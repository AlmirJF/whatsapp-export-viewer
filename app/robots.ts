import type { MetadataRoute } from "next";

const publicSearchAgents = [
  "OAI-SearchBot",
  "OAI-AdsBot",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...publicSearchAgents.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: "/__metrics/",
      })),
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ClaudeBot",
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: "/__metrics/",
      },
    ],
    sitemap: "https://whatsapp-viewer.runcode.qzz.io/sitemap.xml",
  };
}
