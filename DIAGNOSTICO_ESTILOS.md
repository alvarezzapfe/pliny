# DIAGNOSTICO_ESTILOS.md — Mapa visual del front

> Generado: 2026-07-02 | Branch: `main` | READ-ONLY — sin cambios al código

---

## 1. Tokens: dónde viven colores y tipografía

### Fuentes de verdad (no hay una sola)

| Fuente de estilos | Archivo | Notas |
|---|---|---|
| **Tailwind v4** | `postcss.config.mjs` | Instalado via `@tailwindcss/postcss`, pero **NO hay `tailwind.config.ts/js`** — corre con defaults |
| **Global CSS** | `app/globals.css` (182 líneas) | Variables `:root`, clases `.burocrowd-*`, blobs, animaciones |
| **Landing inline CSS** | `app/page.tsx` líneas ~125-306 | Sistema de diseño completo: 19 vars, 30+ clases, 6 keyframes |
| **Por-página inline** | Cada `page.tsx` tiene su propio `<style>` | Login, register, legal, advisory, dashboard pages — cada uno redefine vars |

**No hay:** `tailwind.config`, theme provider, archivo de design tokens, dark mode toggle.

### Paleta completa — CSS Variables

#### globals.css `:root`

| Variable | Valor (light) | Valor (dark) |
|---|---|---|
| `--background` | `#ffffff` | `#0a0a0a` |
| `--foreground` | `#171717` | `#ededed` |
| `--cl-blue` | `#0084FF` | — |
| `--cl-green` | `#41E897` | — |
| `--deep-0` | `#030812` | — |
| `--deep-1` | `#040B18` | — |
| `--deep-2` | `#06122A` | — |
| `--deep-3` | `#071A3B` | — |

Tailwind theme mapping (`@theme inline`):
- `--color-background` → `var(--background)`
- `--color-foreground` → `var(--foreground)`
- `--font-sans` → `var(--font-geist-sans)` (referencia Geist, pero la landing usa DM Sans)
- `--font-mono` → `var(--font-geist-mono)`

#### Landing (`app/page.tsx` `:root`, líneas ~130-150)

| Variable | Valor | Uso |
|---|---|---|
| `--font-sans` | `'DM Sans', -apple-system, system-ui, sans-serif` | Tipografía principal |
| `--font-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace` | Labels, badges, código |
| `--bg` | `#FFFFFF` | Fondo principal |
| `--bg-2` | `#F9FAFB` | Fondo secundario (topbar, hover) |
| `--bg-3` | `#F3F4F6` | Fondo terciario (tab toggle) |
| `--fg` | `#0A0A0A` | Texto principal |
| `--fg-2` | `#6B7280` | Texto secundario |
| `--fg-3` | `#9CA3AF` | Texto terciario / labels |
| `--border` | `#E5E7EB` | Bordes primarios |
| `--border-2` | `#D1D5DB` | Bordes hover |
| `--accent` | `#0C1E4A` | Navy blue (botones, sidebar) |
| `--accent-2` | `#00E5A0` | Verde brillante (highlight, CTA) |
| `--purple` | `#7C3AED` | Acentos decorativos |
| `--cyan` | `#0891B2` | Acentos secundarios |
| `--red` | `#EF4444` | Errores |
| `--amber` | `#F59E0B` | Warnings |
| `--green` | `#00E5A0` | = accent-2 (duplicado) |
| `--grad` | `linear-gradient(135deg, #7B5CF5 0%, #1E7FFF 50%, #1FD9E8 100%)` | Gradiente principal |
| `--grad-text` | `linear-gradient(135deg, #7B5CF5 0%, #1E7FFF 45%, #1FD9E8 100%)` | Gradiente para texto |

#### Legal / Auth (tema oscuro)

| Variable | Valor |
|---|---|
| `--bg` | `#0C1E4A` |
| `--bg-2` | `#0F2254` |
| `--bg-3` | `#132660` |
| `--fg` | `#EEF2FF` |
| `--fg-2` | `rgba(238,242,255,0.62)` |
| `--fg-3` | `rgba(238,242,255,0.36)` |
| `--border` | `rgba(255,255,255,0.08)` |
| `--accent` | `#5B8DEF` |
| `--accent-2` | `#00E5A0` |

#### Colores de layout por rol

| Layout | Sidebar gradient | Content bg | Accent |
|---|---|---|---|
| Dashboard | `radial-gradient(... #1B3F8A → #0C1E4A → #091530)` | `#F4F6FB` | `#5B8DEF` / `#00E5A0` |
| Fondeador | Mismo gradient azul | `#F4F6FB` | `#3B82F6` |
| Solicitante | `linear-gradient(160deg, #0A2518 → #051A10)` | `#F0F7F4` | `#00E5A0` |

---

## 2. Tipografía

### Fuentes y carga

| Fuente | Carga | Pesos | Dónde se usa |
|---|---|---|---|
| **DM Sans** | Google Fonts `@import` en `<style>` inline | 300-800 + italic 400 | Landing (`app/page.tsx`), Advisory |
| **JetBrains Mono** | Google Fonts `@import` en `<style>` inline | 400, 500, 600 | Landing (mono), calculadora |
| **Geist** | Google Fonts `@import` en `<style>` inline | 300-900 (varía por página) | Dashboard, login, register, legal, admin, solicitante |
| **Geist Mono** | Google Fonts `@import` en `<style>` inline | 400-700 | Dashboard, admin (monospace) |

**No se usa `next/font`.** Todas las fuentes se cargan via `@import url(...)` dentro de tags `<style>` en cada página. Esto significa que cada página hace su propia petición a Google Fonts.

### Tamaños de texto recurrentes

#### Landing (`app/page.tsx`)

| Elemento | fontSize | fontWeight | letterSpacing |
|---|---|---|---|
| Hero h1 | `clamp(40px,7vw,84px)` | 800 | `-0.055em` |
| Hero subtítulo | `clamp(15px,2vw,18px)` | 400 | — |
| Section h2 | `clamp(28px,4vw,48px)` | 800 | `-0.045em` |
| About h2 | `clamp(24px,3.5vw,42px)` | 800 | `-0.045em` |
| Precio amount | `48px` | 800 | `-0.06em` |
| Lead form h3 | `30px` | 800 | `-0.045em` |
| CTA h2 (sol.) | `26px` | 800 | `-0.045em` |
| Stat value | `32px` | 800 | `-0.05em` |
| Monto solicitud | `24px` | 800 | `-0.05em` |
| Body text | `13.5px` | 500-600 | `-0.015em` |
| Mono labels | `10px` | 500 | `0.14em` |
| Badges/pills | `9-9.5px` | 500-600 | `0.05-0.08em` |
| Logo text | `16px` | 700 | `-0.04em` |
| Logo sub | `8px` (mono) | — | `0.14em` |
| Footer links | `13px` | — | — |
| Footer small | `10-10.5px` (mono) | — | — |

#### Dashboard / páginas internas

Usa `Geist` con tamaños similares pero no idénticos: `11px`, `12px`, `13px`, `14px`, `15px`, `18px`, `20px`, `22px`, `26px` hardcodeados.

### Escala tipográfica no estandarizada

Se usan **23 tamaños distintos** de fuente en la landing: `8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 18, 19, 24, 26, 30, 32, 48px` más 4 `clamp()`.

---

## 3. Layout

### Contenedores

| Elemento | Max-width | Padding horizontal |
|---|---|---|
| `.nav-inner` | `1160px` | `28px` |
| `.section` | `1160px` | `28px` |
| Flow diagram wrapper | `860px` | `20px` |
| 3-pillar grid | `860px` | `20px` |
| Hero subtítulo | `52ch` | — |
| Pricing desc | `44ch` | — |

### Spacing (padding/margin/gap recurrentes)

**No hay escala fija.** Los valores más usados:

| Contexto | Valores comunes |
|---|---|
| Padding botones | `7px 15px` (sm), `11px 22px` (md), `14px 28px` (lg) |
| Padding cards | `20px` (sol), `28px` (feat), `32px` (price), `14px 16px` (kpi) |
| Gap grids | `12px`, `14px`, `16px`, `52px`, `64px` |
| marginBottom secciones | `16, 22, 24, 28, 36, 52, 60, 72` |
| Gap flex items | `4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22` |

### Border-radius

| Valor | Dónde |
|---|---|
| `999px` | Pills, badges, dots, status-pill, sol-tag, sol-badge |
| `24px` | Lead form container |
| `22px` | CTA box solicitante |
| `18px` | db-card, price-card, feature grid container |
| `16px` | SVG flow nodes (rx) |
| `14px` | sol-card, stat-block, pricing info, 3-pillar cards |
| `13px` | Benefit box (solicitante) |
| `12px` | kpi-card, tab-toggle |
| `10px` | Botones, inputs |
| `9px` | tab-pill, sol-btn, pricing icon box |
| `8px` | nav-btn, social links |
| `7px` | About tags |
| `6px` | db-tab |

Otros valores sueltos en el codebase: `4, 5, 7, 11, 13, 20, 28px` — one-offs.

### Breakpoints

| Breakpoint | Qué cambia |
|---|---|
| `900px` | Nav links se ocultan |
| `768px` | Grids colapsan a 1-2 columnas, CTAs en columna, tabla oculta columnas |

---

## 4. Componentes visuales del home

### Navbar (`.nav-wrap`, `.nav-inner`)

- Fijo `position:fixed`, `z-index:100`, `height:60px`
- Transparente → scroll: `background:rgba(255,255,255,0.92)` + `backdrop-filter:blur(28px) saturate(160%)`
- Transición: `.4s`
- Links: `.nav-btn` — `13.5px/500`, hover con `rgba(0,0,0,0.04)` bg
- CTAs: `.btn-ghost` y `.btn-solid` (btn-sm)

### Hero

- `paddingTop:148px` para compensar navbar fijo
- Título: `clamp(40px,7vw,84px)/800` con `.grad-text` (gradiente en "México.")
- Subtítulo: `clamp(15px,2vw,18px)`, `maxWidth:52ch`, `color:var(--fg-2)`
- CTAs: `.btn-md.btn-solid` + `.btn-md.btn-ghost`
- Social proof: mono `10px`, separados por dots `3x3px`
- 3 pillar cards: grid `minmax(220px,1fr)`, `borderRadius:14`, `padding:20px 22px`

### Botones (sistema de clases)

| Clase | Apariencia |
|---|---|
| `.btn` | Base: `13.5px/600`, `borderRadius:10px`, hover `translateY(-1px)` |
| `.btn-sm` | `7px 15px`, `12.5px` |
| `.btn-md` | `11px 22px` |
| `.btn-lg` | `14px 28px`, `14.5px` |
| `.btn-solid` | `bg:var(--fg)`, `color:#fff`, shadow doble |
| `.btn-ghost` | Transparente + border |
| `.btn-grad` | Gradiente `--grad`, `::after` shine overlay |
| `.btn-accent` | `bg:var(--accent)` navy |
| `.btn-green` | `bg:var(--accent-2)`, texto oscuro `#031A11` |

### Cards

| Tipo | Clase | borderRadius | padding | Shadow |
|---|---|---|---|---|
| Dashboard mock | `.db-card` | `18px` | — | `0 1px 3px + 0 8px 32px` |
| KPI | `.kpi-card` | `12px` | `14px 16px` | hover: `0 1px 4px` |
| Feature | `.feat-card` | — (dentro de grid `18px`) | `28px` | — |
| Pricing | `.price-card` | `18px` | `32px` | `0 1px 3px` / highlight: green ring |
| Solicitud | `.sol-card` | `14px` | `20px` | hover: `0 8px 32px` |
| Stat | `.stat-block` | `14px` | `24px 28px` | `0 1px 3px` |
| 3-pillar | (inline) | `14px` | `20px 22px` | — |

### Badges/Pills

| Tipo | Clase | fontSize | borderRadius |
|---|---|---|---|
| Status verde | `.status-pill.green` | `9.5px` mono | `999px` |
| Status ámbar | `.status-pill.amber` | `9.5px` mono | `999px` |
| Status rojo | `.status-pill.red` | `9.5px` mono | `999px` |
| Sol tag | `.sol-tag` | `9px` mono | `999px` |
| Sol badge | `.sol-badge` | `9px` mono | `999px` |
| Precio recomendado | (inline) | `9.5px` mono | `0 0 10px 10px` |

### Tabs

- `.tab-toggle`: `bg:#F3F4F6`, `borderRadius:12px`, `padding:4px`
- `.tab-pill`: `9px 22px`, `borderRadius:9px`, `13.5px/600`
  - `.active-ot`: navy bg + white text
  - `.active-sol`: green bg + dark text
  - `.inactive`: transparente

### Inputs

- `.inp`: `borderRadius:10px`, `padding:11px 15px`, `13.5px`
- Focus: `border-color:#00E5A0` + `box-shadow:0 0 0 3px rgba(0,229,160,.10)`

---

## 5. Inconsistencias detectadas

### A) Colores hardcodeados vs tokens

**Grises:** Se usan valores de la escala Tailwind Gray (gray-100 a gray-900) pero directamente como hex, no como variables CSS:

| Hex | Tailwind equiv. | Veces usado | Problema |
|---|---|---|---|
| `#F8FAFC` | slate-50 | 17 | Solo en componentes internos, no en landing |
| `#F1F5F9` | slate-100 | 10 | Solo en componentes internos |
| `#E2E8F0` | slate-200 | 39 | Borde principal en dashboard (landing usa `#E5E7EB`) |
| `#94A3B8` | slate-400 | 26 | Texto secundario en dashboard (landing usa `#6B7280`) |
| `#64748B` | slate-500 | 23 | Texto medio |
| `#0F172A` | slate-900 | 25 | Texto principal en dashboard (landing usa `#0A0A0A`) |

**El mismo gris conceptual con valores distintos:**
- Borde: `#E5E7EB` (landing) vs `#E2E8F0` (dashboard/componentes)
- Texto secundario: `#6B7280` (landing) vs `#94A3B8` (dashboard) vs `#64748B` (componentes)
- Texto principal: `#0A0A0A` (landing) vs `#0F172A` (dashboard)
- Background sutil: `#F9FAFB` (landing) vs `#F8FAFC` (dashboard)

### B) Verdes inconsistentes

| Hex | Dónde | Propósito |
|---|---|---|
| `#00E5A0` | Landing, var `--accent-2` / `--green` | Acento principal verde |
| `#41E897` | globals.css `--cl-green` | Crowdlink brand (¿legacy?) |
| `#00C896` | Algunos componentes | Verde alternativo |
| `#059669` | Componentes internos | Emerald-600 |
| `#065F46` | Status pills, flow diagram | Emerald-800 |
| `#10B981` | Dashboard | Emerald-500 |
| `#047857` | Flow diagram SVG text | Emerald-700 |

### C) Azules inconsistentes

| Hex | Dónde | Propósito |
|---|---|---|
| `#0C1E4A` | Landing `--accent`, sidebars | Navy principal |
| `#0084FF` | globals.css `--cl-blue` | Crowdlink brand (¿legacy?) |
| `#3B82F6` | Fondeador layout accent | Blue-500 |
| `#5B8DEF` | Dashboard layout active | Azul intermedio |
| `#1B3F8A` | Dashboard sidebar active | Azul oscuro |
| `#1D4ED8` | Otros componentes | Blue-700 |

### D) Fuente mono inconsistente

- Landing: `JetBrains Mono`
- Dashboard/internos: `Geist Mono`
- Ambas sirven el mismo propósito pero son tipografías distintas.

### E) Background de contenido principal por layout

- Dashboard: `#F4F6FB`
- Fondeador: `#F4F6FB` (igual)
- Solicitante: `#F0F7F4` (diferente — tinte verde)
- Landing: `#FFFFFF`
- Register/Login: dark theme

### F) Border-radius sin escala

Hay **17 valores distintos** de borderRadius: `4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28px` + `999px`. Lo ideal sería consolidar a 6-8 tokens.

### G) Box-shadow sin sistema

Se encontraron **15+ combinaciones únicas** de box-shadow. No hay tokens ni clases reutilizables para sombras.

### H) Transiciones inconsistentes

- Duración: `.12s`, `.14s`, `.15s`, `.2s`, `.22s`, `.25s`, `.3s`, `.4s`
- Easing: `cubic-bezier(.16,1,.3,1)` vs `ease-out` vs `ease-in-out` vs `linear`

### I) globals.css vs landing — dos sistemas desconectados

| globals.css | landing page.tsx |
|---|---|
| `--background: #ffffff` | `--bg: #FFFFFF` |
| `--foreground: #171717` | `--fg: #0A0A0A` |
| `--font-sans: var(--font-geist-sans)` | `--font-sans: 'DM Sans'...` |
| `--cl-green: #41E897` | `--green: #00E5A0` |
| `--cl-blue: #0084FF` | `--accent: #0C1E4A` |

La landing **sobreescribe completamente** los tokens de globals.css con sus propios nombres. Son dos sistemas de diseño que no se hablan.

---

## 6. Qué se puede retocar SOLO con estilos (sin tocar JSX ni lógica)

### Puntos seguros para cambios CSS-only

#### En `app/page.tsx`, bloque `<style>` (líneas ~125-306):

| Qué | Cómo | Riesgo |
|---|---|---|
| **Paleta completa del landing** | Cambiar valores de `--bg`, `--fg`, `--accent`, `--accent-2`, etc. en `:root` | Nulo — todo el landing lee de estas vars |
| **Gradiente principal** | Cambiar `--grad` y `--grad-text` | Nulo — afecta botones grad, badges, spark bars |
| **Tipografía** | Cambiar `--font-sans` y `--font-mono` (y el `@import` de Google Fonts) | Nulo si se mantienen los pesos |
| **Tamaños de texto** | Modificar `fontSize` en `.nav-btn`, `.btn`, `.mono-label`, etc. | Bajo |
| **Border radius** | Cambiar `border-radius` en `.btn`, `.db-card`, `.price-card`, `.sol-card`, `.kpi-card`, etc. | Bajo |
| **Shadows** | Cambiar `box-shadow` en clases existentes | Nulo |
| **Animaciones** | Cambiar duración/easing en `@keyframes` y `.mount` delays | Nulo |
| **Colores de status pills** | Cambiar bg/color/border en `.status-pill.green/amber/red` | Nulo |
| **Hover states** | Cambiar `:hover` en `.btn`, `.feat-card`, `.sol-card`, `.kpi-card`, etc. | Nulo |
| **Navbar altura/blur** | Cambiar `height` en `.nav-inner`, `blur()` en `.nav-wrap.scrolled` | Bajo |
| **Breakpoints** | Cambiar `@media` queries | Medio — probar responsivo |
| **Colores de tabs** | Cambiar `.tab-pill.active-ot/active-sol` | Nulo |
| **Input focus ring** | Cambiar `.inp:focus` border y shadow | Nulo |
| **Footer links** | Cambiar `.foot-link` | Nulo |

#### En `app/globals.css`:

| Qué | Cómo | Riesgo |
|---|---|---|
| **Background/foreground globales** | Cambiar `--background`, `--foreground` | Bajo — afecta body base |
| **Clase `.burocrowd-bg`** | Cambiar gradientes del login/auth | Nulo — solo login/register |
| **Blobs** | Cambiar colores/tamaños/blur | Nulo — decorativos |
| **Grid noise** | Cambiar grid size, opacidad, mask | Nulo — decorativo |

#### En inline `style={{}}` de `app/page.tsx`:

| Qué | Riesgo |
|---|---|
| Cambiar `style` objects requiere tocar JSX | **No es CSS-only** — hay que editar el archivo .tsx |
| La mayoría de estilos visuales del hero, stats, cards de solicitud, about, footer usan inline styles | **No se pueden cambiar sin tocar JSX** |

### Lo que NO se puede cambiar solo con CSS

- **Contenido del hero** (texto, enlaces) — es JSX
- **Colores en inline `style={{}}`** — hay ~200 instancias de colores hardcodeados como `color:"#6B7280"`, `background:"#FFFFFF"`, etc. directamente en props de React. Estos **no respetan CSS variables** y requieren editar JSX
- **Colores del SVG flow diagram** — `fill`, `stroke` están hardcodeados en atributos SVG
- **Spacing en inline styles** — `padding`, `margin`, `gap` hardcodeados en style objects
- **Border-radius en inline styles** — muchos `borderRadius:14` directamente en JSX
- **Colores en componentes del dashboard** — cada `page.tsx` tiene sus propios hex hardcodeados

### Estrategia recomendada

1. **Inmediato (CSS-only, riesgo cero):** Cambiar las ~19 CSS variables del `:root` en el bloque `<style>` de `app/page.tsx`. Esto actualiza navbar, botones, pills, tabs, inputs, feature cards, footer — todo lo que usa clases CSS.

2. **Segundo paso (requiere editar JSX pero sin cambiar lógica):** Migrar los ~200 inline `style={{}}` a que usen `var(--fg-2)` en vez de `"#6B7280"`, etc. Es buscar-y-reemplazar, no cambia estructura ni lógica.

3. **Tercer paso:** Unificar globals.css + landing vars en un solo sistema de tokens. Consolidar grises, verdes y azules.

---

## Apéndice: Animaciones definidas

### Landing (`app/page.tsx`)

| Keyframe | Duración | Efecto |
|---|---|---|
| `fadeUp` | 0.7s `cubic-bezier(.16,1,.3,1)` | `opacity:0 → 1`, `translateY(18px → 0)` |
| `fadeIn` | — | `opacity:0 → 1` |
| `spin` | 0.7s linear infinite | `rotate(0 → 360deg)` |
| `counterUp` | — | `opacity:0 → 1`, `translateY(6px → 0)` |
| `shimmer` | — | `background-position:-200% → 200%` |
| `flowRight` (SVG) | 1.5s linear infinite | `stroke-dashoffset:0 → -36` |
| `dotPulse` (SVG) | 2.2s ease-in-out infinite | `opacity:.35 ↔ 1` |

Mount stagger: `.mount-1` a `.mount-6` con delays `0.05s → 0.68s`.

### globals.css

| Keyframe | Efecto |
|---|---|
| `floaty` | Float con `scale` — blobs decorativos |
| `stepFade` | Fade in `translateY(6px → 0)` — transiciones de sección |
