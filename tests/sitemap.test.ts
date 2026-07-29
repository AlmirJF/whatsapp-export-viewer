import assert from "node:assert/strict";
import test from "node:test";
import { GET as getCanonicalSitemap } from "../app/sitemap.xml/route.ts";
import { GET as getFreshSitemap } from "../app/sitemap-pages.xml/route.ts";
import {
  SITEMAP_PATHS,
  SITE_ORIGIN,
  createSitemapXml,
} from "../app/sitemap-response.ts";

test("gera um sitemap XML com todas as páginas públicas uma única vez", () => {
  const xml = createSitemapXml();
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const expected = SITEMAP_PATHS.map(({ path }) => new URL(path, SITE_ORIGIN).toString());

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(locations, expected);
  assert.equal(new Set(locations).size, locations.length);
});

test("os dois endereços retornam XML explícito e cacheável", async () => {
  for (const getSitemap of [getCanonicalSitemap, getFreshSitemap]) {
    const response = getSitemap();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
    assert.equal(
      response.headers.get("cache-control"),
      "public, max-age=3600, s-maxage=3600",
    );
    assert.equal(await response.text(), createSitemapXml());
  }
});
