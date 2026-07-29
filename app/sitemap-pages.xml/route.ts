import { createSitemapResponse } from "../sitemap-response.ts";

export function GET() {
  return createSitemapResponse();
}
