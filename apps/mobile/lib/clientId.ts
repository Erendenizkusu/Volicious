import * as SecureStore from "expo-secure-store";

/**
 * Anonim cihaz kimliği (maliyet güvenliği kotasının temeli — RELEASE.md § A).
 * Sunucuya X-Client-Id başlığıyla gider; günlük kota IP yerine cihaz bazında sayılır.
 *
 * ✅ KALICI: kimlik expo-secure-store ile cihazda saklanır. Uygulama kapanıp açılsa da
 * AYNI kalır → kullanıcı uygulamayı yeniden başlatarak günlük keşif hakkını sıfırlayamaz
 * (eski davranış: bellek-içi UUID her açılışta değişiyor, kota resetleniyordu).
 *
 * `initClientId()` uygulama açılışında bir kez (RootLayout) çağrılır; kalıcı kimliği yükler
 * ya da ilk açılışta üretip saklar. `getClientId()` senkron erişim içindir (fetch başlığı);
 * init tamamlanmışsa kalıcı kimliği, aksi halde güvenli bir bellek-içi düşüş döndürür.
 */
const STORE_KEY = "volicious.clientId";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

/** Açılışta bir kez: kalıcı kimliği yükle ya da üretip sakla. Fetch'lerden ÖNCE tamamlanmalı. */
export async function initClientId(): Promise<string> {
  if (cached) return cached;
  try {
    let id = await SecureStore.getItemAsync(STORE_KEY);
    if (!id) {
      id = uuid();
      await SecureStore.setItemAsync(STORE_KEY, id);
    }
    cached = id;
  } catch {
    // SecureStore erişilemezse (ör. bazı emülatörler) bellek-içi kimliğe düş — çökme yok.
    if (!cached) cached = uuid();
  }
  return cached;
}

export function getClientId(): string {
  // init edilmeden çağrılırsa güvenli düşüş (normalde açılışta init tamamlanır).
  if (!cached) cached = uuid();
  return cached;
}
