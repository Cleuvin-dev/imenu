# 14 — Seed e roteiro de demonstração

## 1. Objetivo

O seed deve permitir demonstrar todo o fluxo sem depender de dados reais. Deve ser idempotente, identificável como fictício e proibido em produção.

## 2. Tenant demo

### Estabelecimento

- Nome: **Bistrô Vermelho Demo**
- Slug: `bistro-vermelho-demo`
- Cidade: Belo Horizonte/MG
- Fuso: `America/Sao_Paulo`
- Moeda: `BRL`
- Assinatura: ativa
- Aceitando pedidos: sim

### Mesas

- Mesa 01
- Mesa 02
- Varanda 01

Tokens devem ser gerados pelo seed local e exibidos apenas na documentação local de demo.

## 3. Usuários demo

Criar por script local seguro, com senhas obtidas de variáveis ou valores explicitamente exclusivos do ambiente de desenvolvimento:

- owner;
- manager;
- menu editor;
- kitchen;
- cashier;
- viewer;
- superadmin;
- platform support;
- usuário de outro tenant para testes de isolamento.

O README do projeto implementado deve explicar como criar/redefinir essas contas. Não versionar senha de staging/produção.

## 4. Cardápio demo

### Categoria: Hambúrgueres

**Clássico da Casa**

- preço: R$ 24,90;
- pão brioche, carne bovina, queijo, alface, tomate e molho da casa;
- alergênicos: glúten, leite;
- grupo obrigatório “Ponto da carne”: malpassado, ao ponto, bem-passado;
- grupo opcional “Adicionais”: bacon + R$ 4,00, queijo + R$ 3,00;
- mídia placeholder local.

**Veggie Crocante**

- preço: R$ 27,90;
- hambúrguer vegetal, salada e molho;
- alergênicos: glúten;
- publicado e disponível.

### Categoria: Porções

**Batata Especial**

- preço: R$ 18,00;
- opções de tamanho: pequena, grande + R$ 8,00;
- status publicado, inicialmente esgotado para demonstrar disponibilidade.

### Categoria: Bebidas

**Refrigerante Lata**

- preço: R$ 7,00;
- sabores como grupo obrigatório.

**Água Mineral**

- preço: R$ 5,00.

### Rascunho

**Sobremesa Secreta**

- produto `draft`;
- nunca deve aparecer no menu público;
- usado para teste de publicação.

## 5. Segundo tenant

Criar **Café Azul Demo** com produtos e usuários próprios. Ele existe para provar:

- isolamento RLS;
- seleção de tenant;
- tokens de mesa distintos;
- filtros do superadmin.

## 6. Cenários de cobrança

Criar dados controlados:

- Bistrô ativo com fatura paga.
- Café Azul `past_due` com prazo adicional futuro.
- terceiro tenant opcional suspenso por fatura vencida.

Cada cenário deve poder ser resetado por script idempotente.

## 7. Roteiro de demonstração

### Etapa 1 — Cardápio

1. Abrir QR da Mesa 01 em viewport móvel.
2. Navegar pelas categorias.
3. Abrir produto com mídia.
4. Selecionar ponto, adicional e observação.
5. Adicionar ao carrinho.

### Etapa 2 — Pedido

1. Abrir KDS em outra janela.
2. Enviar pedido.
3. Demonstrar alerta.
4. Aceitar → preparar → pronto → entregar.
5. Mostrar atualização no consumidor.

### Etapa 3 — Conta

1. Consumidor solicita conta.
2. Caixa reconhece.
3. Marca conta entregue.
4. Fecha sessão.

### Etapa 4 — Cardápio

1. Menu editor publica “Sobremesa Secreta”.
2. Atualizar menu público.
3. Marcar Batata disponível.
4. Mostrar ambos sem novo deploy.

### Etapa 5 — QR

1. Baixar QR.
2. Regenerar token da Mesa 02.
3. Confirmar QR antigo inválido e novo válido.

### Etapa 6 — Assinatura

1. Superadmin cria fatura vencida no cenário de teste.
2. Executa job.
3. Mostrar bloqueio.
4. Confirmar pagamento.
5. Mostrar reativação e preservação do cardápio.

### Etapa 7 — Segurança

1. Logar como kitchen e tentar abrir editor.
2. Tentar acessar tenant B pela URL.
3. Confirmar negação.

## 8. Reset

Fornecer comando documentado para:

- limpar apenas dados demo;
- recriar seed;
- não tocar em dados fora do ambiente local;
- exigir confirmação/flag quando houver qualquer risco.

