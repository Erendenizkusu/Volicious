import Link from "next/link";
import type { Locale, ScoredPlace } from "@truebite/shared";
import { SiteHeader } from "../SiteHeader";
import { SiteFooter } from "../SiteFooter";
import { AdSlot } from "../AdSlot";
import { GuideSpotRow } from "./GuideSpotRow";
import { districtOf, type GuideCity } from "@/lib/guide";
import type { GuideContent } from "@/lib/guideContent";

export interface GuideLink {
  label: string;
  href: string;
}

// Yapısal veri (JSON-LD) MUTLAK URL ister: BreadcrumbList item'ı göreli yol olursa Google
// "id alanında geçersiz URL" uyarısı verir. Origin, layout.tsx metadataBase ile aynı.
const SITE_ORIGIN = "https://volicious.app";

/**
 * Şehir/kategori rehber sayfası — TAM SUNUCU-RENDER (SSR/ISR). Ana keşif ekranından ayrı,
 * ikincil rehber yüzeyi. Gerçek siteyle aynı tasarım dili (koyu müze paleti + Fraunces).
 * SSS + breadcrumb JSON-LD yapısal verisi arama görünürlüğünü artırır.
 */
export function GuidePage({
  locale,
  city,
  places,
  content,
  altHref,
  homeHref,
  aboutHref,
  ctaHref,
  otherCategories,
  otherCities,
}: {
  locale: Locale;
  city: GuideCity;
  places: ScoredPlace[];
  content: GuideContent;
  altHref: string;
  homeHref: string;
  aboutHref: string;
  ctaHref: string;
  otherCategories: GuideLink[];
  otherCities: GuideLink[];
}) {
  const cityNames = [city.name.tr, city.name.en];
  const topName = places[0]?.name;
  // Öğretici callout yalnızca listede "az yorumlu ama yüksek Google puanı" varsa anlamlı.
  const teachingCase = places.some(
    (p) => p.userRatingsTotal < 300 && (p.rating ?? 0) >= 4.7,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: content.breadcrumb.home,
            item: `${SITE_ORIGIN}${homeHref}`,
          },
          // Son öğe (mevcut sayfa): Google son breadcrumb öğesinde item BEKLEMEZ. Ara öğe
          // bırakmıyoruz — ara ListItem'larda item (URL) ZORUNLU, yoksa "item eksik" uyarısı
          // çıkar. Görsel breadcrumb da (Ana sayfa / Şehir) bu 2 seviyeyle birebir.
          { "@type": "ListItem", position: 2, name: content.breadcrumb.city },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader locale={locale} altHref={altHref} />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pt-24 sm:px-8">
        {/* breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone"
        >
          <Link href={homeHref} className="transition hover:text-ink">
            {content.breadcrumb.home}
          </Link>
          <span aria-hidden className="text-line">
            /
          </span>
          <span>{content.breadcrumb.city}</span>
        </nav>

        {/* hero */}
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-sage">
          {content.eyebrow}
        </p>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-5xl">
          {content.h1}
        </h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-stone sm:text-base">
          {content.lede.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-stone">
          <span>{content.meta.updated}</span>
          <span>{content.meta.evaluated}</span>
          <span>{content.meta.source}</span>
        </div>

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_TOP} className="mt-9 min-h-[90px] rounded-xl" />

        {/* ranking */}
        <div className="mt-12 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            {content.listHeading}
          </h2>
          <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
            {content.listNote}
          </span>
        </div>
        <ol className="mt-2">
          {places.map((place, i) => (
            <GuideSpotRow
              key={place.placeId}
              place={place}
              rank={i + 1}
              locale={locale}
              district={districtOf(place.formattedAddress, cityNames)}
            />
          ))}
        </ol>

        {teachingCase && topName && (
          <div className="mt-7 rounded-r-xl border-l-2 border-sage bg-sage-soft/40 px-5 py-4 text-sm leading-relaxed text-stone">
            <p className="font-semibold text-ink">{content.callout(topName).title}</p>
            <p className="mt-2">{content.callout(topName).body}</p>
          </div>
        )}

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE_MID} className="mt-11 min-h-[90px] rounded-xl" />

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            {locale === "tr" ? "Sık Sorulanlar" : "Frequently asked"}
          </h2>
          <div className="mt-4">
            {content.faq.map((f, i) => (
              <details
                key={i}
                className="group border-t border-line py-4"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-sage transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-stone">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* related / internal links */}
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            {content.relatedTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-stone">{content.relatedIntro}</p>

          <div className="mt-6">
            <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
              {content.otherCategories}
            </span>
            <div className="flex flex-wrap gap-2.5">
              {otherCategories.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-sage/50 hover:text-sage-ink"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {otherCities.length > 0 && (
            <div className="mt-6">
              <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-stone">
                {content.otherCities}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {otherCities.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-sage/50 hover:text-sage-ink"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* app bridge */}
        <section className="mt-16 rounded-3xl border border-line bg-gradient-to-b from-sage-soft/40 to-surface/40 px-7 py-9 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            {content.bridge.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-stone">
            {content.bridge.text}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-paper transition hover:-translate-y-0.5"
            >
              {content.bridge.cta}
            </Link>
            <Link
              href={aboutHref}
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-sage/50"
            >
              {content.bridge.secondary}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
