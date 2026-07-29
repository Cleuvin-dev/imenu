# iMenu — Documentação de execução do MVP

**Versão:** 1.0  
**Data-base:** 29/07/2026  
**Idioma do produto:** Português do Brasil (`pt-BR`)  
**Moeda inicial:** Real brasileiro (`BRL`)

## 1. Objetivo deste pacote

Este pacote é a fonte de verdade para o Claude Code construir o MVP do **iMenu**, uma plataforma SaaS multiestabelecimento de cardápio digital e pedidos por QR Code.

O resultado esperado é uma aplicação web responsiva e funcional com quatro experiências:

1. **Cardápio público do consumidor:** acesso sem cadastro por QR Code da mesa.
2. **Painel operacional:** pedidos em tempo real, cozinha, caixa, mesas e solicitações de conta.
3. **Painel administrativo do estabelecimento:** cardápio, mídias, categorias, produtos, adicionais, mesas, QR Codes, equipe e assinatura.
4. **Painel administrativo geral do iMenu:** estabelecimentos, planos, faturas, pagamentos, inadimplência, bloqueios e administradores da plataforma.

## 2. Definição resumida do MVP

O consumidor escaneia um QR Code exclusivo da mesa, consulta produtos com vídeo ou imagem, ingredientes, alergênicos, adicionais e preço, monta o carrinho e envia o pedido. O estabelecimento recebe o pedido em tempo real, com alerta visual e sonoro, e atualiza seu andamento. O consumidor acompanha o status e pode solicitar a conta.

O estabelecimento mantém o próprio cardápio e sua equipe. O administrador geral do iMenu controla os estabelecimentos e suas assinaturas. Uma assinatura vencida sem prazo adicional suspende o serviço sem apagar os dados.

## 3. Decisões obrigatórias da versão 1.0

- O produto é **Web App/PWA responsivo**; o consumidor não instala aplicativo.
- No MVP, PWA significa manifest, ícones e experiência mobile adequada; modo offline e fila offline de pedidos ficam fora desta versão.
- O consumidor **não cria conta**.
- Cada QR Code identifica um estabelecimento e uma mesa.
- O sistema é **multi-tenant**: todo dado operacional pertence a um estabelecimento.
- O frontend e backend web ficam em um único projeto Next.js modular.
- Supabase fornece PostgreSQL, autenticação, armazenamento e tempo real.
- O preço é armazenado em centavos; o servidor é a única autoridade de cálculo.
- No MVP, a conta é solicitada pelo sistema, mas o consumidor paga fora do AppWeb.
- No MVP, o pagamento da mensalidade do estabelecimento é confirmado pelo administrador geral; a modelagem fica pronta para integrar um provedor depois.
- Suspensão por inadimplência bloqueia novos pedidos e os painéis operacionais, preservando dados.
- O visual usa vermelho como cor principal, com identidade original do iMenu; não deve copiar logotipo, ícones, textos ou composição visual do iFood.

## 4. Ordem obrigatória de leitura

O Claude Code deve ler, nesta ordem:

1. `CLAUDE.md`
2. `docs/01_VISAO_ESCOPO_E_DECISOES.md`
3. `docs/02_PERSONAS_PAPEIS_E_PERMISSOES.md`
4. `docs/03_REQUISITOS_FUNCIONAIS_E_REGRAS.md`
5. `docs/04_TELAS_UX_E_DESIGN_SYSTEM.md`
6. `docs/05_FLUXOS_E_MAQUINAS_DE_ESTADO.md`
7. `docs/06_ARQUITETURA_TECNICA.md`
8. `docs/07_BANCO_DE_DADOS_RLS_E_STORAGE.md`
9. `docs/08_API_REALTIME_E_CONTRATOS.md`
10. `docs/09_ASSINATURAS_INADIMPLENCIA_E_SUPERADMIN.md`
11. `docs/10_SEGURANCA_LGPD_E_AUDITORIA.md`
12. `docs/11_TESTES_CRITERIOS_DE_ACEITE.md`
13. `docs/12_PLANO_DE_IMPLEMENTACAO.md`
14. `docs/13_DEPLOY_OPERACAO_E_AMBIENTES.md`
15. `docs/14_SEED_E_DEMONSTRACAO.md`
16. `docs/15_BACKLOG_POS_MVP.md`
17. `docs/16_DEFINITION_OF_DONE.md`
18. `references/ROTAS_E_ESTRUTURA_DE_PASTAS.md`
19. `references/MATRIZ_DE_RASTREABILIDADE.md`
20. `status/IMPLEMENTATION_STATUS.md`
21. `PROMPT_MESTRE_CLAUDE_CODE.md`

## 5. Stack de referência

- Next.js com App Router, TypeScript em modo estrito e renderização server-first.
- React e Tailwind CSS.
- Componentes acessíveis próprios ou shadcn/ui, mantendo identidade visual do iMenu.
- Supabase: PostgreSQL, Auth, Realtime e Storage.
- Zod para validação compartilhada.
- React Hook Form para formulários administrativos.
- TanStack Query apenas onde o estado remoto no cliente realmente exigir.
- Vitest para testes unitários e de integração.
- Playwright para testes ponta a ponta.
- Vercel para aplicação web e cron; Supabase gerenciado para dados.

Usar apenas versões estáveis e compatíveis disponíveis no momento da implementação. Não usar versões alpha, beta ou release candidate. Registrar versões exatas no lockfile.

## 6. Entregável que o Claude Code deve produzir

O repositório final deve conter:

- Aplicação executável localmente.
- Migrações SQL versionadas.
- Seed de demonstração.
- RLS ativa e testada.
- Fluxos públicos, operacionais, administrativos e do superadmin.
- Upload e exibição de mídia.
- Geração de QR Code por mesa.
- Pedidos e solicitações de conta em tempo real.
- Gestão de assinatura e suspensão.
- Testes automatizados dos fluxos críticos.
- `.env.example` sem segredos.
- README de instalação e deploy.
- Documentação atualizada conforme o que foi realmente implementado.

## 7. Como iniciar

1. Extraia este pacote na raiz do novo repositório.
2. Abra a pasta no Claude Code.
3. Envie o conteúdo de `PROMPT_MESTRE_CLAUDE_CODE.md`.
4. Responda apenas às perguntas que dependam de credenciais, domínio ou decisões comerciais.
5. Acompanhe o avanço em `status/IMPLEMENTATION_STATUS.md`.

## 8. Regra de precedência

Quando houver conflito:

1. Segurança, isolamento de tenant e integridade financeira prevalecem.
2. Os critérios de aceite prevalecem sobre exemplos visuais.
3. As decisões registradas em `status/DECISION_LOG.md` prevalecem quando aprovadas pelo responsável do projeto.
4. O Claude Code não deve remover requisito silenciosamente; deve registrar o bloqueio e propor a menor alternativa segura.

## 9. Instalação e execução local (estado atual da implementação)

Esta seção é atualizada conforme o código evolui; ver `status/IMPLEMENTATION_STATUS.md` para o estado por fase.

### Pré-requisitos

- Node.js 22+ e npm.
- Uma conta/projeto Supabase (local via Docker + Supabase CLI, ou um projeto de desenvolvimento na nuvem). Ver `status/DECISION_LOG.md` (D-010) sobre a decisão do ambiente de desenvolvimento atual.

### Passos

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do seu projeto Supabase
npm run dev                  # abre em http://localhost:3000
```

### Scripts disponíveis

| Comando | Função |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção (após `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes unitários/integração (Vitest) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:e2e` | Testes end-to-end (Playwright) |
| `npm run db:migrate` | Aplica migrações (`supabase db push`) |
| `npm run db:reset` | Reseta o banco local (`supabase db reset`) |
| `npm run seed` | Executa o seed de demonstração |

### Variáveis de ambiente

Ver `references/ENV_EXAMPLE.md` e `.env.example` para a lista completa e regras de uso. Nunca commitar `.env.local` nem qualquer arquivo com valores reais.

### Contas de demonstração

Ainda não existem — serão criadas junto com o seed na Fase 3+ (`docs/14_SEED_E_DEMONSTRACAO.md`). Nenhuma credencial real deve ser versionada; instruções de criação local serão documentadas aqui quando o script de seed existir.
