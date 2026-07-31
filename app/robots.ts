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
        disallow: ["/__metrics/", "/__contact", "/_local-media/", "/local-media-sw.js"],
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
        disallow: ["/__metrics/", "/__contact", "/_local-media/", "/local-media-sw.js"],
      },
    ],
    sitemap: "https://whatsapp-viewer.runcode.qzz.io/sitemap-pages.xml",
  };
}
