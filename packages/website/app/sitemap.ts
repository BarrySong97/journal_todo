import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/downloads`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/release-notes`, changeFrequency: "weekly", priority: 0.6 },
  ];
}
