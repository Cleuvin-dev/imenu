# 09 — Assinaturas, inadimplência e painel geral

## 1. Objetivo

O iMenu é um SaaS pago por estabelecimento. O MVP precisa permitir controle completo de contrato e acesso mesmo sem integração com gateway: o administrador geral cria faturas, confirma pagamentos e o sistema suspende vencidos automaticamente.

## 2. Escopo comercial do MVP

- Uma assinatura por estabelecimento.
- Um plano vigente por assinatura.
- Periodicidade mensal por padrão.
- Faturas criadas administrativamente ou por job.
- Pagamento confirmado manualmente.
- Suspensão automática baseada em fatura vencida.
- Prazo adicional opcional.
- Reativação após regularização.
- Histórico imutável de eventos.

Fora do MVP: checkout do owner, cartão salvo, Pix automático, boleto, recorrência por gateway e nota fiscal.

## 3. Planos

Campos:

- código estável;
- nome comercial;
- preço mensal em centavos;
- periodicidade;
- limites (`products`, `tables`, `members`, `media_storage_mb`);
- recursos;
- ativo/inativo.

Sugestão inicial para seed, não decisão comercial definitiva:

| Plano | Produtos | Mesas | Usuários | Armazenamento |
|---|---:|---:|---:|---:|
| Essencial | 100 | 30 | 5 | 2 GB |
| Profissional | 300 | 100 | 15 | 10 GB |

O administrador pode ajustar antes de produção. A desativação de um plano impede novas assinaturas, sem quebrar as existentes.

## 4. Ciclo de cobrança

1. Assinatura é criada em `trialing` ou `active`.
2. Fatura representa um período e tem `due_at`.
3. Fatura `open` antes do vencimento.
4. Ao vencer sem pagamento, vira `overdue`.
5. Assinatura vira `past_due`.
6. Se não existir `grace_until` futuro, vira `suspended`.
7. Pagamento integral confirmado muda fatura para `paid`.
8. Se não houver outra fatura vencida bloqueante e não houver bloqueio manual, assinatura volta para `active`.

O job deve ser idempotente: rodar várias vezes não cria eventos ou faturas duplicadas.

O gate de acesso não deve confiar somente no último status gravado. Ele também verifica faturas vencidas, `grace_until` e suspensão manual, evitando uma janela indevida de acesso entre o vencimento e a próxima execução do job.

## 5. Job de inadimplência

Executar a cada hora ou, no mínimo, diariamente. Algoritmo:

1. adquirir lock lógico/advisory para evitar duas execuções concorrentes;
2. localizar faturas `open` com `due_at < now`;
3. alterar para `overdue`;
4. localizar assinaturas com fatura vencida não paga;
5. alterar para `past_due`;
6. suspender quando `grace_until` for nulo/passado;
7. registrar `subscription_event` e `audit_log` do sistema;
8. devolver contagens;
9. não apagar nem alterar catálogo/pedidos.

O endpoint de cron exige segredo e não aceita invocação de navegador autenticado.

## 6. Confirmação de pagamento

Campos exigidos:

- fatura;
- valor recebido;
- data/hora;
- método (`pix`, `boleto`, `transfer`, `cash`, `card`, `other`);
- referência/comprovante textual opcional;
- observação;
- administrador responsável.

Regras:

- o MVP aceita apenas quitação integral de uma fatura;
- pagamento duplicado é impedido;
- valor deve coincidir, salvo fluxo de correção explicitamente autorizado;
- confirmação cria `payment`, atualiza fatura e reavalia assinatura em uma transação;
- reativação só ocorre se todas as pendências bloqueantes estiverem resolvidas;
- toda ação gera auditoria.

## 7. Correção/estorno

Não excluir pagamento. Criar reversão:

- muda pagamento para `reversed`;
- exige motivo;
- reabre/reavalia fatura;
- reavalia assinatura;
- registra ator, antes/depois e evento.

## 8. Prazo adicional

- Campo `grace_until`.
- Somente `super_admin` ou `platform_admin`.
- Exige motivo.
- Não marca fatura como paga.
- Mantém serviço enquanto a data estiver no futuro.
- Ao expirar, o próximo job suspende se a pendência persistir.
- Remover o prazo também gera auditoria e reavaliação imediata.

## 9. Suspensão manual

Casos: solicitação comercial, suspeita de fraude, encerramento ou outro motivo.

- Independente de fatura.
- Exige motivo e nota.
- Tem precedência sobre reativação automática.
- Somente admin da plataforma.
- Reativação manual também exige justificativa.

## 10. Comportamento durante suspensão

### Consumidor

Exibir página neutra:

> “O cardápio deste estabelecimento está temporariamente indisponível. Procure a equipe do local.”

Não mencionar inadimplência ao consumidor.

### Funcionários

- operação, cardápio e configurações bloqueados;
- mostrar razão genérica e orientação para o owner;
- não permitir novos pedidos nem alterações operacionais;
- sessões abertas e histórico são preservados.

### Owner

- acesso limitado à tela de assinatura, faturas, dados de contato e suporte;
- não pode contornar o bloqueio alterando URL.

### Plataforma

- acesso integral conforme papel;
- ações auditadas.

## 11. Cancelamento

- Não apaga dados.
- Impede operação.
- Registra data e motivo.
- Não pode ser confundido com exclusão LGPD.
- Reativar uma assinatura cancelada deve criar evento explícito e novo período; pode exigir nova assinatura, conforme decisão comercial.

## 12. Dashboard geral

Indicadores:

- total de estabelecimentos;
- trialing, active, past_due, suspended e canceled;
- faturas abertas, vencidas, pagas e anuladas;
- valor confirmado no mês;
- vencimentos nos próximos 7 dias;
- suspensões recentes.

Os totais devem vir de queries agregadas consistentes. Receita no MVP significa pagamentos confirmados, não faturamento fiscal.

## 13. Filtros e detalhe

Busca por:

- nome fantasia/razão social;
- CNPJ/documento;
- owner;
- cidade/UF;
- plano;
- status;
- vencimento.

Detalhe do estabelecimento:

- cadastro;
- membros principais;
- plano/assinatura;
- faturas/pagamentos;
- bloqueios e prazos;
- eventos;
- auditoria.

## 14. Preparação para gateway futuro

Persistir campos opcionais:

- `billing_provider`;
- `external_customer_id`;
- `external_subscription_id`;
- `external_invoice_id`;
- `external_payment_id`;
- `external_event_id`.

Encapsular confirmação em `BillingProvider` e serviço de domínio. O provider futuro não pode escrever status livremente; deve invocar as mesmas regras transacionais do fluxo manual.
