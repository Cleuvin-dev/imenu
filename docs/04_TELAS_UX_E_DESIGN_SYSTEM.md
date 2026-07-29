# 04 — Telas, experiência e design system

## 1. Direção visual

O iMenu terá aparência moderna, limpa e apetitosa, com vermelho predominante, fundos claros e hierarquia forte. A referência do iFood limita-se à familiaridade de uso e à presença do vermelho; a composição, marca, ícones, ilustrações e textos do iMenu devem ser originais.

### Paleta inicial

| Token | Cor | Uso |
|---|---|---|
| `primary-600` | `#D9233F` | Botões, links e elementos de marca |
| `primary-700` | `#B81831` | Hover e cabeçalhos fortes |
| `primary-50` | `#FFF1F3` | Fundos de destaque |
| `neutral-950` | `#1D1D1F` | Texto principal |
| `neutral-600` | `#66666D` | Texto secundário |
| `neutral-200` | `#E8E8EC` | Bordas |
| `neutral-50` | `#F8F8FA` | Fundo geral |
| `white` | `#FFFFFF` | Cards e superfícies |
| `success` | `#198754` | Pago, pronto e ativo |
| `warning` | `#D98300` | Vencimento e atenção |
| `danger` | `#B42318` | Erro, atraso e bloqueio |
| `info` | `#2563EB` | Informação operacional |

Validar contraste; ajustar tons se o teste automático reprovar.

### Tipografia e forma

- Fonte: `Inter`, `Manrope` ou alternativa local compatível.
- Raio: 12 px em cards, 10 px em controles, 999 px em chips.
- Espaçamento base: 4 px.
- Sombra discreta; borda visível em elementos interativos.
- Ícones consistentes, acompanhados de texto em ações críticas.
- Botão primário sempre vermelho; ações destrutivas não dependem apenas da cor.

## 2. Navegação do consumidor

### P-01 — Validação do QR

Estado curto de carregamento com logotipo do iMenu. Valida token, assinatura, estabelecimento e mesa. Não revelar se um UUID interno existe.

### P-02 — Cardápio

Estrutura mobile:

1. cabeçalho com logo/capa, nome do local, mesa e status;
2. busca;
3. chips de categoria fixos após rolagem;
4. cards de produto com imagem, nome, resumo, preço e disponibilidade;
5. barra de carrinho fixa quando houver itens.

Cards usam imagem/thumbnail. Vídeo não reproduz na lista.

### P-03 — Detalhe do produto

1. mídia 16:9 no topo;
2. vídeo com poster, controles, sem som automático e `preload=metadata`;
3. imagem como fallback;
4. nome, descrição, preço;
5. ingredientes, alergênicos e nutrição;
6. grupos de opções;
7. observação;
8. seletor de quantidade;
9. botão fixo “Adicionar — R$ X,XX”.

Para grupos obrigatórios incompletos, rolar ao primeiro erro e anunciar mensagem acessível.

### P-04 — Carrinho

- mesa e estabelecimento;
- itens editáveis;
- adicionais e observações;
- subtotal/total;
- aviso de que o pagamento ocorre no estabelecimento;
- botão “Enviar pedido” com proteção contra duplo clique.

### P-05 — Confirmação e acompanhamento

- número do pedido;
- status atual;
- linha do tempo;
- itens e total;
- aviso quando pronto;
- ação para voltar ao cardápio;
- área “Meus pedidos desta visita”.

### P-06 — Solicitar conta

Modal/página com confirmação, total informativo dos pedidos conhecidos e texto: “A equipe levará a conta até sua mesa”. Após envio, mostrar status recebido/visualizado/atendido.

### Estados públicos obrigatórios

- QR inválido ou desativado;
- estabelecimento indisponível;
- assinatura suspensa;
- fora do horário;
- pedidos pausados;
- produto esgotado;
- carrinho com preço alterado;
- sem conexão;
- erro recuperável;
- solicitação/pedido enviado.

## 3. Painel operacional

### O-01 — Tela de ativação de alertas

Na primeira entrada, botão “Ativar alertas sonoros” e “Testar som”. O painel continua funcional se o som for bloqueado.

### O-02 — KDS de pedidos

Desktop/tablet:

- cabeçalho com tenant, estado de conexão, relógio e alternância de som;
- colunas: Novos, Em preparo, Prontos;
- cartões com número, mesa, idade, itens e observações;
- cores de status acompanhadas de texto;
- ações grandes com confirmação somente para rejeitar/cancelar;
- destaque crescente conforme tempo de espera.

Mobile: abas por status em vez de colunas.

### O-03 — Detalhe do pedido

Exibe histórico, itens, opções, observações, total e ações permitidas. Nunca permite editar preço ou itens após criação.

### O-04 — Caixa e contas

- solicitações de conta no topo;
- mesa, horário e total informativo da sessão;
- ações: reconhecer, marcar entregue e fechar sessão;
- lista de mesas abertas;
- pedidos relacionados.

### O-05 — Disponibilidade rápida

Lista simples para marcar produto como disponível/esgotado sem acessar o editor completo.

## 4. Painel administrativo do estabelecimento

### E-01 — Login e recuperação

E-mail/senha via Supabase Auth. Mensagens neutras para evitar enumeração de contas. Recuperação por e-mail quando o provedor estiver configurado.

### E-02 — Dashboard

Cards do dia: novos, em preparo, prontos, entregues, pedidos totais e solicitações de conta. Mostrar banner de assinatura quando aplicável.

### E-03 — Categorias

Tabela/lista, ordenação por drag-and-drop ou botões, ativação e arquivamento.

### E-04 — Produtos

Busca, categoria, status e disponibilidade. Ações criar, editar, duplicar, pré-visualizar, publicar, esgotar e arquivar.

### E-05 — Editor de produto

Abas/seções:

- informações;
- preço;
- mídia;
- ingredientes/alergênicos;
- opções/adicionais;
- publicação.

Autosave não é obrigatório. Alertar antes de sair com alterações não salvas.

### E-06 — Mesas e QR Codes

Lista com nome/número, status, QR ativo e ações. Download PNG/SVG e impressão em folha A4 podem ser simples. Regeneração exige confirmação e invalida o QR anterior.

### E-07 — Equipe

Membros, papel, estado e convites pendentes. Mostrar link copiável quando envio de e-mail estiver indisponível.

### E-08 — Horários e operação

Grade semanal, exceção por data e chave “Aceitar novos pedidos”.

### E-09 — Assinatura

Plano, status, período, vencimento, prazo adicional e faturas. Quando bloqueado, esta área e suporte continuam acessíveis ao owner.

## 5. Painel administrativo geral

### A-01 — Login separado

Rota e layout próprios. Autenticação sozinha não basta: exigir presença ativa em `platform_admins`.

### A-02 — Dashboard

- estabelecimentos ativos;
- em avaliação;
- em atraso;
- suspensos;
- cancelados;
- faturas abertas, vencidas e pagas;
- valor confirmado no período.

### A-03 — Estabelecimentos

Tabela com busca e filtros. Colunas: nome, cidade, owner, plano, vencimento, status e operação. Detalhe com abas Cadastro, Assinatura, Faturas, Equipe e Auditoria.

### A-04 — Planos

Nome, preço, periodicidade, limites, recursos e estado. Alterar plano não reescreve faturas passadas.

### A-05 — Cobrança

Criar fatura, confirmar pagamento, corrigir/estornar, conceder prazo, suspender e reativar. Ações críticas exigem confirmação e motivo.

### A-06 — Administradores

Somente superadmin. Convidar, alterar papel e desativar; impedir remoção do último superadmin.

### A-07 — Auditoria

Filtros por ator, ação, recurso, estabelecimento e período. Exibir antes/depois com mascaramento de dados sensíveis.

## 6. Layout responsivo

| Área | Mobile | Tablet | Desktop |
|---|---|---|---|
| Cardápio | Principal | Centralizado | Coluna central com carrinho lateral opcional |
| KDS | Abas | 2–3 colunas | 3 colunas |
| Admin do local | Drawer | Sidebar recolhível | Sidebar fixa |
| Superadmin | Resumo e cards | Tabelas roláveis | Tabelas e filtros completos |

## 7. Acessibilidade

- Foco visível.
- Ordem de tabulação coerente.
- Inputs com `label`.
- Erros associados ao campo.
- Alternativa textual para imagem e poster.
- Legenda/transcrição opcional para vídeo; informação essencial também em texto.
- Movimento e som nunca são a única forma de notificação.
- Modal com foco contido e retorno de foco.
- Áreas de toque de pelo menos 44 × 44 px.
- Formatação monetária e datas por `pt-BR`.

