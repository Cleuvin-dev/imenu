# Status de implementação — iMenu MVP

**Atualizado em:** 29/07/2026 (Fase 1 concluída)  
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

## Fases

| Fase | Estado | Evidência/observação |
|---|---|---|
| 0 — Diagnóstico e fundação | Concluída (29/07/2026) | Repositório reestruturado (docs movidos para a raiz), Git inicializado **e primeiro commit publicado** (`9d41953`, `https://github.com/Cleuvin-dev/imenu.git`, branch `main`), Next.js 16 + TypeScript estrito + Tailwind v4 scaffolded, estrutura modular criada (`app/`, `components/`, `modules/`, `lib/`, `supabase/`, `tests/`, `public/`), design tokens do iMenu em `app/globals.css`, `.env.example`/`lib/env` com validação Zod, CI básica em `.github/workflows/ci.yml`, projeto Supabase de dev `imenu-dev` criado. `npm run lint`, `npm run typecheck`, `npm test` (6/6) e `npm run build` passam; `npm run start` respondeu HTTP 200 na home. Nenhum segredo versionado (`.env.local` ignorado por `.gitignore`). |
| 1 — Identidade, tenancy e RLS | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; RLS ativa/forçada e testada (script SQL com rollback, sem persistir dados); login e seleção de tenant funcionando; layouts protegidos de `/painel` e `/admin-geral`; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 1 concluída" acima para detalhes. |
| 2 — Assinatura e gate | Não iniciada | Próxima fase. |
| 3 — Catálogo e mídias | Não iniciada | — |
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
| Integração/RLS | Passou — `supabase/tests/0001_identity_tenancy_rls.sql` executado via MCP contra `imenu-dev` (todas as asserções OK, rollback completo). Ainda não roda em `npm test`/CI: exige conexão Postgres direta (Docker/Supabase local indisponível — mesmo bloqueio da Fase 0) | 29/07/2026 |
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
| Obter `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` | Dono do produto | Operações admin/cron da Fase 2+ | Pendente — só acessível pelo painel Supabase |
| Projetos Supabase de staging/produção exclusivos | Dono do produto | Deploy staging/produção | Pendente |
| Definir valores comerciais dos planos | Dono do produto | Seed/configuração produção | Pendente |
| Definir e-mail transacional | Dono do produto | Envio automático de convite | Opcional no MVP |

## Última entrega

- Fase 1 concluída: identidade, tenancy e RLS (ver seção "Fase 1 concluída" acima para a lista completa de migrações e arquivos).
- Arquivos principais: `supabase/migrations/20260729190000..190004_*.sql`, `supabase/tests/0001_identity_tenancy_rls.sql`, `lib/auth/{session,tenant,platform,index}.ts`, `lib/supabase/database-types.ts`, `modules/identity/`, `modules/tenancy/`, `modules/platform-admin/`, `proxy.ts`, `app/(auth)/entrar/`, `app/(establishment)/painel/`, `app/(platform)/admin-geral/`, `tests/unit/identity-tenancy-schemas.test.ts`.
- Verificado em 29/07/2026: `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Testes de RLS executados via MCP contra `imenu-dev` com sucesso (ver tabela "Verificações").
- Nenhum commit criado nesta sessão ainda — aguardando decisão do responsável sobre quando commitar/publicar a Fase 1 (ver "Onde retomar").

## Onde retomar (próxima sessão)

- **Repositório:** branch `main` publicada até o commit `9d41953` (Fase 0). O trabalho da Fase 1 está no working tree, **ainda não commitado** — revisar e decidir se comita/publica antes de prosseguir.
- **Próxima etapa a iniciar: Fase 2 — Assinatura e gate de acesso.** Escopo: migrações de `plans`, `subscriptions`, `invoices`, `payments`, `subscription_events`; serviço `evaluateEstablishmentAccess`; superadmin mínimo (estabelecimento/plano/assinatura/fatura); confirmação de pagamento; job idempotente de atraso; bloqueio público/operacional; auditoria financeira. Gate: AC-SUB-001 a AC-SUB-004.
- **Pendência bloqueante para a Fase 2:** `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` **continua vazia** em `.env.local` — só o dono do produto consegue pegar em `https://supabase.com/dashboard/project/vvqhvnnsnhwoywbaxcwg/settings/api-keys`. Necessária para o job de cron de inadimplência e para o bootstrap real do primeiro `owner`/estabelecimento (que hoje só existe como fixture de teste, sem UI/RPC ainda — RF-ADM-002 fica para a Fase 8, mas a rotina de bootstrap via `lib/supabase/admin.ts` já pode ser exercitada assim que a chave existir).
- **Pendências externas sem prazo definido:** domínio final, projetos Supabase de staging/produção, valores comerciais dos planos, e-mail transacional (ver tabela "Bloqueios externos").
- **Observação técnica para quem continuar:** `middleware.ts` foi renomeado para `proxy.ts` (convenção do Next.js 16.2 — o antigo nome gerava um aviso de depreciação no build); a função exportada também mudou de `middleware` para `proxy`.

