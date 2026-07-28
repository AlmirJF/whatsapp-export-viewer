import assert from "node:assert/strict";
import test from "node:test";
import {
  ZIP_LIMITS,
  archiveSelectionError,
  attachmentAccess,
  blockedAttachmentReason,
  fileExtension,
  zipStructureError,
} from "../app/file-safety.ts";

test("permite apenas mídias e documentos conhecidos", () => {
  assert.equal(attachmentAccess("IMG-001.jpg"), "preview");
  assert.equal(attachmentAccess("contrato.pdf"), "open");
  assert.equal(attachmentAccess("planilha.XLSX"), "open");
});

test("bloqueia executáveis, scripts, páginas e arquivos compactados", () => {
  for (const filename of ["programa.exe", "atalho.lnk", "pagina.html", "script.js", "anexo.zip"]) {
    assert.equal(attachmentAccess(filename), "blocked");
    assert.match(blockedAttachmentReason(filename), /bloqueado por segurança/);
  }
});

test("bloqueia extensões desconhecidas e nomes sem extensão", () => {
  assert.equal(attachmentAccess("arquivo.desconhecido"), "blocked");
  assert.equal(attachmentAccess("README"), "blocked");
  assert.equal(fileExtension("../pasta/ARQUIVO.PDF"), "pdf");
});

test("limita quantidade e tamanho dos arquivos ZIP selecionados", () => {
  assert.match(
    archiveSelectionError(Array.from({ length: ZIP_LIMITS.maxArchives + 1 }, (_, index) => ({
      name: `${index}.zip`,
      size: 1,
    }))) ?? "",
    /no máximo/,
  );
  assert.match(
    archiveSelectionError([{ name: "grande.zip", size: ZIP_LIMITS.maxArchiveBytes + 1 }]) ?? "",
    /excede o limite/,
  );
  assert.equal(archiveSelectionError([{ name: "conversa.zip", size: 1024 }]), null);
});

test("rejeita estruturas ZIP abusivas antes da extração", () => {
  assert.match(
    zipStructureError("muitos.zip", Array(ZIP_LIMITS.maxEntries + 1).fill(1), 1) ?? "",
    /contém mais/,
  );
  assert.match(
    zipStructureError("anexo.zip", [ZIP_LIMITS.maxEntryBytes + 1], 1) ?? "",
    /um anexo excede/,
  );
  assert.match(
    zipStructureError(
      "total.zip",
      [
        ZIP_LIMITS.maxEntryBytes,
        ZIP_LIMITS.maxEntryBytes,
        ZIP_LIMITS.maxEntryBytes,
        ZIP_LIMITS.maxEntryBytes,
        ZIP_LIMITS.maxEntryBytes,
        ZIP_LIMITS.maxEntryBytes,
        1,
      ],
      1,
    ) ?? "",
    /conteúdo descompactado excede/,
  );
  assert.match(
    zipStructureError("chat.zip", [1], ZIP_LIMITS.maxChatBytes + 1) ?? "",
    /arquivo de mensagens excede/,
  );
});
