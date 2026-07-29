# 01 — Visão, escopo e decisões do MVP

## 1. Visão do produto

O iMenu reduz o intervalo entre o consumidor sentar-se à mesa e o estabelecimento receber seu pedido. Um QR Code impresso na mesa abre um cardápio web visual, com mídias e informações suficientes para que o consumidor escolha e peça sem esperar atendimento inicial.

O produto não pretende eliminar o atendimento humano. Ele automatiza consulta, envio do pedido, acompanhamento e solicitação da conta, deixando a equipe livre para preparar, conferir, servir e resolver exceções.

## 2. Problemas resolvidos

### Para o consumidor

- Espera para receber o cardápio.
- Dificuldade para visualizar a aparência e os ingredientes.
- Dependência de um garçom para registrar o primeiro pedido.
- Incerteza sobre o andamento do pedido.
- Espera para pedir a conta.

### Para o estabelecimento

- Cardápio impresso desatualizado.
- Retrabalho para alterar preços e disponibilidade.
- Erros de transcrição entre mesa e cozinha.
- Falta de ordem e horário claro dos pedidos.
- Baixa visibilidade operacional.
- Ausência de controle central dos conteúdos e usuários.

### Para o iMenu

- Cadastro e controle de estabelecimentos clientes.
- Gestão de planos, vencimentos, pagamentos e inadimplência.
- Suspensão e reativação sem perda de dados.
- Auditoria das ações administrativas.

## 3. Objetivos mensuráveis do MVP

- Um consumidor deve chegar ao cardápio em até dois passos após ler o QR.
- Um pedido válido deve aparecer no painel operacional em até cinco segundos em condição normal de rede.
- Alterações publicadas no cardápio devem ficar visíveis em até 60 segundos.
- Nenhum usuário de um estabelecimento deve ler ou alterar dados de outro.
- Uma fatura vencida deve suspender o serviço no ciclo do job de cobrança, salvo prazo adicional ativo.
- O sistema deve reconstruir o estado correto após perda e retorno da conexão em tempo real.

## 4. Escopo incluído

### Cardápio público

- Acesso por QR Code exclusivo da mesa.
- Identificação visual do estabelecimento.
- Categorias, busca por texto e produtos.
- Imagem de capa e/ou vídeo no detalhe do produto.
- Nome, descrição, ingredientes, alergênicos, informação nutricional opcional e preço.
- Grupos de adicionais/opções com regras de seleção.
- Observação por item.
- Carrinho, resumo, total e envio do pedido.
- Confirmação e acompanhamento de status.
- Solicitação de conta.
- Estados de local fechado, pedidos pausados, item indisponível e assinatura suspensa.

### Operação do estabelecimento

- Lista/KDS de pedidos com atualização em tempo real.
- Alerta visual e sonoro para novos pedidos.
- Filtros por status e ordenação por horário.
- Aceitar, rejeitar, iniciar preparo, marcar pronto, entregue ou cancelado.
- Exibição clara da mesa, itens, quantidades, opções e observações.
- Painel de solicitações de conta.
- Visão de mesas e sessões abertas.

### Administração do estabelecimento

- Dashboard.
- Gestão de categorias.
- Gestão de produtos, preço, descrição, ingredientes, alergênicos e informações nutricionais.
- Upload, substituição e exclusão de vídeo/imagem.
- Gestão de adicionais e opções.
- Rascunho, pré-visualização e publicação.
- Disponível, indisponível ou arquivado.
- Horários e botão para aceitar/pausar pedidos.
- Mesas, QR Codes, regeneração e download.
- Convite e gestão de funcionários.
- Papéis e permissões.
- Consulta da assinatura e faturas.

### Administração geral

- Dashboard geral.
- Cadastro e edição de estabelecimentos.
- Ativação, suspensão, reativação e cancelamento.
- Gestão de planos.
- Criação e acompanhamento de faturas.
- Confirmação e estorno administrativo de pagamentos.
- Prazo adicional manual.
- Pesquisa e filtros.
- Gestão de administradores da plataforma.
- Auditoria.

## 5. Fora do MVP

- Pagamento da refeição pelo celular.
- Pix, cartão, gorjeta ou divisão de conta do consumidor.
- Cobrança recorrente automática por gateway para a mensalidade SaaS.
- Aplicativo Android/iOS nativo.
- Conta, perfil ou fidelidade do consumidor.
- Delivery, retirada, reserva de mesa ou fila de espera.
- Chamada genérica de garçom.
- Integração com PDV, ERP, estoque, impressora térmica ou sistema fiscal.
- Emissão de nota fiscal.
- WhatsApp, SMS ou push fora do navegador.
- Cupons, cashback, programa de pontos ou avaliações.
- Várias filiais compartilhando o mesmo catálogo.
- Precificação dinâmica, taxas de serviço e divisão automática por cozinha.
- Inteligência artificial para gerar cardápio.

## 6. Premissas

- O estabelecimento possui conexão estável e ao menos um dispositivo com navegador moderno.
- Cada mesa tem um QR Code físico legível.
- Funcionários autenticados operam o painel.
- O consumidor aceita que o navegador mantenha um identificador anônimo local para acompanhar o próprio pedido.
- A equipe do estabelecimento confere pedidos antes do preparo.
- Vídeos são curtos e otimizados pelo próprio estabelecimento no MVP.

## 7. Decisões fechadas

| Tema | Decisão do MVP | Motivo |
|---|---|---|
| Plataforma | Web App/PWA responsivo | Sem instalação e acesso imediato pelo QR |
| Arquitetura | Monólito modular Next.js + Supabase | Menor complexidade operacional |
| Consumidor | Anônimo | Reduz fricção |
| Mesa | QR com token aleatório | Evita IDs sequenciais e identifica o contexto |
| Pagamento da refeição | Apenas solicitação da conta | Evita escopo fiscal/financeiro prematuro |
| Cobrança SaaS | Registro administrativo + suspensão automática por vencimento | MVP executável sem conta externa |
| Cardápio | Rascunho/publicação e disponibilidade | Permite edição segura |
| Status | Nível de pedido, não de cada item | KDS suficiente para a primeira versão |
| Moeda | BRL em centavos | Evita erro de ponto flutuante |
| Idioma | pt-BR | Público inicial |
| Tema | Vermelho original do iMenu | Diretriz de marca |
| Vídeo | Opcional, com imagem de fallback | Desempenho e acessibilidade |
| Multi-tenant | Uma assinatura por estabelecimento | Isolamento comercial simples |

## 8. Riscos conhecidos e resposta

| Risco | Resposta no MVP |
|---|---|
| Foto do QR usada fora do local | Token aleatório, rate limit, horário de operação, aceite manual e regeneração |
| Navegador bloquear som | Tela de ativação de alertas e sinal visual persistente |
| Realtime desconectar | Refetch ao reconectar e polling de segurança |
| Preço mudar com item no carrinho | Servidor recalcula e retorna `PRICE_CHANGED` |
| Produto ficar indisponível | Servidor rejeita o item e informa o consumidor |
| Pedido duplicado por toque/retry | Chave de idempotência |
| Tenant acessar outro tenant | RLS, autorização no servidor e testes de isolamento |
| Vídeos pesados | Limite de tamanho, poster, `preload=metadata` e imagem na listagem |
| Fatura marcada incorretamente | Auditoria e operação administrativa de correção |

## 9. Indicadores iniciais

O MVP deve preparar os dados, sem exigir dashboard analítico avançado:

- pedidos criados por estabelecimento e período;
- taxa de rejeição/cancelamento;
- tempo entre criação, aceite, preparo, pronto e entrega;
- solicitações de conta abertas e concluídas;
- estabelecimentos ativos, em atraso, suspensos e cancelados;
- faturas pagas, abertas e vencidas;
- produtos indisponíveis.

