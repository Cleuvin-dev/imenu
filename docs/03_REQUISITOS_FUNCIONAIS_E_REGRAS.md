# 03 — Requisitos funcionais e regras de negócio

## 1. Requisitos do cardápio público

- **RF-PUB-001:** validar estabelecimento e mesa pelo token do QR.
- **RF-PUB-002:** exibir nome, logotipo, capa, status de atendimento e identificação amigável da mesa.
- **RF-PUB-003:** listar apenas categorias ativas e produtos publicados.
- **RF-PUB-004:** permitir busca por nome e descrição.
- **RF-PUB-005:** abrir detalhe com mídia principal, descrição, ingredientes, alergênicos, informação nutricional opcional, preço e opções.
- **RF-PUB-006:** exigir seleções mínimas e máximas dos grupos de opções.
- **RF-PUB-007:** permitir quantidade entre 1 e 20 por item e observação de até 300 caracteres.
- **RF-PUB-008:** manter carrinho local vinculado ao estabelecimento e à mesa.
- **RF-PUB-009:** recalcular preço e disponibilidade no servidor ao confirmar.
- **RF-PUB-010:** criar o pedido uma única vez mesmo após retry.
- **RF-PUB-011:** mostrar número, horário, itens, total e status do pedido.
- **RF-PUB-012:** atualizar status em tempo real, com fallback de consulta.
- **RF-PUB-013:** permitir solicitar conta para a sessão aberta da mesa.
- **RF-PUB-014:** exibir resposta segura para QR inválido, serviço suspenso, local fechado e pedidos pausados.
- **RF-PUB-015:** não expor dados de outros consumidores ou mesas.

## 2. Requisitos de operação

- **RF-OPS-001:** novos pedidos aparecem sem recarregar a página.
- **RF-OPS-002:** emitir alerta visual e sonoro quando o navegador permitir.
- **RF-OPS-003:** permitir ativar/testar som explicitamente.
- **RF-OPS-004:** exibir mesa, número, tempo decorrido, itens, quantidades, adicionais e observações.
- **RF-OPS-005:** filtrar por pendente, em produção, pronto, finalizado e exceção.
- **RF-OPS-006:** validar transições de status.
- **RF-OPS-007:** exigir motivo ao rejeitar ou cancelar.
- **RF-OPS-008:** registrar autor e horário de cada transição.
- **RF-OPS-009:** mostrar solicitações de conta em tempo real.
- **RF-OPS-010:** permitir reconhecer, marcar conta entregue e fechar sessão da mesa.
- **RF-OPS-011:** refazer consulta ao reconectar.
- **RF-OPS-012:** impedir ações operacionais quando o tenant estiver suspenso.

## 3. Requisitos de administração do estabelecimento

- **RF-EST-001:** dashboard com pedidos do dia, pendentes, tempo médio simples e solicitações de conta.
- **RF-EST-002:** criar, editar, ordenar, ativar e arquivar categorias.
- **RF-EST-003:** criar, duplicar, editar, publicar, indisponibilizar e arquivar produto.
- **RF-EST-004:** editar nome, descrição, preço, ingredientes, alergênicos e informação nutricional.
- **RF-EST-005:** configurar grupos de opções obrigatórios/opcionais e seus adicionais de preço.
- **RF-EST-006:** fazer upload, prévia, substituição, ordenação e remoção de imagem/vídeo.
- **RF-EST-007:** visualizar prévia de rascunho sem expô-lo ao público.
- **RF-EST-008:** controlar manualmente se aceita novos pedidos.
- **RF-EST-009:** configurar horário semanal e exceções simples de data.
- **RF-EST-010:** cadastrar, editar, desativar e ordenar mesas.
- **RF-EST-011:** gerar, regenerar e baixar QR em PNG e SVG.
- **RF-EST-012:** convidar, listar, alterar papel e desativar membros conforme permissão.
- **RF-EST-013:** consultar plano, período, faturas e situação da assinatura.
- **RF-EST-014:** impedir publicação de produto sem campos mínimos.

## 4. Requisitos do administrador geral

- **RF-ADM-001:** dashboard com contagem por estado de assinatura e resumo de faturas.
- **RF-ADM-002:** cadastrar estabelecimento e owner inicial.
- **RF-ADM-003:** pesquisar por nome, CNPJ/documento, responsável, cidade, plano e status.
- **RF-ADM-004:** editar dados cadastrais e ativação.
- **RF-ADM-005:** criar, editar e desativar planos sem alterar contratos históricos.
- **RF-ADM-006:** criar fatura para um período.
- **RF-ADM-007:** confirmar pagamento manual com data, valor, método e referência.
- **RF-ADM-008:** marcar correção/estorno com justificativa.
- **RF-ADM-009:** conceder ou remover prazo adicional.
- **RF-ADM-010:** suspender ou reativar manualmente com motivo.
- **RF-ADM-011:** executar suspensão automática de vencidos de forma idempotente.
- **RF-ADM-012:** reativar após regularização quando não houver outra pendência bloqueante.
- **RF-ADM-013:** preservar dados durante suspensão e cancelamento.
- **RF-ADM-014:** gerir administradores autorizados.
- **RF-ADM-015:** registrar auditoria de ações sensíveis.

## 5. Regras de catálogo

1. Categoria arquivada não aparece no menu.
2. Produto `draft` nunca aparece ao público.
3. Produto `published` e `is_available=false` pode aparecer como “Esgotado”, sem botão de adicionar.
4. Produto `archived` não aparece, mas permanece em pedidos históricos.
5. Um produto publicado exige categoria ativa, nome, descrição curta e preço não negativo.
6. Vídeo é recomendado, mas imagem ou placeholder é fallback válido.
7. Preço base e adicionais não podem ser negativos no MVP.
8. O servidor valida mínimo/máximo e pertencimento de opções ao produto.
9. Ao editar produto, pedidos anteriores mantêm snapshots.
10. Excluir significa arquivar quando houver referência histórica.

## 6. Regras do carrinho e pedido

1. Um carrinho contém itens de um único estabelecimento e mesa.
2. Alterar de QR com carrinho existente exige limpar ou confirmar a troca.
3. O navegador envia IDs, quantidade, opções e observação; nunca envia total confiável.
4. O servidor recalcula tudo em transação.
5. Se preço mudou, retornar `PRICE_CHANGED` com resumo atualizado e não criar pedido até nova confirmação.
6. Se produto/opção ficou indisponível, retornar `PRODUCT_UNAVAILABLE`.
7. O total é a soma de `(preço-base + adicionais) × quantidade`.
8. O pedido recebe número legível por estabelecimento e dia, além de UUID.
9. `client_request_id` é único por contexto e garante idempotência.
10. Pedido criado inicia em `pending`.
11. O estabelecimento pode rejeitar ou cancelar com motivo.
12. O consumidor acompanha apenas pedidos cujo token de rastreamento está na sessão segura do navegador.

## 7. Regras da mesa e conta

1. O primeiro pedido cria ou reutiliza uma sessão de atendimento aberta para a mesa.
2. Dispositivos diferentes da mesma mesa podem contribuir com pedidos para a sessão aberta, sem acessar tokens privados uns dos outros.
3. Uma mesa possui no máximo uma sessão de atendimento aberta.
4. A solicitação de conta pertence à sessão da mesa.
5. Deve existir no máximo uma solicitação ativa por sessão; retries retornam a mesma solicitação.
6. Solicitar conta não cancela itens nem fecha a sessão.
7. O caixa fecha a sessão apenas após conferir o atendimento.
8. Após fechar, o próximo pedido abre nova sessão.
9. No MVP, total da sessão é informativo e não representa comprovante fiscal.

## 8. Regras de disponibilidade do serviço

O cálculo deve separar:

- `can_view_menu`;
- `can_place_order`;
- `can_operate`;
- `can_manage_billing`.

| Situação | Ver menu | Fazer pedido | Operar | Ver cobrança |
|---|:---:|:---:|:---:|:---:|
| Trial ativo | Sim | Sim | Sim | Sim |
| Assinatura ativa | Sim | Sim | Sim | Sim |
| Em atraso dentro do prazo adicional | Sim | Sim | Sim | Sim |
| Suspensa por inadimplência | Mensagem de indisponibilidade | Não | Não | Owner |
| Suspensa manualmente | Mensagem de indisponibilidade | Não | Não | Owner |
| Cancelada/tenant desativado | Mensagem de indisponibilidade | Não | Não | Owner limitado |
| Fora do horário | Sim | Não | Sim | Sim |
| Pedidos pausados | Sim | Não | Sim | Sim |

## 9. Limites iniciais

| Campo/recurso | Limite |
|---|---:|
| Nome de estabelecimento | 120 caracteres |
| Nome de categoria | 80 caracteres |
| Nome de produto | 120 caracteres |
| Descrição curta | 240 caracteres |
| Descrição completa | 2.000 caracteres |
| Observação do item | 300 caracteres |
| Categorias ativas | 50 por estabelecimento |
| Produtos ativos | Conforme plano; padrão inicial 300 |
| Imagem | 5 MB |
| Vídeo | 50 MB |
| Duração recomendada de vídeo | até 30 segundos |
| Itens distintos por pedido | 50 |
| Quantidade por item | 20 |
| Mesas | Conforme plano; padrão inicial 100 |
| Convite de equipe | expira em 72 horas |

Os limites comerciais devem ser configuráveis no plano, não hardcoded na interface.

## 10. Requisitos não funcionais

- **RNF-001:** mobile-first no público e responsivo nos painéis.
- **RNF-002:** TypeScript estrito e validação em fronteiras.
- **RNF-003:** isolamento multi-tenant testado.
- **RNF-004:** operação crítica idempotente.
- **RNF-005:** sem segredo privilegiado no cliente.
- **RNF-006:** estados principais acessíveis por teclado e leitor de tela.
- **RNF-007:** contraste compatível com WCAG AA nos fluxos críticos.
- **RNF-008:** rastreabilidade por logs estruturados com `request_id`.
- **RNF-009:** erros ao usuário em português, sem stack trace.
- **RNF-010:** menu navegável em conexão móvel comum, com mídia lazy-loaded.
- **RNF-011:** retomada consistente após reconexão.
- **RNF-012:** build reproduzível com lockfile.

