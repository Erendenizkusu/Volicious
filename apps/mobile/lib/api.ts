import type { NearbyResult, HighlightsResult } from "@truebite/shared";
import { getClientId } from "@/lib/clientId";

// Cihaz/emülatör dev makineye localhost ile erişemez.
//   - Android emülatör: http://10.0.2.2:8787
//   - Fiziksel cihaz:   http://<dev-makine-LAN-IP>:8787
// .env içinde EXPO_PUBLIC_API_BASE_URL ile ayarla.
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

/**
 * Keşif yarıçapı (metre). Keşif ekranı ve harita ekranı AYNI değeri kullanmalı ki ikisi tek
 * önbellek anahtarını paylaşsın → harita açmak ikinci bir kota/Google çağrısı YAPMAZ.
 */
export const SEARCH_RADIUS_M = 4000;

/** Maliyet güvenliği kotası (RELEASE.md § A) — sunucudan header ile gelir. */
export interface Quota {
  remaining: number | null;
  limit: number | null;
}

/** fetchNearby dönüşü — 429 (kota) ile gerçek hata ayrıştırılır ki UI doğru ekranı göstersin. */
export type NearbyResponse =
  | { kind: "ok"; result: NearbyResult; quota: Quota }
  | { kind: "quota"; quota: Quota }
  | { kind: "error" };

function numOrNull(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Backend'in /places/nearby endpoint'ini tüketir. Cihaz kimliğini (X-Client-Id) iletir;
 * kota başlıklarını okur. 429 → kota doldu (ayrı ekran), diğer !ok → hata.
 * Konum-bağımsız: hangi lat/lng verilirse o bölgeyi sorgular.
 */
export async function fetchNearby(
  lat: number,
  lng: number,
  radiusM = 2000,
  category?: string | null,
): Promise<NearbyResponse> {
  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusM: String(radiusM),
    limit: "12",
  });
  if (category && category !== "all") qs.set("category", category);
  try {
    const res = await fetch(`${BASE}/api/nearby?${qs.toString()}`, {
      headers: { "X-Client-Id": getClientId() },
    });
    const quota: Quota = {
      remaining: numOrNull(res.headers.get("x-quota-remaining")),
      limit: numOrNull(res.headers.get("x-quota-limit")),
    };
    if (res.status === 429) return { kind: "quota", quota };
    if (!res.ok) return { kind: "error" };
    return { kind: "ok", result: (await res.json()) as NearbyResult, quota };
  } catch {
    return { kind: "error" };
  }
}

/**
 * AI "öne çıkan özellikler" — mekana dokununca yorumlardan derlenen etiketler (OpenAI).
 * Sonuç placeId başına cache'li (backend). Hata/anahtar yoksa null → UI zarifçe düşer.
 */
export async function fetchHighlights(placeId: string): Promise<HighlightsResult | null> {
  try {
    const res = await fetch(`${BASE}/api/places/${encodeURIComponent(placeId)}/highlights`, {
      headers: { "X-Client-Id": getClientId() },
    });
    if (!res.ok) return null;
    return (await res.json()) as HighlightsResult;
  } catch {
    return null;
  }
}

/**
 * Reklam izleme karşılığı +istek hakkı ister (backend /quota/grant).
 * ⚠️ STUB: gerçek AdMob rewarded ad + SSV entegrasyonuna kadar geçicidir.
 */
export async function grantQuota(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/quota/grant`, {
      method: "POST",
      headers: { "X-Client-Id": getClientId(), "Content-Type": "application/json" },
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}
