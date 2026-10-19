# Contribuindo com o WhatsApp Export Viewer

Obrigado pelo interesse em contribuir! Este documento explica como participar do projeto.

## Antes de começar

- Leia o [README](README.md) para entender o objetivo e a arquitetura do projeto.
- Verifique as [issues abertas](https://github.com/AlmirJF/whatsapp-export-viewer/issues) para ver se sua ideia ou correção já está em discussão.
- O projeto processa conversas exportadas do WhatsApp localmente no navegador. Toda contribuição deve manter essa premissa: **nenhum dado de conversa deve ser enviado para um servidor**.

## Como contribuir

### Reportar bugs

1. Abra uma [issue de bug](https://github.com/AlmirJF/whatsapp-export-viewer/issues/new?template=bug_report.md).
2. Descreva os passos para reproduzir o problema.
3. Inclua: sistema operacional, navegador e versão do Node.js.
4. Se possível, anexe um ZIP de teste **sem dados reais** (crie um `_chat.txt` fictício).

### Sugerir melhorias

1. Abra uma [issue de melhoria](https://github.com/AlmirJF/whatsapp-export-viewer/issues/new?template=feature_request.md).
2. Explique o problema que a melhoria resolve.
3. Descreva a solução proposta e alternativas consideradas.

### Enviar código

1. Faça um fork do repositório.
2. Crie uma branch a partir de `main`:

   ```bash
   git checkout -b feat/nome-da-funcionalidade
   ```

3. Faça suas alterações seguindo os padrões de código do projeto descritos abaixo.
4. Rode os testes:

   ```bash
   npm ci
   npm test
   npm run build
   ```

5. Faça commit seguindo [Conventional Commits](https://www.conventionalcommits.org/) em pt-BR:

   ```
   feat: adiciona suporte a mensagens de áudio
   fix: corrige ordenação de mensagens com fuso horário
   docs: atualiza instruções de deploy
   ```

6. Abra um Pull Request para a branch `main` usando o [template de PR](https://github.com/AlmirJF/whatsapp-export-viewer/compare).
7. Referencie a issue relacionada no corpo do PR (`Closes #123`).

### Padrões de código

- **TypeScript** para todo o código do app e do worker.
- **Identificadores em inglês** (variáveis, funções, tipos, constantes).
- **Comentários e documentação em português** para explicar regras de negócio, decisões e orquestração.
- **React Server Components** por padrão; use `"use client"` apenas quando necessário.
- Mantenha funções pequenas e com responsabilidade única.
- Não introduza dependências que enviem dados para serviços externos.
- O Service Worker é a única forma de entregar mídia local. Não crie rotas de upload ou download.

### Testes

Os testes ficam em `tests/` e rodam com o runner nativo do Node:

```bash
npm test
```

Toda nova funcionalidade ou correção de bug deve incluir um teste que cubra o comportamento.

### Privacidade

- Nunca commite conversas reais, mídias ou dados pessoais.
- O `.gitignore` já bloqueia arquivos `.zip`, `_chat.txt` e diretórios de exportação.
- O repositório não deve conter nenhum dado de conversa, apenas código e fixtures de teste fictícios.

## Segurança

Vulnerabilidades de segurança **não devem ser reportadas como issues públicas**. Consulte [SECURITY.md](SECURITY.md) para o canal adequado.

## Código de conduta

Participe de forma respeitosa. Veja o [Código de Conduta](CODE_OF_CONDUCT.md).

## Dúvidas

Abra uma issue com a label `question` ou inicie uma [Discussion](https://github.com/AlmirJF/whatsapp-export-viewer/discussions) (se habilitado).
