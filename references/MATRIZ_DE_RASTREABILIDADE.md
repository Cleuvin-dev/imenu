# Matriz de rastreabilidade

Esta matriz ajuda a provar que requisito, implementação e teste permanecem alinhados.

| Área | Requisitos | Banco/módulo | Critérios principais |
|---|---|---|---|
| QR/contexto | RF-PUB-001, 014 | `tables`, `tenancy` | AC-PUB-001, 002; AC-QR-001 |
| Cardápio | RF-PUB-002–007 | `catalog`, `media` | AC-PUB-003; AC-CAT-001; AC-MEDIA-001 |
| Carrinho/pedido | RF-PUB-008–012 | `ordering` | AC-ORD-001–008 |
| Conta | RF-PUB-013, RF-OPS-009–010 | `service-session` | AC-BILL-001–002 |
| KDS | RF-OPS-001–008, 011 | `operations`, `ordering` | AC-ORD-001, 007, 008; AC-REC-001 |
| Catálogo admin | RF-EST-002–007, 014 | `catalog`, `media` | AC-CAT-001; AC-MEDIA-001 |
| Operação/config | RF-EST-008–009 | `tenancy` | cenários P1 horário/pausa |
| Mesas/QR | RF-EST-010–011 | `tables` | AC-QR-001 |
| Equipe | RF-EST-012 | `identity`, `tenancy` | AC-ROLE-001–002 |
| Assinatura local | RF-EST-013 | `billing` | AC-SUB-001–004 |
| Admin geral | RF-ADM-001–015 | `platform-admin`, `billing`, `audit` | AC-SUB-001–004; AC-PLAT-001 |
| Multi-tenant | RNF-003 | RLS/tenancy | AC-TEN-001 |
| Segurança | RNF-004–005 | shared/infra | AC-SEC-001 |
| Reconexão | RNF-011 | operations | AC-REC-001 |

## Modelo para atualização

Ao implementar, acrescentar:

| ID | Arquivos/migrações | Testes | Estado | Observação |
|---|---|---|---|---|
| AC-... | caminho | nome do teste | Pendente/Passou | — |

Nenhum P0 deve permanecer sem teste ou justificativa explícita.

