# Referência de rotas e estrutura de pastas

## 1. URLs de produto

| Área | Rota sugerida |
|---|---|
| Cardápio por QR | `/m/[establishmentSlug]/t/[tableToken]` |
| Produto | `/m/[slug]/t/[token]/produto/[productSlug]` |
| Carrinho | `/m/[slug]/t/[token]/carrinho` |
| Acompanhar pedido | `/pedido/[trackingToken]` |
| Solicitar conta | `/m/[slug]/t/[token]/conta` |
| Login | `/entrar` |
| Painel do local | `/painel` |
| KDS | `/painel/pedidos` |
| Caixa | `/painel/caixa` |
| Cardápio admin | `/painel/cardapio` |
| Mesas | `/painel/mesas` |
| Equipe | `/painel/equipe` |
| Assinatura | `/painel/assinatura` |
| Admin geral | `/admin-geral` |

## 2. Estrutura sugerida

```text
app/
├── (public)/
│   ├── m/[establishmentSlug]/t/[tableToken]/
│   └── pedido/[trackingToken]/
├── (auth)/
│   └── entrar/
├── (establishment)/
│   └── painel/
├── (platform)/
│   └── admin-geral/
├── api/
│   ├── public/
│   ├── establishments/
│   ├── platform/
│   ├── internal/cron/
│   └── webhooks/
└── layout.tsx

components/
├── ui/
├── public-menu/
├── operations/
├── establishment-admin/
└── platform-admin/

modules/
├── identity/
├── tenancy/
├── catalog/
├── media/
├── tables/
├── ordering/
├── service-session/
├── operations/
├── billing/
├── platform-admin/
└── audit/

lib/
├── auth/
├── supabase/
├── validation/
├── money/
├── dates/
├── errors/
├── logging/
├── rate-limit/
└── env/

supabase/
├── migrations/
├── seed.sql
└── tests/

tests/
├── unit/
├── integration/
└── e2e/

public/
├── sounds/
├── placeholders/
└── brand/

docs/
status/
```

## 3. Organização de módulo

Exemplo:

```text
modules/ordering/
├── domain/
│   ├── order-status.ts
│   ├── pricing.ts
│   └── errors.ts
├── application/
│   ├── create-order.ts
│   └── transition-order.ts
├── infrastructure/
│   └── order-repository.ts
├── schemas/
│   └── order.schema.ts
└── index.ts
```

Não é necessário aplicar arquitetura cerimonial excessiva. A separação deve impedir que componentes React contenham regra transacional.

## 4. Middleware/proteção

- Middleware pode renovar sessão e fazer redirects básicos.
- Autorização fina não deve depender só do middleware.
- Cada página/ação protegida resolve usuário e associação no servidor.
- Rotas públicas nunca aceitam tenant apenas pelo slug sem validar token/estado.

## 5. Convenções de código

- arquivos em `kebab-case`;
- componentes em `PascalCase`;
- funções/variáveis em `camelCase`;
- tipos de domínio claros;
- schemas Zod próximos da fronteira;
- repositórios não retornam `any`;
- textos do produto centralizados quando fizer sentido;
- erros por códigos estáveis.

## 6. Scripts esperados

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "...",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:test": "...",
    "seed": "..."
  }
}
```

Adaptar comandos à configuração real; não deixar scripts vazios.

