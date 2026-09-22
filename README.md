# LovableUnlimited

Site estático com página pública e administração. A logo e sua cor original foram preservadas.

## Executar localmente

Requer Node.js. Execute `node preview.cjs` e abra http://127.0.0.1:4173. O admin está em `/admin.html`.

## Administração e dados

- Pedidos, aprovação/rejeição de pagamentos e configurações continuam usando o Supabase configurado.
- O login exige autenticação e uma função administrativa emitida pelo servidor: `app_metadata.role = "admin"` ou `app_metadata.is_admin = true`. Metadados editáveis pelo usuário não são aceitos. Se as contas atuais usam outra convenção, ela precisa ser mapeada para a política administrativa real antes da publicação.
- Nenhuma política RLS, permissão ou conta no Supabase foi alterada. A verificação visual no frontend não substitui autorização no servidor. As políticas de leitura/alteração de `orders` e `settings` precisam aplicar a mesma restrição administrativa. Não foi possível verificar essas políticas neste workspace, que não contém migrations ou credenciais administrativas.
- Não existe mais login que aceita qualquer senha quando o serviço está indisponível.
- O botão “Explorar painel de demonstração” abre apenas dados fictícios em memória. Esse modo não consulta nem grava tabelas reais.
- Cupons, logs, conversa de suporte e gráfico de uso são demonstrações explícitas, mesmo após login real. Não há tabelas/serviços desses módulos no projeto. As alterações são perdidas ao encerrar a sessão.
- Usuários são clientes derivados dos pedidos, não um cadastro completo de contas. Último acesso e data de cadastro não são inventados.
- O produto existente tem plano vitalício. Não foram inventadas assinaturas recorrentes, próximas cobranças ou cancelamentos.
- Nenhum pagamento real, mensagem de suporte ou alteração remota foi executado durante os testes.

## Arquivos

- `index.html`, `style.css`, `redesign.css`, `app.js`, `experience.js`: página pública, demonstração interativa e fluxo existente de compra.
- `admin.html`, `admin.css`, `admin-redesign.css`, `admin.js`, `admin-config.js`: painel.
- `PRODUCT.md` e `DESIGN.md`: contexto e decisões.
- `qa/`: capturas desktop (1440px), tablet (820px) e mobile (390px), além do relatório de layout.

## Verificação

Para reproduzir os testes: `npm install --prefix .qa-runtime playwright@1.63.0` e mantenha `node preview.cjs` em execução. É necessário Microsoft Edge instalado.

- `node interaction-tests.cjs`: busca, detalhes, seleção, paginação, filtros persistentes, confirmação/cancelamento, cupons demo, suporte demo, configurações, atalhos, logout, isolamento do demo e rejeição de conta comum.
- `node qa.cjs`: capturas e verificação de overflow/erros nas três dimensões.

A inspeção final não apresentou overflow da página nem erros JavaScript nas rotas verificadas. Tabelas usam rolagem horizontal própria em telas pequenas.

## Limites da entrega

A publicação não foi realizada. Integrações reais dependem do backend existente. O arquivo `lovableunlimited.zip` já tinha apenas 60 bytes antes desta tarefa; seu conteúdo não foi substituído ou certificado como uma extensão funcional. O fluxo público de termos, pagamento e consulta foi preservado.

Teste adicional: `node backend-contract-tests.cjs` verifica respostas de atualização sem registros, sem gravação real, e escape de conteúdo vindo da base.
