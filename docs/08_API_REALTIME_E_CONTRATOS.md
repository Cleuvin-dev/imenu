# 08 — API, Realtime e contratos

## 1. Princípios

- API interna versionável, mesmo dentro do monólito.
- Entrada e saída validadas.
- Respostas públicas sem detalhes internos.
- Autorização no servidor.
- Mutação crítica com idempotência.
- Preço calculado no servidor.
- Erros com código estável e mensagem em português.

## 2. Rotas públicas

### `GET /api/public/context/{slug}/{tableToken}`

Retorna dados mínimos do estabelecimento, mesa, disponibilidade e sessão anônima.

### `GET /api/public/menu/{slug}/{tableToken}`

Retorna categorias e produtos publicados. Nunca retorna paths de rascunho, dados de assinatura ou IDs internos desnecessários.

### `POST /api/public/orders`

Request:

```json
{
  "tableToken": "token-publico",
  "clientRequestId": "uuid",
  "expectedTotalCents": 4890,
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "selectedOptionIds": ["uuid"],
      "notes": "Sem cebola"
    }
  ]
}
```

Response `201`:

```json
{
  "order": {
    "trackingToken": "token-rastreamento",
    "number": "A023",
    "status": "pending",
    "totalCents": 4890,
    "currency": "BRL",
    "createdAt": "2026-07-29T18:20:00Z"
  }
}
```

O servidor não utiliza `expectedTotalCents` para calcular; usa apenas para detectar alteração.

### `GET /api/public/orders/{trackingToken}`

Exige vínculo com sessão anônima. Retorna status, linha do tempo, snapshot dos itens e total.

### `POST /api/public/bill-requests`

Request:

```json
{
  "tableToken": "token-publico",
  "clientRequestId": "uuid"
}
```

Cria ou retorna solicitação ativa idempotente.

## 3. Rotas autenticadas do estabelecimento

Prefixo de referência: `/api/establishments/{establishmentId}`. O ID da rota é apenas seletor; a associação é sempre revalidada.

- `GET/POST /categories`
- `PATCH/DELETE /categories/{id}`
- `GET/POST /products`
- `GET/PATCH/DELETE /products/{id}`
- `POST /products/{id}/duplicate`
- `POST /products/{id}/publish`
- `POST /products/{id}/availability`
- `POST /media/upload-intent`
- `DELETE /media/{id}`
- `GET/POST /tables`
- `PATCH /tables/{id}`
- `POST /tables/{id}/rotate-token`
- `GET /tables/{id}/qr?format=png|svg`
- `GET /orders`
- `GET /orders/{id}`
- `POST /orders/{id}/transition`
- `GET /bill-requests`
- `POST /bill-requests/{id}/transition`
- `GET/POST /members`
- `PATCH /members/{id}`
- `GET/POST /invites`
- `POST /invites/{id}/revoke`
- `GET/PATCH /settings`
- `GET /subscription`
- `GET /invoices`

Pode-se usar Server Actions para formulários, desde que os mesmos serviços e validações sustentem testes e segurança.

## 4. Rotas do administrador geral

Prefixo: `/api/platform`.

- `GET/POST /establishments`
- `GET/PATCH /establishments/{id}`
- `POST /establishments/{id}/suspend`
- `POST /establishments/{id}/reactivate`
- `POST /establishments/{id}/cancel`
- `GET/POST /plans`
- `PATCH /plans/{id}`
- `GET/POST /invoices`
- `POST /invoices/{id}/confirm-payment`
- `POST /payments/{id}/reverse`
- `POST /subscriptions/{id}/grant-grace`
- `GET/POST /admins`
- `PATCH /admins/{id}`
- `GET /audit`

Cron:

- `POST /api/internal/cron/process-overdue-subscriptions`
- exige segredo exclusivo e aceita retry idempotente;
- nunca fica disponível por sessão de usuário comum.

## 5. Códigos de erro

| Código | HTTP | Uso |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Payload inválido |
| `INVALID_TABLE_TOKEN` | 404 | QR inválido/desativado |
| `ESTABLISHMENT_UNAVAILABLE` | 503 | Tenant desativado |
| `ESTABLISHMENT_SUSPENDED` | 403 | Assinatura/ação suspensa |
| `ORDERS_CLOSED` | 409 | Fora do horário ou pausado |
| `PRODUCT_UNAVAILABLE` | 409 | Produto/opção indisponível |
| `PRICE_CHANGED` | 409 | Total mudou |
| `INVALID_OPTION_SELECTION` | 422 | Mínimo/máximo inválido |
| `INVALID_STATUS_TRANSITION` | 409 | Máquina de estado |
| `IDEMPOTENCY_CONFLICT` | 409 | Mesma chave, payload diferente |
| `RATE_LIMITED` | 429 | Excesso de requisições |
| `UNAUTHENTICATED` | 401 | Sessão ausente |
| `FORBIDDEN` | 403 | Papel insuficiente |
| `NOT_FOUND` | 404 | Recurso ausente no escopo |
| `INTERNAL_ERROR` | 500 | Erro inesperado |

Mensagem para QR inválido e tenant não acessível deve evitar enumeração.

## 6. Paginação e filtros

- Cursor para históricos grandes.
- Limite padrão 25, máximo 100.
- Ordenação permitida por lista branca.
- Busca escapada e normalizada.
- Datas recebem ISO 8601.
- Filtros de tenant vêm da autorização, não do payload.

## 7. Realtime

Canais lógicos:

- `tenant:{id}:orders`;
- `tenant:{id}:bill_requests`;
- `tenant:{id}:availability`.

Eventos que interessam:

- pedido inserido;
- pedido atualizado;
- solicitação inserida/atualizada;
- produto tornado indisponível.

O cliente não deve depender do conteúdo completo do evento. Use-o para atualizar cache e, quando necessário, refazer consulta autorizada.

## 8. Áudio

- carregar recurso local pequeno;
- exigir gesto para habilitar;
- persistir preferência por dispositivo;
- tocar uma vez por pedido novo não visto;
- não tocar novamente ao refetch do mesmo pedido;
- oferecer contador/badge e destaque visual;
- permitir silenciar e testar.

## 9. Rate limit

Política inicial:

| Operação | Limite sugerido |
|---|---:|
| Carregar contexto/menu | 60/min por IP hash + token |
| Criar pedido | 10/5 min por sessão + mesa |
| Consultar pedido | 60/min por sessão |
| Solicitar conta | 3/10 min por sessão + mesa |
| Login | usar proteção do Auth + limite de borda |
| Upload | 20/h por usuário, além de limite do plano |

Os números são configuração inicial. Rejeitar sem revelar existência de recursos.

## 10. Logs

Cada request crítico deve registrar:

- `request_id`;
- rota e método;
- ator/scope sem token;
- tenant quando conhecido;
- recurso;
- resultado/código;
- duração;
- erro sanitizado.

Não registrar:

- token da mesa;
- token de rastreamento;
- cookie;
- senha;
- service role;
- vídeo/binário;
- payload completo de observações do consumidor.

## 11. Webhooks futuros

Reservar rota de adaptador de cobrança, mas não habilitar sem provedor:

```text
POST /api/webhooks/billing/{provider}
```

Quando implementada:

- validar assinatura;
- armazenar ID do evento;
- processar idempotentemente;
- nunca confiar apenas no estado enviado sem verificar quando o provider permitir;
- mapear evento externo para fatura/pagamento/assinatura;
- auditar.

## 12. Estado real da implementação (registrado na Fase 9)

As seções 2–4 acima descrevem o desenho de referência do contrato. Na implementação real, a maior parte das mutações autenticadas (estabelecimento e admin geral) usa **Server Actions** por módulo, não uma API REST literal — permitido explicitamente pela seção 3 ("desde que os mesmos serviços e validações sustentem testes e segurança"), e é o padrão seguido em todas as fases (1–8). As únicas rotas HTTP (`app/api/**/route.ts`) que existem de fato são:

- `POST /api/public/orders`, `GET /api/public/orders/{trackingToken}` — conforme seção 2.
- `POST /api/public/bill-requests`, `GET /api/public/bill-requests/{tableToken}` — conforme seção 2.
- `GET /api/establishments/mesas/{tableId}/qr?format=png|svg` — download do QR (equivalente ao `GET /tables/{id}/qr` da seção 3; `export const dynamic = "force-dynamic"` obrigatório nesta rota e em qualquer rota futura que leia token/estado rotativo — ver `status/DECISION_LOG.md`, D-039/D-041).
- `POST /api/internal/cron/process-overdue-subscriptions` — conforme seção 4.
- `GET /api/health/live`, `GET /api/health/ready` — health checks (docs/13 §7), não fazem parte do contrato de negócio.
- `POST /api/internal/log-client-error` — recebe erros não tratados do cliente (`app/global-error.tsx`), rate-limited, nunca expõe detalhes ao usuário final.

Toda mutação/consulta que a seção 3/4 descreve como REST (`categories`, `products`, `tables`, `members`, `invites`, `establishments`, `plans`, `admins`, `audit` etc.) é servida por Server Actions dentro de `app/(establishment)/painel/**/actions.ts` e `app/(platform)/admin-geral/**/actions.ts`, chamando os mesmos serviços de `modules/*/application/` que sustentam os testes de integração (`supabase/tests/*.sql`) e a autorização server-side. Os códigos de erro da seção 5 e os limites da seção 9 são os efetivamente usados por essas Server Actions e rotas, sem divergência.
