# Conversa Clara

Visualizador privado de conversas exportadas do WhatsApp.

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

## Privacidade

- Todo o processamento das conversas acontece no dispositivo do usuário.
- O projeto não possui endpoint para receber arquivos de conversa.
- Exportações `.zip`, `_chat.txt` e diretórios de teste são ignorados pelo Git.
- O repositório não contém conversas, mídias ou dados pessoais usados durante o desenvolvimento.

## Hospedagem

O código não está vinculado à hospedagem Sites do GPT. O build usa Vinext e
permanece compatível com um ambiente Cloudflare Workers, caso uma hospedagem
seja configurada futuramente.

Este é um produto independente e não afiliado ao WhatsApp.
