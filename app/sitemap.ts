import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://whatsapp-viewer.runcode.qzz.io/",
      lastModified: new Date("2026-07-27"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
