import type { Metadata } from "next";
import LegalPage from "../LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade | WhatsApp Export Viewer",
  description: "Entenda como o WhatsApp Export Viewer processa conversas localmente e quais métricas técnicas são coletadas.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="TRANSPARÊNCIA"
      title="Política de Privacidade"
      intro="A regra principal é simples: o conteúdo da conversa que você abre permanece no seu navegador e não é enviado ao nosso servidor."
    >
      <aside className="legalNotice">
        <strong>Resumo essencial</strong>
        <p>O arquivo ZIP, as mensagens, os nomes, as mídias e os documentos são lidos apenas no seu dispositivo. Não fazemos upload nem mantemos uma cópia da conversa. Somente informações que você escrever voluntariamente no formulário de contato são enviadas ao servidor.</p>
      </aside>

      <section>
        <h2>1. Quem somos e o que esta política cobre</h2>
        <p>O WhatsApp Export Viewer é uma ferramenta gratuita e independente para abrir, pesquisar e navegar em conversas exportadas do WhatsApp. Esta política explica o tratamento de dados durante o acesso ao site e o uso do visualizador.</p>
        <p>O produto não é afiliado, patrocinado nem mantido pelo WhatsApp ou pela Meta.</p>
      </section>

      <section>
        <h2>2. Como sua conversa é processada</h2>
        <p>Quando você escolhe um ZIP, o navegador lê o arquivo e organiza mensagens e anexos na memória da própria aba. Essa operação acontece por código executado no seu dispositivo.</p>
        <ul>
          <li>O ZIP não é enviado ao servidor do site.</li>
          <li>Mensagens, participantes, nomes de arquivos e anexos não entram nas métricas.</li>
          <li>Não existe banco de dados de conversas nem cadastro de usuário.</li>
          <li>Ao remover uma conversa ou fechar a aba, os dados temporários deixam a memória da sessão. O arquivo original no seu computador não é alterado.</li>
        </ul>
      </section>

      <section>
        <h2>3. Métricas técnicas e dados de infraestrutura</h2>
        <p>Para acompanhar o funcionamento do serviço, mantemos um contador interno com totais diários de visitas e de aberturas iniciadas, concluídas ou com erro. Esses eventos são requisições vazias e não registram IP, navegador, nome do arquivo ou conteúdo da conversa no banco de métricas.</p>
        <p>Também usamos Cloudflare para entrega, proteção e medição de desempenho do site. Como parte normal de uma conexão web, a Cloudflare pode processar dados técnicos, como endereço IP, cabeçalhos do navegador, URL acessada e sinais de segurança, de acordo com sua própria política. Esses dados não incluem o conteúdo do ZIP, que nunca é transmitido pelo visualizador.</p>
        <p>Saiba mais na <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Política de Privacidade da Cloudflare</a>.</p>
      </section>

      <section>
        <h2>4. Cookies e armazenamento no navegador</h2>
        <p>Atualmente, não usamos cookies de publicidade e não exigimos login. O site usa um marcador temporário no <code>sessionStorage</code> para contar a visita apenas uma vez por sessão. As conversas abertas permanecem somente na memória da aba e não são gravadas pelo aplicativo em armazenamento persistente do navegador.</p>
      </section>

      <section>
        <h2>5. Formulário de contato</h2>
        <p>Quando você envia o formulário, recebemos e armazenamos nome, e-mail, categoria, título, mensagem, data, horário e um número de protocolo. O envio é opcional e depende do seu consentimento.</p>
        <p>Usamos esses dados exclusivamente para analisar a solicitação, responder ao contato, investigar problemas e proteger o serviço. Não inclua conteúdo de conversas, arquivos, nomes de participantes, telefones ou anexos.</p>
        <p>As solicitações ficam em banco privado, acessível somente por administração local protegida, e são excluídas automaticamente após 12 meses, salvo quando uma obrigação legal ou investigação de segurança justificar prazo diferente.</p>
      </section>

      <section>
        <h2>6. Publicidade</h2>
        <p>O site ainda não exibe anúncios; os espaços visíveis são apenas reservas de layout. Antes de ativar uma rede de publicidade, esta política será atualizada para identificar os fornecedores envolvidos, o uso de cookies ou identificadores e as opções de consentimento e desativação aplicáveis.</p>
      </section>

      <section>
        <h2>7. Compartilhamento e retenção</h2>
        <p>Não vendemos nem compartilhamos conversas, porque não as recebemos. Também não vendemos os dados enviados pelo formulário. Eles poderão ser apresentados somente a fornecedores de infraestrutura estritamente necessários ou quando houver obrigação legal.</p>
        <p>Os totais agregados do contador podem ser mantidos para comparação histórica do uso do serviço, sem vínculo com uma pessoa ou conversa. Dados técnicos tratados pela Cloudflare seguem os prazos e condições definidos por ela.</p>
      </section>

      <section>
        <h2>8. Seus direitos e escolhas</h2>
        <p>Você pode impedir a leitura de uma conversa simplesmente não selecionando o arquivo, remover a conversa pela interface ou fechar a aba. Como o servidor não recebe o conteúdo, não temos uma cópia para localizar, exportar ou apagar.</p>
        <p>Para consultar, corrigir ou solicitar a exclusão dos dados enviados pelo formulário, use a nossa <a href="/contato">página de contato</a> e informe o número do protocolo. Analisaremos pedidos relacionados aos seus direitos conforme a legislação aplicável.</p>
      </section>

      <section>
        <h2>9. Segurança e alterações</h2>
        <p>Adotamos HTTPS, cabeçalhos de segurança, isolamento dos serviços e dependências mantidas para reduzir riscos. Nenhum sistema é infalível; por isso, evite usar computadores compartilhados e mantenha seu navegador atualizado.</p>
        <p>Podemos atualizar esta política quando o funcionamento do site, os fornecedores ou a legislação mudarem. A data no início da página indica a versão vigente.</p>
      </section>
    </LegalPage>
  );
}
