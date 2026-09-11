import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * AdMob rewarded (ödüllü) reklam sarmalayıcısı — maliyet güvenliği/altın kuralın gelir ayağı.
 * Kullanıcı günlük ücretsiz kotasını bitirince kısa bir reklam izleyip +1 keşif kazanır.
 *
 * ⚠️ Native AdMob modülü YALNIZCA EAS/dev-build'de vardır — Expo Go'da yoktur. Bu yüzden:
 *   - Expo Go (geliştirme): native yok → dev fallback (ödülü ver ki grant akışı test edilebilsin).
 *   - Gerçek build: gerçek reklam yüklenir/gösterilir. __DEV__'de Google TEST birimi kullanılır
 *     (gerçek reklam yerine — kendi reklamına tıklama = AdMob hesap banı riski; test birimi ZORUNLU).
 *
 * KURULUM (build öncesi, kullanıcı):
 *   1. AdMob'da uygulama + "Rewarded" reklam birimi oluştur.
 *   2. app.json → "react-native-google-mobile-ads".{android_app_id,ios_app_id} = App ID (…~…).
 *   3. Aşağıdaki REWARDED_UNIT_ID_* = reklam birimi ID'si (…/…).
 *   4. SSV (server-side verification) ileride: /api/quota/grant'ı AdMob callback'iyle koru.
 */
const REWARDED_UNIT_ID_ANDROID = "ca-app-pub-2707472203466324/7167483078";
const REWARDED_UNIT_ID_IOS = "ca-app-pub-2707472203466324/6836285909";

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// SADECE reklamın YÜKLENMESİ için üst sınır. Reklam gelmezse (örn. "no-fill") kullanıcıyı uzun
// süre bekletmeyiz → çağıran taraf net bir uyarı gösterir (buton ölü GÖRÜNMEMELİ; App Store
// incelemesinde yeni hesaplar sık sık reklam alamaz). LOADED gelince aşağıda iptal edilir, yani
// kullanıcı reklamı izlerken bu zaman aşımı akışı KESMEZ.
const AD_LOAD_TIMEOUT_MS = 10_000;

let initialized = false;

/** Ödüllü reklam gösterir; kullanıcı ödülü kazandıysa true. Hiçbir durumda exception fırlatmaz. */
export async function showRewardedAd(): Promise<boolean> {
  // Expo Go: native reklam modülü yok → akışı bozmadan ödülü ver (SADECE geliştirme).
  if (inExpoGo) {
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }

  try {
    // Lazy require — Expo Go yolunda hiç değerlendirilmez (native modül yalnızca build'de var).
    const RNGMA = require("react-native-google-mobile-ads");
    const mobileAds = RNGMA.default;
    const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = RNGMA;

    if (!initialized) {
      await mobileAds().initialize();
      initialized = true;
    }

    const unitId = __DEV__
      ? TestIds.REWARDED
      : Platform.OS === "ios"
        ? REWARDED_UNIT_ID_IOS
        : REWARDED_UNIT_ID_ANDROID;

    return await new Promise<boolean>((resolve) => {
      const rewarded = RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      let earned = false;
      let settled = false;
      let loadTimer: ReturnType<typeof setTimeout> | undefined;
      const finish = (v: boolean) => {
        if (settled) return;
        settled = true;
        if (loadTimer) clearTimeout(loadTimer);
        resolve(v);
      };

      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        // Reklam yüklendi → yükleme zaman aşımını iptal et (izleme uzun sürebilir, kesilmesin).
        if (loadTimer) clearTimeout(loadTimer);
        rewarded.show();
      });
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
      rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false));

      rewarded.load();
      // Yalnızca YÜKLEME için zaman aşımı; LOADED gelince yukarıda iptal edilir.
      loadTimer = setTimeout(() => finish(false), AD_LOAD_TIMEOUT_MS);
    });
  } catch {
    return false; // native modül yoksa/patlarsa: ödül yok, akış kırılmaz
  }
}
