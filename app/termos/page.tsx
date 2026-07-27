import type { Metadata } from "next";
import LegalPage from "../LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso | WhatsApp Export Viewer",
  description: "Termos para o uso gratuito do visualizador local de conversas exportadas do WhatsApp.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="USO RESPONSÁVEL"
      title="Termos de Uso"
      intro="Estes termos definem as condições para usar gratuitamente o WhatsApp Export Viewer."
    >
      <section>
        <h2>1. Aceitação e finalidade</h2>
        <p>Ao usar o site, você concorda com estes Termos e com a Política de Privacidade. A ferramenta serve para visualizar, pesquisar e navegar em arquivos de conversa exportados do WhatsApp.</p>
      </section>

      <section>
        <h2>2. Processamento local</h2>
        <p>A leitura do ZIP e a exibição das mensagens acontecem no navegador do usuário. O aplicativo não envia a conversa ao nosso servidor nem mantém cópias. Consulte os detalhes na <a href="/privacidade">Política de Privacidade</a>.</p>
      </section>

      <section>
        <h2>3. Responsabilidade pelo conteúdo</h2>
        <p>Você deve abrir somente conversas às quais tenha acesso legítimo e respeitar a privacidade, os direitos autorais e os demais direitos das pessoas envolvidas. Você é responsável pelo arquivo selecionado e pelo uso que fizer das informações exibidas.</p>
      </section>

      <section>
        <h2>4. Usos proibidos</h2>
        <p>Não é permitido usar o serviço para atividades ilegais, violar direitos de terceiros, tentar acessar a infraestrutura sem autorização, contornar proteções, introduzir código malicioso ou sobrecarregar deliberadamente o site.</p>
      </section>

      <section>
        <h2>5. Compatibilidade e precisão</h2>
        <p>Os formatos de exportação podem variar conforme aparelho, idioma e versão do WhatsApp. Trabalhamos para reconhecer os formatos comuns, mas não garantimos que toda mensagem, data ou anexo será interpretado perfeitamente. O arquivo original continua sendo a referência.</p>
      </section>

      <section>
        <h2>6. Disponibilidade</h2>
        <p>O serviço é oferecido gratuitamente, no estado em que se encontra, e pode passar por manutenção, mudanças ou interrupções. Não garantimos disponibilidade contínua nem adequação a uma finalidade específica.</p>
      </section>

      <section>
        <h2>7. Marcas e independência</h2>
        <p>WhatsApp e Meta são marcas de seus respectivos titulares. O WhatsApp Export Viewer é um produto independente e não possui vínculo, endosso ou parceria com essas empresas.</p>
      </section>

      <section>
        <h2>8. Publicidade e mudanças</h2>
        <p>O serviço poderá ser mantido por anúncios discretos. Antes da ativação, as informações de privacidade e consentimento serão ajustadas conforme os fornecedores e as regras aplicáveis.</p>
        <p>Podemos atualizar estes Termos para refletir mudanças no produto ou em obrigações legais. O uso após uma atualização estará sujeito à versão publicada nesta página.</p>
      </section>

      <section>
        <h2>9. Contato</h2>
        <p>Dúvidas, relatos de segurança ou solicitações relacionadas a estes Termos podem ser enviados pelos canais da <a href="/contato">página de contato</a>.</p>
      </section>
    </LegalPage>
  );
}
