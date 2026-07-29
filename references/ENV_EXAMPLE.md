# Referência de variáveis de ambiente

O projeto implementado deve expor um `.env.example` sem valores reais. Nomes finais podem acompanhar bibliotecas escolhidas, preservando a separação abaixo.

```dotenv
# Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=local
APP_TIMEZONE=America/Sao_Paulo

# Supabase — valores públicos permitidos no navegador
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — somente servidor
SUPABASE_SERVICE_ROLE_KEY=

# Segurança
CRON_SECRET=
ANONYMOUS_SESSION_PEPPER=
INVITE_TOKEN_PEPPER=
ORDER_TRACKING_TOKEN_PEPPER=
IP_HASH_PEPPER=

# Rate limit opcional
RATE_LIMIT_PROVIDER=memory
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# E-mail opcional
EMAIL_PROVIDER=console
EMAIL_FROM=
EMAIL_API_KEY=

# Observabilidade opcional
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Flags
ENABLE_EMAIL_DELIVERY=false
ENABLE_EXTERNAL_BILLING=false
ENABLE_ERROR_REPORTING=false
```

## Regras

- Valores `NEXT_PUBLIC_*` podem ir ao bundle; revisar cada um.
- Service role, peppers, cron e API keys nunca recebem prefixo público.
- Produção exige valores distintos de staging.
- `memory` em rate limit serve apenas a local/teste; produção deve usar mecanismo distribuído ou proteção de borda equivalente.
- `EMAIL_PROVIDER=console` registra apenas que enviaria; nunca imprimir token completo em log.
- Flags de integração externa não podem estar ativas sem configuração válida.
- Validar ambiente no boot com schema Zod e falhar cedo no servidor.

