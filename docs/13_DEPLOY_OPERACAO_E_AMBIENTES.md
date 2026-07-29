# 13 — Deploy, operação e ambientes

## 1. Topologia recomendada

- Aplicação Next.js: Vercel.
- Banco/Auth/Realtime/Storage: Supabase.
- Repositório Git privado.
- CI: pipeline do provedor Git.
- Domínios:
  - produção: `app.seudominio.com.br`;
  - staging: `staging.seudominio.com.br`.

Os nomes são exemplos; parametrizar.

## 2. Ambientes

| Ambiente | Banco | Dados | Uso |
|---|---|---|---|
| Local | Supabase local/dev | seed fictício | desenvolvimento/testes |
| Staging | projeto separado | fictício | QA e demonstração |
| Produção | projeto exclusivo | real | clientes |

Não usar dados de produção em testes locais sem anonimização e autorização.

## 3. Pipeline

Em pull request:

1. instalação pelo lockfile;
2. lint;
3. typecheck;
4. testes unitários;
5. testes de integração com banco temporário/local;
6. build;
7. verificação de migração.

Antes de produção:

1. deploy staging;
2. aplicar migrações staging;
3. seed somente de staging;
4. E2E P0;
5. revisão de segurança;
6. backup/snapshot apropriado;
7. aplicar migrações produção;
8. deploy;
9. smoke test;
10. monitorar erros e Realtime.

## 4. Migrações

- Versionadas em `supabase/migrations`.
- Aplicadas primeiro em staging.
- Migração destrutiva requer plano de dados e rollback.
- Alteração incompatível segue expand-and-contract.
- Nunca alterar migration aplicada.
- Seed separado e idempotente.

## 5. Cron

O job de inadimplência:

- chama endpoint interno com `Authorization: Bearer {CRON_SECRET}`;
- roda pelo menos diariamente, recomendado por hora;
- retorna contagens sem dados sensíveis;
- usa lock/idempotência;
- alerta em falha repetida.

Se o provedor de hospedagem tiver limitação de cron no plano escolhido, usar Supabase Cron ou scheduler equivalente, mantendo uma única fonte ativa.

## 6. Observabilidade

Mínimo:

- logs estruturados;
- request ID;
- captura de exceções server/client;
- métricas de erro por rota;
- alerta para falha de criação de pedido;
- alerta para job de cobrança;
- estado de Realtime no painel.

Nunca enviar segredos, tokens ou observações completas para ferramenta externa.

## 7. Health checks

- `/api/health/live`: processo responde, sem consultar serviços.
- `/api/health/ready`: verifica conectividade essencial com timeout curto.
- Rotas não revelam versões internas, chaves ou schema.

## 8. Backup e rollback

Antes do lançamento:

- confirmar política de backup do plano Supabase;
- registrar como restaurar em projeto separado;
- definir responsável;
- validar migração de rollback lógico quando necessário;
- manter versão anterior do deploy pronta para rollback;
- não reverter aplicação se a migration já tornou schema incompatível.

## 9. Runbook de incidentes

### Pedidos não chegam no KDS

1. verificar se pedido existe no banco;
2. conferir estado da assinatura e tenant;
3. conferir Realtime/canal;
4. usar refetch/polling;
5. checar erros de autorização;
6. manter operação por snapshot até recuperar eventos.

### Pedido duplicado

1. preservar ambos os registros;
2. comparar `client_request_id` e payload;
3. verificar constraint/idempotência;
4. cancelar duplicata com motivo;
5. abrir incidente e teste de regressão.

### Tenant cruzado

Tratar como incidente crítico:

1. bloquear rota/feature afetada;
2. preservar logs;
3. revogar sessão/chave se necessário;
4. corrigir RLS/autorização;
5. executar testes de todos os tenants;
6. seguir procedimento jurídico/comunicação aplicável.

### Suspensão indevida

1. consultar fatura, pagamento, prazo e eventos;
2. corrigir por ação auditada;
3. reavaliar assinatura;
4. não editar linha diretamente sem evento.

## 10. Checklist de lançamento

- domínio/HTTPS;
- redirects do Auth;
- variáveis de produção;
- RLS e buckets;
- superadmin criado de forma segura;
- planos reais;
- cron;
- rate limit;
- alertas;
- termos/política;
- QR de teste;
- pedido E2E real;
- suspensão e reativação testadas;
- backup confirmado;
- seed demo ausente em produção.

## 11. Operação diária

- verificar falhas de pedido e cron;
- acompanhar faturas vencidas;
- revisar auditoria de ações financeiras;
- revisar uso de Storage e limites;
- manter dependências de segurança;
- testar restauração periodicamente;
- desativar usuários que saíram da equipe.

