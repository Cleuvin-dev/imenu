# Status de implementação — iMenu MVP

**Atualizado em:** 29/07/2026 (Fase 2 concluída)  
**Estado inicial:** documentação concluída; implementação ainda não iniciada.

## Como atualizar

- Marcar somente após evidência.
- Inserir data, arquivos principais e comandos executados.
- Se parcial, explicar o que falta.
- Não apagar histórico de bloqueios; resolver e registrar.

## Diagnóstico inicial do repositório (29/07/2026)

- Repositório **não é um repositório Git** (`git status` falha com "not a git repository"). Será necessário `git init` na Fase 0.
- Único conteúdo existente é o pacote de documentação em `iMenu_documentacao/` (README, CLAUDE.md, `docs/`, `references/`, `status/`, prompt mestre). Nenhum código de aplicação, `package.json`, migrações ou testes existem ainda.
- Ambiente local: Node `v24.16.0`, npm `12.0.1` disponíveis. **Docker e WSL não estão instalados** — `supabase start` (stack local via Docker) não pode rodar neste ambiente no momento.
- MCP do Supabase está conectado a uma conta com a organização "Battle Runners" (`iglwosqdyansinlvxjfh`) e um projeto existente chamado `battle-run`, sem relação com o iMenu. Nenhum projeto Supabase do iMenu existe ainda.
- Custo estimado de criação de um novo projeto Supabase nessa organização: **R$0/mês** (plano gratuito), segundo a ferramenta de custo do MCP — a confirmar com o responsável antes de provisionar, por se tratar de criação de recurso externo vinculado à conta do usuário.
- Nenhum segredo, `.env` ou chave foi encontrado no repositório.

## Bloqueio resolvido — ambiente Supabase de desenvolvimento

O responsável escolheu criar um projeto Supabase de desenvolvimento agora (custo confirmado em R$0/mês) em vez de instalar Docker. Projeto `imenu-dev` criado com sucesso (ver `status/DECISION_LOG.md`, D-010). `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` já estão em `.env.local` (não versionado).

### Bloqueio residual: `SUPABASE_SERVICE_ROLE_KEY`

Por segurança, a ferramenta de MCP do Supabase não expõe a service role key — apenas chaves publicáveis/anônimas. Esse valor só pode ser obtido pelo responsável do produto diretamente no painel do Supabase:

`https://supabase.com/dashboard/project/vvqhvnnsnhwoywbaxcwg/settings/api-keys`

Necessário antes da Fase 2 (operações administrativas/cron) e de testes de integração que exijam bypass de RLS controlado. Até lá, o desenvolvimento prossegue normalmente usando a chave anônima (RLS sempre ativa).

## Decisão registrada sobre estrutura do repositório

O README pressupõe que `docs/`, `references/` e `status/` fiquem na raiz do repositório. Hoje eles estão em `iMenu_documentacao/`. Decisão: mover esse conteúdo para a raiz do repositório e montar o projeto Next.js ao lado dele (ver `status/DECISION_LOG.md`, D-009).

## Bloqueio resolvido — versionamento Git (29/07/2026)

Verificação encontrou divergência: `status/DECISION_LOG.md` (D-009) registrava "Git inicializado" na Fase 0, mas `.git` existia sem nenhum commit (`git log` retornava "does not have any commits yet"); os 48 arquivos da Fase 0 estavam todos untracked. Causa provável: commit anterior rodado sem `git add` antes (arquivo `.git/COMMIT_EDITMSG` continha a mensagem pretendida "Inicio do projeto." mas nenhum commit foi criado).

Resolução:
- Commit inicial criado: `9d41953` — "Início do projeto: fundação do repositório (Fase 0)" (48 arquivos, nenhum segredo versionado).
- Remote `origin` já apontava para `https://github.com/Cleuvin-dev/imenu.git` (repositório vazio, acessível). Push feito com sucesso: `git push -u origin main` → branch `main` publicada e rastreando `origin/main`.
- Repositório remoto GitHub agora reflete o estado local da Fase 0.

### Observação para a Fase 1

As pastas `app/(auth)`, `app/(establishment)`, `app/(platform)`, `app/(public)`, `app/api/*`, `modules/*`, `components/*`, `lib/auth`, `lib/rate-limit`, `lib/validation`, `lib/logging` e `supabase/migrations`, `supabase/tests` existem apenas como esqueleto vazio (estrutura de `references/ROTAS_E_ESTRUTURA_DE_PASTAS.md`), sem código ainda. Isso é esperado — é o ponto de partida real da Fase 1, não uma pendência da Fase 0.

## Fase 1 concluída (29/07/2026) — Identidade, tenancy e RLS

### Migrações (`supabase/migrations/`)

- `20260729190000_identity_tenancy_tables.sql`: enums `member_role`, `platform_role`, `suspension_reason`; tabelas `profiles`, `platform_admins`, `establishments`, `establishment_members`, `member_invites`; trigger genérico de `updated_at`; trigger `enforce_last_owner_guard` que impede remover/rebaixar o único `owner` ativo de um estabelecimento (docs/02, regra 4).
- `20260729190001_profile_provisioning.sql`: trigger `on_auth_user_created` (cria `profiles` a partir de `auth.users`) e `on_auth_user_email_updated` (mantém `profiles.email` espelhado).
- `20260729190002_rls_helpers.sql`: helpers `is_active_member`, `has_tenant_role`, `is_platform_admin` — `security definer`, `search_path` fixo, `stable`, sem recursão de RLS.
- `20260729190003_rls_policies.sql`: RLS ativa e forçada (`FORCE ROW LEVEL SECURITY`) nas 5 tabelas; políticas separadas por papel (owner/manager/platform admin), sem depender de `establishment_id` enviado pelo cliente.
- `20260729190004_rls_hardening.sql`: correções apontadas pelo advisor de segurança/performance do Supabase — extensão `citext` movida para fora de `public`; funções de trigger com `EXECUTE` revogado de `anon`/`authenticated`; `(select auth.uid())` para evitar reavaliação por linha; policies de `platform_admins` separadas por operação; índices de cobertura para FKs (`invited_by`, `created_by`).

Todas as 5 migrações foram aplicadas com sucesso no projeto Supabase de desenvolvimento `imenu-dev` (`vvqhvnnsnhwoywbaxcwg`) via MCP (`apply_migration`). `get_advisors` (security) não aponta mais nenhum problema exceto os 3 avisos esperados/aceitos abaixo.

**Aviso aceito conscientemente:** `authenticated` mantém `EXECUTE` em `is_active_member`, `has_tenant_role` e `is_platform_admin` (o advisor de segurança sinaliza isso como "signed-in users can execute security definer function"). Isso é intencional e necessário: as próprias políticas RLS invocam essas funções como o papel `authenticated`, então revogar quebraria o isolamento inteiro. Chamar essas funções diretamente via RPC não vaza nada além do que o próprio usuário já veria com um `select` normal (retornam apenas um booleano sobre a própria associação).

### Aplicação (Next.js)

- `lib/auth/session.ts`, `lib/auth/tenant.ts`, `lib/auth/platform.ts`: helpers server-only que sempre revalidam no banco (via RLS, usando `getUser()` — nunca `getSession()`) e nunca confiam em `establishment_id` vindo da URL/cookie sem checar `establishment_members`.
- `modules/identity/`: schema Zod de login + `sign-in.ts`/`sign-out.ts` (Supabase Auth e-mail/senha).
- `modules/tenancy/`: schema de seleção de tenant, `list-user-establishments.ts`, `select-establishment.ts` (revalida associação antes de gravar o cookie `imenu_active_establishment`), `resolve-active-establishment.ts` (memoizado por requisição com `React.cache`), rótulos de papel.
- `modules/platform-admin/`: rótulos de papel da plataforma.
- `proxy.ts` (antigo `middleware.ts` — renomeado para a convenção do Next.js 16.2): renova cookies de sessão do Supabase Auth em toda navegação.
- `app/(auth)/entrar/`: login com e-mail/senha (Server Action + `useActionState`), estados de erro/carregamento, mensagens que não revelam se o e-mail existe.
- `app/(establishment)/painel/`: layout protegido; resolve usuário e tenant no servidor; seletor de estabelecimento quando há mais de um vínculo ativo (seleção automática quando há apenas um); estado vazio para usuário sem nenhum vínculo.
- `app/(platform)/admin-geral/`: layout protegido exclusivo para `platform_admins` ativos; usuário autenticado sem vínculo vê tela de acesso restrito, não erro genérico.
- `lib/supabase/database-types.ts`: tipos gerados a partir do schema real do `imenu-dev` (`generate_typescript_types`), usados via `createBrowserClient<Database>`/`createServerClient<Database>`/`createClient<Database>` — elimina `any` nas consultas.

### Testes de isolamento multi-tenant e RLS

- `supabase/tests/0001_identity_tenancy_rls.sql`: script autocontido (fixtures + asserções + `rollback` final, nunca persiste dados) cobrindo AC-TEN-001 (owner A não lê/altera tenant B), AC-ROLE-001 (kitchen não edita configuração nem membros), guarda do último owner ativo (regra 4), manager não promove a owner nem edita a linha do owner, AC-PLAT-001 (usuário sem `platform_admins` não lê dados de plataforma; super_admin lê qualquer tenant) e exclusão do papel `anon`.
- **Executado com sucesso via MCP (`execute_sql`) contra `imenu-dev` em 29/07/2026** — todas as asserções passaram, nenhuma linha persistida (transação sempre termina em `ROLLBACK`). Ainda não integrado a `npm test`/CI porque depende de uma conexão Postgres direta (Docker/Supabase local indisponível neste ambiente — mesmo bloqueio já registrado na Fase 0); documentado para rodar via `supabase db execute` assim que a stack local existir.
- `tests/unit/identity-tenancy-schemas.test.ts`: cobertura rápida e sem rede dos schemas Zod (login, seleção de tenant) e completude dos mapas de rótulo de papel — roda em `npm test`.

### Verificação de segurança (AC-SEC-001)

`npm run build` gerado e `.next/static` inspecionado: nem o nome `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET` nem o valor real de `CRON_SECRET` aparecem no bundle do cliente.

## Fase 2 concluída (29/07/2026) — Assinatura e gate de acesso

### Migrações (`supabase/migrations/`)

- `20260729190005_billing_tables.sql`: enums `subscription_status`, `invoice_status`, `payment_status`, `payment_method`, `audit_actor_scope`; tabelas `plans`, `subscriptions` (única por estabelecimento), `invoices`, `payments`, `subscription_events` (histórico imutável) e `audit_logs` (append-only).
- `20260729190006_billing_rls.sql`: RLS ativa/forçada nas 6 tabelas. Leitura restrita a owner/manager do tenant ou platform admin; `payments`/`subscription_events`/`audit_logs` são somente leitura para `authenticated` (escrita só via função); `invoices` bloqueia a transição para `paid` mesmo para platform admin via RLS direta — só `confirm_invoice_payment` pode quitar.
- `20260729190007_billing_functions.sql`: funções `security definer` — `evaluate_establishment_access` (RPC pública de leitura limitada, o gate em si), `process_overdue_subscriptions` (job idempotente com advisory lock), `confirm_invoice_payment` e `reverse_payment` (só platform admin, validam o chamador internamente, tudo transacional com `subscription_events` + `audit_logs`).
- `20260729190008_billing_functions_privilege_fix.sql`: correção de privilégio — funções novas recebem `GRANT EXECUTE TO PUBLIC` por padrão do Supabase, o que anula qualquer `revoke ... from anon/authenticated` feito na criação (`PUBLIC` cobre todos os papéis independentemente de revokes nomeados). Corrigido revogando de `PUBLIC` explicitamente e regrantando só aos papéis corretos — mesma lição já vista na Fase 1, mas dessa vez capturada e registrada em D-015 para não se repetir.
- `20260729190009_billing_indexes.sql`: índices de cobertura para FKs sinalizadas pelo advisor de performance.

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` revalidado: os únicos avisos remanescentes são os já aceitos na Fase 1 (helpers RLS executáveis por `authenticated`, ver D-013) mais o mesmo padrão intencional para `evaluate_establishment_access` (precisa ser chamável por `anon` — é o gate público) e um aviso de plataforma não relacionado ao código (`auth_leaked_password_protection` desativado no projeto — ver pendência abaixo).

### Aplicação (Next.js)

- `modules/billing/`: schemas Zod (confirmação de pagamento, estorno), serviços de aplicação que chamam as RPCs via cliente autenticado do próprio ator (nunca o cliente service role, exceto o job de cron), rótulos de domínio (status de assinatura/fatura, método de pagamento, motivo de bloqueio).
- `app/api/internal/cron/process-overdue-subscriptions/route.ts`: endpoint de cron, aceita `GET`/`POST`, exige segredo (`x-cron-secret` ou `Authorization: Bearer`) comparado com `crypto.timingSafeEqual`; chama `process_overdue_subscriptions` via `lib/supabase/admin.ts`.
- `app/(platform)/admin-geral/estabelecimentos/`: lista de estabelecimentos com plano/status de assinatura; detalhe com faturas e formulário de confirmação de pagamento (Server Action → `confirm_invoice_payment`).
- `app/(establishment)/painel/layout.tsx`: agora chama `evaluateEstablishmentAccess` para o tenant ativo antes de renderizar `children`. Bloqueado: owner vê um resumo mínimo de assinatura/faturas pendentes (`owner-billing-summary.tsx`); os demais papéis veem uma mensagem genérica orientando a falar com o proprietário — nunca menciona inadimplência a quem não é owner, e o cardápio público (Fase 4) vai reusar a mesma RPC.

### Testes AC-SUB-001 a AC-SUB-004

- `supabase/tests/0002_billing_subscription_gate.sql`: script autocontido (mesmo formato do 0001, sempre termina em `ROLLBACK`) cobrindo suspensão por atraso, preservação de dados fora do domínio de cobrança, reativação por pagamento confirmado e prazo adicional (`grace_until` vigente mantém o serviço; ao expirar, o job suspende). Inclui também um controle negativo: usuário autenticado sem `platform_admins` não consegue confirmar pagamento (função rejeita com `42501`).
- **Executado com sucesso via MCP contra `imenu-dev` em 29/07/2026** — todas as asserções passaram, nada persistido.

### Dados de demonstração criados em `imenu-dev` (fora do versionamento)

A pedido do responsável, para permitir clicar no fluxo real: usuário `admin@imenu.local` (owner do estabelecimento fictício "Restaurante Demo iMenu"). Sem assinatura própria ainda — os dados de assinatura usados nos testes acima foram inseridos e revertidos dentro da transação do script SQL, não persistem no banco.

## Fases

| Fase | Estado | Evidência/observação |
|---|---|---|
| 0 — Diagnóstico e fundação | Concluída (29/07/2026) | Repositório reestruturado (docs movidos para a raiz), Git inicializado **e primeiro commit publicado** (`9d41953`, `https://github.com/Cleuvin-dev/imenu.git`, branch `main`), Next.js 16 + TypeScript estrito + Tailwind v4 scaffolded, estrutura modular criada (`app/`, `components/`, `modules/`, `lib/`, `supabase/`, `tests/`, `public/`), design tokens do iMenu em `app/globals.css`, `.env.example`/`lib/env` com validação Zod, CI básica em `.github/workflows/ci.yml`, projeto Supabase de dev `imenu-dev` criado. `npm run lint`, `npm run typecheck`, `npm test` (6/6) e `npm run build` passam; `npm run start` respondeu HTTP 200 na home. Nenhum segredo versionado (`.env.local` ignorado por `.gitignore`). |
| 1 — Identidade, tenancy e RLS | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; RLS ativa/forçada e testada (script SQL com rollback, sem persistir dados); login e seleção de tenant funcionando; layouts protegidos de `/painel` e `/admin-geral`; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 1 concluída" acima para detalhes. |
| 2 — Assinatura e gate | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; AC-SUB-001 a AC-SUB-004 testados via script SQL (rollback completo); job de cron autenticado por segredo; gate aplicado no painel do estabelecimento; superadmin mínimo de estabelecimentos/faturas; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 2 concluída" acima. |
| 3 — Catálogo e mídias | Não iniciada | Próxima fase. |
| 4 — Mesas, QR e público | Não iniciada | — |
| 5 — Pedido transacional | Não iniciada | — |
| 6 — Operação em tempo real | Não iniciada | — |
| 7 — Conta e sessão da mesa | Não iniciada | — |
| 8 — Administração completa | Não iniciada | — |
| 9 — Robustez e deploy | Não iniciada | — |

Estados permitidos: `Não iniciada`, `Em andamento`, `Bloqueada`, `Concluída`.

## Verificações

| Verificação | Último resultado | Data |
|---|---|---|
| Lint | Passou (`npm run lint`) | 29/07/2026 |
| Typecheck | Passou (`npm run typecheck`) | 29/07/2026 |
| Unitários | Passou — 13/13 (`npm test`) | 29/07/2026 |
| Integração/RLS | Passou — `supabase/tests/0001_identity_tenancy_rls.sql` e `0002_billing_subscription_gate.sql` executados via MCP contra `imenu-dev` (todas as asserções OK, rollback completo). Ainda não rodam em `npm test`/CI: exigem conexão Postgres direta (Docker/Supabase local indisponível — mesmo bloqueio da Fase 0) | 29/07/2026 |
| E2E P0 | Não executado — depende das rotas das Fases 4–8 | — |
| Build | Passou (`npm run build`) | 29/07/2026 |
| Segurança (AC-SEC-001) | Passou — `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET` (nome e valor) ausentes de `.next/static` | 29/07/2026 |
| Acessibilidade | Não executado | — |
| Staging smoke test | Não executado | — |

## Bloqueios externos

| Bloqueio | Responsável | Impacto | Estado |
|---|---|---|---|
| Definir domínio final | Dono do produto | Deploy produção/QR final | Pendente |
| Projeto Supabase de desenvolvimento | — | Banco/Auth/Storage/Realtime local | **Resolvido** — projeto `imenu-dev` criado (D-010) |
| Obter `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` | Dono do produto | Job de cron real (hoje só testado via RPC direta) e bootstrap real de estabelecimento/owner (RF-ADM-002, Fase 8) | Pendente — só acessível pelo painel Supabase |
| Projetos Supabase de staging/produção exclusivos | Dono do produto | Deploy staging/produção | Pendente |
| Definir valores comerciais dos planos | Dono do produto | Seed/configuração produção (hoje só existe plano de teste, criado e revertido dentro do script de teste) | Pendente |
| Definir e-mail transacional | Dono do produto | Envio automático de convite | Opcional no MVP |
| Habilitar "Leaked Password Protection" no Supabase Auth | Dono do produto | Segurança de contas antes de produção (checklist docs/10 §10) | Pendente — ajuste de configuração no painel do projeto, fora do escopo de migração |

## Última entrega

- Fase 2 concluída: assinatura e gate de acesso (ver seção "Fase 2 concluída" acima para a lista completa de migrações e arquivos).
- Arquivos principais: `supabase/migrations/20260729190005..190009_*.sql`, `supabase/tests/0002_billing_subscription_gate.sql`, `modules/billing/`, `app/api/internal/cron/process-overdue-subscriptions/route.ts`, `app/(platform)/admin-geral/estabelecimentos/`, `app/(establishment)/painel/{layout.tsx,owner-billing-summary.tsx}`.
- Verificado em 29/07/2026: `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Testes AC-SUB-001 a AC-SUB-004 executados via MCP contra `imenu-dev` com sucesso.
- Commit local da Fase 1 (`081c101`) e da Fase 2 registrados nesta sessão — ver "Onde retomar" para o estado exato de publicação no remoto.

## Onde retomar (próxima sessão)

- **Repositório:** branch `main` local à frente de `origin/main` (que ainda está no commit `9d41953`, só a Fase 0). Fases 1 e 2 commitadas localmente; **push ainda não foi feito** — avisar antes de publicar em repositório compartilhado.
- **Próxima etapa a iniciar: Fase 3 — Catálogo e mídias.** Escopo: `categories`, `products`, `product_media`, `option_groups`, `options`, `product_option_groups`, `business_hours`/`business_hour_exceptions`; CRUD do estabelecimento; rascunho/prévia/publicação/esgotado/arquivo; upload validado (MIME real, tamanho, extensão); cache/invalidação; seed de cardápio. Gate: rascunho não é público, mídia válida funciona, tenant cruzado falha.
- **Pendência bloqueante para operações reais de cron/bootstrap:** `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` **continua vazia** em `.env.local` — só o dono do produto consegue pegar em `https://supabase.com/dashboard/project/vvqhvnnsnhwoywbaxcwg/settings/api-keys`. O endpoint de cron (`app/api/internal/cron/process-overdue-subscriptions`) já está pronto e testado via RPC direta, só falta essa chave para ser exercitado de ponta a ponta pela rota real.
- **Pendências externas sem prazo definido:** domínio final, projetos Supabase de staging/produção, valores comerciais dos planos reais, e-mail transacional, leaked password protection (ver tabela "Bloqueios externos").
- **Observação técnica para quem continuar:** `middleware.ts` foi renomeado para `proxy.ts` (convenção do Next.js 16.2); a lição sobre `GRANT EXECUTE TO PUBLIC` anular revokes nomeados (D-015) vale para qualquer função nova criada nas próximas fases — sempre `revoke ... from public` explicitamente, nunca só `from anon`/`from authenticated`.

