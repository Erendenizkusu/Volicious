import { getLocales } from "expo-localization";
import { normalizeLocale, type Locale } from "@truebite/shared";

/**
 * Mobil sözlük. Kategori/AI-etiket/biçimlendirme metinleri BURADA DEĞİL — onlar
 * `@truebite/shared` içindedir (web ile senkron kalmak zorunda).
 *
 * Dil, CİHAZ DİLİNDEN belirlenir ve uygulama ömrü boyunca sabittir (kullanıcı sistem dilini
 * değiştirirse uygulama zaten yeniden başlar). Bu yüzden modül seviyesinde tek sefer çözülür —
 * context/provider gerekmez.
 */
export const locale: Locale = normalizeLocale(getLocales()[0]?.languageCode);

interface Dict {
  header: { tagline: string };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    sub: string;
    subStrong: string;
    cta: (noun: string) => string;
    ctaLoading: string;
    hint: string;
    hintServices: string;
    hintPermissionBlocked: string;
    hintUnavailable: string;
    hintPermission: string;
    headingAll: string;
    heading: (label: string) => string;
    quotaLeft: (n: number) => string;
    cached: string;
    fresh: string;
    map: string;
  };
  spot: {
    highlightsLabel: string;
    highlightsLoading: string;
    highlightsEmpty: string;
    scoreLabel: string;
  };
  empty: { title: string; text: string };
  limit: {
    title: string;
    text: string;
    cta: string;
    ctaBusy: string;
    note: string;
    adUnavailableTitle: string;
    adUnavailableText: string;
  };
  location: {
    servicesTitle: string;
    servicesText: string;
    servicesCta: string;
    servicesNoteAndroid: string;
    servicesNoteIos: string;
    servicesRetry: string;
    blockedTitle: string;
    blockedText: string;
    blockedCta: string;
    blockedNoteAndroid: string;
    blockedNoteIos: string;
    unavailableTitle: string;
    unavailableText: string;
    unavailableCta: string;
    unavailableNote: string;
    permissionTitle: string;
    permissionText: string;
    permissionCta: string;
    permissionNote: string;
  };
  map: { back: string; reviews: (n: number) => string };
}

const tr: Dict = {
  header: { tagline: "GERÇEK PUAN, GERÇEK MEKAN" },
  hero: {
    eyebrow: "DÜRÜST MEKAN KEŞFİ",
    titleLine1: "Gözlerini kapat!",
    titleLine2: "Seni harika bir yere götürüyorum.",
    sub: "Algoritmamız şişirilmiş ve sahte puanları ayıkladı, binlerce yorumu ağırlıklandırdı. Konumundaki en popüler ve dürüst mekanlar tek tıkla karşında.",
    subStrong: "Hadi tıkla da gidelim.",
    cta: (noun) => `Konumumdaki en popüler ${noun} listele`,
    ctaLoading: "Konumun bulunuyor…",
    hint: "Tek dokunuş. En iyileri RealScore'a göre sıralarız — şişirilmiş puanlar elenir.",
    hintServices: "Cihazının konumu kapalı — aşağıdan konum ayarlarını açabilirsin.",
    hintPermissionBlocked: "Konum izni engellenmiş — aşağıdan uygulama ayarlarını açabilirsin.",
    hintUnavailable: "Konumuna ulaşılamadı — aşağıdan tekrar deneyebilirsin.",
    hintPermission: "Konum izni gerekli — en iyi mekanları görmek için aşağıdan paylaş.",
    headingAll: "EN İYİ MEKANLAR",
    heading: (label) => `EN İYİ ${label.toUpperCase()} MEKANLARI`,
    quotaLeft: (n) => `${n} keşif kaldı · harita`,
    cached: "● anlık · harita",
    fresh: "● güncel · harita",
    map: "harita",
  },
  spot: {
    highlightsLabel: "YORUMLARDAN ÖNE ÇIKANLAR",
    highlightsLoading: "derleniyor…",
    highlightsEmpty: "Bu mekân için henüz öne çıkan bir özellik derleyemedik.",
    scoreLabel: "VOLICIOUS PUANI",
  },
  empty: {
    title: "bu kategoride yakınında mekan bulunamadı",
    text: "Farklı bir kategori ya da daha geniş bir alan dene.",
  },
  limit: {
    title: "Bugünlük ücretsiz keşif hakkın doldu",
    text: "Kaliteli mekan verisi bize maliyet doğurur; adil kullanım için günlük bir sınır var. Kısa bir reklam izleyerek bir keşif daha açabilir ya da yarın devam edebilirsin.",
    cta: "Reklam izle → 1 keşif daha",
    ctaBusy: "hazırlanıyor…",
    note: "Kota her gün sıfırlanır.",
    adUnavailableTitle: "Şu an gösterilecek reklam yok",
    adUnavailableText:
      "Şu anda uygun bir reklam bulunamadı. Birazdan tekrar deneyebilir ya da yarın ücretsiz keşif hakkınla devam edebilirsin.",
  },
  location: {
    servicesTitle: "Cihazının konumu kapalı",
    servicesText:
      "Telefonunun konum servisi (GPS) kapalı olduğu için çevrendeki mekanları bulamıyoruz. Konumu açman yeterli — gerisini biz hallederiz.",
    servicesCta: "Konum ayarlarını aç",
    servicesNoteAndroid: "Ayarları açıp konumu etkinleştir, geri dön — otomatik devam edeceğiz.",
    servicesNoteIos:
      "Ayarlar › Gizlilik ve Güvenlik › Konum Servisleri → aç, sonra Volicious'a izin ver.",
    servicesRetry: "Açtım, tekrar dene",
    blockedTitle: "Konum izni kapalı",
    blockedText:
      "Volicious'un konumuna erişimi engellenmiş. İzni uygulama ayarlarından açtıktan sonra buraya dönüp tekrar dene.",
    blockedCta: "Uygulama ayarlarını aç",
    blockedNoteAndroid: "Ayarlar › Uygulamalar › Volicious › İzinler › Konum.",
    blockedNoteIos: "Ayarlar › Volicious › Konum › Uygulamayı Kullanırken.",
    unavailableTitle: "Konumuna ulaşamadık",
    unavailableText:
      "Sinyal zayıf olabilir ya da işlem zaman aşımına uğradı. Açık bir alana geçip tekrar denemek genelde çözer.",
    unavailableCta: "Tekrar dene",
    unavailableNote: "Sorun sürerse cihazının konum ayarlarını kontrol et.",
    permissionTitle: "Konumunu paylaş",
    permissionText:
      "Volicious, çevrendeki gerçekten en iyi mekanları bulmak için konumunu kullanır. Konum izni olmadan sana özel liste gösteremeyiz.",
    permissionCta: "Konum iznini ver",
    permissionNote: "Konumun yalnızca yakınındaki mekanları bulmak için kullanılır.",
  },
  map: { back: "‹ liste", reviews: (n) => `${n} yorum` },
};

const en: Dict = {
  header: { tagline: "REAL RATINGS, REAL SPOTS" },
  hero: {
    eyebrow: "HONEST SPOT DISCOVERY",
    titleLine1: "Close your eyes!",
    titleLine2: "I'm taking you somewhere great.",
    sub: "Our algorithm filtered out inflated and fake ratings and weighed thousands of reviews. The most popular, honestly rated spots near you are one tap away.",
    subStrong: "Tap and let's go.",
    cta: (noun) => `List the top ${noun} near me`,
    ctaLoading: "Finding your location…",
    hint: "One tap. We rank the best by RealScore — inflated ratings get filtered out.",
    hintServices: "Your device's location is off — you can open location settings below.",
    hintPermissionBlocked: "Location permission is blocked — open app settings below.",
    hintUnavailable: "We couldn't get your location — you can try again below.",
    hintPermission: "Location permission needed — share it below to see the best spots.",
    headingAll: "BEST SPOTS",
    heading: (label) => `BEST ${label.toUpperCase()} SPOTS`,
    quotaLeft: (n) => `${n} ${n === 1 ? "search" : "searches"} left · map`,
    cached: "● instant · map",
    fresh: "● fresh · map",
    map: "map",
  },
  spot: {
    highlightsLabel: "HIGHLIGHTS FROM REVIEWS",
    highlightsLoading: "compiling…",
    highlightsEmpty: "We couldn't compile any highlights for this spot yet.",
    scoreLabel: "VOLICIOUS SCORE",
  },
  empty: {
    title: "no spots found nearby in this category",
    text: "Try a different category or a wider area.",
  },
  limit: {
    title: "You've used today's free searches",
    text: "Quality spot data costs us money, so there's a daily limit to keep things fair. Watch a short ad to unlock one more search, or come back tomorrow.",
    cta: "Watch an ad → 1 more search",
    ctaBusy: "getting ready…",
    note: "Your quota resets every day.",
    adUnavailableTitle: "No ad available right now",
    adUnavailableText:
      "We couldn't find an ad to show at the moment. Please try again shortly, or come back tomorrow for your free search.",
  },
  location: {
    servicesTitle: "Your device's location is off",
    servicesText:
      "Your phone's location service (GPS) is turned off, so we can't find spots around you. Just turn it on — we'll handle the rest.",
    servicesCta: "Open location settings",
    servicesNoteAndroid: "Open settings, turn location on, then come back — we'll continue automatically.",
    servicesNoteIos:
      "Settings › Privacy & Security › Location Services → turn on, then allow Volicious.",
    servicesRetry: "I've turned it on, try again",
    blockedTitle: "Location permission is off",
    blockedText:
      "Volicious is blocked from accessing your location. Enable the permission in app settings, then come back and try again.",
    blockedCta: "Open app settings",
    blockedNoteAndroid: "Settings › Apps › Volicious › Permissions › Location.",
    blockedNoteIos: "Settings › Volicious › Location › While Using the App.",
    unavailableTitle: "We couldn't get your location",
    unavailableText:
      "The signal may be weak, or the request timed out. Moving to an open area and trying again usually fixes it.",
    unavailableCta: "Try again",
    unavailableNote: "If it keeps happening, check your device's location settings.",
    permissionTitle: "Share your location",
    permissionText:
      "Volicious uses your location to find the genuinely best spots around you. Without location permission we can't show you a personalised list.",
    permissionCta: "Grant location permission",
    permissionNote: "Your location is only used to find spots near you.",
  },
  map: { back: "‹ list", reviews: (n) => `${n} ${n === 1 ? "review" : "reviews"}` },
};

const DICTS: Record<Locale, Dict> = { tr, en };

/** Uygulamanın metin sözlüğü — cihaz diline göre çözülmüş. */
export const t: Dict = DICTS[locale];
