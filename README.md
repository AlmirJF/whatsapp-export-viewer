# WhatsApp Export Viewer

Abra e leia conversas exportadas do WhatsApp diretamente no navegador.
O projeto transforma o arquivo ZIP em uma interface simples, pesquisável e
familiar, sem exigir instalação ou cadastro.

> WhatsApp Export Chat Viewer para arquivos ZIP, com processamento 100% local.

O arquivo ZIP é aberto e processado localmente pelo navegador. As conversas e
mídias não são enviadas para um servidor externo.

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
- Exportações `.zip`, `_chat.txt` e diretórios de teste são ignorados pelo Git.
- O repositório não contém conversas, mídias ou dados pessoais usados durante o desenvolvimento.

## Hospedagem

O build usa Vinext e
permanece compatível com um ambiente Cloudflare Workers, caso uma hospedagem
seja configurada futuramente.

WhatsApp é uma marca comercial da WhatsApp LLC. Este é um produto independente,
sem afiliação, patrocínio ou endosso da WhatsApp LLC.
