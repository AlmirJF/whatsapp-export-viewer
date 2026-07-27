"use client";

import JSZip from "jszip";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  Info,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  type ChatAttachment,
  type ChatMessage,
  conversationName,
  mediaKind,
  parseWhatsAppChat,
} from "./chat-parser";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface Conversation {
  id: string;
  name: string;
  fileName: string;
  messages: ChatMessage[];
  participants: string[];
  firstDate: string;
  lastDate: string;
  selfSender: string;
  objectUrls: string[];
}

type MobileView = "chats" | "messages" | "details";
type MediaFilter = "all" | "text" | "image" | "video" | "audio" | "document";
type MetricEvent = "visit" | "import-started" | "import-succeeded" | "import-failed";

const initialLimit = 240;
const visitSessionKey = "whatsapp_viewer_visit_counted_v1";

function recordMetric(event: MetricEvent) {
  void fetch(`/__metrics/${event}`, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Metrics are best-effort and must never interrupt local chat processing.
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function fileMime(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  const known: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    opus: "audio/ogg; codecs=opus",
    ogg: "audio/ogg",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    pdf: "application/pdf",
  };
  return (extension && known[extension]) || "application/octet-stream";
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: value > 9999 ? "compact" : "standard" }).format(value);
}

function countWords(messages: ChatMessage[]) {
  return messages.reduce((sum, message) => sum + message.text.trim().split(/\s+/).filter(Boolean).length, 0);
}

function kindLabel(filter: MediaFilter) {
  return {
    all: "Tudo",
    text: "Só texto",
    image: "Fotos",
    video: "Vídeos",
    audio: "Áudios",
    document: "Documentos",
  }[filter];
}

function PrivacySeal({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`privacySeal${compact ? " compact" : ""}`}>
      <LockKeyhole aria-hidden="true" className="uiIcon" />
      <span>
        <strong>Arquivos 100% locais</strong>
        {!compact && <small>Conversas nunca são enviadas para servidores externos</small>}
      </span>
    </div>
  );
}

function AdSlot({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`adSlot${compact ? " compact" : ""}`} aria-label="Publicidade">
      <span>Publicidade</span>
      {!compact && <p>Anúncios discretos mantêm o acesso gratuito.</p>}
    </aside>
  );
}

export default function ChatViewer() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [senderFilter, setSenderFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(initialLimit);
  const [mobileView, setMobileView] = useState<MobileView>("messages");
  const [darkMode, setDarkMode] = useState(false);
  const [showFaq, setShowFaq] = useState<number | null>(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    let shouldCount = true;
    try {
      shouldCount = sessionStorage.getItem(visitSessionKey) !== "1";
      if (shouldCount) sessionStorage.setItem(visitSessionKey, "1");
    } catch {
      // A blocked sessionStorage should not affect the viewer.
    }
    if (shouldCount) recordMetric("visit");
  }, []);

  useEffect(() => {
    return () => {
      conversationsRef.current.forEach((conversation) => {
        conversation.objectUrls.forEach((url) => URL.revokeObjectURL(url));
      });
    };
  }, []);

  const importFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith(".zip"));
    if (!files.length) {
      setError("Escolha um arquivo .zip exportado pelo WhatsApp.");
      return;
    }

    setError("");
    setImporting(true);
    recordMetric("import-started");
    const imported: Conversation[] = [];

    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        const baseProgress = (fileIndex / files.length) * 100;
        const step = 100 / files.length;
        setProgress(baseProgress + step * 0.08);
        setProgressText(`Abrindo ${file.name} no seu navegador…`);

        const zip = await JSZip.loadAsync(file, {
          checkCRC32: false,
          createFolders: false,
        });
        const entries = Object.values(zip.files).filter((entry) => !entry.dir);
        const chatEntry = entries.find((entry) => /(^|\/)_chat\.txt$/i.test(entry.name))
          ?? entries.find((entry) => /(^|\/).*(chat|conversa).*\.txt$/i.test(entry.name));

        if (!chatEntry) {
          throw new Error(`${file.name}: não encontrei o arquivo _chat.txt dentro do ZIP.`);
        }

        setProgress(baseProgress + step * 0.3);
        setProgressText("Lendo as mensagens localmente…");
        const chatText = await chatEntry.async("string");

        const mediaEntries = entries.filter((entry) => entry.name !== chatEntry.name);
        const mediaMap = new Map<string, ChatAttachment>();
        const objectUrls: string[] = [];

        setProgressText(`Preparando ${mediaEntries.length} arquivo(s) de mídia…`);
        for (let index = 0; index < mediaEntries.length; index += 1) {
          const entry = mediaEntries[index];
          const filename = entry.name.split("/").pop() || entry.name;
          const content = await entry.async("blob");
          const typedBlob = new Blob([content], { type: fileMime(filename) });
          const url = URL.createObjectURL(typedBlob);
          objectUrls.push(url);
          mediaMap.set(filename.toLocaleLowerCase("pt-BR"), {
            filename,
            kind: mediaKind(filename),
            url,
          });
          if (index % 20 === 0) {
            setProgress(baseProgress + step * (0.35 + (index / Math.max(mediaEntries.length, 1)) * 0.45));
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
        }

        setProgress(baseProgress + step * 0.86);
        setProgressText("Organizando a conversa na memória do navegador…");
        const parsed = parseWhatsAppChat(chatText, mediaMap);
        if (!parsed.messages.length) {
          objectUrls.forEach((url) => URL.revokeObjectURL(url));
          throw new Error(`${file.name}: o arquivo foi aberto, mas nenhuma mensagem reconhecível foi encontrada.`);
        }

        imported.push({
          id: `${Date.now()}-${fileIndex}-${Math.random().toString(36).slice(2)}`,
          name: conversationName(file.name),
          fileName: file.name,
          messages: parsed.messages,
          participants: parsed.participants,
          firstDate: parsed.firstDate,
          lastDate: parsed.lastDate,
          selfSender: parsed.participants.at(-1) ?? "",
          objectUrls,
        });
      }

      setProgress(100);
      setProgressText("Pronto — nada saiu do seu computador.");
      setConversations((current) => [...current, ...imported]);
      setActiveId(imported[0]?.id ?? null);
      setMobileView("messages");
      recordMetric("import-succeeded");
      setTimeout(() => setImporting(false), 450);
    } catch (caught) {
      imported.forEach((conversation) => conversation.objectUrls.forEach((url) => URL.revokeObjectURL(url)));
      setImporting(false);
      recordMetric("import-failed");
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir o arquivo.");
    }
  }, []);

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void importFiles(event.dataTransfer.files);
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setQuery("");
    setSenderFilter("all");
    setMediaFilter("all");
    setVisibleLimit(initialLimit);
    setMobileView("messages");
    requestAnimationFrame(() => messagesEnd.current?.scrollIntoView());
  }

  function updateSelfSender(sender: string) {
    if (!activeConversation) return;
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id ? { ...conversation, selfSender: sender } : conversation
    )));
  }

  function removeConversation(id: string) {
    const target = conversations.find((conversation) => conversation.id === id);
    target?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  }

  function clearSession() {
    if (!window.confirm("Remover todas as conversas desta aba? Os arquivos originais no seu computador não serão alterados.")) return;
    conversations.forEach((conversation) => conversation.objectUrls.forEach((url) => URL.revokeObjectURL(url)));
    setConversations([]);
    setActiveId(null);
  }

  const filteredMessages = useMemo(() => {
    if (!activeConversation) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return activeConversation.messages.filter((message) => {
      if (normalizedQuery && !message.searchableText.includes(normalizedQuery)) return false;
      if (senderFilter !== "all" && message.sender !== senderFilter) return false;
      if (mediaFilter === "text" && (message.attachments.length || !message.text)) return false;
      if (mediaFilter !== "all" && mediaFilter !== "text" && !message.attachments.some((item) => item.kind === mediaFilter)) return false;
      return true;
    });
  }, [activeConversation, mediaFilter, query, senderFilter]);

  const visibleMessages = filteredMessages.slice(-visibleLimit);
  const hiddenCount = Math.max(0, filteredMessages.length - visibleMessages.length);
  const filteredConversations = conversations.filter((conversation) => (
    conversation.name.toLocaleLowerCase("pt-BR").includes(sidebarQuery.toLocaleLowerCase("pt-BR"))
  ));

  if (!conversations.length) {
    return (
      <main className={`landing${darkMode ? " dark" : ""}`}>
        <header className="landingNav">
          <a className="brand" href="#inicio" aria-label="WhatsApp Export Viewer — início">
            <MessageCircleMore aria-hidden="true" className="brandIcon" />
            <span>WhatsApp Export Viewer</span>
          </a>
          <nav aria-label="Navegação principal">
            <a href="#privacidade">Privacidade</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <button className="themeButton" onClick={() => setDarkMode((value) => !value)} aria-label="Alternar tema">
            {darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            <span>{darkMode ? "Tema claro" : "Tema escuro"}</span>
          </button>
        </header>

        <section className="hero" id="inicio">
          <div className="heroCopy">
            <span className="eyebrow"><span className="statusDot" /> Gratuito e sem cadastro</span>
            <h1>Abra conversas exportadas<br /><em>do WhatsApp no navegador.</em></h1>
            <p className="heroLead">
              Transforme o ZIP exportado pelo WhatsApp em uma conversa fácil de ler, pesquisar e navegar — sem instalar nada.
            </p>
            <div className="privacyPromise">
              <ShieldCheck aria-hidden="true" className="privacyShieldIcon" />
              <p>
                <strong>Nenhum arquivo é enviado para nós.</strong>
                Tudo é aberto e processado somente na memória do seu navegador, no seu próprio computador.
                <span className="privacyMetricsNote">
                  Métricas técnicas medem visitas, desempenho e resultado da abertura. ZIP, nome de arquivo e conteúdo nunca fazem parte delas.
                </span>
              </p>
            </div>
            <div className="heroActions">
              <button className="primaryButton" onClick={() => fileInput.current?.click()}>
                <FolderOpen aria-hidden="true" />
                Abrir minha conversa
              </button>
              <a className="textLink" href="#como-funciona">Ver como funciona <ArrowRight aria-hidden="true" /></a>
            </div>
            <span className="independentNote">Produto independente, não afiliado ao WhatsApp.</span>
          </div>

          <div className="importCardWrap">
            <div className="importCard">
              <div className="importCardHead">
                <div>
                  <span className="stepLabel">COMECE AQUI</span>
                  <h2>Importe o arquivo .zip</h2>
                </div>
                <PrivacySeal compact />
              </div>
              <div
                className={`dropArea${dragging ? " dragging" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                role="region"
                aria-labelledby="zipDropTitle"
                aria-describedby="zipDropHint"
              >
                <span className="uploadGlyph" aria-hidden="true"><Upload /></span>
                <strong id="zipDropTitle">Arraste seus arquivos ZIP aqui</strong>
                <span>ou escolha diretamente no computador</span>
                <button className="chooseZipButton" onClick={() => fileInput.current?.click()} type="button">
                  <FileArchive aria-hidden="true" />
                  Selecionar ZIP
                </button>
                <small id="zipDropHint">Somente .zip · um ou vários arquivos · sem upload</small>
                <span className="srOnly" aria-live="polite">
                  {dragging ? "Você entrou na área de soltura. Solte os arquivos ZIP para abrir." : "Área de soltura pronta."}
                </span>
              </div>
              <input
                ref={fileInput}
                id="conversationZipInput"
                type="file"
                accept=".zip,application/zip"
                multiple
                hidden
                onChange={handleInput}
                aria-describedby="zipDropHint"
              />

              {importing && (
                <div className="progressPanel" role="status" aria-live="polite">
                  <div className="progressMeta"><span>{progressText}</span><strong>{Math.round(progress)}%</strong></div>
                  <div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progresso da leitura local">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <small>Processamento local — sem upload para a internet.</small>
                </div>
              )}
              {error && <p className="errorMessage" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}

              <div className="exportHint">
                <span className="phoneGlyph" aria-hidden="true"><Smartphone /></span>
                <p><strong>Como exportar no WhatsApp</strong>Conversa → Menu → Mais → Exportar conversa</p>
              </div>
            </div>
            <div className="floatingTrust"><span className="checkBadge"><Check aria-hidden="true" /></span><p><strong>Seus dados continuam seus</strong><small>Nunca chegam ao nosso servidor</small></p></div>
          </div>
        </section>

        <section className="trustBar" id="privacidade" aria-label="Compromissos de privacidade">
          <div><span className="trustNumber">01</span><p><strong>Processamento local</strong><small>O ZIP é lido pelo seu navegador</small></p></div>
          <div><span className="trustNumber">02</span><p><strong>Zero armazenamento</strong><small>Não criamos cópias em servidores</small></p></div>
          <div><span className="trustNumber">03</span><p><strong>Sessão temporária</strong><small>Fechou a aba, os dados desaparecem</small></p></div>
          <div><span className="trustNumber">04</span><p><strong>Métricas sem conversas</strong><small>Somente sinais técnicos e agregados</small></p></div>
        </section>

        <AdSlot />

        <section className="howSection" id="como-funciona">
          <div className="sectionIntro">
            <span className="eyebrow">SIMPLES POR ESCOLHA</span>
            <h2>Do arquivo à conversa<br />em três passos.</h2>
          </div>
          <div className="stepsGrid">
            <article><span>1</span><h3>Exporte</h3><p>No WhatsApp, escolha exportar a conversa e salve o arquivo ZIP no seu aparelho.</p></article>
            <article><span>2</span><h3>Abra localmente</h3><p>Selecione o ZIP aqui. O navegador lê as mensagens sem enviá-las para a internet.</p></article>
            <article><span>3</span><h3>Explore</h3><p>Pesquise textos, filtre participantes e consulte fotos, áudios e documentos.</p></article>
          </div>
        </section>

        <section className="faqSection" id="duvidas">
          <div className="sectionIntro"><span className="eyebrow">SEM LETRAS MIÚDAS</span><h2>Dúvidas comuns.</h2></div>
          <div className="faqList">
            {[
              ["Minhas conversas são enviadas para algum servidor?", "Não. A leitura e a organização acontecem no próprio navegador. O ZIP e as mensagens permanecem no seu computador."],
              ["O site guarda uma cópia depois?", "Não. Não há cadastro nem banco de dados de conversas. Ao fechar a aba ou limpar a sessão, o conteúdo sai da memória do navegador."],
              ["O que o site mede?", "Nosso contador guarda apenas totais diários de visitas e de aberturas iniciadas, concluídas ou com erro, sem IP ou navegador. A Cloudflare mede visualizações e desempenho sem coletar dados pessoais. Nenhuma dessas métricas recebe o ZIP, nome de arquivo, conteúdo ou metadados da conversa."],
              ["Por que o serviço é gratuito?", "Espaços pequenos e discretos de publicidade ajudam a manter o site gratuito sem interferir na leitura da conversa."],
            ].map(([question, answer], index) => (
              <button key={question} className="faqItem" onClick={() => setShowFaq(showFaq === index ? null : index)} aria-expanded={showFaq === index}>
                <span><strong>{question}</strong>{showFaq === index && <small>{answer}</small>}</span>
                <ChevronDown aria-hidden="true" className={showFaq === index ? "expanded" : ""} />
              </button>
            ))}
          </div>
        </section>

        <footer className="landingFooter">
          <span className="brand"><MessageCircleMore aria-hidden="true" className="brandIcon" />WhatsApp Export Viewer</span>
          <p>Privacidade não é um recurso extra. É a base do produto.</p>
        </footer>
      </main>
    );
  }

  return (
    <main className={`viewer${darkMode ? " dark" : ""}`}>
      <header className="appTopbar">
        <button className="brand brandButton" onClick={() => setMobileView("chats")}>
          <MessageCircleMore aria-hidden="true" className="brandIcon" />
          <span>WhatsApp Export Viewer</span>
        </button>
        <PrivacySeal compact />
        <AdSlot compact />
        <div className="topbarActions">
          <button className="quietButton" onClick={() => setDarkMode((value) => !value)}>
            {darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {darkMode ? "Claro" : "Escuro"}
          </button>
          <button className="quietButton dangerText" onClick={clearSession}><Trash2 aria-hidden="true" />Limpar sessão</button>
          <button className="primaryButton small" onClick={() => fileInput.current?.click()}><Plus aria-hidden="true" />Adicionar ZIP</button>
          <input ref={fileInput} type="file" accept=".zip,application/zip" multiple hidden onChange={handleInput} />
        </div>
      </header>

      <div className="localNotice" role="status">
        <ShieldCheck aria-hidden="true" />
        <strong>Privacidade ativa:</strong> estas conversas estão somente na memória deste navegador. Nada foi importado para um servidor externo.
      </div>

      {importing && (
        <div className="importOverlay" role="dialog" aria-modal="true" aria-labelledby="importModalTitle">
          <div className="importModal" aria-live="polite">
            <PrivacySeal />
            <h2 id="importModalTitle">Abrindo no seu computador</h2>
            <p>{progressText}</p>
            <div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progresso da leitura local">
              <span style={{ width: `${progress}%` }} />
            </div>
            <small>{Math.round(progress)}% · nenhum dado enviado</small>
          </div>
        </div>
      )}

      <div className="workspace">
        <aside className={`conversationPanel mobile-${mobileView}`}>
          <div className="panelHeading">
            <div><span className="stepLabel">SUAS CONVERSAS</span><h2>{conversations.length} aberta{conversations.length === 1 ? "" : "s"}</h2></div>
            <button className="squareButton" onClick={() => fileInput.current?.click()} aria-label="Adicionar conversa"><Plus aria-hidden="true" /></button>
          </div>
          <label className="searchField">
            <Search aria-hidden="true" />
            <input value={sidebarQuery} onChange={(event) => setSidebarQuery(event.target.value)} placeholder="Buscar conversa" />
          </label>
          <div className="conversationList">
            {filteredConversations.map((conversation) => {
              const lastMessage = conversation.messages.at(-1);
              return (
                <button key={conversation.id} className={`conversationItem${conversation.id === activeId ? " active" : ""}`} onClick={() => selectConversation(conversation.id)}>
                  <span className="avatar">{initials(conversation.name)}</span>
                  <span className="conversationText"><strong>{conversation.name}</strong><small>{lastMessage?.text || `${conversation.messages.length} mensagens`}</small></span>
                  <span className="conversationMeta"><time>{lastMessage?.time}</time><b>{formatCompact(conversation.messages.length)}</b></span>
                </button>
              );
            })}
          </div>
          <div className="panelPrivacy">
            <LockKeyhole aria-hidden="true" className="uiIcon" />
            <p><strong>Somente neste dispositivo</strong><small>Fechar a aba apaga esta sessão.</small></p>
          </div>
        </aside>

        <section className={`chatPanel mobile-${mobileView}`}>
          {activeConversation ? (
            <>
              <header className="chatHeader">
                <button className="mobileBack" onClick={() => setMobileView("chats")} aria-label="Voltar às conversas"><ArrowLeft aria-hidden="true" /></button>
                <span className="avatar large">{initials(activeConversation.name)}</span>
                <div className="chatIdentity"><h1>{activeConversation.name}</h1><p>{formatCompact(activeConversation.messages.length)} mensagens · {activeConversation.firstDate} a {activeConversation.lastDate}</p></div>
                <button className="detailsButton" onClick={() => setMobileView("details")}><Info aria-hidden="true" />Detalhes</button>
              </header>

              <div className="filterBar">
                <label className="searchField chatSearch"><Search aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleLimit(initialLimit); }} placeholder="Buscar nesta conversa" /></label>
                <label><span className="srOnly">Filtrar por pessoa</span><select value={senderFilter} onChange={(event) => { setSenderFilter(event.target.value); setVisibleLimit(initialLimit); }}><option value="all">Todas as pessoas</option>{activeConversation.participants.map((participant) => <option key={participant}>{participant}</option>)}</select></label>
                <label><span className="srOnly">Filtrar por tipo</span><select value={mediaFilter} onChange={(event) => { setMediaFilter(event.target.value as MediaFilter); setVisibleLimit(initialLimit); }}>{(["all", "text", "image", "video", "audio", "document"] as MediaFilter[]).map((filter) => <option value={filter} key={filter}>{kindLabel(filter)}</option>)}</select></label>
                <span className="resultCount">{formatCompact(filteredMessages.length)} resultado{filteredMessages.length === 1 ? "" : "s"}</span>
              </div>

              <div className="messagesViewport">
                <div className="encryptionNote"><LockKeyhole aria-hidden="true" /><span>Conteúdo aberto localmente. Nenhuma mensagem foi enviada para nossos servidores.</span></div>
                {hiddenCount > 0 && <button className="loadEarlier" onClick={() => setVisibleLimit((value) => value + 400)}>Mostrar {Math.min(400, hiddenCount)} mensagens anteriores</button>}
                {visibleMessages.length ? <MessageList messages={visibleMessages} selfSender={activeConversation.selfSender} query={query} /> : <div className="emptyResults"><Search aria-hidden="true" /><h3>Nada por aqui</h3><p>Tente remover um filtro ou buscar outra palavra.</p></div>}
                <div ref={messagesEnd} />
              </div>
            </>
          ) : <div className="emptyResults"><h3>Escolha uma conversa</h3></div>}
        </section>

        <aside className={`detailsPanel mobile-${mobileView}`}>
          {activeConversation && (
            <>
              <header className="detailsHeader"><button className="mobileBack" onClick={() => setMobileView("messages")} aria-label="Voltar às mensagens"><ArrowLeft aria-hidden="true" /></button><div><span className="stepLabel">VISÃO GERAL</span><h2>Sobre a conversa</h2></div></header>
              <div className="statsGrid">
                <article><MessageSquareText aria-hidden="true" /><strong>{formatCompact(activeConversation.messages.length)}</strong><small>mensagens</small></article>
                <article><BarChart3 aria-hidden="true" /><strong>{formatCompact(countWords(activeConversation.messages))}</strong><small>palavras</small></article>
                <article><Users aria-hidden="true" /><strong>{activeConversation.participants.length}</strong><small>participantes</small></article>
                <article><FileArchive aria-hidden="true" /><strong>{formatCompact(activeConversation.messages.reduce((sum, message) => sum + message.attachments.length, 0))}</strong><small>arquivos</small></article>
              </div>
              <div className="detailsBlock"><span className="detailLabel">PERÍODO</span><div className="dateRange"><p><small>Primeira mensagem</small><strong>{activeConversation.firstDate}</strong></p><ArrowRight aria-hidden="true" /><p><small>Última mensagem</small><strong>{activeConversation.lastDate}</strong></p></div></div>
              <div className="detailsBlock"><label className="detailLabel" htmlFor="selfSender">QUEM É VOCÊ NESTA CONVERSA?</label><select id="selfSender" value={activeConversation.selfSender} onChange={(event) => updateSelfSender(event.target.value)}>{activeConversation.participants.map((participant) => <option key={participant}>{participant}</option>)}</select><small className="helperText">Usamos isso apenas para alinhar suas mensagens à direita.</small></div>
              <div className="detailsBlock"><span className="detailLabel">PARTICIPANTES</span><div className="participantList">{activeConversation.participants.map((participant) => <div key={participant}><span className="avatar mini">{initials(participant)}</span><strong>{participant}</strong><small>{formatCompact(activeConversation.messages.filter((message) => message.sender === participant).length)}</small></div>)}</div></div>
              <AdSlot />
              <button className="removeButton" onClick={() => removeConversation(activeConversation.id)}><Trash2 aria-hidden="true" />Remover desta sessão</button>
              <p className="detailsPrivacy"><LockKeyhole aria-hidden="true" /><span><strong>Nada armazenado externamente</strong><small>Todos os dados permanecem neste navegador e neste computador.</small></span></p>
            </>
          )}
        </aside>
      </div>

      <nav className="mobileNav" aria-label="Navegação do visualizador">
        <button className={mobileView === "chats" ? "active" : ""} onClick={() => setMobileView("chats")}><Menu aria-hidden="true" />Conversas</button>
        <button className={mobileView === "messages" ? "active" : ""} onClick={() => setMobileView("messages")}><MessageSquareText aria-hidden="true" />Mensagens</button>
        <button className={mobileView === "details" ? "active" : ""} onClick={() => setMobileView("details")}><Info aria-hidden="true" />Detalhes</button>
      </nav>
    </main>
  );
}

function MessageList({ messages, selfSender, query }: { messages: ChatMessage[]; selfSender: string; query: string }) {
  let lastDate = "";
  return messages.map((message) => {
    const dateChanged = message.dateKey !== lastDate;
    lastDate = message.dateKey;
    if (message.system) {
      return <div className="messageGroup" key={message.id}>{dateChanged && <div className="dateDivider">{message.dateLabel}</div>}<div className="systemMessage">{message.text}</div></div>;
    }
    return (
      <div className="messageGroup" key={message.id}>
        {dateChanged && <div className="dateDivider">{message.dateLabel}</div>}
        <article className={`messageBubble${message.sender === selfSender ? " mine" : ""}`}>
          <span className="messageSender">{message.sender}</span>
          {message.attachments.map((attachment) => <AttachmentView attachment={attachment} key={attachment.filename} />)}
          {message.text && <p>{highlightText(message.text, query)}</p>}
          <time>{message.time}</time>
        </article>
      </div>
    );
  });
}

function highlightText(text: string, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const parts = text.split(new RegExp(`(${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, index) => part.toLocaleLowerCase("pt-BR") === cleanQuery.toLocaleLowerCase("pt-BR") ? <mark key={`${part}-${index}`}>{part}</mark> : part);
}

function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "image") return <a className="mediaCard" href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={`Imagem ${attachment.filename}`} loading="lazy" /></a>;
  if (attachment.kind === "video") return <video className="mediaCard" src={attachment.url} controls preload="metadata" playsInline />;
  if (attachment.kind === "audio") return <div className="audioCard"><span>Áudio</span><audio src={attachment.url} controls preload="metadata" /></div>;
  return <a className="documentCard" href={attachment.url} download={attachment.filename}><span><FileText aria-hidden="true" /></span><p><strong>{attachment.filename}</strong><small>{attachment.filename.split(".").pop()?.toUpperCase().slice(0, 4) || "DOC"} · clique para salvar</small></p><Download aria-hidden="true" /></a>;
}
