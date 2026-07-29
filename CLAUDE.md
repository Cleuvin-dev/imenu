# Instruções permanentes para o Claude Code — iMenu

## Missão

Construir e entregar o MVP funcional do iMenu conforme a documentação deste repositório. Não tratar os documentos como sugestões genéricas: eles formam o contrato de produto, arquitetura, segurança e aceite.

## Forma de trabalhar

1. Leia toda a documentação na ordem definida em `README.md` antes de escrever código.
2. Inspecione o repositório e registre o estado inicial.
3. Produza um plano por fases alinhado a `docs/12_PLANO_DE_IMPLEMENTACAO.md`.
4. Atualize `status/IMPLEMENTATION_STATUS.md` ao concluir cada etapa verificável.
5. Faça alterações pequenas, coesas e testáveis.
6. Execute lint, checagem de tipos, testes e build ao final de cada fase.
7. Não declare uma etapa concluída se ela depende de mock não documentado.
8. Ao encontrar ambiguidade, aplique as decisões de MVP já registradas. Pergunte somente se a escolha mudar escopo, custo, credenciais ou regra comercial.

## Regras técnicas inegociáveis

- TypeScript estrito; não usar `any` sem justificativa documentada.
- Toda tabela de negócio multi-tenant deve possuir `establishment_id`, restrições coerentes e RLS.
- Nunca confiar em `establishment_id`, preço, total, status ou permissões enviados pelo navegador.
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Criação de pedido e cálculo de total devem ocorrer no servidor, em transação.
- Valores monetários em centavos inteiros.
- Datas persistidas em UTC; exibição no fuso do estabelecimento.
- Alterações de status devem validar a máquina de estados.
- Pedidos devem guardar snapshots de produto, preço e adicionais.
- Endpoints públicos devem validar QR/mesa, disponibilidade, assinatura, horário, payload, idempotência e limite de requisições.
- Uploads devem validar tipo real, tamanho, extensão e autorização.
- Toda ação sensível do superadmin deve gerar auditoria.
- Não desabilitar RLS como atalho.
- Não usar dados reais ou segredos em seed, testes, commits ou documentação.

## Escopo do MVP

Implemente integralmente o que estiver marcado como MVP. Não implemente itens de `docs/15_BACKLOG_POS_MVP.md` sem autorização. Em especial:

- Não integrar pagamento da refeição.
- Não criar aplicativo nativo.
- Não criar conta de consumidor.
- Não integrar impressora, PDV, ERP, WhatsApp ou marketplace.
- Não implementar programa de fidelidade, delivery ou reserva.

## Qualidade visual

- Mobile-first no cardápio público.
- Tablet/desktop-first nos painéis de cozinha e caixa, mantendo responsividade.
- Vermelho predominante com identidade própria definida no design system.
- Estados de carregamento, vazio, erro, bloqueio, confirmação e indisponibilidade são obrigatórios.
- Não usar textos genéricos de template no produto final.
- Garantir navegação por teclado, foco visível, contraste e rótulos acessíveis.

## Banco e migrações

- Criar arquivos SQL versionados em `supabase/migrations`.
- Nunca editar migração já aplicada; criar nova migração corretiva.
- Criar seed idempotente para demonstração.
- Criar políticas RLS explícitas; nenhuma tabela nova pode ficar sem decisão documentada de acesso.
- Funções `security definer` devem fixar `search_path`, validar o chamador e expor somente o necessário.

## Verificação obrigatória

Antes da entrega:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Se algum comando depender de serviço externo indisponível, registre exatamente o bloqueio, mantenha os testes locais possíveis e não oculte a falha.

## Documentação viva

Ao final:

- Atualize o README do repositório com instalação, execução, testes, seed e deploy.
- Atualize `status/IMPLEMENTATION_STATUS.md`.
- Registre desvios em `status/DECISION_LOG.md`.
- Mantenha os contratos de API e a modelagem compatíveis com o código.
- Entregue uma lista curta do que foi concluído, comandos executados, resultados e pendências externas.

