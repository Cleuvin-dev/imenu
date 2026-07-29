# Prompt mestre para executar o MVP no Claude Code

Copie e envie ao Claude Code após colocar todo este pacote na raiz do repositório:

---

Você será o engenheiro principal responsável por construir o MVP completo do **iMenu**. Este repositório contém a documentação oficial do produto.

## Primeira ação obrigatória

Antes de editar qualquer arquivo:

1. Leia integralmente `README.md` e `CLAUDE.md`.
2. Leia todos os arquivos de `docs/`, `references/` e `status/` na ordem indicada pelo README.
3. Inspecione o estado atual do repositório, as tecnologias existentes e eventuais alterações não commitadas.
4. Compare o estado encontrado com a especificação e escreva um plano de implementação por fases.
5. Atualize `status/IMPLEMENTATION_STATUS.md` com o diagnóstico inicial.

Não comece por telas isoladas. Construa o fluxo vertical completo com banco, segurança, servidor, interface e testes.

## Resultado obrigatório

Entregue uma aplicação web SaaS multi-tenant funcional com:

- Cardápio público por QR Code exclusivo da mesa, sem login do consumidor.
- Categorias, busca, produto com vídeo ou imagem, descrição, ingredientes, alergênicos, preço, adicionais e observação.
- Carrinho e criação de pedido com preço recalculado no servidor.
- Acompanhamento do pedido.
- Painel operacional em tempo real com alerta visual e sonoro.
- Fluxo de pedido: pendente, aceito, em preparo, pronto, entregue, rejeitado ou cancelado.
- Solicitação de conta e tratamento pelo caixa.
- Administração do estabelecimento para cardápio, mídias, disponibilidade, mesas, QR Codes, equipe, permissões, horários e assinatura.
- Painel administrativo geral do iMenu para estabelecimentos, planos, faturas, pagamentos, inadimplência, suspensão, reativação, administradores e auditoria.
- Bloqueio automático de estabelecimentos inadimplentes sem apagar seus dados.
- Supabase com migrações, RLS, Storage, Auth e Realtime.
- Seed de demonstração e contas de teste documentadas sem credenciais reais.
- Testes automatizados dos fluxos críticos.
- Deploy documentado.

## Restrições

- Siga rigorosamente as decisões de escopo. Não implemente itens pós-MVP.
- Não exponha chaves privilegiadas.
- Não aceite preço, total, tenant ou permissão enviados pelo cliente como verdade.
- Use centavos inteiros para dinheiro e UTC para persistência de datas.
- Toda operação multi-tenant precisa de RLS e teste de isolamento.
- Criação de pedido deve ser transacional e idempotente.
- Use identidade visual própria do iMenu, com vermelho predominante, sem copiar o iFood.
- Use apenas dependências estáveis e necessárias.
- Preserve qualquer trabalho existente que não conflite com a documentação.

## Autonomia e bloqueios

Pode tomar decisões técnicas de baixo risco que preservem o contrato. Registre decisões relevantes em `status/DECISION_LOG.md`.

Pare e solicite minha intervenção somente quando precisar de:

- credenciais ou criação de conta externa;
- domínio e configuração DNS;
- decisão comercial não definida;
- operação destrutiva em dados existentes;
- mudança material de escopo;
- acesso que não esteja disponível.

Enquanto credenciais externas não existirem, implemente adaptadores, validação de configuração, ambiente local e mocks explicitamente limitados a desenvolvimento. Não marque integração externa como concluída.

## Sequência de implementação

Siga as fases de `docs/12_PLANO_DE_IMPLEMENTACAO.md`. Ao final de cada fase:

1. execute lint, tipos e testes pertinentes;
2. corrija falhas antes de avançar;
3. atualize `status/IMPLEMENTATION_STATUS.md`;
4. informe objetivamente arquivos alterados, testes executados e próximo passo.

## Condição de término

Só considere o MVP entregue quando todos os itens de `docs/16_DEFINITION_OF_DONE.md` estiverem atendidos e os cenários P0 de `docs/11_TESTES_CRITERIOS_DE_ACEITE.md` passarem.

Comece agora pela leitura e diagnóstico. Não altere código antes de me apresentar o plano baseado no estado real do repositório.

---

