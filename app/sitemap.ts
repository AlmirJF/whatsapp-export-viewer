import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://whatsapp-viewer.runcode.qzz.io/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://whatsapp-viewer.runcode.qzz.io/privacidade",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://whatsapp-viewer.runcode.qzz.io/termos",
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://whatsapp-viewer.runcode.qzz.io/contato",
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
