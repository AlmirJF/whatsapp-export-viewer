"use client";

import type { ChatMessage } from "./chat-parser";
import {
  LOCAL_CONVERSATIONS_STORE,
  LOCAL_DATA_DATABASE_NAME,
  LOCAL_MEDIA_CACHE_NAME,
  LOCAL_MEDIA_PREFIX,
  LOCAL_MEDIA_SERVICE_WORKER_PATH,
} from "./local-media-constants";

export interface StoredConversation {
  id: string;
  name: string;
  fileName: string;
  messages: ChatMessage[];
  participants: string[];
  firstDate: string;
  lastDate: string;
  selfSender: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;
let serviceWorkerPromise: Promise<void> | null = null;

function requireLocalStorageSupport() {
  if (
    typeof window === "undefined"
    || !("caches" in window)
    || !("indexedDB" in window)
    || !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "Este navegador não oferece o armazenamento local seguro necessário para visualizar anexos.",
    );
  }
}

function openDatabase(): Promise<IDBDatabase> {
  requireLocalStorageSupport();
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATA_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LOCAL_CONVERSATIONS_STORE)) {
        database.createObjectStore(LOCAL_CONVERSATIONS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento local."));
    request.onblocked = () => reject(new Error("O armazenamento local está bloqueado por outra aba."));
  });

  return databasePromise;
}

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CONVERSATIONS_STORE, mode);
    const request = operation(transaction.objectStore(LOCAL_CONVERSATIONS_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao acessar o armazenamento local."));
    transaction.onabort = () => reject(transaction.error ?? new Error("A operação local foi cancelada."));
  }));
}

function waitForServiceWorkerControl(): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      reject(new Error("O armazenamento local foi preparado. Recarregue a página para ativá-lo."));
    }, 6_000);
    const handleControllerChange = () => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
  });
}

export function ensureLocalMediaReady(): Promise<void> {
  requireLocalStorageSupport();
  if (serviceWorkerPromise) return serviceWorkerPromise;

  serviceWorkerPromise = (async () => {
    await navigator.serviceWorker.register(LOCAL_MEDIA_SERVICE_WORKER_PATH, {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    await waitForServiceWorkerControl();
  })().catch((error) => {
    serviceWorkerPromise = null;
    throw error;
  });

  return serviceWorkerPromise;
}

export async function initializeLocalStorage(): Promise<StoredConversation[]> {
  await ensureLocalMediaReady();
  if (navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => false);
  }
  return loadStoredConversations();
}

function safeExtension(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,8}$/.test(extension) ? `.${extension}` : "";
}

function localMediaPath(conversationId: string, filename: string): string {
  const mediaId = crypto.randomUUID();
  return `${LOCAL_MEDIA_PREFIX}${encodeURIComponent(conversationId)}/${mediaId}${safeExtension(filename)}`;
}

export async function cacheLocalMedia(
  conversationId: string,
  filename: string,
  content: Blob,
  mimeType: string,
): Promise<string> {
  await ensureLocalMediaReady();
  const path = localMediaPath(conversationId, filename);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Length": String(content.size),
    "Content-Type": mimeType,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  const cache = await caches.open(LOCAL_MEDIA_CACHE_NAME);
  await cache.put(
    new Request(path, { credentials: "same-origin" }),
    new Response(content, { status: 200, headers }),
  );
  return path;
}

export function saveStoredConversation(conversation: StoredConversation): Promise<IDBValidKey> {
  return runStoreRequest("readwrite", (store) => store.put(conversation));
}

export function loadStoredConversations(): Promise<StoredConversation[]> {
  return runStoreRequest("readonly", (store) => store.getAll());
}

async function deleteCachedMediaForConversation(conversationId: string): Promise<void> {
  const cache = await caches.open(LOCAL_MEDIA_CACHE_NAME);
  const prefix = `${LOCAL_MEDIA_PREFIX}${encodeURIComponent(conversationId)}/`;
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter((request) => new URL(request.url).pathname.startsWith(prefix))
      .map((request) => cache.delete(request)),
  );
}

export async function deleteStoredConversation(conversationId: string): Promise<void> {
  await Promise.all([
    runStoreRequest("readwrite", (store) => store.delete(conversationId)),
    deleteCachedMediaForConversation(conversationId),
  ]);
}

export async function clearAllStoredConversations(): Promise<void> {
  await Promise.all([
    runStoreRequest("readwrite", (store) => store.clear()),
    caches.delete(LOCAL_MEDIA_CACHE_NAME),
  ]);
}
