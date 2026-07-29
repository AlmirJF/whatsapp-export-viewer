export const SITE_ORIGIN = "https://whatsapp-viewer.runcode.qzz.io";

export const SITEMAP_PATHS = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/privacidade", changeFrequency: "monthly", priority: 0.5 },
  { path: "/termos", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contato", changeFrequency: "monthly", priority: 0.4 },
] as const;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createSitemapXml() {
  const entries = SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => {
    const url = new URL(path, SITE_ORIGIN).toString();

    return [
      "  <url>",
      `    <loc>${escapeXml(url)}</loc>`,
      `    <changefreq>${changeFrequency}</changefreq>`,
      `    <priority>${priority.toFixed(1)}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function createSitemapResponse() {
  return new Response(createSitemapXml(), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
