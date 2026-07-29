# 12 — Plano de implementação do MVP

## 1. Princípio

Construir por **fatias verticais**: banco, regra, API, interface e teste do mesmo fluxo. Evitar criar todas as telas com dados falsos para só depois integrar.

## 2. Fase 0 — Diagnóstico e fundação

Entregas:

- inventário do repositório;
- decisão entre iniciar projeto ou adaptar existente;
- Next.js + TypeScript estrito + Tailwind;
- scripts de lint, typecheck, test, e2e e build;
- configuração Supabase local;
- `.env.example`;
- estrutura modular;
- CI básica;
- design tokens iniciais.

Gate:

- aplicação abre;
- lint, tipos, teste mínimo e build passam;
- nenhum segredo versionado.

## 3. Fase 1 — Identidade, tenancy e RLS

Entregas:

- migrações de profiles, establishments, members, platform_admins e invites;
- Auth SSR/cookies;
- login;
- seleção de tenant;
- helpers de papel;
- políticas RLS;
- teste de isolamento;
- layouts protegidos dos dois painéis.

Gate:

- usuário A não acessa tenant B;
- papéis básicos funcionam;
- superadmin separado.

## 4. Fase 2 — Assinatura e gate de acesso

Entregas:

- plans, subscriptions, invoices, payments e events;
- serviço `evaluateEstablishmentAccess`;
- superadmin mínimo para estabelecimento/plano/assinatura/fatura;
- confirmação de pagamento;
- job idempotente de atraso;
- bloqueio público/operacional;
- auditoria financeira.

Gate:

- AC-SUB-001 a AC-SUB-004 passam.

Motivo da antecipação: todos os demais módulos precisam respeitar o gate de assinatura.

## 5. Fase 3 — Catálogo e mídias

Entregas:

- categorias, produtos, grupos e opções;
- CRUD do estabelecimento;
- rascunho, prévia, publicação, esgotado e arquivo;
- upload validado;
- cache/invalidação;
- seed de cardápio.

Gate:

- rascunho não é público;
- mídia válida funciona;
- tenant cruzado falha;
- pedido histórico ainda não existe, mas modelagem de snapshot está pronta.

## 6. Fase 4 — Mesas, QR e cardápio público

Entregas:

- mesas e tokens;
- QR PNG/SVG;
- rotação;
- rota pública;
- contexto anônimo/cookie;
- cardápio mobile;
- detalhe do produto e carrinho local;
- horários e pausa de pedidos.

Gate:

- QR válido/ inválido/rotacionado;
- cardápio público fiel ao publicado;
- fechado/pausado/suspenso corretos.

## 7. Fase 5 — Pedido transacional

Entregas:

- sessões de mesa;
- orders, items, options e history;
- RPC/serviço transacional;
- preço no servidor;
- idempotência;
- snapshots;
- confirmação e rastreamento público;
- erros de preço/item.

Gate:

- AC-ORD-001 a AC-ORD-008 no nível API/integração.

## 8. Fase 6 — Operação em tempo real

Entregas:

- KDS;
- assinatura Realtime;
- alertas;
- transições;
- reconexão e polling;
- filtros/status;
- disponibilidade rápida.

Gate:

- pedido aparece e percorre todos os estados;
- nenhuma transição inválida;
- reconexão recupera estado.

## 9. Fase 7 — Conta e fechamento da mesa

Entregas:

- bill_requests;
- tela pública;
- caixa;
- estados e histórico;
- fechamento de sessão;
- total informativo.

Gate:

- AC-BILL-001 e AC-BILL-002.

## 10. Fase 8 — Administração completa

Entregas:

- dashboard do estabelecimento;
- equipe/convites;
- horários/configurações;
- página de assinatura;
- dashboard geral;
- filtros;
- administradores da plataforma;
- auditoria consultável.

Gate:

- matriz de permissões coberta;
- owner bloqueado ainda vê cobrança;
- último owner/superadmin protegido.

## 11. Fase 9 — Robustez e entrega

Entregas:

- todos os testes P0;
- acessibilidade;
- performance;
- headers e rate limit;
- logs;
- seed/demonstração;
- deploy staging;
- checklist manual;
- documentação real;
- plano de rollback.

Gate:

- `docs/16_DEFINITION_OF_DONE.md` integralmente atendido.

## 12. Ordem interna por fase

1. migração/constraint;
2. RLS;
3. tipos e schema Zod;
4. serviço/regra;
5. endpoint/server action;
6. interface;
7. testes;
8. documentação/status.

## 13. Política de mocks

Mocks podem existir apenas:

- em testes;
- no seed;
- para e-mail, observabilidade ou provider externo não configurado;
- claramente identificados por ambiente.

É proibido entregar telas principais ligadas a arrays estáticos e declarar fluxo concluído.

## 14. Commits sugeridos

- `chore: bootstrap imenu`
- `feat(auth): add multi-tenant access`
- `feat(billing): enforce subscription gate`
- `feat(catalog): manage and publish menu`
- `feat(tables): generate table qr codes`
- `feat(orders): create transactional orders`
- `feat(operations): add realtime kds`
- `feat(billing): add table bill requests`
- `feat(admin): complete tenant and platform panels`
- `test: cover critical mvp journeys`
- `docs: finalize runbook and delivery`

Não fazer commit automático se o usuário não tiver autorizado; a lista representa unidades coesas.

## 15. Estimativa relativa

| Fase | Complexidade |
|---|---|
| 0 | Baixa |
| 1 | Alta |
| 2 | Alta |
| 3 | Média/alta |
| 4 | Média |
| 5 | Muito alta |
| 6 | Alta |
| 7 | Média |
| 8 | Alta |
| 9 | Alta |

As fases 1, 2 e 5 não devem ser comprimidas às custas de segurança ou transação.

