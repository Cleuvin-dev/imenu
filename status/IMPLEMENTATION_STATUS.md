# Status de implementação — iMenu MVP

**Atualizado em:** 30/07/2026 (Fase 5 concluída)  
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

## Fases

| Fase | Estado | Evidência/observação |
|---|---|---|
| 0 — Diagnóstico e fundação | Concluída (29/07/2026) | Repositório reestruturado (docs movidos para a raiz), Git inicializado **e primeiro commit publicado** (`9d41953`, `https://github.com/Cleuvin-dev/imenu.git`, branch `main`), Next.js 16 + TypeScript estrito + Tailwind v4 scaffolded, estrutura modular criada (`app/`, `components/`, `modules/`, `lib/`, `supabase/`, `tests/`, `public/`), design tokens do iMenu em `app/globals.css`, `.env.example`/`lib/env` com validação Zod, CI básica em `.github/workflows/ci.yml`, projeto Supabase de dev `imenu-dev` criado. `npm run lint`, `npm run typecheck`, `npm test` (6/6) e `npm run build` passam; `npm run start` respondeu HTTP 200 na home. Nenhum segredo versionado (`.env.local` ignorado por `.gitignore`). |
| 1 — Identidade, tenancy e RLS | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; RLS ativa/forçada e testada (script SQL com rollback, sem persistir dados); login e seleção de tenant funcionando; layouts protegidos de `/painel` e `/admin-geral`; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 1 concluída" acima para detalhes. |
| 2 — Assinatura e gate | Concluída (29/07/2026) | 5 migrações aplicadas em `imenu-dev` via MCP; AC-SUB-001 a AC-SUB-004 testados via script SQL (rollback completo); job de cron autenticado por segredo; gate aplicado no painel do estabelecimento; superadmin mínimo de estabelecimentos/faturas; `npm run lint`, `npm run typecheck`, `npm test` (13/13) e `npm run build` passam. Ver seção "Fase 2 concluída" acima. |
| 3 — Catálogo e mídias | Concluída (29/07/2026) | 6 migrações aplicadas em `imenu-dev` via MCP (tabelas, RLS, funções, storage, índices); AC-CAT-001 testado via script SQL; upload validado por magic bytes (13 testes unitários); categorias/produtos/opções/mídia funcionando de ponta a ponta, testado em navegador real; `npm run lint`, `npm run typecheck`, `npm test` (26/26) e `npm run build` passam. Ver seção "Fase 3 concluída" acima. |
| 4 — Mesas, QR e público | Concluída (29/07/2026) | 7 migrações aplicadas em `imenu-dev` via MCP (mesas, sessão anônima, RPCs de cardápio público, horário de funcionamento); AC-PUB-001, AC-PUB-002 e AC-QR-001 testados via script SQL (rollback completo); QR PNG/SVG por mesa com regeneração de token; cardápio público mobile + carrinho local testados de ponta a ponta em navegador real; `npm run lint`, `npm run typecheck`, `npm test` (26/26) e `npm run build` passam. Ver seção "Fase 4 concluída" acima. |
| 5 — Pedido transacional | Concluída (30/07/2026) | 9 migrações aplicadas em `imenu-dev` via MCP (sessão de mesa, pedidos/itens/opções/histórico, `create_public_order`, `transition_order_status`, `get_public_order`, índices); AC-ORD-002 a 008 testados via script SQL (rollback completo); carrinho público conectado de ponta a ponta (testado em navegador real contra o servidor de dev + Supabase real, pedido de verdade criado e transicionado); painel de pedidos com transições por papel; `npm run lint`, `npm run typecheck`, `npm test` (40/40) e `npm run build` passam. Ver seção "Fase 5 concluída" acima. |
| 6 — Operação em tempo real | Não iniciada | Próxima fase. |
| 7 — Conta e sessão da mesa | Não iniciada | — |
| 8 — Administração completa | Não iniciada | — |
| 9 — Robustez e deploy | Não iniciada | — |

Estados permitidos: `Não iniciada`, `Em andamento`, `Bloqueada`, `Concluída`.

## Verificações

| Verificação | Último resultado | Data |
|---|---|---|
| Lint | Passou (`npm run lint`) | 30/07/2026 |
| Typecheck | Passou (`npm run typecheck`) | 30/07/2026 |
| Unitários | Passou — 40/40 (`npm test`) | 30/07/2026 |
| Integração/RLS | Passou — `0001_identity_tenancy_rls.sql`, `0002_billing_subscription_gate.sql`, `0003_catalog_gate.sql`, `0004_public_menu_gate.sql` e `0005_orders_transactional.sql` executados via MCP contra `imenu-dev` (todas as asserções OK, rollback completo). Ainda não rodam em `npm test`/CI: exigem conexão Postgres direta (Docker/Supabase local indisponível — mesmo bloqueio da Fase 0) | 30/07/2026 |
| E2E P0 | `npm run test:e2e` roda mas não encontra nenhum arquivo `*.spec.ts` — Playwright configurado (`playwright.config.ts`) porém nenhum teste E2E formal foi escrito ainda; verificação end-to-end até aqui foi feita via scripts Playwright ad-hoc descartáveis (ver "Verificação manual em navegador" de cada fase) | 30/07/2026 |
| Build | Passou (`npm run build`) | 30/07/2026 |
| Segurança (AC-SEC-001) | Passou — `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET`/`ORDER_TRACKING_TOKEN_PEPPER`/`IP_HASH_PEPPER` (nome e valor) ausentes de `.next/static` | 30/07/2026 |
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
| Senha da conta demo `admin@imenu.local` desconhecida nesta sessão | — | Impediu login via navegador para clicar fisicamente nos botões de `/painel/pedidos` (Fase 5); a lógica foi validada por RPC direto (D-023) | Informativo — não bloqueia entrega, só limita a forma de evidência de UI |

## Última entrega

- Fase 5 concluída: pedido transacional (ver seção "Fase 5 concluída" acima para a lista completa de migrações e arquivos).
- Arquivos principais: `supabase/migrations/20260730100000..100008_*.sql`, `supabase/tests/0005_orders_transactional.sql`, `tests/unit/ordering-domain.test.ts`, `lib/rate-limit/`, `modules/ordering/`, `app/api/public/orders/`, `app/(public)/pedido/[trackingToken]/`, `app/(public)/m/[establishmentSlug]/t/[tableToken]/carrinho/cart-client.tsx`, `modules/service-session/domain/cart.ts`, `app/(establishment)/painel/pedidos/`.
- Verificado em 30/07/2026: `npm run lint`, `npm run typecheck`, `npm test` (40/40) e `npm run build` passam. `npm run test:e2e` roda sem erro mas não encontra nenhum arquivo de teste (bloqueio já conhecido). Testes AC-ORD-002 a 008 executados via MCP contra `imenu-dev` com sucesso (rollback completo). Fluxo completo do consumidor (QR → produto → carrinho → **enviar pedido de verdade** → acompanhamento público, token/QR inválidos) testado em navegador real via Playwright contra o servidor de dev + `imenu-dev` reais, sem erros de console; o pedido criado foi conferido no banco e depois transicionado para `accepted` via RPC direto, com a página de acompanhamento refletindo a mudança. Ver D-023 para a lacuna de verificação do lado do painel (sem senha da conta demo).
- **Working tree com alterações pendentes de commit** — esta sessão não commitou nem fez push; aguardando instrução do responsável.

## Onde retomar (próxima sessão)

- **Repositório:** último commit publicado em `origin/main` continua sendo `d078905` (Fases 0–4). As mudanças da Fase 5 estão no working tree local, ainda sem commit.
- **Próxima etapa a iniciar: Fase 6 — Operação em tempo real.** Escopo (docs/12): KDS (kitchen display), assinatura Realtime do Supabase para pedidos/disponibilidade, alertas sonoros/visuais para pedido novo, reconexão com invalidação de cache (não confiar só em eventos perdidos), polling de segurança a cada 15s, filtros por status, disponibilidade rápida direto do KDS.
- **Pendência bloqueante para operações reais de cron/bootstrap:** `SUPABASE_SERVICE_ROLE_KEY` do projeto `imenu-dev` **continua vazia** em `.env.local` — só o dono do produto consegue pegar em `https://supabase.com/dashboard/project/vvqhvnnsnhwoywbaxcwg/settings/api-keys`.
- **Pendências externas sem prazo definido:** domínio final, projetos Supabase de staging/produção, valores comerciais dos planos reais, e-mail transacional, leaked password protection, senha da conta demo (ver tabela "Bloqueios externos").
- **Observações técnicas para quem continuar:**
  - `middleware.ts` foi renomeado para `proxy.ts` (convenção do Next.js 16.2).
  - Lição repetida três vezes nas fases anteriores (D-015, D-017): funções novas podem receber `GRANT EXECUTE` para `anon`/`authenticated` de duas formas diferentes — via `PUBLIC` (`revoke ... from public` resolve) ou via grant nomeado direto (só `revoke ... from <papel>` nomeado resolve). Nesta fase, o padrão `revoke all ... from public, <papel>` seguido de `grant` só para quem precisa funcionou corretamente já na primeira tentativa para as 3 funções novas (confirmado por `has_function_privilege`, não só pelo advisor).
  - `eslint.config.mjs` ignora variáveis/parâmetros prefixados com `_`; `react-hooks/set-state-in-effect` é desabilitado pontualmente onde `localStorage` é lido em `useEffect` (padrão SSR-safe, legítimo).
  - `lib/env/index.ts`: variáveis genuinamente opcionais usam `z.preprocess` para tratar string vazia como ausente (D-018).
  - `guest_sessions`, `orders`, `order_items`, `order_item_options`, `order_status_history` e `table_service_sessions` não têm policy de RLS de escrita para `anon`/`authenticated` — toda escrita passa por função `SECURITY DEFINER`. Isso é intencional, não uma lacuna.
  - **Módulos com `import "server-only"` não podem ser importados por testes unitários** (o pacote `server-only` não está instalado — só o bundler do Next.js sabe resolvê-lo via shim especial; o Vitest quebra). Por isso `lib/rate-limit/memory.ts` existe separado de `lib/rate-limit/index.ts`: a lógica pura (testável) fica sem o import, a orquestração (`server-only`, lê env) fica em `index.ts`. Ao adicionar lógica de domínio testável em um módulo que hoje é `server-only`, considere o mesmo split.
  - Token de rastreamento do pedido (`orders.public_tracking_token_hash`) é um HMAC determinístico de `clientRequestId` (não um valor aleatório hasheado) — ver D-019 para o motivo (retry idempotente precisa devolver o mesmo token sem reler o banco).
  - `create_public_order` recebe só `tableToken` (não `establishmentSlug`) — ver D-020. O parâmetro `p_expected_total_cents`/`p_items` têm default no Postgres para poderem ser omitidos pelo cliente Supabase-js quando ausentes (evita ter que enviar `null` explicitamente).
  - Dado de demonstração desta fase: o pedido `A001` criado durante a verificação em navegador (Suco de Laranja, Mesa 7) ficou persistido em `imenu-dev` no status `accepted` — mesmo regime de D-016, não é seed formal.

## Dado de demonstração adicional (30/07/2026, fora das fases) — "Cantina da Nonna"

A pedido do responsável, criado um segundo estabelecimento fictício completo em `imenu-dev` só para visualização (categorias, 10 produtos publicados com foto placeholder, grupo de opções de tamanho na pizza, mesa com QR real, dono próprio). Ver `status/DECISION_LOG.md` D-024 para detalhes e para a lição sobre login real de usuário inserido manualmente (`auth.identities` + colunas de token vazias em vez de `NULL`). Mesmo regime de D-016: não é seed formal, remover/desativar antes de produção.

