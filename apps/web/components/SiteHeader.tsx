import Link from "next/link";
import type { Locale } from "@truebite/shared";
import { getDict, localePath, type Page } from "@/lib/i18n";
import { Mark } from "./Mark";

/**
 * Dil değiştirici AYNI sayfanın öbür dildeki adresine gider (kullanıcıyı ana sayfaya atmaz).
 * `page` sabit sayfalar (home/about/privacy) için kullanılır.
 */
export function SiteHeader({
  locale,
  page = "home",
}: {
  locale: Locale;
  page?: Page;
}) {
  const t = getDict(locale).nav;
  const other: Locale = locale === "tr" ? "en" : "tr";
  const switchHref = localePath(other, page);

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href={localePath(locale, "home")}
          className="group inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          aria-label={t.home}
        >
          <Mark size={26} className="text-ink transition-transform group-hover:-translate-y-0.5" />
          <span className="text-[19px] font-extrabold uppercase leading-none tracking-[0.14em]">
            <span className="text-sage">V</span>OLICIOUS
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs uppercase tracking-[0.18em] text-stone sm:inline">
            {t.tagline}
          </span>
          <Link
            href={switchHref}
            hrefLang={other}
            aria-label={t.switchLabel}
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface/80 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-stone backdrop-blur transition hover:border-sage/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t.switchTo}
          </Link>
        </div>
      </div>
    </header>
  );
}
