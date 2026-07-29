# 02 — Personas, papéis e permissões

## 1. Personas

### Consumidor

Está fisicamente no estabelecimento, lê o QR, explora o cardápio, envia pedido, acompanha o status e solicita a conta. Não possui login nem acesso administrativo.

### Cozinha

Recebe e prepara pedidos. Precisa de uma interface grande, rápida, legível e com poucas ações.

### Caixa/atendimento

Acompanha pedidos, entregas, mesas e solicitações de conta. Pode finalizar sessões de mesa.

### Editor de cardápio

Mantém categorias, produtos, preços, mídias, ingredientes, adicionais e disponibilidade.

### Gerente

Coordena operação, cardápio, mesas e equipe, mas não altera propriedade do estabelecimento.

### Proprietário do estabelecimento

Possui acesso completo ao próprio estabelecimento, inclusive equipe e assinatura.

### Administrador geral do iMenu

Controla a plataforma, estabelecimentos, planos, faturas, pagamentos, bloqueios e administradores autorizados.

### Suporte do iMenu

Consulta dados necessários ao atendimento e pode executar ações limitadas, sempre auditadas.

## 2. Papéis autenticados

### Plataforma

- `super_admin`: acesso total e gestão de outros administradores.
- `platform_admin`: estabelecimentos, planos, faturamento e suporte; não promove outro superadmin.
- `platform_support`: leitura operacional e ações de suporte permitidas; sem confirmar pagamentos ou excluir registros.

### Estabelecimento

- `owner`: acesso total ao tenant.
- `manager`: operação, cardápio, mesas, horários e equipe, exceto remover owner ou alterar assinatura.
- `menu_editor`: categorias, produtos, opções, mídia e prévia.
- `kitchen`: pedidos e mudança de status relacionada ao preparo.
- `cashier`: pedidos, entrega, mesas e solicitações de conta.
- `viewer`: dashboards e leitura operacional.

Um usuário pode participar de mais de um estabelecimento, com papel diferente em cada um.

## 3. Matriz de permissões

Legenda: `G` gerenciar, `O` operar/alterar, `L` ler, `—` sem acesso.

| Recurso | Owner | Manager | Menu editor | Kitchen | Cashier | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | L | L | L | L | L | L |
| Pedidos | G | G | L | O | O | L |
| Status: aceitar/rejeitar | G | G | — | O | O | — |
| Status: em preparo/pronto | G | G | — | O | O | — |
| Status: entregue/cancelado | G | G | — | — | O | — |
| Solicitações de conta | G | G | — | L | O | L |
| Categorias/produtos | G | G | G | L | L | L |
| Mídias | G | G | G | — | — | L |
| Disponibilidade rápida | G | G | G | O | O | L |
| Mesas/QR Codes | G | G | — | — | L | L |
| Horários/pausar pedidos | G | G | — | — | O | L |
| Equipe e permissões | G | G* | — | — | — | — |
| Assinatura/faturas | G | L | — | — | — | — |
| Configurações do local | G | G | — | — | — | L |

`*` O gerente não pode criar, promover, rebaixar ou remover um `owner`.

## 4. Matriz da plataforma

| Recurso | Superadmin | Platform admin | Support |
|---|:---:|:---:|:---:|
| Dashboard geral | G | G | L |
| Estabelecimentos | G | G | L |
| Criar/editar estabelecimento | G | G | — |
| Suspender/reativar | G | G | — |
| Planos | G | G | L |
| Faturas | G | G | L |
| Confirmar/estornar pagamento | G | G | — |
| Prazo adicional | G | G | — |
| Administradores da plataforma | G | — | — |
| Auditoria | G | L | L limitada |
| Impersonação | Fora do MVP | Fora do MVP | Fora do MVP |

## 5. Regras de autorização

1. O papel é obtido no servidor a partir da sessão e das tabelas de associação.
2. O frontend pode ocultar ações, mas não é barreira de segurança.
3. Toda mutação valida permissão no servidor e no banco.
4. `owner` não pode remover a si mesmo se for o único owner ativo.
5. Um convite expira em 72 horas e pode ser revogado.
6. O e-mail convidado deve corresponder ao e-mail autenticado que aceitar o convite.
7. Um membro desativado perde acesso imediatamente.
8. Contas da plataforma não recebem acesso automático a tenants.
9. Alterações de papéis, bloqueios, pagamento e assinatura geram auditoria.
10. Políticas RLS devem derivar acesso de `establishment_members` e nunca de um tenant escolhido apenas na URL.

## 6. Convite de equipe

Fluxo:

1. Owner/manager informa nome, e-mail e papel.
2. O servidor cria convite com token aleatório armazenado como hash.
3. No MVP, o link pode ser copiado; envio transacional por e-mail é habilitado quando o provedor estiver configurado.
4. O convidado abre o link, autentica ou cria sua conta e aceita.
5. O servidor verifica token, expiração, revogação e e-mail.
6. A associação é criada e o convite é consumido.

Sem provedor de e-mail, o painel deve mostrar claramente “copiar link de convite”; não fingir que o e-mail foi enviado.

## 7. Seleção de estabelecimento

Se o usuário participar de mais de um tenant:

- após login, apresentar seletor;
- manter o tenant escolhido em cookie seguro ou rota;
- revalidar associação a cada sessão sensível;
- permitir troca pelo cabeçalho;
- nunca aceitar `establishment_id` do cliente sem cruzar com a associação.

