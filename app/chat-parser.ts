export type MediaKind = "image" | "video" | "audio" | "document";

export interface ChatAttachment {
  filename: string;
  kind: MediaKind;
  url: string;
}

export interface ChatMessage {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  sender: string;
  text: string;
  searchableText: string;
  system: boolean;
  attachments: ChatAttachment[];
}

export interface ParsedChat {
  messages: ChatMessage[];
  participants: string[];
  firstDate: string;
  lastDate: string;
}

interface RawMessage {
  date: string;
  time: string;
  ampm?: string;
  sender: string;
  text: string;
  system: boolean;
}

const BRACKETED = /^[\u200e\u200f]*\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?\]\s*(.*)$/i;
const DASHED = /^[\u200e\u200f]*(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?\s*[-–—]\s*(.*)$/i;
const SENDER_AND_TEXT = /^([^:]{1,120}):\s?([\s\S]*)$/;

const mediaExtensions: Record<string, MediaKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  heic: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  opus: "audio",
  ogg: "audio",
  mp3: "audio",
  m4a: "audio",
  aac: "audio",
  wav: "audio",
};

export function mediaKind(filename: string): MediaKind {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return mediaExtensions[extension] ?? "document";
}

export function conversationName(filename: string): string {
  return filename
    .replace(/\.zip$/i, "")
    .replace(/^(whatsapp\s+chat|conversa\s+do\s+whatsapp)\s*[-–—]\s*/i, "")
    .trim() || "Conversa sem nome";
}

function normalizeTime(rawTime: string, ampm?: string): string {
  const [hourText, minute = "00"] = rawTime.split(":");
  let hour = Number(hourText);
  if (ampm) {
    const upper = ampm.toUpperCase();
    if (upper === "PM" && hour < 12) hour += 12;
    if (upper === "AM" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function normalizeDate(rawDate: string): { key: string; label: string } {
  const [first, second, yearText] = rawDate.replace(/\./g, "/").split("/");
  let day = Number(first);
  let month = Number(second);
  let year = Number(yearText);
  if (year < 100) year += 2000;

  // Em exportações em inglês, o primeiro número pode ser o mês.
  if (day <= 12 && month > 12) [day, month] = [month, day];
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return { key: `${year}-${mm}-${dd}`, label: `${dd}/${mm}/${year}` };
}

function parseStart(line: string): RawMessage | null {
  const clean = line.replace(/^[\u200e\u200f]+/, "");
  const match = clean.match(BRACKETED) ?? clean.match(DASHED);
  if (!match) return null;

  const body = match[4].trim();
  const senderMatch = body.match(SENDER_AND_TEXT);
  if (!senderMatch) {
    return {
      date: match[1],
      time: match[2],
      ampm: match[3],
      sender: "Aviso do WhatsApp",
      text: body,
      system: true,
    };
  }

  return {
    date: match[1],
    time: match[2],
    ampm: match[3],
    sender: senderMatch[1].trim(),
    text: senderMatch[2],
    system: false,
  };
}

function cleanAttachmentText(text: string, filenames: string[]): string {
  let result = text;
  for (const filename of filenames) {
    result = result
      .replace(new RegExp(`<\\s*(?:anexado|attached)\\s*:\\s*${escapeRegex(filename)}\\s*>`, "gi"), "")
      .replace(new RegExp(`${escapeRegex(filename)}\\s*\\((?:arquivo anexado|file attached)\\)`, "gi"), "")
      .replace(new RegExp(`(?:^|\\n)${escapeRegex(filename)}(?=\\n|$)`, "gi"), "");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attachmentNames(text: string, mediaByName: Map<string, ChatAttachment>): string[] {
  const found = new Set<string>();
  const explicit = /<\s*(?:anexado|attached)\s*:\s*([^>]+)>/gi;
  let match: RegExpExecArray | null;
  while ((match = explicit.exec(text))) {
    const candidate = match[1].trim();
    if (mediaByName.has(candidate.toLowerCase())) found.add(candidate.toLowerCase());
  }

  for (const line of text.split("\n")) {
    const candidate = line
      .replace(/[\u200e\u200f]/g, "")
      .replace(/\s*\((?:arquivo anexado|file attached)\)\s*$/i, "")
      .trim();
    if (mediaByName.has(candidate.toLowerCase())) found.add(candidate.toLowerCase());
  }
  return [...found];
}

export function parseWhatsAppChat(
  source: string,
  mediaByName: Map<string, ChatAttachment>,
): ParsedChat {
  const rawMessages: RawMessage[] = [];
  let current: RawMessage | null = null;

  for (const rawLine of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const next = parseStart(rawLine);
    if (next) {
      if (current) rawMessages.push(current);
      current = next;
    } else if (current) {
      current.text += `${current.text ? "\n" : ""}${rawLine}`;
    }
  }
  if (current) rawMessages.push(current);

  const messages = rawMessages.map((message, index): ChatMessage => {
    const date = normalizeDate(message.date);
    const names = attachmentNames(message.text, mediaByName);
    const attachments = names
      .map((name) => mediaByName.get(name))
      .filter((item): item is ChatAttachment => Boolean(item));
    const text = cleanAttachmentText(message.text, attachments.map((item) => item.filename));
    return {
      id: `${date.key}-${message.time}-${index}`,
      dateKey: date.key,
      dateLabel: date.label,
      time: normalizeTime(message.time, message.ampm),
      sender: message.sender,
      text,
      searchableText: `${message.sender} ${text}`.toLocaleLowerCase("pt-BR"),
      system: message.system,
      attachments,
    };
  });

  const participants = [...new Set(messages.filter((message) => !message.system).map((message) => message.sender))];
  return {
    messages,
    participants,
    firstDate: messages.at(0)?.dateLabel ?? "—",
    lastDate: messages.at(-1)?.dateLabel ?? "—",
  };
}
