import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GET as getMissingLocalMedia } from "../app/_local-media/[...path]/route.ts";
import { LOCAL_MEDIA_PREFIX } from "../app/local-media-constants.ts";
import {
  GET as getServiceWorker,
  serviceWorkerSource,
} from "../app/local-media-sw.js/route.ts";
import robots from "../app/robots.ts";

interface WorkerHarness {
  request(url: string, init?: RequestInit): Promise<Response>;
}

function createWorkerHarness(cachedResponse?: Response): WorkerHarness {
  let fetchHandler: ((event: {
    request: Request;
    respondWith(response: Promise<Response>): void;
  }) => void) | undefined;
  const workerSelf = {
    location: { origin: "https://viewer.example" },
    skipWaiting() {},
    clients: { claim: async () => undefined },
    addEventListener(type: string, handler: typeof fetchHandler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const cacheApi = {
    open: async () => ({
      match: async () => cachedResponse?.clone(),
    }),
  };

  const startWorker = new Function(
    "self",
    "caches",
    "Request",
    "Response",
    "Headers",
    "URL",
    "Blob",
    serviceWorkerSource(),
  );
  startWorker(workerSelf, cacheApi, Request, Response, Headers, URL, Blob);
  assert.ok(fetchHandler, "o Service Worker deve registrar o evento fetch");

  return {
    request(url, init) {
      return new Promise((resolve, reject) => {
        let handled = false;
        fetchHandler?.({
          request: new Request(url, init),
          respondWith(response) {
            handled = true;
            response.then(resolve, reject);
          },
        });
        if (!handled) reject(new Error("a requisição local não foi interceptada"));
      });
    },
  };
}

test("publica o Service Worker com escopo e proteção contra indexação", async () => {
  const response = getServiceWorker();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/javascript/);
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.doesNotThrow(() => new Function(serviceWorkerSource()));
});

test("serve mídia local completa e com suporte a intervalos", async () => {
  const cached = new Response(new Blob(["0123456789"], { type: "video/mp4" }), {
    headers: {
      "Content-Type": "video/mp4",
      "X-Content-Type-Options": "nosniff",
    },
  });
  const worker = createWorkerHarness(cached);

  const complete = await worker.request(`https://viewer.example${LOCAL_MEDIA_PREFIX}chat/video.mp4`);
  assert.equal(complete.status, 200);
  assert.equal(await complete.text(), "0123456789");

  const partial = await worker.request(
    `https://viewer.example${LOCAL_MEDIA_PREFIX}chat/video.mp4`,
    { headers: { Range: "bytes=2-5" } },
  );
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("content-range"), "bytes 2-5/10");
  assert.equal(partial.headers.get("accept-ranges"), "bytes");
  assert.equal(await partial.text(), "2345");
});

test("uma rota local sem arquivo no navegador nunca é atendida pelo servidor", async () => {
  const serviceWorkerMissing = await createWorkerHarness().request(
    `https://viewer.example${LOCAL_MEDIA_PREFIX}chat/ausente.png`,
  );
  assert.equal(serviceWorkerMissing.status, 404);
  assert.match(serviceWorkerMissing.headers.get("x-robots-tag") ?? "", /noindex/);

  const serverMissing = getMissingLocalMedia();
  assert.equal(serverMissing.status, 404);
  assert.match(serverMissing.headers.get("cache-control") ?? "", /no-store/);
});

test("robots.txt reserva as rotas de armazenamento local", () => {
  const rules = robots().rules;
  const serializedRules = JSON.stringify(rules);
  assert.match(serializedRules, /_local-media\//);
  assert.match(serializedRules, /local-media-sw\.js/);
});

test("o visualizador não cria URLs blob nem links de download para anexos", async () => {
  const [viewerSource, caddySource] = await Promise.all([
    readFile(new URL("../app/ChatViewer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../deploy/Caddyfile", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(viewerSource, /URL\.createObjectURL|URL\.revokeObjectURL/);
  assert.doesNotMatch(viewerSource, /attachment\.url|download=\{attachment/);
  assert.doesNotMatch(caddySource, /\bblob:/);
  assert.match(caddySource, /respond "Arquivo local indisponível" 404/);
});
