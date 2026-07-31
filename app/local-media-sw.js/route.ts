import {
  LOCAL_MEDIA_CACHE_NAME,
  LOCAL_MEDIA_PREFIX,
} from "../local-media-constants.ts";

export const dynamic = "force-static";

export function serviceWorkerSource(): string {
  return `
const LOCAL_MEDIA_CACHE_NAME = ${JSON.stringify(LOCAL_MEDIA_CACHE_NAME)};
const LOCAL_MEDIA_PREFIX = ${JSON.stringify(LOCAL_MEDIA_PREFIX)};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(LOCAL_MEDIA_PREFIX)) return;
  event.respondWith(serveLocalMedia(event.request));
});

function notFoundResponse() {
  return new Response("Arquivo local indisponível", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function parseRange(rangeHeader, size) {
  const match = /^bytes=(\\d*)-(\\d*)$/.exec(rangeHeader || "");
  if (!match || (!match[1] && !match[2])) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(end)
    || start < 0
    || end < start
    || start >= size
  ) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function serveLocalMedia(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store" },
    });
  }

  const cache = await caches.open(LOCAL_MEDIA_CACHE_NAME);
  const cached = await cache.match(new Request(request.url, { credentials: "same-origin" }));
  if (!cached) return notFoundResponse();

  const content = await cached.blob();
  const headers = new Headers(cached.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(content.size));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader) {
    return new Response(request.method === "HEAD" ? null : content, {
      status: 200,
      headers,
    });
  }

  const range = parseRange(rangeHeader, content.size);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        "Cache-Control": "no-store",
        "Content-Range": "bytes */" + content.size,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const partialContent = content.slice(range.start, range.end + 1, content.type);
  headers.set("Content-Length", String(partialContent.size));
  headers.set("Content-Range", "bytes " + range.start + "-" + range.end + "/" + content.size);
  return new Response(request.method === "HEAD" ? null : partialContent, {
    status: 206,
    headers,
  });
}
`;
}

export function GET() {
  return new Response(serviceWorkerSource(), {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "text/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
