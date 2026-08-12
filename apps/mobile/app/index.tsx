import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  AppState,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { categoryCtaNoun, categoryLabel, type ScoredPlace } from "@truebite/shared";
import { fetchNearby, grantQuota, SEARCH_RADIUS_M } from "@/lib/api";
import { showRewardedAd } from "@/lib/ads";
import {
  locate,
  servicesEnabled,
  openLocationSettings,
  openAppSettings,
  type Blocker,
} from "@/lib/location";
import { locale, t } from "@/lib/i18n";
import { colors, font, radius } from "@/lib/theme";
import { CATEGORIES } from "@/lib/categories";
import { Brand } from "@/components/Brand";
import { SpotCard } from "@/components/SpotCard";
import { FoodRain } from "@/components/FoodRain";

// KONUM-BAĞIMSIZ & konsept-öncelikli: kullanıcı butona basınca konum alınır.
// Konum verilmezse rastgele şehir DEMOSU göstermeyiz (yanıltıcı) → "konumunu paylaş" ekranı.
type Status = "idle" | "locating" | "ready" | "denied";
type Coords = { lat: number; lng: number };
// Tek arama = tek kota/Google maliyeti. Yalnızca kullanıcı butona basınca "işlenmiş" arama
// (search) kurulur; kategori chip'ini değiştirmek OTOMATİK arama tetiklemez (maliyet + UX).
type Search = { lat: number; lng: number; catKey: string };

export default function Discover() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [catIdx, setCatIdx] = useState(0);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  // Engelin türü — "izin yok" ile "cihazın konum servisi kapalı" farklı çözümler ister.
  const [blocker, setBlocker] = useState<Blocker | null>(null);
  // İşlenmiş arama: butona basılınca kurulur. Sorgu yalnızca buna bağlıdır (chip'e değil).
  const [search, setSearch] = useState<Search | null>(null);
  const cat = CATEGORIES[catIdx]!;

  const [granting, setGranting] = useState(false);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["nearby", search?.lat, search?.lng, search?.catKey],
    queryFn: () => fetchNearby(search!.lat, search!.lng, SEARCH_RADIUS_M, search!.catKey),
    enabled: !!search,
  });
  // Ayrıştırılmış dönüş: ok / kota-doldu / hata.
  const searched = !!search;
  const result = data?.kind === "ok" ? data.result : null;
  const places = result?.places ?? [];
  const quotaExceeded = data?.kind === "quota";
  const remaining = data && data.kind !== "error" ? data.quota.remaining : null;

  // "Reklam izle → +1 keşif": önce ödüllü reklam göster; kullanıcı ödülü kazanınca sunucudan
  // +1 hak iste (grant) ve listeyi tazele. Expo Go'da reklam modülü yoksa ödül dev-fallback ile
  // verilir (grant akışı test edilebilir). Reklam izlenmez/başarısızsa hak verilmez.
  async function watchAdForMore() {
    setGranting(true);
    try {
      const earned = await showRewardedAd();
      if (earned && (await grantQuota())) await refetch();
    } finally {
      setGranting(false);
    }
  }

  async function locateAndSearch() {
    // Konum zaten alınmışsa tekrar GPS'e gitme; seçili kategori için doğrudan yeni arama başlat.
    if (coords && status === "ready") {
      setSearch({ lat: coords.lat, lng: coords.lng, catKey: cat.key });
      return;
    }
    setStatus("locating");
    const r = await locate();
    if (r.ok) {
      setCoords({ lat: r.lat, lng: r.lng });
      setBlocker(null);
      setStatus("ready");
      setSearch({ lat: r.lat, lng: r.lng, catKey: cat.key });
      return;
    }
    setBlocker(r.blocker);
    setStatus("denied");
  }

  // Kategori değişince OTOMATİK arama YAPMA: yalnızca seçimi değiştir ve önceki sonuçları
  // temizle → kullanıcı butona basınca seçili kategoride arar (her arama bir kota harcar).
  function selectCategory(i: number) {
    setCatIdx(i);
    setSearch(null);
  }

  // Kullanıcı sistem konum ayarlarına gidip GPS'i açtıysa, geri döndüğünde uygulamayı elle
  // yeniden başlatmasın: öne gelince servisi tekrar kontrol et, açıldıysa kendiliğinden ara.
  const blockerRef = useRef<Blocker | null>(null);
  blockerRef.current = blocker;
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active" || blockerRef.current !== "services") return;
      if (await servicesEnabled()) locateAndSearch();
    });
    return () => sub.remove();
  }, []);

  // Konum verilmezse (denied) sonuç göstermeyiz → engele uygun yönlendirme ekranı gösteririz.
  // Liste henüz yokken (idle/konum/iskelet/boş/kota) hero'yu dikey ortala → buton-altı
  // boşluk kapanır, içerik üste sıkışmaz. Gerçek sonuç gelince üstten normal akışa döner.
  const hasResults = searched && !quotaExceeded && places.length > 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.paper }}>
      {/* Hero (liste yok) ekranının arka plan katmanı: yiyecek yağmuru + sage parıltı. */}
      {!hasResults && <FoodRain />}
      <View style={s.header}>
        <Brand />
        <Text style={s.headerTag}>{t.header.tagline}</Text>
      </View>

      <FlatList
        data={searched && !quotaExceeded ? places : []}
        keyExtractor={(p: ScoredPlace) => p.placeId}
        renderItem={({ item, index }) => <SpotCard place={item} rank={index + 1} />}
        ListHeaderComponent={
          <Hero
            cat={cat}
            catIdx={catIdx}
            onCat={selectCategory}
            status={status}
            blocker={blocker}
            onLocate={locateAndSearch}
            resultCount={searched && !quotaExceeded ? places.length : null}
            remaining={remaining}
            cacheHit={result?.cacheHit}
            onMap={() =>
              search &&
              router.push(`/map?lat=${search.lat}&lng=${search.lng}&cat=${search.catKey}`)
            }
          />
        }
        ListEmptyComponent={
          quotaExceeded ? (
            <LimitReached onWatchAd={watchAdForMore} granting={granting} />
          ) : status === "locating" || (searched && isFetching) ? (
            <Skeleton />
          ) : status === "denied" ? (
            <LocationPrompt blocker={blocker} onRetry={locateAndSearch} />
          ) : searched ? (
            <Empty />
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          flexGrow: 1,
          justifyContent: hasResults ? "flex-start" : "center",
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Hero({
  cat,
  catIdx,
  onCat,
  status,
  blocker,
  onLocate,
  resultCount,
  remaining,
  cacheHit,
  onMap,
}: {
  cat: (typeof CATEGORIES)[number];
  catIdx: number;
  onCat: (i: number) => void;
  status: Status;
  blocker: Blocker | null;
  onLocate: () => void;
  resultCount: number | null;
  remaining: number | null;
  cacheHit?: boolean;
  onMap: () => void;
}) {
  const locating = status === "locating";
  return (
    <View style={{ paddingTop: 20 }}>
      <View style={s.eyebrow}>
        <View style={s.eyebrowDot} />
        <Text style={s.eyebrowText}>{t.hero.eyebrow}</Text>
      </View>

      <Text style={s.h1}>
        {t.hero.titleLine1}
        {"\n"}
        <Text style={s.h1Italic}>{t.hero.titleLine2}</Text>
      </Text>

      <Text style={s.sub}>
        {t.hero.sub}{" "}
        <Text style={{ color: colors.ink, fontFamily: font.semibold }}>{t.hero.subStrong}</Text>
      </Text>

      {/* kategori filtreleri — yatay kaydırma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
        style={{ marginHorizontal: -20, marginTop: 22 }}
      >
        {CATEGORIES.map((c, i) => {
          const active = i === catIdx;
          return (
            <Pressable
              key={c.key}
              onPress={() => onCat(i)}
              style={[s.chip, active ? s.chipActive : s.chipIdle]}
            >
              <Text style={[s.chipText, { color: active ? colors.paper : colors.ink }]}>
                {categoryLabel(c, locale)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* merkezi CTA */}
      <Pressable
        onPress={onLocate}
        disabled={locating}
        style={({ pressed }) => [s.cta, (pressed || locating) && { opacity: 0.75 }]}
      >
        <View style={s.ctaDot} />
        <Text style={s.ctaText}>
          {locating ? t.hero.ctaLoading : t.hero.cta(categoryCtaNoun(cat, locale))}
        </Text>
      </Pressable>

      <Text style={s.note}>
        {status !== "denied"
          ? t.hero.hint
          : blocker === "services"
            ? t.hero.hintServices
            : blocker === "permission-blocked"
              ? t.hero.hintPermissionBlocked
              : blocker === "unavailable"
                ? t.hero.hintUnavailable
                : t.hero.hintPermission}
      </Text>

      {/* sonuç başlığı */}
      {resultCount != null && (
        <View style={s.listHead}>
          <Text style={s.listLabel}>
            {cat.key === "all" ? t.hero.headingAll : t.hero.heading(categoryLabel(cat, locale))}
          </Text>
          <Pressable onPress={onMap} hitSlop={8}>
            <Text style={s.mapLink}>
              {remaining != null
                ? t.hero.quotaLeft(remaining)
                : cacheHit == null
                  ? ""
                  : cacheHit
                    ? t.hero.cached
                    : t.hero.fresh}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Skeleton() {
  return (
    <View style={{ marginTop: 4 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={s.skRow}>
          <View style={[s.skBox, { width: 26, height: 18 }]} />
          <View style={{ flex: 1, gap: 9 }}>
            <View style={[s.skBox, { width: "55%", height: 18 }]} />
            <View style={[s.skBox, { width: "35%", height: 12 }]} />
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <View style={[s.skBox, { width: 54, height: 26 }]} />
            <View style={[s.skBox, { width: 60, height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Empty() {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{t.empty.title}</Text>
      <Text style={s.emptyText}>{t.empty.text}</Text>
    </View>
  );
}

function LocationPrompt({ blocker, onRetry }: { blocker: Blocker | null; onRetry: () => void }) {
  // Rastgele şehir demosu YOK. Engelin türüne göre kullanıcıyı DOĞRU yere gönderiyoruz:
  // konum servisi kapalıysa izin istemek işe yaramaz — sistem konum ayarları açılmalı.
  const isAndroid = Platform.OS === "android";

  const L = t.location;
  const view = {
    services: {
      title: L.servicesTitle,
      text: L.servicesText,
      cta: L.servicesCta,
      onPress: openLocationSettings,
      note: isAndroid ? L.servicesNoteAndroid : L.servicesNoteIos,
    },
    "permission-blocked": {
      title: L.blockedTitle,
      text: L.blockedText,
      cta: L.blockedCta,
      onPress: openAppSettings,
      note: isAndroid ? L.blockedNoteAndroid : L.blockedNoteIos,
    },
    unavailable: {
      title: L.unavailableTitle,
      text: L.unavailableText,
      cta: L.unavailableCta,
      onPress: onRetry,
      note: L.unavailableNote,
    },
    permission: {
      title: L.permissionTitle,
      text: L.permissionText,
      cta: L.permissionCta,
      onPress: onRetry,
      note: L.permissionNote,
    },
  }[blocker ?? "permission"];

  return (
    <View style={s.limit}>
      <Text style={s.limitTitle}>{view.title}</Text>
      <Text style={s.limitText}>{view.text}</Text>
      <Pressable
        onPress={view.onPress}
        style={({ pressed }) => [s.limitCta, pressed && { opacity: 0.75 }]}
      >
        <Text style={s.limitCtaText}>{view.cta}</Text>
      </Pressable>
      <Text style={s.limitNote}>{view.note}</Text>
      {/* Ayarlardan dönüp otomatik denemeyi kaçıranlar için elle tetikleyici. */}
      {blocker === "services" && (
        <Pressable onPress={onRetry} hitSlop={8} style={{ marginTop: 10 }}>
          <Text style={s.limitLink}>{L.servicesRetry}</Text>
        </Pressable>
      )}
    </View>
  );
}

function LimitReached({ onWatchAd, granting }: { onWatchAd: () => void; granting: boolean }) {
  // Kota doldu — maliyet güvenliği (altın kural). Reklamla ödüllendir ya da yarını beklet.
  return (
    <View style={s.limit}>
      <Text style={s.limitTitle}>{t.limit.title}</Text>
      <Text style={s.limitText}>{t.limit.text}</Text>
      <Pressable
        onPress={onWatchAd}
        disabled={granting}
        style={({ pressed }) => [s.limitCta, (pressed || granting) && { opacity: 0.75 }]}
      >
        <Text style={s.limitCtaText}>{granting ? t.limit.ctaBusy : t.limit.cta}</Text>
      </Pressable>
      <Text style={s.limitNote}>{t.limit.note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTag: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, color: colors.stone },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.sage },
  eyebrowText: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, color: colors.stone },

  h1: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 18,
  },
  h1Italic: { fontFamily: font.displayItalic, color: colors.sage },
  sub: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.stone,
    marginTop: 16,
  },

  chips: { paddingHorizontal: 20, gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: colors.sage },
  chipIdle: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipText: { fontFamily: font.semibold, fontSize: 14 },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 22,
    maxWidth: "100%",
  },
  ctaDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: colors.paper },
  ctaText: { fontFamily: font.semibold, fontSize: 15, color: colors.paper, flexShrink: 1 },

  note: { fontFamily: font.regular, fontSize: 12, color: colors.stone, marginTop: 14, maxWidth: 320 },

  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 12,
    marginTop: 30,
  },
  listLabel: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.4, color: colors.stone },
  mapLink: { fontFamily: font.mono, fontSize: 11, color: colors.sage },

  skRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 18 },
  skBox: { backgroundColor: colors.sand, borderRadius: 6 },

  empty: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: radius.card,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: { fontFamily: font.mono, fontSize: 14, color: colors.stone },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.stone,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 260,
  },

  limit: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.sage,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 28,
    alignItems: "center",
  },
  limitTitle: {
    fontFamily: font.display,
    fontSize: 19,
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  limitText: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.stone,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 300,
  },
  limitCta: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginTop: 18,
  },
  limitCtaText: { fontFamily: font.semibold, fontSize: 14, color: colors.paper },
  limitNote: {
    fontFamily: font.mono,
    fontSize: 11,
    lineHeight: 17,
    color: colors.stone,
    marginTop: 12,
    textAlign: "center",
  },
  limitLink: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.sage,
    textDecorationLine: "underline",
  },
});
