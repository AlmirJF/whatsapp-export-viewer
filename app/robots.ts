import type { MetadataRoute } from "next";

const publicSearchAgents = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "OAI-AdsBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...publicSearchAgents.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/__metrics/", "/__contact"],
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
        disallow: ["/__metrics/", "/__contact"],
      },
    ],
    sitemap: "https://whatsapp-viewer.runcode.qzz.io/sitemap-pages.xml",
  };
}
