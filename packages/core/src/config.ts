import { z } from "zod";

/** Ortam değişkenleri — uygulama açılışında doğrulanır. */
const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Cache-miss isteklerinde gerekli; yoksa sadece cache-hit yolu çalışır.
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
  // AI "öne çıkan özellikler" için gerekli (OpenAI gpt-4o-mini); yoksa highlights endpoint'i devre dışı.
  OPENAI_API_KEY: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8787),
  // geohash hücre çözünürlüğü (önbellek anahtarı). 6 ≈ 1.2km hücre.
  CELL_PRECISION: z.coerce.number().int().min(1).max(12).default(6),
  // Kanıtlanmışlık/güven terimi ağırlığı (β): FinalScore += β·(log10(1+v)−log10(1+m)).
  // Bölge-altı puanlı ama çok-yorumlu (kanıtlanmış) markaları öne çıkarır. 0 = kapalı.
  // Kalibrasyon kolu — gerçek-veri geri bildirimiyle ayarlanır (bkz. bayesian-realscore-formula).
  TRUST_WEIGHT: z.coerce.number().min(0).max(2).default(0.25),

  // ─── Önbellek tazeliği (TTL) — maliyet kaldıracı ───
  // Grid hücresi (nearby arama sonuçları) kaç gün taze sayılır. Uzatmak = aynı bölgeden
  // tekrar gelen isteklerde Google'a GİTMEME → daha az maliyet (özellikle trafik popüler
  // bölgelerde yoğunlaştıkça). ⚠️ Kapsamı DÜŞÜRMEZ: her cache-miss zaten TAM tiling (3x3)
  // yapıp bölgenin tüm mekanlarını tek seferde çeker; TTL yalnızca gerçek-dünya
  // değişikliklerinin (yeni/kapanan yer, puan) yenilenme SIKLIĞINI azaltır. Google ToS: max 30 gün.
  CACHE_TTL_DAYS: z.coerce.number().int().positive().max(30).default(10),
  // AI öne çıkanlar ($0.025 Place Details "Atmosphere" SKU) önbelleği kaç gün taze. Uzun TTL
  // bu pahalı SKU'nun tekrarını doğrudan azaltır. Yorumlar yavaş değişir → 14 gün güvenli.
  HIGHLIGHTS_TTL_DAYS: z.coerce.number().int().positive().max(30).default(14),

  // ─── AI Kategori-Uyum skoru (yorumdan "özellikle X'te iyi mi") ───
  // Top-N mekân için yorum çekip AI ile fit (0..1) hesaplar, RealScore'u ölçekleyip yeniden
  // sıralar. VARSAYILAN 0 = KAPALI (altın kural: review-fetch Google maliyeti doğurur; gelir
  // gelince aç). N≈limit (örn. 12) → görünen tüm liste yeniden sıralanır. Cache: (place,kategori).
  CATEGORY_FIT_TOP_N: z.coerce.number().int().nonnegative().default(0),
  // Harmanlama tabanı: adjusted = realScore * (floor + (1-floor)*fit). floor=0.6 → fit=0 olan
  // mekân puanının %60'ını korur (tamamen silinmez), fit=1 tam korur. Kalibrasyon kolu.
  CATEGORY_FIT_FLOOR: z.coerce.number().min(0).max(1).default(0.6),

  // ─── Maliyet güvenliği (RELEASE.md § A / altın kural) ───
  // Kullanıcı(cihaz) başına GÜNLÜK ücretsiz istek. Bitince reklam izle → +istek.
  // MVP maliyet güvenliği: reklam geliri oturana kadar cihaz başına günde 1 ücretsiz keşif
  // (altın kural — [[monetization-cost-rule]]). Büyüyünce artırılabilir (env ile override).
  FREE_REQUESTS_PER_DAY: z.coerce.number().int().nonnegative().default(1),
  // Bir rewarded ad kaç ek istek kazandırır.
  AD_GRANT_REQUESTS: z.coerce.number().int().positive().default(1),
  // Global GÜNLÜK Google Places çağrı tavanı (sert maliyet koruması). ~$0.032/çağrı →
  // 300 çağrı ≈ $10/gün. Cache-miss başına ~5 çağrı (2x2 tiling). Deploy'da ayarla.
  DAILY_GOOGLE_BUDGET: z.coerce.number().int().positive().default(300),
  // Global AYLIK Google Places çağrı tavanı. 5000 çağrı ≈ $160/ay backstop.
  MONTHLY_GOOGLE_BUDGET: z.coerce.number().int().positive().default(5000),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
