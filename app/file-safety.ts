export const ZIP_LIMITS = {
  maxArchives: 10,
  maxArchiveBytes: 1024 * 1024 * 1024,
  maxEntries: 10_000,
  maxEntryBytes: 256 * 1024 * 1024,
  maxChatBytes: 64 * 1024 * 1024,
  maxTotalUncompressedBytes: 1536 * 1024 * 1024,
} as const;

const previewExtensions = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "heic",
  "mp4", "webm", "mov",
  "opus", "ogg", "mp3", "m4a", "aac", "wav",
]);

const safeDocumentExtensions = new Set([
  "pdf", "txt", "csv", "rtf",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "odt", "ods", "odp", "vcf",
]);

const dangerousExtensions = new Set([
  "apk", "app", "bat", "bin", "cmd", "com", "cpl", "dll", "dmg",
  "exe", "gadget", "hta", "htm", "html", "inf", "ins", "iso", "jar",
  "js", "jse", "lnk", "mjs", "msi", "msp", "mst", "pif", "pkg", "ps1",
  "reg", "scr", "sct", "sh", "svg", "sys", "url", "vb", "vbe", "vbs",
  "ws", "wsc", "wsf", "wsh",
  "7z", "bz2", "gz", "rar", "tar", "tgz", "xz", "zip",
]);

export type AttachmentAccess = "preview" | "open" | "blocked";

export function fileExtension(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? "";
  const separator = basename.lastIndexOf(".");
  return separator > 0 ? basename.slice(separator + 1).toLowerCase() : "";
}

export function attachmentAccess(filename: string): AttachmentAccess {
  const extension = fileExtension(filename);
  if (previewExtensions.has(extension)) return "preview";
  if (safeDocumentExtensions.has(extension)) return "open";
  return "blocked";
}

export function blockedAttachmentReason(filename: string): string {
  const extension = fileExtension(filename);
  if (!extension) return "Arquivo sem extensão bloqueado por segurança";
  if (dangerousExtensions.has(extension)) return "Tipo de arquivo bloqueado por segurança";
  return "Formato não reconhecido bloqueado por segurança";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

export function archiveSelectionError(files: ArrayLike<{ name: string; size: number }>): string | null {
  if (files.length > ZIP_LIMITS.maxArchives) {
    return `Abra no máximo ${ZIP_LIMITS.maxArchives} arquivos ZIP por vez.`;
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file.size > ZIP_LIMITS.maxArchiveBytes) {
      return `${file.name}: o ZIP excede o limite de ${formatFileSize(ZIP_LIMITS.maxArchiveBytes)}.`;
    }
  }

  return null;
}

export function zipStructureError(
  archiveName: string,
  entrySizes: Array<number | null>,
  chatSize: number | null,
): string | null {
  if (entrySizes.length > ZIP_LIMITS.maxEntries) {
    return `${archiveName}: o ZIP contém mais de ${ZIP_LIMITS.maxEntries.toLocaleString("pt-BR")} arquivos.`;
  }

  if (chatSize !== null && chatSize > ZIP_LIMITS.maxChatBytes) {
    return `${archiveName}: o arquivo de mensagens excede ${formatFileSize(ZIP_LIMITS.maxChatBytes)}.`;
  }

  let total = 0;
  for (const size of entrySizes) {
    if (size === null) continue;
    if (!Number.isSafeInteger(size) || size < 0) {
      return `${archiveName}: o ZIP contém informações de tamanho inválidas.`;
    }
    if (size > ZIP_LIMITS.maxEntryBytes) {
      return `${archiveName}: um anexo excede o limite de ${formatFileSize(ZIP_LIMITS.maxEntryBytes)}.`;
    }
    total += size;
    if (total > ZIP_LIMITS.maxTotalUncompressedBytes) {
      return `${archiveName}: o conteúdo descompactado excede ${formatFileSize(ZIP_LIMITS.maxTotalUncompressedBytes)}.`;
    }
  }

  return null;
}
