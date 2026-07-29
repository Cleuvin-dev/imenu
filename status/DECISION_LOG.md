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

