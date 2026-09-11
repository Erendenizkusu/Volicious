import type { MetadataRoute } from "next";
import { localePath } from "@/lib/i18n";

const BASE = "https://volicious.app";

/**
 * Sitemap — arama motorlarına tüm sayfaları bildirir. FETCH YOK (yalnızca kayıt defteri
 * numaralandırılır) → oluşturması bedava, Google çağrısı doğurmaz.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    localePath("tr", "home"),
    localePath("en", "home"),
    localePath("tr", "about"),
    localePath("en", "about"),
    localePath("tr", "privacy"),
    localePath("en", "privacy"),
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.6,
  }));
}
