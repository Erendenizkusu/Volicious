import "server-only";
import {
  loadConfig,
  createSupabase,
  isCellFresh,
  queryNearby,
  upsertPlaces,
  touchCell,
  freshHighlights,
  upsertHighlights,
  fetchNearbyFromGoogle,
  fetchPlaceReviews,
  GOOGLE_CALLS_PER_FETCH,
  getNearby,
  extractHighlights,
  scoreCategoryFit,
  HIGHLIGHTS_MODEL,
  getHighlights,
  refineByCategoryFit,
  freshCategoryFit,
  upsertCategoryFit,
  consumeUserRequest,
  grantAdRequest,
  tryConsumeBudget,
  type NearbyDeps,
  type HighlightsDeps,
  type QuotaResult,
  type GrantResult,
} from "@truebite/core";
import type { NearbyQuery, NearbyResult, HighlightsResult } from "@truebite/shared";

/**
 * Volicious backend'i — Vercel serverless (Next.js route handler) tarafı.
 * Fastify (apps/api/server.ts) ile AYNI çekirdeği (@truebite/core) kullanır; burada yalnızca
 * bağımlılıkları (Supabase client + anahtarlar + bütçe konfigü) bağlarız.
 *
 * LAZY-INIT: konfig/istemci İLK İSTEKTE kurulur (modül yüklenirken DEĞİL). Böylece `next build`
 * sırasında (route modülleri import edilirken) sırlara ihtiyaç olmaz — build ortam değişkeni
 * gerektirmez; anahtarlar yalnızca çalışma anında (Vercel serverless process.env) okunur.
 */
type Ctx = {
  config: ReturnType<typeof loadConfig>;
  sb: ReturnType<typeof createSupabase>;
  nearbyDeps: NearbyDeps;
  hlDeps: HighlightsDeps;
};

let _ctx: Ctx | null = null;

function ctx(): Ctx {
  if (_ctx) return _ctx;
  const config = loadConfig();
  const sb = createSupabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

  const nearbyDeps: NearbyDeps = {
    cellPrecision: config.CELL_PRECISION,
    isCellFresh: (cellId, bucket, ttlDays) =>
      isCellFresh(sb, cellId, bucket, ttlDays ?? config.CACHE_TTL_DAYS),
    fetchFromGoogle: (q) => {
      if (!config.GOOGLE_PLACES_API_KEY) {
        throw new Error("GOOGLE_PLACES_API_KEY tanımlı değil — cache-miss isteği yapılamıyor");
      }
      return fetchNearbyFromGoogle(q, config.GOOGLE_PLACES_API_KEY);
    },
    upsertPlaces: (places) => upsertPlaces(sb, places),
    touchCell: (cellId, bucket, count) => touchCell(sb, cellId, bucket, count),
    queryNearby: (q) => queryNearby(sb, q, config.TRUST_WEIGHT),
    tryConsumeBudget: async (calls) =>
      (await tryConsumeBudget(sb, calls, config.DAILY_GOOGLE_BUDGET, config.MONTHLY_GOOGLE_BUDGET))
        .allowed,
    googleCallsPerFetch: GOOGLE_CALLS_PER_FETCH,
    // AI kategori-uyum katmanı — YALNIZCA açık (topN>0) + anahtarlar varsa bağlanır; aksi
    // halde undefined → nearby tam bypass (bugünkü davranış, sıfır maliyet). Altın kural.
    refineByCategoryFit:
      config.CATEGORY_FIT_TOP_N > 0 && config.OPENAI_API_KEY && config.GOOGLE_PLACES_API_KEY
        ? (places, q) =>
            refineByCategoryFit(places, q, {
              topN: config.CATEGORY_FIT_TOP_N,
              floor: config.CATEGORY_FIT_FLOOR,
              freshFit: (placeId, category) => freshCategoryFit(sb, placeId, category),
              fetchReviews: (placeId) => fetchPlaceReviews(placeId, config.GOOGLE_PLACES_API_KEY!),
              scoreFit: (reviews, label) => scoreCategoryFit(reviews, label, config.OPENAI_API_KEY!),
              upsertFit: (placeId, category, fit, count) =>
                upsertCategoryFit(sb, placeId, category, fit, count, HIGHLIGHTS_MODEL),
              tryConsumeBudget: async (calls) =>
                (
                  await tryConsumeBudget(
                    sb,
                    calls,
                    config.DAILY_GOOGLE_BUDGET,
                    config.MONTHLY_GOOGLE_BUDGET,
                  )
                ).allowed,
            })
        : undefined,
  };

  const hlDeps: HighlightsDeps = {
    freshHighlights: (placeId) => freshHighlights(sb, placeId, config.HIGHLIGHTS_TTL_DAYS),
    fetchReviews: (placeId) => {
      if (!config.GOOGLE_PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY tanımlı değil");
      return fetchPlaceReviews(placeId, config.GOOGLE_PLACES_API_KEY);
    },
    extract: (reviews) => {
      if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY tanımlı değil");
      return extractHighlights(reviews, config.OPENAI_API_KEY);
    },
    upsert: (placeId, tags, count) => upsertHighlights(sb, placeId, tags, count, HIGHLIGHTS_MODEL),
  };

  _ctx = { config, sb, nearbyDeps, hlDeps };
  return _ctx;
}

/** Cihaz kotasını atomik tüket (istek başına, nearby'den ÖNCE). */
export function checkQuota(clientId: string): Promise<QuotaResult> {
  const { sb, config } = ctx();
  return consumeUserRequest(sb, clientId, config.FREE_REQUESTS_PER_DAY);
}

/** Nearby çekirdek akışı (cache + bütçe kapısı içeride). opts.cacheTtlDays ile bu çağrıya özel
 *  önbellek tazelik penceresi geçilebilir. */
export function runNearby(
  q: NearbyQuery,
  opts?: { cacheTtlDays?: number },
): Promise<NearbyResult> {
  return getNearby(q, ctx().nearbyDeps, opts);
}

/** Reklam izleme → +istek hakkı. */
export function grant(clientId: string): Promise<GrantResult> {
  const { sb, config } = ctx();
  return grantAdRequest(sb, clientId, config.AD_GRANT_REQUESTS);
}

/** AI öne çıkan özellikler (OpenAI anahtarı gerektirir). */
export function runHighlights(placeId: string): Promise<HighlightsResult> {
  return getHighlights(placeId, ctx().hlDeps);
}
