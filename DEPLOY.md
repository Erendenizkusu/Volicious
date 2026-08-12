# Volicious — Deploy Runbook (§B)

> Topoloji (Vercel-only): **web + backend tek Next.js uygulaması** (Vercel serverless route'lar),
> **Supabase cloud** (DB), Google/OpenAI anahtarları Vercel env'de. Ayrı API host'u YOK.
> Backend mantığı tek kaynak: `packages/core` (hem yerel Fastify hem Vercel route'ları oradan beslenir).

```
Tarayıcı / Mobil
      │  GET /api/nearby, POST /api/quota/grant, GET /api/places/:id/highlights
      ▼
Vercel (apps/web — Next.js)         @truebite/core (nearby/kota/bütçe/AI)
      │
      ▼
Supabase cloud (PostGIS + RealScore RPC + usage/bütçe RPC)
      │
      ▼
Google Places API  +  OpenAI (gpt-4o-mini: highlights + kategori-uyum)
```

---

## 1) Supabase cloud

1. https://supabase.com → **New project** (bölge: EU — Frankfurt/Amsterdam, Rotterdam'a yakın).
   Güçlü bir DB şifresi belirle (kaydet).
2. Proje açılınca **Project Settings → API**'den şunları al:
   - `Project URL`  → Vercel'de `SUPABASE_URL`
   - `service_role` secret → Vercel'de `SUPABASE_SERVICE_ROLE_KEY` (⚠️ gizli, asla client'a verme)
3. Yerelden migration'ları buluta uygula (repo kökünde):
   ```bash
   supabase link --project-ref <PROJECT_REF>     # dashboard URL'indeki ref
   supabase db push                               # supabase/migrations/* buluta uygulanır
   ```
   `db push` tüm migration'ları (postgis, places, cache_cells, nearby_places v1-**v5**,
   api_rpcs, grants, place_highlights, usage_cost_safety, **place_category_fit**) sırayla uygular.
   ⚠️ `db push` INTERAKTİF `[Y/n]` sorar → non-TTY'de onayı borula: `echo y | supabase db push`
   (yoksa SESSİZ BAŞARISIZLIK). İmza-değiştiren migration'da ÖNCE db push → SONRA git push.
4. (Opsiyonel) demo seed: cloud'da seed yok — ilk gerçek aramalar cache'i dolduracak.

## 2) Vercel (web + backend)

Vercel → **Add New → Project → GitHub → Erendenizkusu/Volicious**.

**Ayarlar:**
- **Root Directory:** `apps/web`  (Turborepo otomatik algılanır; install repo kökünden yapılır)
- **Framework Preset:** Next.js (otomatik)
- **Build/Install Command:** varsayılan (elleme)

**Environment Variables** (Production + Preview ikisine de):

| Anahtar | Değer | Not |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | zorunlu |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | zorunlu, gizli |
| `GOOGLE_PLACES_API_KEY` | Google Places (New) anahtarı | cache-miss için zorunlu |
| `OPENAI_API_KEY` | OpenAI anahtarı (gpt-4o-mini) | AI highlights + kategori-uyum için; yoksa AI devre dışı |
| `FREE_REQUESTS_PER_DAY` | `1` | maliyet güvenliği (cihaz başına günde 1 ücretsiz keşif) |
| `AD_GRANT_REQUESTS` | `1` | reklam başı +istek |
| `DAILY_GOOGLE_BUDGET` | `300` | günlük Google çağrı tavanı (trafik/bütçeye göre ayarla) |
| `MONTHLY_GOOGLE_BUDGET` | `5000` | aylık tavan |
| `CELL_PRECISION` | `6` | önbellek hücre çözünürlüğü |
| `TRUST_WEIGHT` | `0.25` | güven terimi β (kalibrasyon) |
| `CATEGORY_FIT_TOP_N` | `0` | AI kategori-uyum **KAPALI** (altın kural). Gelir gelince `12` yap → döner precision |
| `CATEGORY_FIT_FLOOR` | `0.6` | kategori-uyum harmanlama tabanı |

> ⚠️ `ANTHROPIC_API_KEY` KALDIRILDI (AI artık OpenAI). Varsa Vercel'den silebilirsin (zararsız).
> `CATEGORY_FIT_TOP_N` 0'dan büyük yapılırsa cache-miss'te top-N mekân için **Google review-fetch
> maliyeti** doğar (bütçe kapısından geçer, cache'lenir) — altın kural: gelir gelince aç.

Deploy sonrası prod URL: `https://<proje>.vercel.app`. Test:
`https://<proje>.vercel.app/api/nearby?lat=51.9225&lng=4.47917&radiusM=4000&category=coffee`

> Google Places anahtarını **API kısıtla**: yalnızca "Places API (New)"; HTTP referrer yerine
> sunucu kullanımı olduğundan IP/uygulama kısıtı yerine API kısıtı yeterli. Bütçe alarmı kur.

## 3) Mobil (Expo/EAS)

- `apps/mobile/.env`: `EXPO_PUBLIC_API_BASE_URL=https://<proje>.vercel.app`
  (yollar tekil: mobil `lib/api.ts` zaten `${BASE}/api/nearby` + `${BASE}/api/quota/grant` +
  `${BASE}/api/places/:id/highlights` çağırıyor; yerel Fastify de aynı `/api/*` → sadece BASE değişir.)
- **Google Maps SDK** anahtarı → `app.json` `android.config.googleMaps.apiKey` (şu an placeholder).
- **AdMob (rewarded reklam) — kod HAZIR, build öncesi doldur:**
  1. AdMob → uygulama + "Rewarded" reklam birimi oluştur.
  2. `app.json` → `plugins` → `react-native-google-mobile-ads` → `androidAppId`/`iosAppId` = **App ID** (`…~…`).
  3. `apps/mobile/lib/ads.ts` → `REWARDED_UNIT_ID_ANDROID`/`_IOS` = **reklam birimi ID** (`…/…`).
  4. `__DEV__`/dev-build'de Google TEST birimi otomatik kullanılır (kendi reklamına tıklama = ban riski).
  5. Expo Go'da native modül yok → `ads.ts` dev-fallback ile ödülü verir (grant akışı test edilebilir).
- `eas.json` hazır: `eas build -p android --profile preview` → paylaşılabilir **APK** (`preview` = apk).
- İleride: `/api/quota/grant`'ı AdMob **SSV** (server-side verification) ile koru (bedava kota engeli).

## 4) Deploy sonrası maliyet güvenliği (§A kalanı)

- `/api/quota/grant` şu an **açık stub** → gerçek AdMob SSV ile koru (curl ile bedava kota engeli).
- Google Cloud Console'da **günlük bütçe alarmı** + `DAILY_GOOGLE_BUDGET`'i gerçek trafiğe göre kalibre et.

İlgili: `RELEASE.md` (checklist), `CLAUDE.md` (Monetizasyon altın kuralı), `ARCHITECTURE.md`.
