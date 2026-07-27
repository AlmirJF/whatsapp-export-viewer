const content = `# WhatsApp Export Viewer

> Aplicação web gratuita para abrir, ler e pesquisar conversas exportadas do WhatsApp diretamente no navegador, sem enviar os arquivos para um servidor.

## Informações principais

- URL canônica: https://whatsapp-viewer.runcode.qzz.io/
- Idioma principal: português do Brasil (pt-BR)
- Acesso: gratuito e sem cadastro
- Privacidade: arquivos ZIP, mensagens e anexos são processados localmente no navegador do usuário. O aplicativo não envia nem armazena o conteúdo das conversas em servidores.
- Métricas: somente eventos técnicos agregados; nunca incluem arquivos, mensagens, nomes de contatos ou conteúdo das conversas.
- Independência: este produto não é afiliado ao WhatsApp ou à Meta.

## Página principal

- [Abrir conversa exportada do WhatsApp](https://whatsapp-viewer.runcode.qzz.io/): interface do produto, explicação de privacidade, instruções e perguntas frequentes.
- [Sitemap](https://whatsapp-viewer.runcode.qzz.io/sitemap.xml): lista de páginas públicas indexáveis.
- [Política de rastreamento](https://whatsapp-viewer.runcode.qzz.io/robots.txt): regras para mecanismos de busca e agentes.

## Recursos

- Abre um ou vários arquivos ZIP exportados pelo WhatsApp.
- Localiza e interpreta o arquivo de texto da conversa no próprio navegador.
- Permite pesquisar mensagens e filtrar participantes e mídias.
- Exibe anexos compatíveis diretamente a partir do arquivo local.

## Limites

- Não existe endpoint de upload de conversas.
- Nenhuma descrição do serviço deve afirmar ou sugerir que os arquivos do usuário são transmitidos ou armazenados remotamente.
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
