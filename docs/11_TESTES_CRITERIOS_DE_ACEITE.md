# 11 — Testes e critérios de aceite

## 1. Estratégia

- **Unitários:** dinheiro, disponibilidade, transições, validações, permissões.
- **Integração:** serviços + PostgreSQL/RLS/RPC.
- **Componentes:** formulários, estados, KDS e carrinho.
- **E2E:** jornadas críticas em navegador.
- **Segurança:** isolamento de tenant, papéis, tokens e uploads.
- **Acessibilidade:** axe + testes manuais por teclado.
- **Performance:** menu público e mídia.

## 2. Pirâmide e prioridades

- `P0`: bloqueia entrega.
- `P1`: importante; deve passar antes de produção.
- `P2`: melhoria não bloqueante, registrada.

Cobertura de linha não substitui cenários. Alvo inicial: 80% nos módulos de domínio críticos e cobertura explícita de todas as transições.

## 3. Cenários P0

### AC-PUB-001 — Abrir cardápio por QR válido

**Dado** estabelecimento ativo, assinatura ativa e mesa ativa  
**Quando** consumidor abre o QR  
**Então** vê o cardápio correto e a identificação da mesa  
**E** não recebe dados de outro tenant.

### AC-PUB-002 — QR inválido

**Quando** token não existe, expirou ou mesa está desativada  
**Então** mostrar indisponibilidade neutra  
**E** não revelar IDs ou cadastro.

### AC-PUB-003 — Produto completo

Produto publicado exibe mídia/fallback, descrição, ingredientes, alergênicos, preço e opções válidas.

### AC-ORD-001 — Pedido ponta a ponta

Consumidor cria pedido; ele aparece no KDS em até cinco segundos; operação aceita, prepara, marca pronto e entrega; consumidor acompanha todos os estados.

### AC-ORD-002 — Total no servidor

Alterar total no request não reduz valor; servidor calcula a partir do catálogo.

### AC-ORD-003 — Preço alterado

Preço muda após item entrar no carrinho; criação retorna `PRICE_CHANGED`; nenhum pedido é criado até nova confirmação.

### AC-ORD-004 — Item indisponível

Produto é esgotado antes da confirmação; pedido inteiro não é criado e consumidor recebe orientação.

### AC-ORD-005 — Idempotência

Dois requests idênticos com mesma chave geram um único pedido e a mesma resposta lógica.

### AC-ORD-006 — Conflito de idempotência

Mesma chave com payload diferente é rejeitada.

### AC-ORD-007 — Transição inválida

Não é possível mover `pending` diretamente para `ready`.

### AC-ORD-008 — Histórico

Cada transição válida grava status anterior/novo, ator e horário uma única vez.

### AC-BILL-001 — Solicitar conta

Solicitação aparece no caixa em tempo real, é reconhecida, entregue e fecha a sessão.

### AC-BILL-002 — Retry da conta

Retries não criam solicitações ativas duplicadas.

### AC-CAT-001 — Publicação

Rascunho não aparece; após publicar aparece; arquivado deixa de aparecer sem alterar pedido histórico.

### AC-MEDIA-001 — Upload seguro

Imagem/vídeo permitido e dentro do limite funciona. Executável, MIME falso e excesso de tamanho são rejeitados.

### AC-QR-001 — Regeneração

Após regenerar, QR antigo falha e novo funciona.

### AC-SUB-001 — Suspensão por atraso

Fatura vence, job roda, assinatura fica suspensa, público não faz pedido e funcionários não operam.

### AC-SUB-002 — Preservação

Suspender não apaga categorias, produtos, mesas, pedidos, mídias, equipe ou histórico.

### AC-SUB-003 — Reativação

Administrador confirma pagamento integral; sem outra pendência ou suspensão manual, serviço volta a funcionar.

### AC-SUB-004 — Prazo adicional

Fatura vencida com `grace_until` futuro mantém serviço; ao expirar, job suspende.

### AC-TEN-001 — Isolamento

Owner do tenant A não lê nem altera qualquer recurso do tenant B, inclusive manipulando URL/API.

### AC-ROLE-001 — Cozinha

Kitchen altera status permitido, mas não edita produto, membro ou assinatura.

### AC-ROLE-002 — Menu editor

Menu editor edita catálogo, mas não altera pedidos nem cobrança.

### AC-PLAT-001 — Superadmin

Usuário autenticado sem registro ativo em `platform_admins` não acessa painel geral.

### AC-SEC-001 — Service role

Build do cliente não contém service role nem segredo de cron.

### AC-REC-001 — Reconexão

Painel perde conexão, pedido muda, conexão retorna; snapshot recupera o estado sem duplicar alerta.

## 4. Cenários P1

- busca por produto sem acento/case;
- ordenação de categoria/produto;
- produto esgotado visível e não adicionável;
- convite válido, expirado e e-mail divergente;
- último owner não pode ser removido;
- último superadmin não pode ser desativado;
- horário fechado permite ver menu e bloqueia checkout;
- `accepting_orders=false` bloqueia checkout;
- som bloqueado mantém alerta visual;
- reversão de pagamento reavalia assinatura;
- sessão de mesa fechada abre nova no próximo pedido;
- paginação e filtros;
- upload removido sem quebrar histórico;
- acessibilidade de modal e formulários;
- moeda e datas pt-BR;
- mensagens de erro sem stack trace.

## 5. Testes unitários obrigatórios

- `formatMoney` e cálculo em centavos;
- total por item/opções;
- limites de seleção;
- disponibilidade por assinatura/horário/chave manual;
- todas as transições de pedido;
- todas as transições de conta;
- reavaliação de assinatura;
- permissão por papel;
- normalização de CNPJ/e-mail/slug;
- hash e expiração de token;
- comparação de payload de idempotência.

## 6. Testes RLS

Usar usuários reais do ambiente local, não apenas service role. Para cada tabela:

1. leitura autorizada;
2. leitura cruzada negada;
3. inserção autorizada;
4. alteração com papel insuficiente negada;
5. tentativa de forjar `establishment_id` negada;
6. membro desativado negado.

## 7. Testes E2E

Projetos Playwright:

- Chromium mobile para cardápio;
- Chromium desktop para KDS/admin;
- opcional WebKit para compatibilidade iOS crítica.

Fluxos:

1. QR → produto → opções → carrinho → pedido → KDS → entrega.
2. Pedido → conta → fechamento da mesa.
3. Owner → produto → mídia → publicação → menu.
4. Owner → mesa → QR → rotação.
5. Superadmin → fatura → atraso → suspensão → pagamento → reativação.
6. Tenant A tenta acessar Tenant B.

## 8. Acessibilidade

- axe sem violações críticas/sérias nas rotas principais;
- uso completo por teclado;
- foco após abertura/fechamento de modal;
- anúncio de erro e status;
- contraste;
- zoom 200%;
- vídeo com controles e texto equivalente.

## 9. Performance

Ambiente de staging com dados de seed:

- LCP do cardápio em faixa aceitável em perfil móvel;
- imagens dimensionadas;
- nenhum vídeo carregado integralmente na listagem;
- payload de menu controlado;
- consultas críticas sem varredura desnecessária;
- KDS não aumenta assinaturas/timers a cada render.

Registrar baseline em vez de falsificar uma meta em ambiente instável. Regressões relevantes bloqueiam produção.

## 10. Evidências de aceite

Para cada P0:

- nome do teste;
- comando executado;
- resultado;
- screenshot/vídeo somente quando agrega;
- migration/arquivo associado;
- pendência externa, se houver.

Não aceitar “testado manualmente” sem descrever passos e resultado.

