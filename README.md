# WhatsApp Export Viewer

Abra e leia conversas exportadas do WhatsApp diretamente no navegador.
O projeto transforma o arquivo ZIP em uma interface simples, pesquisável e
familiar, sem exigir instalação ou cadastro.

> WhatsApp Export Chat Viewer para arquivos ZIP, com processamento 100% local.

O arquivo ZIP é aberto e processado localmente pelo navegador. As conversas e
mídias não são enviadas para um servidor externo. Mensagens são persistidas no
IndexedDB e anexos permitidos no Cache Storage do próprio navegador. Um Service
Worker entrega fotos, vídeos e áudios diretamente desse armazenamento local.

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

## Docker e VPS

O repositório inclui uma imagem Docker endurecida, Caddy com HTTPS automático e
Portainer acessível somente por túnel SSH. Consulte [DEPLOYMENT.md](DEPLOYMENT.md)
para criar e operar a instalação na VPS.

## Privacidade

- Todo o processamento das conversas acontece no dispositivo do usuário.
- O projeto não possui endpoint para receber arquivos de conversa.
- A rota reservada para mídia local responde `404` no servidor e somente pode
  ser atendida pelo Service Worker quando o arquivo existe no navegador.
- O aplicativo não cria URLs `blob:`, não oferece anexos para download e não
  abre documentos importados.
- Somente os dados digitados voluntariamente no formulário de contato são
  enviados e armazenados no serviço interno, com retenção máxima de 12 meses.
- Exportações `.zip`, `_chat.txt` e diretórios de teste são ignorados pelo Git.
- O repositório não contém conversas, mídias ou dados pessoais usados durante o desenvolvimento.

## Hospedagem

O build usa Vinext e permanece compatível com um ambiente Cloudflare Workers,
caso uma hospedagem seja configurada futuramente.

## Contribuir

Este é um projeto open-source! Contribuições são bem-vindas — correções de bugs,
novas funcionalidades, melhorias de documentação e reportes de problemas.

- Leia o [guia de contribuição](CONTRIBUTING.md) antes de enviar um PR.
- Siga o [código de conduta](CODE_OF_CONDUCT.md) em todas as interações.
- Vulnerabilidades de segurança devem ser reportadas via [SECURITY.md](SECURITY.md), não em issues públicas.

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

---

WhatsApp é uma marca comercial da WhatsApp LLC. Este é um produto independente,
sem afiliação, patrocínio ou endosso da WhatsApp LLC.
