import type { ReactNode } from "react";
import { ArrowLeft, MessageCircleMore } from "lucide-react";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

const institutionalLinks = [
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de Uso" },
  { href: "/contato", label: "Contato" },
];

export default function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <main className="landing legalPage">
      <header className="landingNav legalNav">
        <a className="brand" href="/" aria-label="WhatsApp Export Viewer — página inicial">
          <MessageCircleMore aria-hidden="true" className="brandIcon" />
          <span>WhatsApp Export Viewer</span>
        </a>
        <nav aria-label="Páginas institucionais">
          {institutionalLinks.map((link) => (
            <a href={link.href} key={link.href}>{link.label}</a>
          ))}
        </nav>
        <a className="legalHomeLink" href="/">
          <ArrowLeft aria-hidden="true" />
          Abrir conversa
        </a>
      </header>

      <article className="legalContent">
        <a className="legalBackLink" href="/">
          <ArrowLeft aria-hidden="true" />
          Voltar ao visualizador
        </a>
        <header className="legalHero">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>Última atualização: 28 de julho de 2026</small>
        </header>
        <div className="legalArticle">{children}</div>
      </article>

      <footer className="landingFooter legalFooter">
        <a className="brand" href="/">
          <MessageCircleMore aria-hidden="true" className="brandIcon" />
          WhatsApp Export Viewer
        </a>
        <div className="landingFooterMeta">
          <p>Privacidade não é um recurso extra. É a base do produto.</p>
          <nav className="footerLinks" aria-label="Links do rodapé">
            {institutionalLinks.map((link) => (
              <a href={link.href} key={link.href}>{link.label}</a>
            ))}
            <a href="/llms.txt">Informações para agentes de IA</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
