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

