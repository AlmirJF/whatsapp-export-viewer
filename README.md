# WhatsApp Export Viewer

A maneira mais fácil de abrir e ler conversas exportadas do WhatsApp no navegador,
sem instalar nada e sem enviar seus arquivos para nenhum servidor.

**Acesse agora:** [whatsapp-viewer.runcode.qzz.io](https://whatsapp-viewer.runcode.qzz.io)

## O problema que resolve

Exportar uma conversa do WhatsApp gera um arquivo `.zip` com um `_chat.txt` e
as mídias. Abrir esse arquivo e ler a conversa de forma legível não é simples:
o texto bruto é difícil de ler, as ferramentas online existentes pedem upload
para servidores externos e a maioria não suporta fotos, vídeos e áudios.

O WhatsApp Export Viewer resolve isso: você arrasta o ZIP, a conversa aparece
numa interface familiar — como o próprio WhatsApp — e nada sai do seu dispositivo.

## Como usar

1. Acesse [whatsapp-viewer.runcode.qzz.io](https://whatsapp-viewer.runcode.qzz.io)
2. Exporte uma conversa no WhatsApp (**Conversa → Mais → Exportar conversa**)
3. Arraste o arquivo `.zip` para a página
4. Leia, pesquise e navegue pelas mensagens

Sem cadastro. Sem instalação. Sem upload.

## Privacidade

Todo o processamento acontece no seu navegador. O arquivo ZIP nunca é enviado
para um servidor.

- Mensagens ficam no IndexedDB do navegador
- Fotos, vídeos e áudios ficam no Cache Storage, entregues por um Service Worker
- O servidor não possui nenhum endpoint que aceite arquivos de conversa
- A rota de mídia local retorna `404` no servidor — só o Service Worker a atende
- O aplicativo não cria URLs `blob:`, não oferece download de anexos e não abre documentos importados
- Somente dados do formulário de contato (preenchido voluntariamente) são armazenados, com retenção máxima de 12 meses
- Exportações `.zip`, `_chat.txt` e diretórios de teste são ignorados pelo Git
- O repositório não contém conversas, mídias ou dados pessoais

## Executar localmente

Requisitos: Node.js 22.13 ou mais recente.

```bash
npm ci
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
```

## Deploy próprio (Docker)

O repositório inclui uma imagem Docker endurecida, Caddy com HTTPS automático e
Portainer acessível somente por túnel SSH. Consulte [DEPLOYMENT.md](DEPLOYMENT.md)
para criar e operar a instalação na VPS.

## Contribuir

Contribuições são bem-vindas — correções de bugs, novas funcionalidades,
melhorias de documentação e reportes de problemas.

- Leia o [guia de contribuição](CONTRIBUTING.md) antes de enviar um PR
- Siga o [código de conduta](CODE_OF_CONDUCT.md) em todas as interações
- Vulnerabilidades de segurança devem ser reportadas via [SECURITY.md](SECURITY.md), não em issues públicas

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

---

WhatsApp é uma marca comercial da WhatsApp LLC. Este é um produto independente,
sem afiliação, patrocínio ou endosso da WhatsApp LLC.
