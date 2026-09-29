# Design
## Direction
Dark Mode SaaS / fintech: fundo escuro profundo, cards azul-marinho com borda sutil de 1px, azul elétrico/ciano como único accent (com glow suave), alto contraste. Referência: modal "Cupom de boas-vindas".

## System (theme.css)
- Fundo `#070b12` / `#0b111e`; cards `#0f172a`; blocos internos `#0d1527`; secundários `#162032`.
- Bordas `rgba(255,255,255,.08)`; destaque `rgba(56,189,248,.28)`.
- Accent `#0084ff` / `#0099ff` / `#38bdf8`; CTA com gradiente azul e `box-shadow: 0 10px 25px -4px rgba(0,132,255,.4)`.
- Texto `#fff` (títulos/números), `#cbd5e1`, `#94a3b8` (secundário).
- Tipografia: Plus Jakarta Sans (UI), Outfit 800 (títulos, preços, códigos), JetBrains Mono (protocolos).
- Raios: botões 12–14px, cards 20–24px, pílulas 9999px.
- Componentes: `.ds-pill--solid`, `.ds-pill--outline`, `.ds-code-box` (caixa tracejada estilo cupom).

## Arquivos
- `theme.css`: tokens + componentes globais (todas as páginas).
- `style.css`: site público (termos, checkout, pedido, status) e navbar do obrigado.html.
- `admin.css` + `admin-redesign.css`: layout do admin (cores via tokens).
- `admin-theme.css`: acabamento dark do admin e do editor.
- `redesign.css`: legado da antiga landing, não é mais carregado.

## Observações
- `settings.primary_color` (Supabase) sobrescreve `--primary` no site; defina `#0084ff` em Configurações.
- `settings.delivery_page_config` salvo antes do redesign mantém as cores antigas na página de entrega até ser redefinido/publicado de novo no Personalizador.
