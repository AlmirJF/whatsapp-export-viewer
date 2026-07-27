import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import LegalPage from "../LegalPage";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contato | WhatsApp Export Viewer",
  description: "Fale com o responsável pelo WhatsApp Export Viewer sobre suporte, privacidade, segurança ou parcerias.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="FALE CONOSCO"
      title="Contato"
      intro="Use o canal abaixo para suporte, privacidade, segurança, parcerias ou sugestões sobre o produto."
    >
      <aside className="legalNotice warning">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>Não envie sua conversa</strong>
          <p>Nunca compartilhe o ZIP, mensagens, nomes, telefones ou anexos. Para relatar um erro, descreva apenas o aparelho, o navegador e o que aconteceu.</p>
        </div>
      </aside>

      <section className="contactFormSection">
        <h2>Envie sua solicitação</h2>
        <p>Os dados abaixo serão armazenados no servidor privado do projeto somente para analisar e responder ao seu contato.</p>
        <ContactForm />
      </section>

      <section>
        <h2>Como podemos ajudar</h2>
        <ul>
          <li><strong>Suporte:</strong> dificuldades para abrir um formato de exportação.</li>
          <li><strong>Privacidade:</strong> dúvidas sobre processamento local ou métricas técnicas.</li>
          <li><strong>Segurança:</strong> relato responsável de uma possível vulnerabilidade.</li>
          <li><strong>Parcerias:</strong> propostas relacionadas ao produto e à publicidade.</li>
        </ul>
      </section>

      <section>
        <h2>O que informar em um erro</h2>
        <p>Inclua o sistema operacional, o nome e a versão do navegador, a mensagem de erro exibida e os passos que levaram ao problema. Não anexe o arquivo exportado nem copie trechos da conversa.</p>
      </section>
    </LegalPage>
  );
}
