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

## D-019 — Token de rastreamento do pedido: HMAC determinístico do `clientRequestId`, não hash de valor aleatório

- **Data:** 30/07/2026
- **Contexto:** `orders.public_tracking_token_hash` (docs/07 §6) precisa, ao mesmo tempo, (1) nunca guardar um segredo utilizável em texto puro, e (2) devolver exatamente o mesmo `trackingToken` numa repetição idempotente da mesma `clientRequestId` (AC-ORD-005) — sem uma segunda ida ao banco para "lembrar" o valor original. Gerar um token aleatório dentro do banco (como `dining_tables.public_token`) e devolvê-lo cru resolveria (1), mas quebraria (2): na repetição, só teríamos o hash salvo, não o valor original para devolver ao cliente.
- **Decisão:** o token de rastreamento é `HMAC-SHA256(ORDER_TRACKING_TOKEN_PEPPER, clientRequestId)`, calculado em Node (`modules/ordering/domain/tracking-token.ts`) e passado pronto para `create_public_order`, que só grava e compara — nunca calcula. Por ser determinístico a partir de um `clientRequestId` que o próprio cliente já gerou, um retry recalcula exatamente o mesmo token de forma independente, sem precisar reler nada do banco; por depender de uma pimenta que só o servidor conhece, ninguém consegue derivar o token a partir do `clientRequestId` sozinho.
- **Alternativas consideradas:** gerar o token aleatório dentro de `create_public_order` (como o QR da mesa) e devolvê-lo cru, hash simples guardado — rejeitada porque quebra o retry idempotente (o valor original não seria recuperável na segunda chamada) sem adicionar uma tabela de cache de resposta só para isso.
- **Impacto:** nenhum — a pimenta (`ORDER_TRACKING_TOKEN_PEPPER`) já existia no schema de ambiente desde antes desta fase, antecipando exatamente este uso.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-020 — `create_public_order` recebe só `tableToken`, sem `establishmentSlug`

- **Data:** 30/07/2026
- **Contexto:** a primeira versão da função foi escrita espelhando `get_public_menu(slug, token)`, mas o contrato público documentado (`docs/08 §2`, `POST /api/public/orders`) só lista `tableToken` no corpo da requisição — sem `establishmentSlug`. Como `dining_tables.public_token` já é único globalmente (`unique` na tabela, Fase 4), o estabelecimento é sempre derivável só a partir do token.
- **Decisão:** removido o parâmetro `p_establishment_slug` (`supabase/migrations/20260730100007_create_public_order_drop_slug_param.sql`, corretiva sobre a migração original, sem editá-la). O serviço Node (`modules/ordering/application/create-public-order.ts`) também não recebe mais o slug.
- **Alternativas consideradas:** manter os dois parâmetros por "defesa extra" — rejeitada por divergir do contrato documentado sem necessidade real (o token sozinho já garante o isolamento de tenant corretamente).
- **Impacto:** nenhum — pego antes de qualquer uso real, ainda durante a implementação.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-021 — Sem tabela genérica `idempotency_records` nesta fase

- **Data:** 30/07/2026
- **Contexto:** `docs/07 §8` lista `idempotency_records` como tabela de suporte geral. Nesta fase, porém, o único consumidor de idempotência é a criação de pedido, que já tem seu próprio mecanismo suficiente: `orders` tem `unique (establishment_id, client_request_id)` mais a coluna `payload_hash` comparada explicitamente dentro de `create_public_order` — o próprio pedido já criado é a "resposta cacheada" a devolver numa repetição.
- **Decisão:** não criar `idempotency_records` agora. Revisar quando `bill_requests` (Fase 7) precisar de idempotência — mas mesmo ali `docs/07 §6` já prevê um índice único parcial próprio ("solicitação ativa por sessão"), o que pode tornar a tabela genérica desnecessária também naquele caso.
- **Alternativas consideradas:** criar a tabela genérica agora, sem uso real — rejeitada por CLAUDE.md ("não implementar itens fora do MVP sem necessidade real") e pelo princípio de não introduzir abstração antes de haver um segundo consumidor.
- **Impacto:** nenhum no MVP atual; caso surja um segundo consumidor de idempotência com necessidades distintas das já cobertas por constraints/índices específicos, este registro serve de lembrete para reavaliar.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-022 — Rate limit implementado na Fase 5, aplicado também retroativamente ao cardápio público da Fase 4

- **Data:** 30/07/2026
- **Contexto:** CLAUDE.md é explícito e não-negociável: "Endpoints públicos devem validar QR/mesa, disponibilidade, assinatura, horário, payload, idempotência **e limite de requisições**". A Fase 4 implementou todas as outras validações de `get_public_menu`, mas não limite de requisições — lacuna que ficou registrada implicitamente (nenhuma menção em `status/IMPLEMENTATION_STATUS.md` da Fase 4), já que `lib/rate-limit/` era só um diretório vazio até agora. O schema de ambiente já antecipava isso (`RATE_LIMIT_PROVIDER`, `UPSTASH_REDIS_REST_URL/TOKEN`, `IP_HASH_PEPPER` já existiam antes desta sessão).
- **Decisão:** implementar `lib/rate-limit/` (backend `memory` para dev local de instância única; backend `upstash` via chamadas REST simples, sem adicionar `@upstash/redis` como dependência) e aplicar em **dois** lugares: `POST /api/public/orders` (10 requisições/5min por sessão anônima+mesa, o alvo principal desta fase) e, como correção pontual de baixo custo enquanto a infraestrutura já estava sendo construída, também em `getPublicMenu` (60/min por hash de IP+token), fechando a lacuna documentada de CLAUDE.md que a Fase 4 tinha deixado.
- **Alternativas consideradas:** aplicar rate limit só em `/api/public/orders` e registrar a lacuna do cardápio como bloqueio pendente para uma fase futura — rejeitada porque a correção era pequena (uma função já teria toda a infraestrutura pronta) e a regra do CLAUDE.md é textualmente inequívoca sobre "endpoints públicos" no plural, não só o de pedidos.
- **Impacto:** baixo risco — mudança aditiva, sem alterar contrato de resposta (limite excedido em `getPublicMenu` devolve `{valid:false}`, mesmo formato de qualquer outra falha silenciosa já documentada para AC-PUB-002).
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-023 — Verificação em navegador do lado do consumidor completa; lado do painel de pedidos verificado só via SQL/RPC direto

- **Data:** 30/07/2026
- **Contexto:** a verificação em navegador desta fase cobriu de ponta a ponta o fluxo do consumidor contra o servidor de dev real + `imenu-dev` real (QR → produto → carrinho → **enviar pedido de verdade** → página de acompanhamento pública, incluindo token de rastreamento inválido e QR inválido) — zero erros de console. Para o lado do painel (`/painel/pedidos`, aceitar/rejeitar/etc.), não há como autenticar como `admin@imenu.local` neste ambiente: a senha da conta demo não está registrada em lugar nenhum (corretamente, por não dever estar) e `SUPABASE_SERVICE_ROLE_KEY` continua vazia (bloqueio já documentado desde a Fase 0/1), o que impede gerar uma sessão de teste programaticamente.
- **Decisão:** validar a lógica de transição de status (papel, motivo obrigatório, idempotência por `operation_id`, transição inválida) integralmente via `supabase/tests/0005_orders_transactional.sql` (script com rollback, sem persistir dados) — cobre exatamente a mesma função (`transition_order_status`) que as páginas do painel chamam. Adicionalmente, para fechar o laço real, o pedido criado pelo teste de navegador do consumidor foi transicionado para `accepted` via `execute_sql` autenticado como o owner de fato da conta demo (mesmo RPC que o botão do painel chama), e a página pública de acompanhamento confirmou refletir o novo status — evidência de que o caminho ponta a ponta funciona, mesmo sem clicar fisicamente nos botões do painel num navegador autenticado.
- **Alternativas consideradas:** pedir a senha da conta demo ao responsável para poder logar via Playwright — não foi necessário pedir agora porque a cobertura por RPC direto (mesmo código que os botões chamam) mais o teste do lado público já validam a lógica de ponta a ponta; renderização pura das páginas do painel (sem interação) foi confirmada indiretamente pelo build bem-sucedido e pelo redirecionamento correto (307) para `/entrar` quando não autenticado.
- **Impacto:** nenhuma lacuna de segurança ou lógica de negócio — só uma lacuna de "clique físico no botão dentro de um navegador autenticado", que é a forma mais fraca de evidência mesmo quando possível. Registrado para transparência, conforme exigido pelo CLAUDE.md ("não oculte a falha").
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-024 — Segundo estabelecimento de demonstração visual + lição sobre login real de usuário inserido manualmente

- **Data:** 30/07/2026
- **Contexto:** o responsável pediu, antes de iniciar a Fase 6, um estabelecimento fictício com produtos e fotos para ver a plataforma funcionando visualmente, e autorizou explicitamente o uso da conexão MCP com o Supabase para isso. Ao tentar logar de verdade (via `signInWithPassword`, não via `set_config('request.jwt.claims', ...)` como nos scripts de teste) com um usuário inserido manualmente em `auth.users`, o GoTrue devolveu `500 Database error querying schema` / `"error finding user: sql: Scan error on column index 3"`. Duas causas, nenhuma documentada nas fases anteriores porque nenhuma sessão anterior havia tentado um login real via senha contra um usuário criado por SQL direto: (1) faltava a linha correspondente em `auth.identities` (obrigatória para login por senha, não só `auth.users`); (2) colunas de token (`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token`) estavam `NULL` — o driver Go do GoTrue não escaneia `NULL` nessas colunas em campos `string` não anuláveis, mesmo a coluna permitindo `NULL` no schema.
- **Decisão:** para o novo usuário (`owner-cantina@imenu.demo`), inserir também a linha em `auth.identities` (provider `email`, `identity_data` com `sub`/`email`/`email_verified`) e normalizar as colunas de token para `''` em vez de `NULL`. Depois disso, o login real funcionou e o upload das imagens do cardápio foi feito através do fluxo de autenticação real (`signInWithPassword` + `supabase.storage.from('menu-media').upload(...)` + `insert` em `product_media`, tudo respeitando RLS como o próprio dono do estabelecimento) — não via service role, preservando o modelo de segurança documentado.
- **Alternativas consideradas:** usar apenas `set_config('request.jwt.claims', ...)` via SQL para simular a sessão (mais simples, já usado nos scripts de teste) — rejeitada aqui porque o objetivo era demonstrar o fluxo real de upload de mídia como um usuário legítimo faria pela aplicação, não simular a checagem de RLS isoladamente.
- **Impacto:** nenhum dado real exposto; lição prática registrada para qualquer inserção futura de usuário de teste que precise logar de verdade (não apenas para testes de RLS via `set_config`): sempre criar a linha em `auth.identities` e normalizar colunas de token para string vazia.
- **Dado de demonstração criado:** estabelecimento "Cantina da Nonna" (`slug: cantina-da-nonna`), 4 categorias, 10 produtos publicados com foto (placeholder gerado localmente, não é foto real) e 1 grupo de opções (Tamanho, na Pizza Margherita), 1 mesa ("Mesa 1") com QR real, dono `owner-cantina@imenu.demo`. Mesmo regime de D-016: não é seed formal de `docs/14`, deve ser removido/desativado antes de produção (checklist `docs/10 §10`).
- **Aprovado por:** usuário, via pedido direto em 30/07/2026 ("Crie um estabelecimento e alguns produtos fictícios com imagens...", "Se precisar agente conecta no Supabase para os dados subirem para lá também").

## D-025 — Build quebrava sem variáveis de ambiente por causa da ordem `getPublicEnv()` antes de `cookies()`

- **Data:** 30/07/2026
- **Contexto:** ao preparar o primeiro deploy na Vercel, o `npm run build` falhou lá com `ZodError: NEXT_PUBLIC_SUPABASE_ANON_KEY ... received undefined`, interrompendo o build inteiro (`Export encountered an error on /(establishment)/painel/cardapio/page`). Localmente, reproduzi renomeando `.env.local` e rodando `npm run build`: o erro se repetiu, primeiro em `/painel/cardapio` (uma página-folha que só faz `redirect()`, sem chamada dinâmica própria) e, depois de eu ter adicionado `export const dynamic = "force-dynamic"` nos dois layouts protegidos, o mesmo erro reapareceu em `/entrar`. Causa raiz: `createSupabaseServerClient()` (`lib/supabase/server.ts`) chamava `getPublicEnv()` **antes** de `cookies()`. Durante uma tentativa de pré-renderização em build (que o Next.js pode tentar para qualquer página sem sinal claro de que precisa ser dinâmica), `cookies()` é quem sinaliza ao Next para desviar para renderização dinâmica de verdade — mas se o código quebra antes de chegar em `cookies()` (porque `getPublicEnv()` falhou por falta de variável), o Next nunca chega a receber esse sinal e trata como erro fatal de build, não como "esta rota é dinâmica".
- **Decisão:** (1) inverter a ordem em `createSupabaseServerClient()` — `cookies()` sempre primeiro, `getPublicEnv()` depois; (2) manter, como reforço redundante, `export const dynamic = "force-dynamic"` nos layouts de `/painel` e `/admin-geral` (toda a árvore já depende de sessão, nunca deveria ser candidata a pré-renderização estática). Reproduzi de novo localmente sem `.env.local` nenhum: o build passou 100% (todas as rotas `ƒ` dinâmicas), contra a falha original.
- **Alternativas consideradas:** só adicionar `force-dynamic` nos layouts (resolveria os dois casos encontrados, mas não protege qualquer página futura fora dessas duas árvores que use `createSupabaseServerClient()` diretamente, como já era o caso de `/entrar`) — descartada como única solução; mantida como reforço, não como correção principal.
- **Impacto:** nenhum dado exposto; a aplicação nunca dependeu de fato de variáveis de ambiente no momento do build (é 100% dinâmica), então isso só destrava o deploy em qualquer plataforma que rode `next build` antes de as variáveis públicas estarem garantidamente presentes nesse instante.
- **Aprovado por:** decisão técnica autônoma (engenheiro responsável), registrada para transparência.

## D-026 — Primeiro deploy na Vercel + conta de administrador de plataforma de demonstração

- **Data:** 30/07/2026
- **Contexto:** o responsável pediu para deixar a aplicação hospedada (GitHub + Vercel) para acompanhar o progresso, e depois perguntou como acessar o `/admin-geral` (painel do administrador de plataforma) — nenhuma conta com esse papel existia ainda (`admin@imenu.local` e `owner-cantina@imenu.demo` são só donos de estabelecimento).
- **Decisão:** (1) GitHub conectado à Vercel com deploy automático a cada push em `main` (conforme `docs/13`); build corrigido para não depender de variáveis de ambiente em tempo de build (D-025); (2) criado usuário de demonstração `superadmin@imenu.demo` com papel `super_admin` em `platform_admins`, separado das contas de estabelecimento, a pedido explícito do responsável ("crie um usuário novo só para isso").
- **Impacto:** a aplicação está publicamente acessível numa URL da Vercel apontando para o mesmo banco `imenu-dev` (não é ainda o ambiente de produção formal com projeto Supabase exclusivo, conforme `docs/13 §2`). Credenciais de demonstração não ficam neste arquivo nem em nenhum lugar do repositório.
- **Aprovado por:** usuário, via pedidos diretos em 30/07/2026.

## D-027 — Causa raiz do cardápio público sempre "QR Code inválido" na Vercel: `NEXT_PUBLIC_SUPABASE_URL` de produção apontava para o próprio domínio do app

- **Data:** 30/07/2026
- **Contexto:** bug em aberto registrado em `status/IMPLEMENTATION_STATUS.md` ("Primeiro deploy na Vercel... — pausado aqui"): `https://imenu-nu.vercel.app/m/{slug}/t/{token}` sempre renderizava o estado de QR inválido, para qualquer estabelecimento/mesa. O diagnóstico anterior (3 `console.error` temporários em `getPublicMenu`) já apontava para a chamada `supabase.rpc("get_public_menu", ...)`, já que ela nunca aparecia nos logs de API do Supabase.
- **Investigação:** usado o Vercel CLI (via `npx vercel`) para puxar os Runtime Logs reais da produção. O log confirmou que a chamada `POST /rest/v1/rpc/get_public_menu` retornava HTTP 404 — mas o corpo do erro era literalmente o HTML da própria página 404 do app iMenu (título "iMenu — Cardápio digital por QR Code"), não uma resposta do Supabase. Isso só é possível se o cliente Supabase do servidor estivesse montando a URL da chamada a partir de um `NEXT_PUBLIC_SUPABASE_URL` apontando para o próprio domínio da Vercel em vez do projeto Supabase.
- **Decisão:** removida e recriada a variável `NEXT_PUBLIC_SUPABASE_URL` em Production e Preview na Vercel com o valor correto (`https://vvqhvnnsnhwoywbaxcwg.supabase.co`, confirmado via `get_project_url` do MCP do Supabase, não adivinhado), seguido de um redeploy de produção (`vercel deploy --prod`). Testado em seguida contra a URL pública real: `cantina-da-nonna`/Mesa 1 e `restaurante-demo-imenu`/Mesa 7 agora renderizam o cardápio completo, sem nenhum log de erro. Os 3 `console.error` de diagnóstico foram removidos de `modules/service-session/application/get-public-menu.ts` (a função volta a falhar fechado silenciosamente, como documentado no comentário do arquivo).
- **Nota sobre ferramentas:** durante a investigação, `npx vercel` disparou um fluxo de login que se completou sozinho (sessão de navegador já autenticada na máquina) e o projeto local foi vinculado (`vercel link`) ao projeto `imenu` na Vercel — não foi uma ação pré-planejada, mas necessária para acessar os logs reais sem depender de o responsável colar manualmente. `.vercel/` está no `.gitignore`. O valor da variável nunca foi lido diretamente (a ferramenta redige qualquer valor que pareça segredo, mesmo com autorização explícita do responsável) — a correção foi aplicada sobrescrevendo com o valor correto obtido de uma fonte confiável (MCP do Supabase), sem depender de enxergar o valor errado.
- **Impacto:** cardápio público (Fase 4) e fluxo de pedido (Fase 5) voltam a funcionar no deploy real da Vercel. Nenhuma migração ou código de domínio precisou mudar — era puramente configuração de ambiente.
- **Aprovado por:** usuário, que autorizou explicitamente (1) checar o valor via Vercel CLI e (2) sobrescrever e redeployar, via `AskUserQuestion` nesta sessão.

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

