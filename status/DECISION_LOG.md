# Registro de decisões

## Como usar

Não sobrescrever decisões. Adicionar uma entrada contendo:

- data;
- contexto;
- decisão;
- alternativas;
- impacto;
- responsável/aprovação.

## D-001 — Web App/PWA

- **Data:** 29/07/2026
- **Decisão:** consumidor acessa por Web App/PWA sem instalação.
- **Impacto:** uma base web responsiva; app nativo fora do MVP.

## D-002 — Consumidor anônimo

- **Data:** 29/07/2026
- **Decisão:** sem cadastro de consumidor.
- **Impacto:** cookie/sessão anônima e token de rastreamento.

## D-003 — Conta sem pagamento no AppWeb

- **Data:** 29/07/2026
- **Decisão:** cliente solicita a conta; pagamento ocorre fora do iMenu.
- **Impacto:** reduz escopo fiscal e financeiro.

## D-004 — Cobrança SaaS manual no MVP

- **Data:** 29/07/2026
- **Decisão:** administrador confirma pagamento; job suspende faturas vencidas.
- **Impacto:** MVP não depende de gateway e fica preparado para integração.

## D-005 — Monólito modular

- **Data:** 29/07/2026
- **Decisão:** Next.js + Supabase em um projeto.
- **Impacto:** menor complexidade de deploy, com separação por módulos.

## D-006 — Multi-tenant com RLS

- **Data:** 29/07/2026
- **Decisão:** `establishment_id`, associação e RLS em todo domínio.
- **Impacto:** isolamento obrigatório e testes dedicados.

## D-007 — Status por pedido

- **Data:** 29/07/2026
- **Decisão:** uma máquina de estado para o pedido inteiro.
- **Impacto:** status por item/estação fica pós-MVP.

## D-008 — Identidade visual

- **Data:** 29/07/2026
- **Decisão:** vermelho predominante e experiência familiar, com marca original.
- **Impacto:** não copiar ativos ou composição do iFood.

## D-009 — Reorganização do pacote de documentação para a raiz do repositório

- **Data:** 29/07/2026
- **Contexto:** o README pressupõe que `docs/`, `references/`, `status/`, `README.md` e `CLAUDE.md` fiquem na raiz do repositório, mas o pacote foi entregue dentro de `iMenu_documentacao/`. O repositório também não é um repositório Git.
- **Decisão:** mover todo o conteúdo de `iMenu_documentacao/` para a raiz do repositório, inicializar Git na raiz e montar a aplicação Next.js (`app/`, `modules/`, `lib/`, `supabase/`, `tests/`, `public/`, etc.) ao lado da documentação, conforme `references/ROTAS_E_ESTRUTURA_DE_PASTAS.md`.
- **Alternativas consideradas:** manter a documentação em subpasta e referenciá-la por caminho relativo — rejeitada por contrariar a estrutura padrão esperada pelas ferramentas (`npm`, CI, scripts) e pela própria documentação.
- **Impacto:** nenhuma perda de conteúdo; apenas movimentação de arquivos. Baixo risco, decisão técnica dentro da autonomia concedida.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-010 — Projeto Supabase de desenvolvimento criado

- **Data:** 29/07/2026
- **Contexto:** ambiente local sem Docker/WSL impede `supabase start`; usuário optou por criar projeto de desenvolvimento na nuvem em vez de instalar Docker.
- **Decisão:** criado projeto Supabase `imenu-dev` (ref `vvqhvnnsnhwoywbaxcwg`) na organização "Battle Runners" (`iglwosqdyansinlvxjfh`), região `sa-east-1`, plano gratuito (R$0/mês confirmado com o usuário antes da criação).
- **Alternativas consideradas:** instalar Docker Desktop para stack local; usar outra organização — usuário escolheu explicitamente criar o projeto agora.
- **Impacto:** este projeto serve apenas como ambiente de desenvolvimento/teste (equivalente a "local/dev" em `docs/06_ARQUITETURA_TECNICA.md` e `docs/13_DEPLOY_OPERACAO_E_AMBIENTES.md`). Staging e produção exigirão projetos Supabase próprios e exclusivos antes do lançamento, com decisão de domínio ainda pendente do responsável do produto.
- **Aprovado por:** usuário, via resposta direta em 29/07/2026.

## D-011 — Autenticação por e-mail e senha (Supabase Auth)

- **Data:** 29/07/2026
- **Contexto:** a documentação (docs/06) define "Supabase Auth" e "recuperação de senha", mas não especifica o método de login (senha vs. link mágico) para funcionários/administradores. Não há decisão de MVP registrada sobre isso.
- **Decisão:** login por e-mail e senha via `supabase.auth.signInWithPassword`, sem OAuth social nem magic link no MVP. Mensagem de erro genérica ("E-mail ou senha inválidos") para não permitir enumeração de contas.
- **Alternativas consideradas:** magic link (evita gerenciar senha, mas exige provedor de e-mail transacional configurado, que é opcional/não configurado no MVP conforme `docs/13` e `.env.example`) — rejeitado por criar uma dependência externa obrigatória para uma função crítica (login) que hoje não tem provedor de e-mail habilitado (`ENABLE_EMAIL_DELIVERY=false`).
- **Impacto:** baixo risco, decisão de implementação que não altera escopo, custo ou regra comercial. Recuperação de senha (reset) fica para uma fase posterior quando necessário; hoje o Supabase Auth já suporta o fluxo padrão caso seja preciso ativá-lo.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-012 — Ausência de policy de INSERT em `establishment_members` para o papel `authenticated`

- **Data:** 29/07/2026
- **Contexto:** ao desenhar as políticas RLS da Fase 1 (docs/02, seção 6), o único fluxo documentado que cria uma linha em `establishment_members` é o aceite de convite (`member_invites`) pelo próprio servidor, ou o bootstrap do owner inicial de um estabelecimento pelo admin geral (RF-ADM-002) — ambos rotinas de servidor, não uma ação direta de um owner/manager autenticado via cliente.
- **Decisão:** não criar uma policy de `INSERT` para o papel `authenticated` nesta tabela nesta fase. A criação de membros acontece apenas via `lib/supabase/admin.ts` (service role, ignora RLS) ou, na Fase 8, por uma função `SECURITY DEFINER` dedicada de aceite de convite que valida token/e-mail/expiração antes de inserir.
- **Alternativas consideradas:** permitir que owner/manager insiram linhas de `establishment_members` diretamente (mais simples), rejeitada por ampliar a superfície de ataque sem necessidade real: nenhum fluxo do MVP precisa disso, e permitir inserção livre abriria a possibilidade de um owner injetar um `user_id` arbitrário sem passar pela verificação de e-mail do convite.
- **Impacto:** o bootstrap do primeiro owner e o aceite de convites (Fase 8) precisarão de rotinas de servidor explícitas; isso já era esperado pelo plano de implementação (`docs/12`, Fase 8 = "equipe/convites").
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-013 — Aviso de segurança aceito: `authenticated` executa os helpers de RLS via RPC

- **Data:** 29/07/2026
- **Contexto:** o advisor de segurança do Supabase (`get_advisors`) sinaliza que `is_active_member`, `has_tenant_role` e `is_platform_admin` são `SECURITY DEFINER` executáveis pelo papel `authenticated` via `/rest/v1/rpc/...`.
- **Decisão:** manter o `EXECUTE` concedido a `authenticated` nessas três funções. Revogar quebraria as próprias políticas RLS, que dependem dessas funções para verificar associação/papel sem recursão (rodam como o dono da função, que ignora RLS internamente).
- **Alternativas consideradas:** mover as funções para um schema não exposto via API — rejeitada porque as políticas RLS ainda precisariam invocá-las como o papel do usuário autenticado, exigindo `EXECUTE` de qualquer forma.
- **Impacto:** chamar essas funções diretamente via RPC devolve apenas um booleano sobre a própria associação do usuário chamador — a mesma informação que ele já obtém com um `select` comum nas tabelas protegidas por RLS. Nenhum dado adicional é exposto.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-014 — Renomeação de `middleware.ts` para `proxy.ts`

- **Data:** 29/07/2026
- **Contexto:** `npm run build` no Next.js 16.2.12 emitiu aviso de depreciação: a convenção de arquivo `middleware.ts` foi renomeada para `proxy.ts` (a função exportada também muda de `middleware` para `proxy`).
- **Decisão:** renomear o arquivo e a função exportada para seguir a convenção atual do framework e eliminar o aviso, sem alterar o comportamento (renovação de cookies de sessão do Supabase Auth).
- **Impacto:** nenhum — mudança de nomenclatura apenas, mesma função no mesmo caminho de execução.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-015 — `GRANT EXECUTE TO PUBLIC` anula revoke nomeado em função nova

- **Data:** 29/07/2026
- **Contexto:** ao criar as funções de cobrança da Fase 2 (`confirm_invoice_payment`, `reverse_payment`, `process_overdue_subscriptions`), segui o padrão da Fase 1 de `revoke execute ... from anon` / `from anon, authenticated` logo após o `create or replace function`. O `get_advisors` continuou acusando `anon` e `authenticated` como executores após a migração. Uma consulta direta a `pg_proc.proacl` confirmou: toda função nova recebe `GRANT EXECUTE TO PUBLIC` (entrada `=X/postgres`) por padrão do Supabase; um `revoke ... from anon` só remove uma concessão nomeada a `anon` — que nem chegou a existir separadamente — e não afeta a concessão a `PUBLIC`, que cobre `anon`/`authenticated`/qualquer papel futuro independentemente de revokes nomeados.
- **Decisão:** corrigir com `revoke all on function ... from public;` explícito, seguido de `grant execute ... to <papéis corretos>;` (migração `20260729190008_billing_functions_privilege_fix.sql`). Isso funcionou porque, na Fase 1, os helpers de RLS (`is_active_member` etc.) já nasceram com `revoke ... from public` na própria migração de criação — por isso não tiveram esse problema; as funções de trigger (`handle_new_auth_user`) também usaram `from public` desde o início. As funções de cobrança foram o primeiro caso em que criei uma função nova e tentei revogar apenas de papéis nomeados, sem tocar em `PUBLIC`.
- **Alternativas consideradas:** nenhuma — é a forma correta de revogar privilégio default do Postgres; não há atalho seguro.
- **Impacto:** nenhum dado foi exposto de fato — o problema foi pego pelo `get_advisors` e por uma consulta a `has_function_privilege` antes de qualquer uso real, ainda na mesma sessão de desenvolvimento. Regra prática registrada para todas as fases seguintes: **toda função nova deve terminar com `revoke all ... from public` explícito**, nunca confiar em `revoke ... from anon`/`from authenticated` isolado.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-016 — Dado de demonstração criado sob autorização explícita do responsável

- **Data:** 29/07/2026
- **Contexto:** o responsável pediu para "ver o primeiro projeto integrável" e depois para simplificar as credenciais de teste. A ferramenta de execução SQL bloqueou automaticamente a primeira tentativa de inserir um usuário real (com senha) em `auth.users` no banco de desenvolvimento compartilhado, por ser uma mudança de estado persistente não pedida explicitamente.
- **Decisão:** parei e perguntei; o responsável autorizou explicitamente ("Pode criar a conta demo"). Criado o usuário `admin@imenu.local` (owner do estabelecimento fictício "Restaurante Demo iMenu") em `imenu-dev`, fora do versionamento do repositório.
- **Alternativas consideradas:** mostrar a aplicação só sem login (rejeitada pelo responsável, que preferiu poder clicar no fluxo completo).
- **Impacto:** existe uma conta sintética persistente em `imenu-dev` (não é seed formal de `docs/14`, não deve ser confundida com dado de produção). Antes de produção, o checklist de `docs/10 §10` já prevê "contas demo removidas ou desativadas" — este registro serve de lembrete de que esta conta específica existe.
- **Aprovado por:** usuário, via resposta direta em 29/07/2026.

## D-017 — Segunda variante do problema de D-015: grant nomeado direto a `anon`

- **Data:** 29/07/2026
- **Contexto:** ao criar `publish_product` e `set_product_availability` (Fase 3), apliquei a lição de D-015 (`revoke all ... from public` logo após a criação). Mesmo assim, `get_advisors` e uma consulta a `has_function_privilege` confirmaram que `anon` continuava com `EXECUTE`. Uma consulta a `pg_proc.proacl` mostrou desta vez `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — sem entrada `=X/postgres` (`PUBLIC`) nenhuma, mas com um grant **nomeado diretamente** para `anon`. Ou seja, o Supabase concede EXECUTE default de duas formas distintas (via `PUBLIC` ou via grants nomeados diretos a `anon`/`authenticated`/`service_role`), aparentemente sem um padrão totalmente previsível — `revoke ... from public` só resolve a primeira forma.
- **Decisão:** revogar sempre dos dois jeitos ao mesmo tempo: `revoke all on function X from public, anon;` (ou `from public, anon, authenticated` quando nenhum dos dois deve ter acesso), seguido do `grant execute` só para quem precisa. Migração `20260729190014_catalog_functions_privilege_fix.sql`.
- **Alternativas consideradas:** confiar apenas no `get_advisors` pós-migração — descartada porque o advisor já mostrou resultado obsoleto/cacheado nesta mesma sessão (Fase 1 e Fase 2); a única fonte confiável é consultar `has_function_privilege`/`pg_proc.proacl` diretamente logo após aplicar a migração.
- **Impacto:** nenhum dado exposto de fato (pego antes de qualquer uso real). Regra prática atualizada para as próximas fases: toda função nova termina com `revoke all ... from public, anon` (mais `authenticated` quando aplicável) e a verificação de privilégio é feita por consulta direta, não só pelo advisor.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-018 — `getServerEnv()` validava o schema inteiro mesmo quando só uma variável era necessária

- **Data:** 29/07/2026
- **Contexto:** ao testar o cardápio público da Fase 4 em navegador real, `hashGuestToken()` (que só precisa de `ANONYMOUS_SESSION_PEPPER`) chamou `getServerEnv()` e a página quebrou com `Error: Configuração de ambiente inválida: SUPABASE_SERVICE_ROLE_KEY: Too small...; UPSTASH_REDIS_REST_URL: Invalid URL`. Duas causas: (1) `SUPABASE_SERVICE_ROLE_KEY` está genuinamente vazia (bloqueio já documentado desde a Fase 0/1, só o dono do produto consegue obter no painel do Supabase) mas o schema exigia `min(1)` sem `.optional()`; (2) `UPSTASH_REDIS_REST_URL=` (declarada vazia em `.env.local`, provedor não usado no MVP) chegava como string vazia `""`, e `.optional()` do Zod só trata `undefined` como ausente — `""` ainda falha em `z.url()`. Como `getServerEnv()` valida o schema inteiro em toda chamada, qualquer código que precisasse de uma única variável não relacionada quebrava o app inteiro.
- **Decisão:** (1) adicionar um helper `emptyToUndefined`/`optionalString`/`optionalUrl` (`z.preprocess`) que converte string vazia em `undefined` antes da validação, aplicado a todas as variáveis genuinamente opcionais do MVP (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `EMAIL_FROM`, `EMAIL_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`); (2) tornar `SUPABASE_SERVICE_ROLE_KEY` opcional no schema, movendo a exigência para o único ponto de uso real (`lib/supabase/admin.ts`, `createSupabaseAdminClient()`), que lança um erro específico e explicativo só quando alguém realmente tentar criar o cliente admin sem a chave configurada.
- **Alternativas consideradas:** dividir `getServerEnv()` em múltiplos schemas menores por domínio (rejeitada por aumentar a complexidade sem necessidade agora — o problema real era a validação de opcionalidade, não o agrupamento); manter `SUPABASE_SERVICE_ROLE_KEY` obrigatória e preencher com um valor fictício em `.env.local` (rejeitada por poder mascarar o bloqueio real e por ir contra a regra de nunca simular segredo).
- **Impacto:** nenhum dado exposto; o bug só impedia a página de carregar em desenvolvimento. Regra prática: exigir uma variável de ambiente apenas no ponto de uso real, nunca no carregamento global do schema, quando a variável não é necessária para o funcionamento básico do app.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## Modelo de nova entrada

```md
## D-XXX — Título

- **Data:** DD/MM/AAAA
- **Contexto:** ...
- **Decisão:** ...
- **Alternativas consideradas:** ...
- **Impacto:** ...
- **Aprovado por:** ...
```

