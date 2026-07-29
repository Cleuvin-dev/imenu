# 10 — Segurança, privacidade, LGPD e auditoria

## 1. Modelo de ameaça resumido

Ativos:

- pedidos e histórico;
- catálogo e mídias;
- dados cadastrais dos estabelecimentos;
- usuários e papéis;
- faturas e pagamentos;
- tokens de mesa/rastreamento;
- chaves e sessões.

Ameaças principais:

- acesso entre tenants;
- adulteração de preço;
- pedido duplicado;
- pedido remoto por QR copiado;
- escalada de papel;
- upload malicioso;
- enumeração de recursos;
- replay de webhook/cron;
- vazamento de segredo;
- ação financeira sem trilha.

## 2. Controles obrigatórios

### Autenticação

- Supabase Auth para funcionários/admins.
- Cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Renovação e logout corretos.
- Mensagens de login neutras.
- MFA recomendado para superadmin pós-MVP; documentar ativação se já suportada sem aumentar escopo.

### Autorização

- RLS + validação server-side.
- Menor privilégio.
- Papel lido do banco.
- Service role restrita ao servidor.
- Rota de superadmin exige associação ativa em `platform_admins`.

### Integridade financeira

- centavos inteiros;
- cálculo no servidor;
- snapshots;
- transação;
- restrições e checks;
- auditoria para pagamento, reversão, prazo e bloqueio.

### Tokens

- aleatórios, alta entropia e não sequenciais;
- convite e sessão anônima armazenados como hash;
- tokens nunca em logs;
- token de mesa rotacionável;
- comparação resistente a timing quando aplicável;
- expiração para convites e sessões.

### Upload

- permitir somente formatos definidos;
- verificar magic bytes/MIME e extensão;
- tamanho máximo;
- nome de arquivo gerado pelo servidor;
- impedir SVG não sanitizado como imagem enviada pelo usuário;
- vídeo: MP4/WebM permitidos conforme suporte;
- imagem: JPEG/PNG/WebP;
- download com cabeçalhos corretos;
- nenhuma execução de conteúdo.

### Aplicação web

- CSP adequada;
- proteção contra clickjacking (`frame-ancestors`);
- HSTS em produção;
- `X-Content-Type-Options: nosniff`;
- política de referrer;
- sanitização de rich text; preferir texto simples no MVP;
- validação de redirecionamentos;
- CORS restrito;
- dependências auditadas.

## 3. QR copiado e abuso

Não é possível garantir presença física apenas com QR estático. O MVP reduz risco por:

- token aleatório;
- mesa ativa;
- horário de operação;
- chave `accepting_orders`;
- rate limit por IP hash/sessão/mesa;
- aceite manual antes de preparo;
- botão de regenerar QR;
- detecção de volume anormal em logs.

Não implementar geolocalização obrigatória no MVP. PIN rotativo, Wi-Fi local ou aprovação por mesa ficam no backlog.

## 4. Privacidade do consumidor

- Sem cadastro obrigatório.
- Sem nome, e-mail, telefone ou localização.
- Sessão anônima pseudonimizada.
- Observação do pedido pode conter texto livre; alertar para não inserir dados sensíveis.
- Cookie estritamente necessário para carrinho/rastreamento.
- Não usar analytics publicitário no MVP.
- Não compartilhar pedidos entre dispositivos sem necessidade operacional.

## 5. LGPD

Documentação do produto deve informar:

- controlador/operador conforme contrato a ser validado juridicamente;
- finalidade do tratamento;
- categorias de dados;
- retenção;
- canal para solicitação do titular;
- cookies necessários;
- subprocessadores;
- medidas de segurança.

Este documento é especificação técnica, não parecer jurídico. Política de privacidade, termos e prazos definitivos devem ser revisados por profissional qualificado antes da produção.

## 6. Retenção inicial

Valores de referência configuráveis:

| Dado | Retenção técnica inicial |
|---|---|
| Sessão anônima/token | 30 dias após encerramento |
| Logs de aplicação sanitizados | 90 dias |
| Auditoria administrativa | 24 meses |
| Pedidos e sessões | 24 meses, sujeito a contrato/obrigações |
| Convites expirados | 90 dias |
| Mídia arquivada sem referência | limpeza após 30 dias |
| Faturas/pagamentos | conforme obrigação contratual/fiscal a validar |

Criar jobs apenas após aprovação das regras legais. No MVP, não apagar histórico financeiro automaticamente.

## 7. Auditoria

Eventos mínimos:

- criação/edição/desativação de estabelecimento;
- alteração de owner ou papéis;
- criação/alteração de plano;
- criação/anulação de fatura;
- confirmação/reversão de pagamento;
- prazo adicional;
- suspensão/reativação/cancelamento;
- regeneração de QR;
- publicação/arquivamento de produto;
- rejeição/cancelamento de pedido;
- alteração de configuração de pedidos.

Registro:

- ator;
- escopo;
- ação;
- recurso;
- tenant;
- data;
- request ID;
- antes/depois sanitizado;
- motivo quando exigido.

Auditoria é append-only para usuários comuns.

## 8. Segredos

- Usar variáveis de ambiente e secret manager do provedor.
- `.env.example` contém nomes, nunca valores reais.
- Rotacionar chave se aparecer em log/commit.
- Separar chaves por ambiente.
- `NEXT_PUBLIC_` somente para valores realmente públicos.
- Chave de cron com entropia suficiente.
- Não copiar service role para Supabase client do navegador.

## 9. Backup e recuperação

- Habilitar backups adequados ao plano Supabase de produção.
- Documentar RPO/RTO contratado.
- Testar restauração em ambiente separado antes do lançamento.
- Exportar migrações no Git; banco de produção não é fonte exclusiva de schema.
- Mídias precisam de estratégia de recuperação compatível com Storage.

## 10. Checklist antes de produção

- RLS testada.
- Segredos separados.
- HTTPS e headers.
- domínio permitido configurado.
- URL de redirect do Auth revisada.
- buckets/policies revisados.
- service role ausente do bundle.
- rate limit ativo.
- cron autenticado.
- backups verificados.
- contas demo removidas ou desativadas.
- auditoria financeira ativa.
- política e termos revisados.

