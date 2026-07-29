# 16 — Definition of Done do MVP

O MVP só está concluído quando todos os itens aplicáveis abaixo estiverem atendidos.

## 1. Produto

- [ ] QR válido abre o cardápio correto sem login.
- [ ] QR inválido/rotacionado é tratado com segurança.
- [ ] Categorias, busca e produtos funcionam.
- [ ] Detalhe possui mídia/fallback, descrição, ingredientes, alergênicos, preço e opções.
- [ ] Carrinho valida grupos e quantidades.
- [ ] Pedido é calculado no servidor e idempotente.
- [ ] Consumidor acompanha o status.
- [ ] KDS recebe pedido em tempo real.
- [ ] Alertas visual e sonoro possuem fallback.
- [ ] Máquina de estados é aplicada.
- [ ] Solicitação de conta funciona até fechamento da mesa.
- [ ] Estabelecimento administra catálogo e mídias.
- [ ] Estabelecimento administra mesas e QR Codes.
- [ ] Estabelecimento administra equipe e permissões.
- [ ] Superadmin administra estabelecimentos, planos, faturas e pagamentos.
- [ ] Suspensão/reativação funciona sem apagar dados.

## 2. Segurança

- [ ] RLS ativa em todas as tabelas de negócio.
- [ ] Testes de isolamento passam.
- [ ] Service role não aparece no cliente.
- [ ] Preços e tenants do navegador não são confiados.
- [ ] Uploads são validados.
- [ ] Tokens sensíveis não aparecem em logs.
- [ ] Rotas internas/cron exigem segredo.
- [ ] Ações financeiras e de papel geram auditoria.
- [ ] Headers de segurança configurados.
- [ ] Rate limit em endpoints públicos críticos.

## 3. Banco

- [ ] Todas as mudanças estão em migrações.
- [ ] Constraints impedem estados impossíveis.
- [ ] Funções críticas são transacionais.
- [ ] `security definer` tem `search_path` e grants seguros.
- [ ] Índices críticos existem e foram avaliados.
- [ ] Seed é idempotente e apenas fictício.
- [ ] Snapshots preservam histórico.

## 4. Qualidade

- [ ] Lint passa.
- [ ] Typecheck passa.
- [ ] Testes unitários passam.
- [ ] Testes de integração passam.
- [ ] Testes E2E P0 passam.
- [ ] Build de produção passa.
- [ ] Axe não mostra violações críticas/sérias nas telas principais.
- [ ] Fluxos críticos funcionam por teclado.
- [ ] Cardápio foi verificado em viewport móvel.
- [ ] KDS foi verificado em tablet/desktop.
- [ ] Reconexão foi testada.

## 5. Operação

- [ ] Staging separado.
- [ ] Variáveis documentadas.
- [ ] Cron configurado e testado.
- [ ] Logs/request IDs disponíveis.
- [ ] Erros não expõem internals.
- [ ] Backup e restauração possuem procedimento.
- [ ] Smoke test pós-deploy documentado.
- [ ] Plano de rollback definido.

## 6. Documentação

- [ ] README do projeto reflete o código real.
- [ ] Instalação local documentada.
- [ ] Migrações e seed documentados.
- [ ] Contas demo são criadas por processo seguro.
- [ ] Rotas/contratos estão atualizados.
- [ ] `status/IMPLEMENTATION_STATUS.md` atualizado.
- [ ] Desvios registrados em `status/DECISION_LOG.md`.
- [ ] Pendências externas listadas.

## 7. Aceite final demonstrável

Em uma demonstração única:

1. owner publica produto;
2. consumidor abre QR;
3. consumidor envia pedido;
4. cozinha recebe e processa;
5. consumidor acompanha;
6. consumidor solicita conta;
7. caixa encerra;
8. superadmin suspende por atraso;
9. serviço bloqueia;
10. pagamento é confirmado;
11. serviço reativa com dados intactos;
12. tentativa de acesso cruzado entre tenants falha.

## 8. Itens que não podem ser mascarados

Não considerar concluído se:

- tela usa dados estáticos no fluxo principal;
- RLS foi desativada;
- testes foram pulados sem registrar falha;
- serviço externo foi simulado em produção;
- pedido é criado parcialmente;
- cálculo ocorre apenas no cliente;
- suspensão é apenas visual;
- papel é validado apenas no menu/interface;
- documentação contradiz o código.

