# Status de implementação — iMenu MVP

**Atualizado em:** 06/08/2026 (Fase 8 concluída — administração completa)  
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

**Atualização (Fase 3):** para o gate de assinatura não bloquear o teste manual do catálogo, foi criado um plano (`demo-plan`) e uma assinatura `active` persistente para "Restaurante Demo iMenu" em `imenu-dev`. Também é dado de demonstração, não seed formal — ver checklist de produção em docs/10 §10 ("contas demo removidas ou desativadas").

## Fase 3 concluída (29/07/2026) — Catálogo e mídias

### Migrações (`supabase/migrations/`)

- `20260729190010_catalog_tables.sql`: enums `product_status`, `media_kind`; tabelas `categories`, `products`, `product_media`, `option_groups`, `options`, `product_option_groups`, `business_hours`, `business_hour_exceptions`; triggers de guarda de tenant (produto↔categoria, mídia↔produto, opção↔grupo, produto-grupo↔ambos) que impedem vincular registros de estabelecimentos diferentes mesmo por uma via que escape da RLS.
- `20260729190011_catalog_rls.sql`: RLS ativa/forçada nas 8 tabelas. Leitura ampla para qualquer membro ativo; escrita restrita a owner/manager/menu_editor (categorias/produtos/mídias/opções) ou owner/manager (horários). Sem policy para `anon` em nenhuma tabela — o cardápio público (Fase 4) lê por RPC dedicada, nunca por select direto. Políticas de SELECT/INSERT/UPDATE/DELETE separadas (em vez de `for all`) para não empilhar policies permissivas redundantes — zero avisos de "multiple permissive policies" desta vez.
- `20260729190012_catalog_functions.sql` + `20260729190014_catalog_functions_privilege_fix.sql`: `publish_product` (valida categoria ativa, nome, descrição curta e preço não negativo antes de publicar — RF-EST-014) e `set_product_availability` (alternância rápida de esgotado/disponível, liberada também a kitchen/cashier). A correção de privilégio foi necessária de novo: desta vez o Supabase concedeu `EXECUTE` a `anon` como **grant nomeado** (não via `PUBLIC`), então `revoke ... from public` sozinho não bastou — registrado como D-017 junto com a lição da Fase 2 (D-015).
- `20260729190013_catalog_storage.sql`: buckets `brand-media` e `menu-media` (públicos, com `file_size_limit`/`allowed_mime_types` como primeira camada de defesa) e políticas de `storage.objects` que derivam o `establishment_id` do primeiro segmento do caminho (`storage.foldername`).
- `20260729190015_catalog_indexes.sql`: índices de cobertura para as FKs sinalizadas pelo advisor.

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` revalidado após a correção de privilégio: nenhum aviso novo além dos já aceitos nas Fases 1–2.

### Aplicação (Next.js)

- `modules/catalog/`: schemas Zod (categoria, produto, grupo de opções, opção), `domain/slug.ts` (geração de slug estável, testado com nomes acentuados), `domain/labels.ts`, serviços de aplicação para categorias/produtos/opções — sempre recebendo `establishmentId` já validado pelo chamador (nunca do input do cliente).
- `modules/media/`: `domain/validate-upload.ts` valida o arquivo pelos **magic bytes reais** (JPEG/PNG/WebP/MP4/WebM), nunca pelo `Content-Type` declarado — rejeita executável disfarçado, MIME divergente do conteúdo e arquivos acima de 5 MB (imagem) / 50 MB (vídeo); `application/upload-product-media.ts` faz upload para o Storage e só then insere `product_media`, removendo o objeto órfão do Storage se o insert falhar.
- `app/(establishment)/painel/cardapio/categorias/`: lista com criação e edição inline (`<details>`, sem JavaScript extra), ativar/arquivar.
- `app/(establishment)/painel/cardapio/produtos/`: lista com criação rápida, publicar, marcar esgotado/disponível, arquivar.
- `app/(establishment)/painel/cardapio/produtos/[id]/`: editor completo — informações/preço/ingredientes/alergênicos, upload de mídia com prévia, grupos de opções (criar grupo, criar opção, anexar/remover do produto), publicar/arquivar/disponibilidade.

### Testes AC-CAT-001 e validações de publicação

- `supabase/tests/0003_catalog_gate.sql`: mesmo formato dos testes anteriores (rollback completo). Cobre: produto válido publica; produto sem descrição curta é rejeitado; produto de categoria inativa é rejeitado; arquivar muda o status sem apagar o registro; isolamento de tenant (owner de outro estabelecimento não lê nem escreve o catálogo); kitchen altera disponibilidade mas não publica nem edita categoria diretamente; `anon` não lê nenhuma tabela de catálogo.
- **Executado com sucesso via MCP contra `imenu-dev` em 29/07/2026.**
- `tests/unit/media-validation.test.ts`: 13 testes cobrindo detecção de magic bytes (JPEG/PNG/WebP/MP4/WebM), rejeição de executável disfarçado, divergência entre MIME declarado e real, e limites de tamanho — cobre AC-MEDIA-001 sem depender de rede/Storage real.

### Verificação manual em navegador

Fluxo completo testado via Playwright headless contra o servidor de dev real, autenticado como `admin@imenu.local`: criar categoria → criar produto (rascunho) → enviar imagem → publicar → lista de produtos reflete "Publicado". Sem erros de console. Capturas de tela geradas e descartadas após a verificação (não fazem parte do repositório).

## Fase 4 concluída (29/07/2026) — Mesas, QR e cardápio público

### Migrações (`supabase/migrations/`)

- `20260729190016_dining_tables.sql`: tabela `dining_tables` (`public_token` gerado via `gen_random_bytes(24)`, `token_version`, `is_active`, `sort_order`). RLS ativa/forçada: leitura para owner/manager/cashier/viewer, escrita só owner/manager.
- `20260729190017_guest_sessions.sql`: tabela `guest_sessions` (sessão anônima por navegador+mesa). RLS ativa/forçada **sem nenhuma policy para `anon`/`authenticated`** — a única policy é leitura para platform admin; todo o acesso real acontece via RPC `SECURITY DEFINER`.
- `20260729190018_public_menu_functions.sql`: primeira versão de `get_public_menu(slug, token)` e `ensure_guest_session(establishmentId, tableId, tokenHash, expiresAt)`.
- `20260729190019_public_menu_indexes.sql`: índice de cobertura em `guest_sessions.table_id`.
- `20260729190020_guest_sessions_composite_unique.sql`: **correção** — a constraint `unique` original era sobre `token_hash` isolado, o que quebraria se o mesmo cookie de navegador visitasse mesas de estabelecimentos diferentes. Trocada por `unique (establishment_id, table_id, token_hash)`.
- `20260729190021_get_public_menu_include_ids.sql`: `get_public_menu` passou a incluir `establishment.id` no JSON de retorno (necessário no servidor para poder chamar `ensure_guest_session` em seguida).
- `20260729190022_get_public_menu_hours.sql`: versão final de `get_public_menu`, com cálculo de horário de funcionamento (`business_hours`/`business_hour_exceptions`, convertendo `now()` para o fuso do estabelecimento) e `operation.acceptingOrders`. Termina com `revoke all ... from public, anon, authenticated` seguido de `grant execute` explícito — mesma lição de D-015/D-017, reaplicada aqui e verificada por consulta direta a `has_function_privilege`, não só pelo `get_advisors`.

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` revalidado: nenhum aviso novo além dos já aceitos nas Fases 1–3.

### Aplicação (Next.js)

- `modules/tables/`: schema Zod de mesa; `domain/qr.ts` (`buildTableUrl`, geração de QR em PNG/SVG via pacote `qrcode`); `application/tables.ts` (criar/editar/ativar/desativar mesa, regenerar token — nunca reaproveita o token antigo, sempre gera novo com `crypto.randomBytes` e incrementa `token_version`).
- `modules/service-session/`: `domain/guest-cookie.ts` (cookie de sessão anônima, gerado com Web Crypto API em `proxy.ts` por rodar em Edge runtime — não pode usar `node:crypto`); `domain/hash-token.ts` (hash HMAC-SHA256 do token com pimenta dedicada, roda em runtime Node); `domain/cart.ts` (carrinho 100% client-side em `localStorage`, sem chamada de rede); `application/get-public-menu.ts` (chama a RPC, valida a resposta com Zod fail-closed, registra a sessão anônima sem quebrar a página se o cookie ainda não existir).
- `modules/media/domain/public-url.ts`: monta a URL pública de um objeto do Storage.
- `proxy.ts`: agora também atribui o cookie de sessão anônima em qualquer rota `/m/*` que ainda não o tenha (Server Components não podem gravar cookies durante a renderização).
- `app/api/establishments/mesas/[tableId]/qr/route.ts`: download autenticado do QR (PNG por padrão, SVG via `?format=svg`), valida papel (owner/manager) e que a mesa pertence ao estabelecimento ativo.
- `app/(establishment)/painel/mesas/`: CRUD de mesas, links de download do QR, regenerar token com confirmação.
- `app/(public)/m/[establishmentSlug]/t/[tableToken]/`: cardápio público mobile-first (busca, chips de categoria fixos, cards de produto), estados de QR inválido e estabelecimento fechado/bloqueado; `produto/[productSlug]/`: detalhe com mídia, grupos de opções (rádio/checkbox com validação de min/max), quantidade, observação, adicionar ao carrinho; `carrinho/`: revisão do carrinho local, quantidades editáveis, remoção, subtotal — botão "Enviar pedido" **permanece desabilitado de propósito**, com texto explicando que o envio real chega na Fase 5 (não simulado).

### Testes AC-PUB-001, AC-PUB-002 e AC-QR-001

- `supabase/tests/0004_public_menu_gate.sql`: mesmo formato dos testes anteriores (rollback completo). Cobre: QR válido mostra exatamente os produtos publicados (disponível + esgotado), excluindo rascunho/arquivado; token inexistente, slug inexistente, mesa desativada e token de outro estabelecimento retornam só `{valid:false}` sem vazar nenhuma chave adicional; estabelecimento sem assinatura ativa retorna `valid:true` mas `access.allowed:false` (interação com o gate da Fase 2); `ensure_guest_session` reaproveita a mesma sessão para o mesmo hash+mesa (idempotência); regenerar o token de uma mesa invalida o token antigo imediatamente e o novo funciona na hora (AC-QR-001).
- **Executado com sucesso via MCP contra `imenu-dev` em 29/07/2026.**

### Correção crítica durante a verificação: `getServerEnv()` quebrava por variável não relacionada

Ao testar o cardápio público em navegador real, uma chamada que só precisava de `ANONYMOUS_SESSION_PEPPER` derrubava a página inteira porque `getServerEnv()` valida o schema completo a cada chamada, e duas outras variáveis estavam com problema (`SUPABASE_SERVICE_ROLE_KEY` vazia — bloqueio externo já conhecido — e `UPSTASH_REDIS_REST_URL=` vazia falhando em `.optional()`, que só aceita `undefined`, não string vazia). Corrigido em `lib/env/index.ts` (preprocess que trata string vazia como ausente) e `lib/supabase/admin.ts` (exigência de `SUPABASE_SERVICE_ROLE_KEY` movida para o ponto de uso). Detalhes completos em `status/DECISION_LOG.md`, D-018.

### Verificação manual em navegador

Fluxo completo testado via Playwright headless contra o servidor de dev real: (1) autenticado como `admin@imenu.local`, criação da mesa "Mesa 7" em `/painel/mesas`; (2) sem autenticação, acesso a um token inválido (tela "QR Code inválido"), depois ao token real da Mesa 7 — cardápio mostra "Restaurante Demo iMenu"/"Mesa 7"/"Suco de Laranja"; (3) abertura do produto, "Adicionar" ao carrinho, navegação até `/carrinho` mostrando o item, subtotal e o botão "Enviar pedido" corretamente desabilitado. Sem erros de console em nenhuma etapa (confirmado antes e depois da correção do bug de `getServerEnv()`). Capturas de tela geradas e descartadas após a verificação (não fazem parte do repositório).

### Dados de demonstração criados em `imenu-dev` (fora do versionamento)

Mesa "Mesa 7" (`public_token` real gerado pelo banco) criada via fluxo real do painel, para permitir testar o cardápio público de ponta a ponta. Mesmo regime de D-016: não é seed formal, deve ser removida/desativada antes de produção (docs/10 §10).

## Fase 5 concluída (30/07/2026) — Pedido transacional

### Migrações (`supabase/migrations/`)

- `20260730100000_table_service_sessions.sql`: enum `table_session_status`; tabela `table_service_sessions` (uma sessão `open` por mesa via índice único parcial). RLS ativa/forçada: leitura para qualquer membro ativo do tenant ou platform admin; sem policy de escrita — só é criada dentro de `create_public_order`.
- `20260730100001_orders_tables.sql`: enum `order_status`; tabelas `orders`, `order_items`, `order_item_options`, `order_status_history` (docs/07 §6). RLS ativa/forçada nas 4: leitura para qualquer membro ativo (docs/02 §3 — "Pedidos" é ao menos "L" para todos os papéis) ou platform admin; nenhuma policy de insert/update/delete — toda escrita passa pelas funções abaixo.
- `20260730100002_create_public_order.sql` + `20260730100007_create_public_order_drop_slug_param.sql` (corretiva: remove parâmetro `establishmentSlug` para casar exatamente com o contrato público de `docs/08`, já que `public_token` é único globalmente) + `20260730100008_create_public_order_optional_params.sql` (corretiva: `expectedTotalCents`/`items` ganham default para poderem ser omitidos na chamada RPC): função `create_public_order` — transacional, `SECURITY DEFINER`, valida mesa/estabelecimento, assinatura, horário/pausa manual, idempotência (`client_request_id` + `payload_hash`), recalcula o preço a partir do catálogo atual (nunca confia no total do cliente), valida disponibilidade de produto/opção e regras de grupo (min/max), abre ou reaproveita a sessão de atendimento da mesa, numera o pedido (`A001`, `A002`...) serializado por trava consultiva por estabelecimento/dia, e grava pedido + itens + opções + primeiro histórico numa única transação.
- `20260730100003_transition_order_status.sql`: função `transition_order_status` — valida a transição e o papel do ator internamente conforme a matriz de docs/05 §3 (nunca só no app), exige motivo em rejeitar/cancelar, é idempotente por `operation_id` (repetir a mesma operação devolve o estado atual sem duplicar histórico).
- `20260730100004_get_public_order.sql`: função `get_public_order` — leitura pública fail-closed do acompanhamento do pedido pelo token de rastreamento (nunca revela se o pedido existe quando o token é inválido).
- `20260730100005_orders_indexes.sql` + `20260730100006_orders_establishment_id_fk_indexes.sql`: índices de cobertura (docs/07 §12) e das FKs sinalizadas pelo advisor de performance.

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` (security) revalidado: nenhum aviso novo além dos já aceitos nas Fases 1–4 (funções novas aparecem como "executável por anon/authenticated" exatamente como esperado — `create_public_order`/`get_public_order` só por `anon`, `transition_order_status` só por `authenticated`). Confirmado também por consulta direta a `has_function_privilege` (não só pelo advisor, lição de D-015/D-017) — os três privilégios vieram exatamente como esperado já na primeira tentativa desta vez.

### Decisões registradas nesta fase

Ver `status/DECISION_LOG.md`: D-019 (token de rastreamento via HMAC determinístico do `clientRequestId`, não hash de valor aleatório — permite idempotência sem reler o banco), D-020 (`create_public_order` recebe só `tableToken`, sem `establishmentSlug`, casando com o contrato documentado), D-021 (sem tabela genérica `idempotency_records` nesta fase — `orders` já tem seu próprio mecanismo suficiente), D-022 (rate limit implementado e aplicado também retroativamente ao cardápio público da Fase 4, fechando uma lacuna do CLAUDE.md), D-023 (verificação em navegador do painel de pedidos limitada por falta de credencial da conta demo).

### Aplicação (Next.js)

- `lib/rate-limit/`: `memory.ts` (backend puro, testável por unidade, usado por padrão em dev) e `index.ts` (`server-only`; escolhe `memory` ou `upstash` via `RATE_LIMIT_PROVIDER`; backend Upstash via chamadas REST simples, sem adicionar `@upstash/redis` como dependência) e `hash-ip.ts` (HMAC do IP com `IP_HASH_PEPPER`, nunca loga/chaveia por IP em texto puro).
- `modules/ordering/`: schemas Zod (`create-order.schema.ts`, `public-order-status.schema.ts`); domínio (`order-status-labels.ts`, `transitions.ts` — espelha a matriz de docs/05 §3 só para orientar a UI, `payload-hash.ts` — hash determinístico e testável por unidade dos itens do pedido, `tracking-token.ts` — HMAC do `clientRequestId`); aplicação (`create-public-order.ts`, `get-public-order.ts` para o consumidor; `list-orders.ts`, `get-order.ts`, `transition-order.ts` para o painel).
- `app/api/public/orders/route.ts` (`POST`) e `app/api/public/orders/[trackingToken]/route.ts` (`GET`): endpoints públicos com rate limit, mapeamento de erros do Postgres para códigos estáveis (`docs/08 §5`), geração/verificação do token de rastreamento.
- `modules/service-session/domain/cart.ts`: ganhou `optionIds` no item do carrinho (antes só guardava os nomes para exibição — faltava o identificador real para poder montar o payload do pedido), `getOrCreateClientRequestId`/`clearClientRequestId` (idempotência sobrevive a reload/duplo clique) e `clearCart`.
- `app/(public)/m/[establishmentSlug]/t/[tableToken]/carrinho/cart-client.tsx`: botão "Enviar pedido" habilitado de verdade — chama a API, trata erros (`PRICE_CHANGED`, `PRODUCT_UNAVAILABLE`, `ORDERS_CLOSED`, etc.) com mensagem inline, limpa o carrinho e redireciona para `/pedido/[trackingToken]` no sucesso.
- `app/(public)/pedido/[trackingToken]/`: página pública de acompanhamento — status atual, motivo de rejeição/cancelamento quando houver, itens com opções, total, linha do tempo; um componente cliente faz poll a cada 8s via `GET /api/public/orders/{trackingToken}` até o pedido chegar a um estado terminal (entregue/rejeitado/cancelado). Token inválido mostra "Pedido não encontrado" sem revelar detalhes.
- `app/(establishment)/painel/pedidos/`: lista (últimos 50, mais recentes primeiro) e detalhe (itens, opções, histórico, formulários de transição — só mostra os botões permitidos para o papel do usuário atual, com campo de motivo obrigatório quando a transição exige). Link adicionado no dashboard do painel.

### Testes AC-ORD-002 a 008

- `supabase/tests/0005_orders_transactional.sql`: mesmo formato dos testes anteriores (fixtures + asserções + `rollback` final, nunca persiste dados). Cobre: servidor recalcula o total e rejeita quando o cliente informa um valor divergente (AC-ORD-002/003); retry idempotente com a mesma `client_request_id` devolve o mesmo pedido sem duplicar (AC-ORD-005); mesma `client_request_id` com payload diferente é rejeitada (AC-ORD-006); produto esgotado não cria pedido parcial nem completo (AC-ORD-004); seleção de opções abaixo do mínimo é rejeitada; transição `pending → ready` direta é rejeitada (AC-ORD-007); transição válida grava histórico e repetir a mesma `operation_id` não duplica (AC-ORD-008); motivo obrigatório em rejeitar é validado e persistido; papel insuficiente (`menu_editor`) é barrado; isolamento de tenant aplicado a pedidos (owner de outro estabelecimento não lê nada).
- **Executado com sucesso via MCP contra `imenu-dev` em 30/07/2026** — todas as asserções passaram, nenhuma linha persistida.
- **Armadilha encontrada e corrigida durante a escrita do teste:** as primeiras verificações de contagem (`select count(*) from public.orders ...`) rodavam como `anon`, que não tem nenhuma policy de `SELECT` em `orders` — o resultado vinha sempre `0`, mascarando o teste (passava mesmo quando não deveria). Corrigido alternando para `service_role` só nas checagens de contagem, mantendo `anon` para as chamadas de `create_public_order` em si (que é o papel real do consumidor).
- `tests/unit/ordering-domain.test.ts`: 14 testes cobrindo hash de payload determinístico e sensível a mudanças reais (ignora ordem de itens/opções, muda com quantidade/opção/mesa diferentes), matriz de transições (cobertura de todos os status, estados terminais sem saída, papel insuficiente, motivo obrigatório só em rejeitar/cancelar) e o backend em memória do rate limit (permite dentro do limite, bloqueia acima, libera após a janela).

### Verificação manual em navegador

Fluxo completo do consumidor testado via Playwright headless contra o servidor de dev real + projeto `imenu-dev` real (não simulado): QR da Mesa 7 → cardápio mostra "Suco de Laranja" → abrir produto → "Adicionar" → `/carrinho` mostra o item → "Enviar pedido" → redirecionamento real para `/pedido/{trackingToken}` mostrando "Aguardando confirmação", o item e o total corretos. Token de rastreamento inválido mostra "Pedido não encontrado"; QR inválido mostra "QR Code inválido". Zero erros de console/página em todas as etapas. O pedido criado (`A001`, R$ 12,00) foi conferido diretamente no banco e depois transicionado para `accepted` via `transition_order_status` autenticado como o owner de fato da conta demo (mesmo RPC que os botões do painel chamam) — a página pública de acompanhamento (`GET /api/public/orders/{trackingToken}`) confirmou refletir `"status":"accepted"` e a linha do tempo com as duas entradas.

**Lacuna registrada (D-023):** não foi possível clicar fisicamente nos botões de `/painel/pedidos` num navegador autenticado como `admin@imenu.local` — a senha da conta demo não está registrada em lugar nenhum (corretamente) e `SUPABASE_SERVICE_ROLE_KEY` continua vazia (bloqueio já conhecido), impedindo gerar uma sessão de teste programaticamente. A lógica exata que esses botões chamam (`transition_order_status`) foi validada de forma equivalente via SQL/RPC direto; as páginas do painel foram confirmadas por build bem-sucedido e redirecionamento correto (307) para `/entrar` quando não autenticado.

## Fase 6 concluída (30/07/2026) — Operação em tempo real

### Migrações (`supabase/migrations/`)

- `20260730110000_operations_realtime.sql`: adiciona `orders` e `products` à publicação `supabase_realtime` (docs/08 §7) — sem policy nova, o Realtime reavalia as mesmas policies de `SELECT` já ativas/forçadas (qualquer membro ativo do tenant; `anon` não lê nenhuma das duas diretamente).
- `20260730110001_realtime_replica_identity_full.sql`: `orders`/`products` passam para `REPLICA IDENTITY FULL`. Não era a causa raiz do bug descrito abaixo (ver D-028), mas é a configuração correta para que o registro antigo completo esteja disponível em updates/deletes, então mantida.

Aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` revalidado: nenhum aviso novo além dos já aceitos nas Fases 1–5.

### Aplicação (Next.js)

- `modules/operations/domain/board-columns.ts`: mapeia os 7 status de pedido para 5 colunas do KDS (`new`, `preparing`, `ready`, `finished`, `exception`); só as 3 primeiras aparecem por padrão (docs/04 O-02).
- `modules/operations/domain/order-urgency.ts`: idade em minutos e 3 níveis de urgência (normal/warning/urgent) — usados só nas colunas ativas (Novos/Em preparo/Prontos), nunca em pedidos já finalizados/cancelados.
- `modules/operations/domain/new-order-alerts.ts`: decide quais pedidos `pending` ainda não geraram alerta sonoro/visual (nunca alerta de novo por um pedido já visto, nunca alerta retroativamente pelo backlog já existente ao abrir a tela).
- `modules/operations/domain/sound-preference.ts`: preferência de som por dispositivo via `localStorage` (docs/08 §8).
- `modules/operations/application/list-kitchen-board.ts`: snapshot do KDS — últimas 24h + qualquer pedido ainda aberto fora dessa janela (docs/06 §7), itens/opções buscados em lote (sem N+1).
- `modules/operations/application/use-realtime-invalidate.ts`: único hook client-side dentro de `modules/` neste projeto (o resto do módulo é server-only) — assina `postgres_changes` filtrado por `establishment_id`, invalida a query em cada evento e ao (re)conectar; nunca confia no conteúdo do evento (docs/08 §7, docs/05 §7). Aguarda a sessão (`auth.getSession()`) antes de assinar — ver D-028 para o motivo (bug real encontrado e corrigido nesta fase).
- `public/sounds/new-order.wav`: chime curto de dois tons, sintetizado localmente (não baixado de terceiros), ~34 KB.
- `app/(establishment)/painel/query-provider.tsx`: `QueryClientProvider` do `@tanstack/react-query` (dependência já provisionada na Fase 0, nunca usada até agora) montado no layout do painel do estabelecimento.
- `app/(establishment)/painel/pedidos/`: `page.tsx` virou um Server Component fino (snapshot inicial + papel do usuário); `kitchen-board.tsx` (novo, client) é o KDS de verdade — cabeçalho com indicador de conexão/relógio/alternância de som, filtro por abas no mobile e colunas simultâneas no desktop (`grid md:grid-cols-2 lg:grid-cols-3`), toggle para mostrar finalizados/exceções, cartões com número/mesa/idade/itens/observações e destaque crescente por tempo de espera, polling de segurança de 15s (`refetchInterval`) via react-query.
- `app/(establishment)/painel/pedidos/[id]/transition-order-form.tsx`: ganhou a prop `size` ("compact"/"large") para reutilizar o mesmo formulário/Server Action nos botões grandes do KDS sem duplicar lógica.
- `app/(establishment)/painel/disponibilidade/`: nova tela "Disponibilidade rápida" (docs/04 O-05) — lista simples de produtos publicados com toggle disponível/esgotado, também com assinatura Realtime (reflete em outras abas abertas), reaproveitando a Server Action `setProductAvailabilityAction` já existente da Fase 3.
- `modules/ordering/domain/order-status-labels.ts`: ganhou `ORDER_TRANSITION_ACTION_LABELS` (ver D-029).

### Bugs reais encontrados e corrigidos durante a verificação em navegador (não eram do escopo original da fase, mas foram corrigidos por serem triviais e visíveis na própria tela que a fase entrega)

- **D-028:** UPDATE de status não chegava via Realtime (só INSERT) — causa raiz era uma corrida entre a resolução assíncrona da sessão do `@supabase/ssr` e a assinatura síncrona do canal, fazendo o `phx_join` sair como `anon`. Corrigido aguardando `auth.getSession()` antes de assinar.
- **D-029:** botões de transição mostravam o nome do status ("Aceito") em vez do verbo da ação ("Aceitar") — também presente na página de detalhe do pedido (Fase 5).
- **D-030:** "Mesa Mesa 7" — duplicação do prefixo "Mesa" em 5 telas (cardápio público, carrinho, acompanhamento de pedido, KDS, detalhe do pedido).

### Testes

- `tests/unit/operations-domain.test.ts`: 13 testes cobrindo `boardColumnFor` (todos os 7 status), `minutesSince`/`urgencyForMinutes` (faixas de urgência) e `findUnseenPendingOrderIds` (não alerta pedido já visto, alerta pedido novo, ignora pedido fora de `pending`).

### Verificação manual em navegador (Playwright, contra o servidor de dev real + `imenu-dev` real)

Login como `owner-cantina@imenu.demo` (credencial de demonstração da Fase 5/D-026 — resolveu a lacuna de D-023, agora é possível clicar fisicamente nos botões). Fluxo completo e real, sem simulação: consumidor cria um pedido de verdade via `/m/cantina-da-nonna/...` (QR real) → aparece no KDS em ~1s sem reload → "Aceitar" move para "Em preparo" em ~1,6s → "Marcar pronto" move para "Prontos" em ~1,3s → "Marcar entregue" move para "Finalizados" em ~1,3s — todas as transições refletidas só por Realtime, sem nenhum reload de página. Botão "Ativar alertas sonoros"/"Testar som" testado sem erro. Tela de disponibilidade rápida testada: 10 produtos listados, toggle disponível/esgotado confirmado no banco e refletido na tela em ~2s. Zero erros de console em toda a sessão de testes.

## Fase 7 concluída (30/07/2026) — Conta e fechamento da mesa

### Migrações (`supabase/migrations/`)

- `20260730130000_bill_requests_tables.sql`: enum `bill_request_status` (`requested`, `acknowledged`, `bill_delivered`, `closed`, `canceled`); tabela `bill_requests` (tenant, mesa, sessão, quem pediu, quem atendeu, timestamps por marco, motivo de cancelamento); índice único parcial garantindo no máximo uma solicitação **ativa** por sessão (docs/03 §regra 5). RLS ativa/forçada: leitura para owner/manager/kitchen/cashier/viewer (`has_tenant_role` explícito na policy — `menu_editor` não tem nenhum acesso, docs/02 §3); sem policy de escrita, toda mutação passa pelas funções abaixo.
- `20260730130001_bill_request_functions.sql`: `request_table_bill` (RPC pública — valida mesa/estabelecimento/assinatura, exige sessão aberta [`IM011` se não houver], idempotente **por sessão** — não por `client_request_id` — via o índice único, então qualquer dispositivo da mesma mesa que repetir a chamada recebe a mesma solicitação); `get_table_bill_status` (leitura pública fail-closed, total informativo somado dos pedidos da sessão); `transition_bill_request_status` (só `acknowledged`/`bill_delivered`/`canceled` — ver D-031 para o motivo de `closed` não estar aqui); `close_table_session` (ver D-031 — bloqueia com pedido não-terminal a menos que owner/manager confirme `p_force=true`, auditado em `audit_logs` nesse caso).
- `20260730130002_bill_requests_realtime.sql`: `bill_requests`/`table_service_sessions` adicionadas à publicação `supabase_realtime` e já criadas com `REPLICA IDENTITY FULL` desde o início (lição de D-028 aplicada preventivamente).
- `20260730130003_get_table_bill_status_names.sql` (corretiva): `get_table_bill_status` passou a incluir `establishmentTradeName`/`tableName`, necessários para o cabeçalho de `/m/.../conta`.
- `20260730130004_get_table_bill_status_prefer_open.sql` (corretiva — ver D-032): correção de uma condição de corrida na escolha de qual sessão exibir quando há empate de `opened_at`.

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` revalidado: nenhum aviso novo além dos já aceitos nas Fases 1–6; os 4 privilégios das funções novas (`request_table_bill`/`get_table_bill_status` só `anon`; `transition_bill_request_status`/`close_table_session` só `authenticated`) vieram exatamente como esperado já na primeira tentativa.

### Aplicação (Next.js)

- `modules/service-session/schemas/bill-request.schema.ts`: Zod para o input público e para o status (`discriminatedUnion` em `valid`, mesmo padrão de `public-order-status.schema.ts`).
- `modules/service-session/domain/bill-request-labels.ts`: dois conjuntos de rótulo — operacional (`BILL_REQUEST_STATUS_LABELS`) e o do consumidor (`PUBLIC_BILL_REQUEST_STATUS_LABELS`, "recebida/visualizada/atendida" per docs/04 P-06) — mais `BILL_REQUEST_ACTION_LABELS` (verbo do botão, lição de D-029 aplicada desde o início desta vez).
- `modules/service-session/domain/bill-request-transitions.ts`: espelha `transition_bill_request_status` só para orientar a UI (mesmo padrão de `modules/ordering/domain/transitions.ts`).
- `modules/service-session/application/request-table-bill.ts` / `get-table-bill-status.ts`: lado público, mesmo padrão de `create-public-order.ts`/`get-public-order.ts` (cookie de sessão anônima, rate limit 3/10min para solicitar e 60/min para consultar status, fail-closed).
- `modules/service-session/application/list-caixa-board.ts`: snapshot do caixa (solicitações + mesas abertas) sem N+1 — mesmo padrão de `list-kitchen-board.ts` da Fase 6.
- `modules/service-session/application/transition-bill-request.ts` / `close-table-session.ts`: lado autenticado, chamam as RPCs e mapeiam erros para `AppErrorCode`.
- `app/api/public/bill-requests/route.ts` (`POST`) e `.../[tableToken]/route.ts` (`GET`): endpoints públicos, mesmo padrão dos endpoints de pedido da Fase 5.
- `app/(public)/m/[establishmentSlug]/t/[tableToken]/conta/`: página pública "Solicitar conta" (docs/04 P-06) — total informativo, texto "A equipe levará a conta até sua mesa", polling de 8s do status (recebida/visualizada/atendida/cancelada), link adicionado no cabeçalho do cardápio público.
- `app/(establishment)/painel/caixa/`: tela do caixa (docs/04 O-04) — reaproveita o padrão de KDS da Fase 6 (react-query + `useRealtimeInvalidate`, agora assinando `bill_requests`, `table_service_sessions` e `orders` ao mesmo tempo para o mesmo snapshot); solicitações ativas em destaque no topo, mesas abertas abaixo, histórico recente; botão de "forçar fechamento" só aparece depois de uma primeira tentativa bloqueada por pedido em aberto. Acesso de leitura restrito (owner/manager/kitchen/cashier/viewer; `menu_editor` vê "Acesso restrito" em vez de erro genérico) tanto na página quanto na Server Action de refetch (defesa em profundidade).
- Link "Caixa" adicionado ao dashboard do painel (`app/(establishment)/painel/page.tsx`).

### Bugs reais encontrados e corrigidos durante a verificação (não eram do escopo original, mas visíveis nas próprias telas entregues)

- **D-031:** decisão de desenhar "fechar sessão" como ação independente das transições de `bill_requests` — sem isso, mesas cujo cliente pede a conta verbalmente (sem usar o app) nunca fechariam.
- **D-032:** `get_table_bill_status` podia escolher a sessão errada em caso de empate de timestamp — encontrado pelo teste de integração, não pela UI.

### Testes

- `tests/unit/bill-request-domain.test.ts`: 8 testes cobrindo transições permitidas por papel (cashier pode reconhecer; kitchen/viewer não podem agir em nada; cancelar exige motivo; `bill_delivered`/`closed`/`canceled` não têm transições próprias) e completude/distinção dos rótulos.
- `supabase/tests/0006_bill_requests_and_table_sessions.sql`: mesmo formato dos testes anteriores (fixtures + asserções + `rollback` final, nunca persiste dados). Cobre: solicitar conta sem sessão aberta falha (`IM011`); AC-BILL-002 (retry de dispositivo diferente não duplica solicitação ativa); papel insuficiente (kitchen) barrado com `42501`; RLS nega leitura a `menu_editor`; fluxo feliz completo (reconhecer → marcar entregue, idempotente); `closed` não é transição válida de `transition_bill_request_status` (`IM010`); fechar com pedido não-terminal falha (`IM013`) e cashier não pode forçar (`42501`), mas owner pode, e gera 1 linha de auditoria; fechar de novo é no-op idempotente; próximo pedido após fechar abre sessão nova (docs/03 §regra 8); cancelar sem motivo falha (`IM009`); depois de cancelada, uma nova solicitação pode ser feita para a mesma sessão; `get_table_bill_status` sempre prioriza a sessão aberta (regressão de D-032).
- **Executado com sucesso via MCP contra `imenu-dev` em 30/07/2026** — todas as asserções passaram, nenhuma linha persistida.

### Verificação manual em navegador (Playwright, contra o servidor de dev real + `imenu-dev` real)

Fluxo completo e real, duas abas simultâneas: consumidor abre `/m/cantina-da-nonna/t/.../conta`, vê o total informativo (R$ 20,70) e solicita a conta → status "Recebida". Staff (`owner-cantina@imenu.demo`) abre `/painel/caixa`, vê o cartão da Mesa 1 → clica "Reconhecer" → aba do consumidor reflete "Visualizada" via polling em até 8s, sem reload → staff clica "Marcar conta entregue" → staff clica "Fechar sessão": como havia um pedido de teste da Fase 6 ainda não finalizado nessa mesa, o sistema corretamente bloqueou o fechamento e ofereceu "Forçar fechamento mesmo com pedidos em aberto" — confirmado como owner, a sessão fechou e o registro de auditoria foi conferido no banco. Aba do consumidor reflete "Atendida" ao final. Zero erros de console em toda a sessão de testes.

## Fases

| Fase | Estado | Evidência/observação |
|---|---|---|
| 0 — Diagnóstico e fundação | Concluída (29/07/2026) | Repositório reestruturado (docs movidos para a raiz), Git inicializado **e primeiro commit publicado** (`9d41953`, `https://github.com/Cleuvin-dev/imenu.git`, branch `main`), Next.js 16 + TypeScript estrito + Tailwind v4 scaffolded, estrutura modular criada (`app/`, `components/`, `modules/`, `lib/`, `supabase/`, `tests/`, `public/`), design tokens do iMenu em `app/globals.css`, `.env.example`/`lib/env` com validação Zod, CI básica em `.github/workflows/ci.yml`, projeto Supabase de dev `imenu-dev` criado. `npm run lint`, `npm run typecheck`, `npm test` (6/6) e `npm run build` passam; `npm run start` respondeu HTTP 200 na home. Nenhum segredo versionado (`.env.local` ignorado por `.gitignore`). |
| 1 — Identidade, tenancy e RLS | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; RLS ativa/forçada e testada (script SQL com rollback, sem persistir dados); login e seleção de tenant funcionando; layouts protegidos de `/painel` e `/admin-geral`; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 1 concluída" acima para detalhes. |
| 2 — Assinatura e gate | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; AC-SUB-001 a AC-SUB-004 testados via script SQL (rollback completo); job de cron autenticado por segredo; gate aplicado no painel do estabelecimento; superadmin mínimo de estabelecimentos/faturas; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 2 concluída" acima. |
| 3 — Catálogo e mídias | Concluída (29/07/2026) | 6 migrações aplicadas em `imenu-dev` via MCP (tabelas, RLS, funções, storage, índices); AC-CAT-001 testado via script SQL; upload validado por magic bytes (13 testes unitários); categorias/produtos/opções/mídia funcionando de ponta a ponta, testado em navegador real; `npm run lint`, `npm run typecheck`, `npm test` (26/26) e `npm run build` passam. Ver seção "Fase 3 concluída" acima. |
| 4 — Mesas, QR e público | Concluída (29/07/2026) | 7 migrações aplicadas em `imenu-dev` via MCP (mesas, sessão anônima, RPCs de cardápio público, horário de funcionamento); AC-PUB-001, AC-PUB-002 e AC-QR-001 testados via script SQL (rollback completo); QR PNG/SVG por mesa com regeneração de token; cardápio público mobile + carrinho local testados de ponta a ponta em navegador real; `npm run lint`, `npm run typecheck`, `npm test` (26/26) e `npm run build` passam. Ver seção "Fase 4 concluída" acima. |
| 5 — Pedido transacional | Concluída (30/07/2026) | 9 migrações aplicadas em `imenu-dev` via MCP (sessão de mesa, pedidos/itens/opções/histórico, `create_public_order`, `transition_order_status`, `get_public_order`, índices); AC-ORD-002 a 008 testados via script SQL (rollback completo); carrinho público conectado de ponta a ponta (testado em navegador real contra o servidor de dev + Supabase real, pedido de verdade criado e transicionado); painel de pedidos com transições por papel; `npm run lint`, `npm run typecheck`, `npm test` (40/40) e `npm run build` passam. Ver seção "Fase 5 concluída" acima. |
| 6 — Operação em tempo real | Concluída (30/07/2026) | 2 migrações aplicadas em `imenu-dev` via MCP (Realtime habilitado em `orders`/`products`, replica identity full); KDS reconstruído com colunas em tempo real, alertas sonoros/visuais, filtros, polling de 15s e reconexão; tela de disponibilidade rápida; ciclo completo de um pedido real (pending→accepted→preparing→ready→delivered) testado em navegador real, cada transição refletida via Realtime em ~1-2s sem reload; `npm run lint`, `npm run typecheck`, `npm test` (53/53) e `npm run build` passam. Ver seção "Fase 6 concluída" acima. |
| 7 — Conta e sessão da mesa | Concluída (30/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP (`bill_requests`, `request_table_bill`, `get_table_bill_status`, `transition_bill_request_status`, `close_table_session`, Realtime); teste de integração `0006_bill_requests_and_table_sessions.sql` cobrindo AC-BILL-001/002 e casos negativos (rollback completo); tela pública "Solicitar conta" e tela de caixa testadas em navegador real, incluindo o caminho de fechamento forçado com pedido em aberto; `npm run lint`, `npm run typecheck`, `npm test` (61/61) e `npm run build` passam. Ver seção "Fase 7 concluída" acima. |
| 8 — Administração completa | Concluída (06/08/2026) | 3 migrações aplicadas em `imenu-dev` via MCP (convites de equipe, guarda do último super_admin, bootstrap de estabelecimento); teste de integração `0007_team_and_platform_admin.sql` cobrindo aceite de convite (feliz/e-mail divergente/revogado/expirado), `list_establishment_team` e a guarda do último super_admin; dashboards, equipe/convites, horários, assinatura, filtros/CRUD de estabelecimentos e planos, administradores da plataforma e auditoria consultável testados em navegador real; dois bugs reais encontrados e corrigidos (D-033: nomes de variáveis de servidor vazando no bundle do cliente desde a Fase 6; D-034: filtro com "Todos" quebrava a página). `npm run lint`, `npm run typecheck`, `npm test` (80/80) e `npm run build` passam. Ver seção "Fase 8 concluída" acima. |
| 9 — Robustez e deploy | Não iniciada | Próxima fase. |

Estados permitidos: `Não iniciada`, `Em andamento`, `Bloqueada`, `Concluída`.

## Verificações

| Verificação | Último resultado | Data |
|---|---|---|
| Lint | Passou (`npm run lint`) | 06/08/2026 |
| Typecheck | Passou (`npm run typecheck`) | 06/08/2026 |
| Unitários | Passou — 80/80 (`npm test`) | 06/08/2026 |
| Integração/RLS | Passou — `0001_identity_tenancy_rls.sql`, `0002_billing_subscription_gate.sql`, `0003_catalog_gate.sql`, `0004_public_menu_gate.sql`, `0005_orders_transactional.sql`, `0006_bill_requests_and_table_sessions.sql` e `0007_team_and_platform_admin.sql` executados via MCP contra `imenu-dev` (todas as asserções OK, rollback completo). Ainda não rodam em `npm test`/CI: exigem conexão Postgres direta (Docker/Supabase local indisponível — mesmo bloqueio da Fase 0) | 06/08/2026 |
| E2E P0 | `npm run test:e2e` roda mas não encontra nenhum arquivo `*.spec.ts` — Playwright configurado (`playwright.config.ts`) porém nenhum teste E2E formal foi escrito ainda; verificação end-to-end até aqui foi feita via scripts Playwright ad-hoc descartáveis (ver "Verificação manual em navegador" de cada fase) | 06/08/2026 |
| Build | Passou (`npm run build`) | 06/08/2026 |
| Segurança (AC-SEC-001) | Passou — `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET`/`ANONYMOUS_SESSION_PEPPER`/`INVITE_TOKEN_PEPPER`/`ORDER_TRACKING_TOKEN_PEPPER`/`IP_HASH_PEPPER` (nome **e valor**) ausentes de `.next/static` — verificação ampliada nesta fase encontrou e corrigiu um vazamento de nomes pré-existente desde a Fase 6 (D-033) | 06/08/2026 |
| Acessibilidade | Não executado | — |
| Staging smoke test | Não executado | — |

## Bloqueios externos

| Bloqueio | Responsável | Impacto | Estado |
|---|---|---|---|
| Definir domínio final | Dono do produto | Deploy produção/QR final | Pendente |
| Projeto Supabase de desenvolvimento | — | Banco/Auth/Storage/Realtime local | **Resolvido** — projeto `imenu-dev` criado (D-010) |
| Obter `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` | Dono do produto | Job de cron real (hoje só testado via RPC direta) e bootstrap real de estabelecimento/owner (RF-ADM-002, código pronto desde a Fase 8 — ver D-035) | Pendente — só acessível pelo painel Supabase |
| Projetos Supabase de staging/produção exclusivos | Dono do produto | Deploy staging/produção | Pendente |
| Definir valores comerciais dos planos | Dono do produto | Seed/configuração produção (hoje só existem planos de teste criados durante verificação manual, removidos ao final da sessão) | Pendente |
| Confirmar se o Supabase Auth do `imenu-dev` deve exigir confirmação de e-mail | Dono do produto | Cadastro de conta durante o aceite de convite (Fase 8) funciona, mas não foi possível observar o caminho de sessão imediata em navegador — o projeto tem confirmação de e-mail habilitada e o SMTP padrão do Supabase tem limite de taxa baixo | Informativo — o código já trata os dois casos corretamente |
| Definir se suspensão/reativação manual com motivo (RF-ADM-010) entra em alguma fase | Dono do produto | Hoje só existe suspensão automática por atraso (Fase 2); RF-ADM-004 cobriu só ativação/desativação cadastral simples (ver D-036) | Pendente — decisão de escopo, não bloqueio técnico |
| Definir e-mail transacional | Dono do produto | Envio automático de convite | Opcional no MVP |
| Habilitar "Leaked Password Protection" no Supabase Auth | Dono do produto | Segurança de contas antes de produção (checklist docs/10 §10) | Pendente — ajuste de configuração no painel do projeto, fora do escopo de migração |
| Senha da conta demo `admin@imenu.local` desconhecida (Fase 5) | — | Impediu login via navegador para clicar fisicamente nos botões de `/painel/pedidos` (Fase 5); a lógica foi validada por RPC direto (D-023) | **Resolvido na Fase 6** — credenciais reais de `owner-cantina@imenu.demo` (D-026) permitiram testar o KDS inteiro em navegador |

## Última entrega

- Fase 8 concluída: administração completa (ver seção "Fase 8 concluída" acima para a lista completa de migrações e arquivos).
- Arquivos principais: `supabase/migrations/20260806140000..140002_*.sql`, `supabase/tests/0007_team_and_platform_admin.sql`, `tests/unit/phase8-schemas.test.ts`, `modules/{tenancy,identity,catalog,operations,billing,platform-admin,audit}/*` (equipe/convites, horários, dashboards, planos, administradores, auditoria), `app/(auth)/convite/[token]/`, `app/(establishment)/painel/{equipe,horarios,assinatura}/`, `app/(platform)/admin-geral/{administradores,auditoria,planos,estabelecimentos/novo}/`.
- Verificado em 06/08/2026: `npm run lint`, `npm run typecheck`, `npm test` (80/80) e `npm run build` passam. Teste de integração `0007_team_and_platform_admin.sql` executado via MCP contra `imenu-dev` com sucesso (rollback completo). Fluxo completo testado em navegador real via Playwright (owner e superadmin), incluindo criação/revogação de convite, aceite de convite por usuário já autenticado (confirmado no banco), toggle de horário/pedidos, filtros de estabelecimentos, CRUD de planos e administradores, auditoria. Zero erros de console em todas as sessões. Dois bugs reais encontrados e corrigidos: D-033 (vazamento do nome de variáveis de servidor no bundle do cliente, pré-existente desde a Fase 6) e D-034 (filtro com "Todos" quebrava a página). Todos os artefatos de teste (convites, plano, associação) foram removidos do banco ao final da verificação.
- **Não commitado ainda nesta sessão** — aguardando autorização explícita do responsável antes de `git commit`/`git push` (CLAUDE.md: nunca commitar sem pedido explícito).

## Onde retomar (próxima sessão)

- **Repositório:** Fases 0–8 completas localmente. Fases 0–7 já estavam publicadas em `origin/main` (`fa7c5d1`) com deploy ao vivo em `https://imenu-nu.vercel.app`; **a Fase 8 ainda não foi commitada nem enviada** — ver "Última entrega" acima.
- **Próxima etapa a iniciar: Fase 9 — Robustez e entrega.** Escopo (docs/12): todos os testes P0, acessibilidade, performance, headers e rate limit, logs, seed/demonstração, deploy staging, checklist manual, documentação real, plano de rollback. Gate: `docs/16_DEFINITION_OF_DONE.md` integralmente atendido.
- **Credenciais de demonstração ativas no deploy:** `owner-cantina@imenu.demo` / `CantinaDemo123!` (proprietário da Cantina da Nonna) e `superadmin@imenu.demo` / `SuperAdminDemo123!` (administrador geral) — ver D-026. Não documentadas em nenhum outro lugar do repositório, por segurança.
- **Pendência bloqueante para operações reais de cron/bootstrap:** `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` **continua vazia** em `.env.local` — só o dono do produto consegue pegar em `https://supabase.com/dashboard/project/vvqhvnnsnhwoywbaxcwg/settings/api-keys`. O cadastro de estabelecimento/owner (RF-ADM-002) já está com código completo esperando essa chave (D-035).
- **Pendências externas sem prazo definido:** domínio final, projetos Supabase de staging/produção, valores comerciais dos planos reais, e-mail transacional, leaked password protection, confirmação de e-mail no Supabase Auth do `imenu-dev` (ver tabela "Bloqueios externos").
- **Observações técnicas para quem continuar:**
  - `lib/env/index.ts` é `server-only` desde a Fase 8 (D-033) — se algo do lado do cliente precisar de env pública, importar de `@/lib/env/public`, nunca de `@/lib/env`. `proxy.ts` (Edge) também usa `@/lib/env/public` pelo mesmo motivo.
  - Schemas Zod que fazem `.parse()`/`.safeParse()` direto sobre `searchParams` (páginas de filtro) devem usar `lib/validation/empty-to-undefined.ts` (`optionalFromEmpty`) em todo campo opcional — um `<select>` em "Todos"/input vazio sempre chega como `""`, nunca `undefined` (D-034, mesma família de D-018).
  - `app/(establishment)/painel/layout.tsx` só libera `{children}` com o acesso operacional bloqueado quando `role === "owner"` e a rota é exatamente `/painel/assinatura` (via header `x-invoke-path` setado em `proxy.ts`) — ver D-037 antes de mexer no gate de assinatura ou adicionar novas exceções a ele.
  - `list_establishment_team` é a única forma de ver nome/e-mail de colegas de equipe (a RLS de `profiles` só libera o próprio registro ou platform admin) — qualquer tela nova que precise mostrar quem é quem num estabelecimento deve reaproveitar essa RPC, não tentar um select direto em `profiles`.
  - `enforce_last_super_admin_guard` (novo em `platform_admins`) não tem escopo de tenant — ele conta super_admins ativos na tabela inteira. Testes de integração que mexem nesse guard precisam neutralizar temporariamente super_admins reais pré-existentes dentro da própria transação de teste (ver comentário em `0007_team_and_platform_admin.sql`).
  - `createEstablishmentWithOwner` e `platform_bootstrap_establishment` juntos formam o único fluxo do projeto que cria um usuário real em `auth.users` fora de um script de teste — sempre usa o cliente admin do início ao fim e compensa (remove o usuário) se o resto falhar. Não tem policy de RLS equivalente porque roda inteiramente sob `service_role`.
  - Qualquer nova assinatura Realtime deve reaproveitar `modules/operations/application/use-realtime-invalidate.ts`, que já aguarda a sessão antes de assinar o canal (ver D-028 — sem isso, updates silenciosamente não chegam, só inserts). Usado agora por `orders`, `products`, `bill_requests` e `table_service_sessions`.
  - "Fechar sessão" (`close_table_session`) é independente das transições de `bill_requests` — ver D-031 antes de mexer no fluxo de conta/caixa.
  - Ordenar por timestamp sozinho não é confiável quando múltiplas linhas podem ter sido criadas dentro da mesma transação (`now()` fica congelado) — sempre incluir um desempate determinístico (`id`) e, quando fizer sentido, priorizar por estado antes de timestamp (ver D-032).
  - `middleware.ts` foi renomeado para `proxy.ts` (convenção do Next.js 16.2).
  - Lição repetida três vezes nas fases anteriores (D-015, D-017): funções novas podem receber `GRANT EXECUTE` para `anon`/`authenticated` de duas formas diferentes — via `PUBLIC` (`revoke ... from public` resolve) ou via grant nomeado direto (só `revoke ... from <papel>` nomeado resolve). Nesta fase, o padrão `revoke all ... from public, <papel>` seguido de `grant` só para quem precisa funcionou corretamente já na primeira tentativa para as 3 funções novas (confirmado por `has_function_privilege`, não só pelo advisor).
  - `eslint.config.mjs` ignora variáveis/parâmetros prefixados com `_`; `react-hooks/set-state-in-effect` é desabilitado pontualmente onde `localStorage` é lido em `useEffect` (padrão SSR-safe, legítimo).
  - Variáveis de ambiente genuinamente opcionais usam `z.preprocess` para tratar string vazia como ausente (D-018) — mesmo padrão hoje compartilhado por `lib/validation/empty-to-undefined.ts` para schemas de filtro (D-034).
  - `guest_sessions`, `orders`, `order_items`, `order_item_options`, `order_status_history` e `table_service_sessions` não têm policy de RLS de escrita para `anon`/`authenticated` — toda escrita passa por função `SECURITY DEFINER`. Isso é intencional, não uma lacuna.
  - **Módulos com `import "server-only"` não podem ser importados por testes unitários** (o pacote `server-only` não está instalado — só o bundler do Next.js sabe resolvê-lo via shim especial; o Vitest quebra). Por isso `lib/rate-limit/memory.ts` existe separado de `lib/rate-limit/index.ts`: a lógica pura (testável) fica sem o import, a orquestração (`server-only`, lê env) fica em `index.ts`. Ao adicionar lógica de domínio testável em um módulo que hoje é `server-only`, considere o mesmo split.
  - Token de rastreamento do pedido (`orders.public_tracking_token_hash`) é um HMAC determinístico de `clientRequestId` (não um valor aleatório hasheado) — ver D-019 para o motivo (retry idempotente precisa devolver o mesmo token sem reler o banco).
  - `create_public_order` recebe só `tableToken` (não `establishmentSlug`) — ver D-020. O parâmetro `p_expected_total_cents`/`p_items` têm default no Postgres para poderem ser omitidos pelo cliente Supabase-js quando ausentes (evita ter que enviar `null` explicitamente).
  - Dado de demonstração desta fase: o pedido `A001` criado durante a verificação em navegador (Suco de Laranja, Mesa 7) ficou persistido em `imenu-dev` no status `accepted` — mesmo regime de D-016, não é seed formal.

## Dado de demonstração adicional (30/07/2026, fora das fases) — "Cantina da Nonna"

A pedido do responsável, criado um segundo estabelecimento fictício completo em `imenu-dev` só para visualização (categorias, 10 produtos publicados com foto placeholder, grupo de opções de tamanho na pizza, mesa com QR real, dono próprio). Ver `status/DECISION_LOG.md` D-024 para detalhes e para a lição sobre login real de usuário inserido manualmente (`auth.identities` + colunas de token vazias em vez de `NULL`). Mesmo regime de D-016: não é seed formal, remover/desativar antes de produção.

## Primeiro deploy na Vercel (30/07/2026) — bug do cardápio público resolvido

**Deploy:** conectado GitHub → Vercel, domínio estável `https://imenu-nu.vercel.app` (env vars configuradas: Supabase URL/anon key, peppers, CRON_SECRET, RATE_LIMIT_PROVIDER=memory). Login funcionando (`owner-cantina@imenu.demo` / `CantinaDemo123!`, e `superadmin@imenu.demo` / `SuperAdminDemo123!` — ver D-026).

### Bug resolvido: cardápio público sempre mostrava "QR Code inválido" no deploy da Vercel

**Sintoma:** `https://imenu-nu.vercel.app/m/{slug}/t/{token}` sempre renderizava o estado de QR inválido, para qualquer estabelecimento/mesa (Cantina da Nonna e Restaurante Demo iMenu/Mesa 7).

**Causa raiz confirmada:** `NEXT_PUBLIC_SUPABASE_URL` em Production/Preview na Vercel não apontava para o projeto Supabase (`https://vvqhvnnsnhwoywbaxcwg.supabase.co`) — a chamada `supabase.rpc("get_public_menu", ...)` estava indo para o próprio domínio do app (`imenu-nu.vercel.app`) e recebendo de volta a página 404 padrão do Next.js (confirmado lendo os Runtime Logs reais da Vercel via `npx vercel logs`, não só os logs do Supabase). Ver `status/DECISION_LOG.md`, D-027, para a investigação completa.

**Correção aplicada e verificada em 30/07/2026:**
1. `NEXT_PUBLIC_SUPABASE_URL` removida e recriada em Production e Preview na Vercel com o valor correto (obtido via `get_project_url` do MCP do Supabase, não adivinhado).
2. Redeploy de produção disparado (`vercel deploy --prod`).
3. Testado contra a URL pública real: `cantina-da-nonna`/Mesa 1 e `restaurante-demo-imenu`/Mesa 7 renderizam o cardápio completo; `npx vercel logs` confirma zero logs de erro nas duas requisições.
4. Os 3 `console.error` de diagnóstico temporário em `modules/service-session/application/get-public-menu.ts` foram removidos — a função volta a falhar fechado silenciosamente, como o comentário do arquivo já documentava.
5. `npm run lint`, `npm run typecheck`, `npm test` (40/40) e `npm run build` executados novamente após a remoção — todos passam.

**Observação sobre ferramentas usadas nesta investigação:** foi necessário autenticar o Vercel CLI (`npx vercel`) e vincular o repositório local ao projeto `imenu` na Vercel para ler os Runtime Logs reais — sem isso, a única evidência disponível era a ausência de chamadas nos logs do Supabase, insuficiente para confirmar a causa. `.vercel/` está no `.gitignore`. O responsável autorizou explicitamente checar e depois sobrescrever a variável antes de qualquer alteração em produção.

## Fase 8 concluída (06/08/2026) — Administração completa

### Migrações (`supabase/migrations/`)

- `20260806140000_platform_last_super_admin_guard.sql`: trigger `enforce_last_super_admin_guard` em `platform_admins` — mesmo padrão do guard de owner da Fase 1, mas para o papel `super_admin` (docs/02 §4, docs/04 A-06).
- `20260806140001_team_invite_functions.sql`: `get_member_invite_preview` (prévia pública fail-closed, `anon`+`authenticated`), `accept_member_invite` (`SECURITY DEFINER`, só `authenticated` — valida token/expiração/revogação/e-mail e cria a associação numa transação), `list_establishment_team` (junta `establishment_members` com `profiles`, já que a RLS de `profiles` não deixa ler colegas diretamente; restrito a owner/manager/platform admin internamente).
- `20260806140002_platform_bootstrap_establishment.sql`: `platform_bootstrap_establishment` — só `service_role` (revogado de `anon`/`authenticated`), cria estabelecimento + assinatura `trialing` + membro owner + auditoria numa transação; a criação do usuário em `auth.users` acontece antes, via `supabase.auth.admin.createUser` na aplicação (ver D-035, bloqueada por `SUPABASE_SERVICE_ROLE_KEY`).

Todas aplicadas com sucesso em `imenu-dev` via MCP. `get_advisors` (security) revalidado: as 3 funções novas aparecem exatamente como esperado (`get_member_invite_preview` pública, `accept_member_invite`/`list_establishment_team` só `authenticated`); `platform_bootstrap_establishment` não aparece na lista (confirma que não é executável por `anon`/`authenticated`) — verificado também por `has_function_privilege` direto (lição de D-015/D-017), que confirmou `service_role: true` e `anon`/`authenticated: false`.

### Aplicação (Next.js)

- `modules/tenancy/`: `domain/invite-token.ts` (token bruto via `randomBytes`, hash HMAC com `INVITE_TOKEN_PEPPER` — já provisionada desde a Fase 0), `schemas/{create-invite,update-member}.schema.ts`, `application/{create-invite,revoke-invite,list-team,update-member,preview-invite,accept-invite}.ts`. Criar/revogar convite e alterar papel/ativação de membro usam o cliente autenticado normal (a RLS de `member_invites`/`establishment_members` desde a Fase 1 já permite isso para owner/manager) — só o aceite e a prévia pública precisam de RPC.
- `modules/identity/`: `schemas/sign-up.schema.ts`, `application/sign-up.ts` — cadastro de conta **só** usado no fluxo de aceite de convite (nunca uma rota pública de cadastro geral, para não confundir com "conta de consumidor", proibida no MVP). Trata explicitamente o caso em que o projeto Supabase exige confirmação de e-mail (sem sessão imediata).
- `app/(auth)/convite/[token]/`: página pública (fora do grupo `(establishment)`, porque o usuário pode não ter nenhum estabelecimento ainda) — prévia do convite, formulário de criar conta + aceitar numa submissão só, ou link para entrar com conta existente. `app/(auth)/entrar/` ganhou suporte a `?next=` (validado como caminho relativo interno, nunca um redirect aberto) para voltar exatamentar para o convite após o login.
- `app/(establishment)/painel/equipe/`: lista de membros (papel, estado, ativar/desativar/alterar papel — owner nunca aparece editável por manager, RLS já bloqueia) e convites pendentes com link copiável (docs/02 §6 — sem provedor de e-mail configurado, nunca finge que enviou).
- `modules/catalog/`: `schemas/business-hours.schema.ts`, `domain/business-hours-labels.ts`, `application/business-hours.ts` (grade semanal, exceções por data, toggle `accepting_orders`) — a RLS já existia desde a Fase 3, só faltava a camada de aplicação. `app/(establishment)/painel/horarios/`.
- `modules/operations/application/get-establishment-dashboard.ts`: agrega pedidos de hoje por coluna do KDS (reaproveita `boardColumnFor` da Fase 6) + tempo médio simples de entrega + solicitações de conta ativas. `app/(establishment)/painel/page.tsx` virou um dashboard de verdade (cards + navegação), não só uma lista de links.
- `modules/billing/`: `application/get-subscription-overview.ts` (leitura própria do estabelecimento — plano, período, prazo adicional, faturas), `application/{list-plans,create-plan,update-plan}.ts` + `schemas/plan.schema.ts` (código nunca muda após criado; editar/desativar plano nunca reescreve fatura já emitida, que é um snapshot). `app/(establishment)/painel/assinatura/` e `app/(platform)/admin-geral/planos/`.
- `modules/platform-admin/`: `application/{get-dashboard-summary,list-establishments,create-establishment,update-establishment,list-admins,add-admin,update-admin}.ts` + schemas. `create-establishment.ts` usa o cliente admin do início ao fim (cria o usuário do owner via `auth.admin.createUser`, gera senha temporária mostrada uma única vez, compensa removendo o usuário se o bootstrap na tabela falhar). `add-admin.ts` **não cria contas novas** — só promove quem já tem login a administrador da plataforma (buscado por e-mail em `profiles`).
- `modules/audit/`: `domain/action-labels.ts`, `schemas/audit-filter.schema.ts`, `application/list-audit-logs.ts` — primeira vez que `audit_logs` é lido de volta pela aplicação (até aqui só era escrito, sempre dentro de funções `SECURITY DEFINER`). `platform_support` não vê `before_data`/`after_data` (docs/02 §4, matriz da plataforma: auditoria é "L limitada" para support). `app/(platform)/admin-geral/auditoria/`.
- `app/(platform)/admin-geral/`: `page.tsx` virou o dashboard geral de verdade (contagem por status de assinatura, faturas por status, valor confirmado no mês, vencimentos em 7 dias, suspensões recentes); `estabelecimentos/` ganhou filtros (nome/documento/cidade/responsável via busca textual sobre `owner_contact_name` — campo já existia na tabela desde a Fase 1 mas nunca fora usado —, status, plano) e `novo/` (cadastro completo); `estabelecimentos/[id]/` ganhou formulário de edição cadastral/ativação e a lista de equipe do estabelecimento.
- `proxy.ts`: passou a repassar o pathname atual via header (`x-invoke-path`) para o layout do painel do estabelecimento conseguir liberar `/painel/assinatura` mesmo com o acesso operacional bloqueado, sem contornar o gate para nenhuma outra rota (ver D-037 — regra do docs/09 §10 que não era atendida antes desta fase).

### Bug de segurança pré-existente encontrado e corrigido (D-033)

A verificação de bundle desta fase (mais abrangente que as anteriores — inspecionou `.next/static` por completo, não só nomes específicos) encontrou que `lib/env/index.ts` vazava os **nomes** de todas as variáveis de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, as 4 pimentas) para o bundle do cliente desde pelo menos a Fase 6, por falta de `import "server-only"` nesse módulo. `getPublicEnv` foi extraído para `lib/env/public.ts` (sem a guarda, seguro para `"use client"`); `lib/env/index.ts` ganhou a guarda. Nenhum valor real chegou a vazar (só os nomes) — confirmado por grep dos valores reais de `.env.local` contra o bundle, além do grep de nomes já usado nas fases anteriores.

### Outro bug real encontrado e corrigido durante a verificação (D-034)

`/admin-geral/estabelecimentos` e `/admin-geral/auditoria` quebravam com erro genérico ao submeter o formulário de filtro com os `<select>` em "Todos" (string vazia não tratada por `.optional()` — mesma classe de bug de D-018). Corrigido com um helper compartilhado novo, `lib/validation/empty-to-undefined.ts`.

### Testes

- `supabase/tests/0007_team_and_platform_admin.sql`: mesmo formato dos testes anteriores (fixtures + asserções + `rollback` final, nunca persiste dados). Cobre: aceite de convite feliz (papel correto, associação criada); reaceitar convite já usado falha (`IM041`); e-mail divergente falha (`IM042`); convite revogado/expirado falham (`IM040`, sem distinguir um do outro — evita enumeração); `get_member_invite_preview` fail-closed (revogado e inexistente retornam `valid:false` igual); `list_establishment_team` só para owner/manager (kitchen barrado com `42501`); guarda do último `super_admin` (rebaixar um de dois é permitido; desativar/remover o último falha com `23514`) — neutralizando primeiro qualquer `super_admin` real pré-existente no banco compartilhado, já que esse guard não tem escopo de tenant (ver comentário no próprio arquivo).
- **Executado com sucesso via MCP contra `imenu-dev` em 06/08/2026** — todas as asserções passaram, nenhuma linha persistida (verificado por contagem pós-rollback).
- `tests/unit/phase8-schemas.test.ts`: 19 testes cobrindo validação de horário de funcionamento (fechado dispensa horário, fechamento antes da abertura é rejeitado), convite (papel/e-mail), atualização de membro, plano (código kebab-case, preço não-negativo, `updatePlanSchema` sem campo `code`) e rótulo de auditoria com fallback para ações desconhecidas.

### Verificação manual em navegador

Fluxo completo testado via Playwright headless contra o servidor de dev real + `imenu-dev` real (não simulado), como owner (`owner-cantina@imenu.demo`) e superadmin (`superadmin@imenu.demo`): dashboard do painel com cards reais; criar convite de equipe → link copiável exibido → revogar um convite pendente (some da lista); alternar "Aceitar novos pedidos"; página de assinatura completa; dashboard geral do superadmin com contagens reais; filtrar estabelecimentos por nome (encontra "Cantina da Nonna") e por status/plano "Todos" (não quebra mais, ver D-034); formulário de novo estabelecimento com o select de planos populado; criar e editar um plano; listar administradores da plataforma; auditoria com filtros. **Fluxo de aceite de convite verificado de duas formas**: (1) ponta a ponta via RPC direto no teste SQL (0007); (2) em navegador real para um usuário **já autenticado** que recebe um convite (login como `superadmin@imenu.demo`, aceitar convite de "Cantina da Nonna" como `viewer`, confirmado no banco e depois revertido — não é dado de demonstração permanente). O caminho de **cadastro de conta nova durante o aceite** não pôde ser verificado de ponta a ponta em navegador: o projeto `imenu-dev` tem confirmação de e-mail habilitada no Supabase Auth e o SMTP padrão do Supabase tem limite de taxa (`429: email rate limit exceeded`) — o código trata esse caso corretamente (mensagem clara em português, sem crash, sem vazamento), mas a criação real da conta não foi observada em navegador. Zero erros de console em todas as sessões de teste. Todos os artefatos de teste (convites, plano e associação de teste) foram removidos do banco ao final.

