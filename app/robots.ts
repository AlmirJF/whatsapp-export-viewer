import type { MetadataRoute } from "next";

const publicSearchAgents = [
  "OAI-SearchBot",
  "OAI-AdsBot",
  "PerplexityBot",
  "Perplexity-User",
];

const restrictedBots = [
  "GPTBot",
  "ClaudeBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...publicSearchAgents.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/__metrics/", "/__contact", "/_local-media/", "/local-media-sw.js"],
      })),
      ...restrictedBots.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/__metrics/", "/__contact", "/_local-media/", "/local-media-sw.js"],
      },
    ],
    sitemap: "https://whatsapp-viewer.runcode.qzz.io/sitemap-pages.xml",
  };
}
