# Design
## Direction
Brief-pinned: estúdio de criação amplo e luminoso, superfícies off-white, tinta quase preta, roxo concentrado em ações. A direção fornecida prevalece sobre alternativas do sorteio da skill.
## System
Inter, hero 64–88px, títulos 44–60px; containers até 1440px; cards 24–32px; botões 14px. Preservar brand-mark e SVG sem alterações. Sombras difusas com deslocamento; transições 300ms; movimento reduzido respeitado.
## Surfaces
Landing: Persuade, hero dividido, aplicação navegável simulada, recursos assimétricos, processo, interface, benefícios, FAQ e CTA amplo.
Admin: Operate, sidebar recolhível, busca, dados verdadeiros quando disponíveis, demonstração explícita para módulos sem backend. Falhas não viram métricas zero.

## Final verification
Inspeção em 1440, 820 e 390 pixels. Hero sem overflow; admin com tabelas que rolam dentro do próprio container. Demonstração com três prompts e transição em três etapas. Dialog nativo com foco e Escape, aria-live em status, foco visível e movimento reduzido.
Revisão independente: visual aprovado; atualização sem registros retornados corrigida exigindo `.select('id').single()` e id correspondente. Limitação de backend explicitada em README.md.
