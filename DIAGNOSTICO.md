# DIAGNOSTICO.md — Auditoría Read-Only del Front

> Generado: 2026-07-02 | Branch: `main` | Sin cambios al código

---

## 1. Estructura de páginas y componentes

**Router:** Next.js App Router (`app/`). No existe `pages/`.

### Rutas públicas

| Ruta | Archivo |
|------|---------|
| `/` | `app/page.tsx` (landing monolítica, ~875 líneas, `"use client"`) |
| `/login` | `app/login/page.tsx` |
| `/register` | `app/register/page.tsx` |
| `/auth/callback` | `app/auth/callback/page.tsx` |
| `/demo` | `app/demo/page.tsx` |
| `/score-demo` | `app/score-demo/page.tsx` |
| `/advisory` | `app/advisory/page.tsx` |
| `/pricing/lead` | `app/pricing/lead/page.tsx` + `LeadClient.tsx` |
| `/legal/*` | `app/legal/terminos/`, `privacidad/`, `cookies/` |
| `/onboarding/role` | `app/onboarding/role/page.tsx` |
| `/onboarding/fondeador` | `app/onboarding/fondeador/page.tsx` |
| `/onboarding/solicitante` | `app/onboarding/solicitante/page.tsx` |
| `/onboarding/[slug]` | `app/onboarding/[slug]/page.tsx` |
| `/invitations/[token]` | `app/invitations/[token]/page.tsx` |

### Dashboard (otorgante/lender) — layout: `app/dashboard/layout.tsx`

`/dashboard`, `/dashboard/cartera`, `/dashboard/cartera/nuevo`, `/dashboard/cartera/[id]`,
`/dashboard/clientes`, `/dashboard/clientes/[id]`, `/dashboard/clientes/[id]/sat`,
`/dashboard/solicitudes`, `/dashboard/reportes`, `/dashboard/datos`, `/dashboard/documentos`,
`/dashboard/marketplace`, `/dashboard/calculadora`, `/dashboard/deals`, `/dashboard/deals/[slug]`,
`/dashboard/deals/[slug]/[id]`, `/dashboard/applicants`, `/dashboard/chat`, `/dashboard/score`,
`/dashboard/plan`, `/dashboard/ajustes`,
`/dashboard/onboarding/applicants`, `/dashboard/onboarding/applicants/[id]`,
`/dashboard/onboarding/portal`, `/dashboard/onboarding/api`, `/dashboard/onboarding/reglas`

### Solicitante (borrower) — layout: `app/solicitante/layout.tsx`

`/solicitante`, `/solicitante/datos`, `/solicitante/creditos`, `/solicitante/financiamiento`,
`/solicitante/ofertas`, `/solicitante/solicitudes`, `/solicitante/verificacion`,
`/solicitante/score`, `/solicitante/mensajes`

### Fondeador (investor) — layout: `app/fondeador/layout.tsx`

`/fondeador`, `/fondeador/inbox`, `/fondeador/perfil`, `/fondeador/ajustes`

### Admin

`/admin`, `/admin/login`, `/admin/forgot-password`, `/admin/reset-password`,
`/admin/cartera`, `/admin/contratos`, `/admin/pagares`,
`/admin/reportes-crediticios`, `/admin/verificaciones`, `/admin/users/[id]/score`

### Secciones del Home (`app/page.tsx`)

1. **Navbar** — fijo, con scroll blur
2. **Hero** — título + subtítulo + CTAs
3. **3 pilares** — Marketplace / Valuación / Asesoría
4. **Flujograma SVG** — Originador → Plinius → Fondeador
5. **Marketplace** — tabs otorgante/solicitante con datos dinámicos
6. **Producto** — grid 3×2 de features
7. **Pricing** — planes dinámicos desde Supabase
8. **About** — descripción + 3 puntos clave
9. **Lead Form** — captura empresa + correo
10. **Footer** — 4 columnas + dirección

### Componentes reutilizables (`components/`)

| Directorio | Componentes |
|------------|-------------|
| `ui/` | `PageShell`, `SectionCard`, `Topbar` |
| `admin/` | `ProductoAdmin` |
| `onboarding/` | `OnboardingLanding`, `OnboardingWizard`, `LenderSetupWizard`, `FlowConfigurator`, `ApplicantDetailDrawer`, `LenderEditModal`, `OnboardingAdminTab`, `StepForm`, `SuccessScreen`, `UpgradeRequiredScreen` |
| `clients/` | `ClientWizard`, `CreateClientModal`, `EditClientModal`, `InlineField`, `KycDocCard` |
| `calculadora/` | `ValuationsList`, `CreditDetailModal`, `ResultsView` + tabs (`TabConcentracion`, `TabDetalle`, `TabErrores`, `TabResumenEjecutivo`, `TabStressTesting`) |
| `cartera/` | `UploadDropzone` |
| `cartera-gestion/` | `KpisHero`, `CreditosTable`, `EditarRapidoDrawer`, `ValuarCarteraButton` |
| `pagares/` | `PagaresWizard` |
| `sat/` | `SatMetricsCard`, `SatPullPanel` |
| root | `ContactarButton` |

---

## 2. Hero — archivo y líneas exactas

**Archivo:** `app/page.tsx`

| Elemento | Líneas | Texto |
|----------|--------|-------|
| **Título** | **~349-355** | `Plataforma de Crédito Privado en México.` (con `<br/>` antes de "México" y `<span className="grad-text">`) |
| **Subtítulo** | **~357-360** | `Marketplace de crédito, valuación de cartera y asesoría financiera para empresas — en una sola plataforma.` |

---

## 3. Flujograma — archivo y ubicación exacta

**Archivo:** `app/page.tsx`, **líneas ~451-498**

El diagrama es un **SVG inline** (no un componente separado), marcado con el comentario:
```
{/* ── CARTERA FLOW DIAGRAM ── */}
```

Tres nodos:
- **Originador** (izq) — "SOFOM · Arrendadora" → etiqueta `publica`
- **Plinius** (centro) — "Marketplace de crédito · Valuación · Score · Asesoría"
- **Fondeador** (der) — "Inversionista · Fondo" → etiqueta `fondea`

Animaciones CSS: `flowRight` (dash animado) y `dotPulse` (puntos verdes pulsantes).

---

## 4. SaaS — Stripe, Pricing y cobro mensual

### No hay Stripe

Grep de `stripe` (case-insensitive) en todo el source: **0 resultados**.
No hay SDK de Stripe, webhooks de pago, ni checkout automatizado.
El cobro es **manual** — el dashboard dice: *"Los pagos se coordinan directamente con el equipo de Plinius"* (email: luis@plinius.mx).

### Componentes acoplados a Pricing / Marketplace / cobro

Para esconder con feature flag, estos son los puntos de contacto:

#### A) Landing — Sección Pricing (`app/page.tsx`)
- **Líneas ~706-760** — sección `#pricing`: fetch de `plans_config` desde Supabase, cards de Basic/Pro, botón "Solicitar" que lleva a `/pricing/lead?plan=X`.

#### B) Pricing Lead Form
- `app/pricing/lead/page.tsx` + `app/pricing/lead/LeadClient.tsx` — formulario de captura de leads por plan.
- `app/api/leads/route.ts` — API que inserta lead y envía emails de confirmación vía Resend.

#### C) Dashboard Plan
- `app/dashboard/plan/page.tsx` — muestra plan actual, comparación Free/Basic/Pro, info de pago.
- `app/dashboard/layout.tsx` (líneas ~50-88, ~173-178) — `PlanDot` y `PlanWidget` en el sidebar.

#### D) PlanContext (contexto global)
- `lib/PlanContext.tsx` — React Context que expone `{ plan, since }` desde `plinius_profiles`.

#### E) PlanGate (feature gating en UI)
- `app/dashboard/applicants/page.tsx` (~líneas 133-147) — componente `PlanGate` inline.
- `app/dashboard/marketplace/page.tsx` — `PlanBadge` + `PaywallModal` (límites de ofertas/chats por plan).
- `app/dashboard/onboarding/reglas/RulesBuilder.tsx` (~línea 133) — "requiere plan PRO".
- `app/dashboard/onboarding/applicants/page.tsx` (~línea 256) — requiere BASIC.
- `components/onboarding/UpgradeRequiredScreen.tsx` — pantalla genérica "requiere upgrade".
- `components/ContactarButton.tsx` (~líneas 69-86) — redirige a `/pricing` si no es PRO.

#### F) API-side plan checks (402 Payment Required)
- `app/api/onb-applicants/route.ts` (~líneas 103-138) — valida plan antes de crear applicant.
- `app/api/onboarding/[slug]/route.ts` (~líneas 20-37) — requiere PRO.
- `app/api/onb-rules/route.ts` (~línea 30) — helper `isPro()`.
- `app/api/reportes-crediticios/route.ts` (~líneas 45-47) — límites mensuales por plan.
- `lib/reportes-crediticios.ts` — lee plan del usuario para calcular límites.

#### G) Admin — gestión de planes
- `app/api/admin/set-plan/route.ts` — asigna plan a usuario.
- `app/api/admin/producto/route.ts` — CRUD de `plans_config`.
- `app/api/admin/features/route.ts` — feature flags per-user (`client_features` table).
- `components/admin/ProductoAdmin.tsx` — UI admin: planes, descuentos, features por cliente.
- `app/admin/SuperAdminClient.tsx` — lista usuarios con plan, modal para cambiar plan.

#### H) Base de datos
- `supabase/migrations/20260418_001_plans_config_v2.sql` — tabla `plans_config`, vistas `plan_limits` y `lender_plan_limits`, columnas en `onb_lenders` (`plan_id`, `is_grandfathered`, `legacy_monthly_price_mxn`).
- `supabase/migrations/20260422_001_plans_config_anon_read.sql` — RLS para lectura anónima de planes activos.

### Sistema de feature flags existente

Ya existe un sistema básico en `client_features` (tabla Supabase) con API en `/api/admin/features`. Permite toggles per-user con campos `feature`, `enabled`, `value`, `note`. Se puede extender para feature flags globales tipo `SHOW_PRICING`, `SHOW_MARKETPLACE`, etc.

---

## 5. Branches

**Branch actual:** `main`

**Branches locales:**
- `main` ← activa
- `feat/cartera-rewrite`
- `feat/cartera-valuation`
- `feat/deal-rooms`
- `feat/landing-redesign`

### Diff: `feat/landing-redesign` vs `main`

La branch `feat/landing-redesign` está **detrás** de `main` por 2 commits:

**Commits en `main` que no están en `feat/landing-redesign`:**
```
f410ed2 Onboarding: Portal config + API settings + fix estatus + migración api_key_last4
5782c03 Fix: filtros de estatus activo→vigente en dashboard, reportes y solicitante
```

**Merge base:** `f87dcc6` (Landing: tema blanco, hero nuevo, página advisory, dirección footer)

**Diff stat (main → feat/landing-redesign):**
```
 app/api/onb-lenders/me/regenerate-key/route.ts     |  67 ----
 app/api/onb-lenders/me/route.ts                    | 116 -------
 app/dashboard/layout.tsx                           |   2 -
 app/dashboard/onboarding/api/page.tsx              | 278 -
 app/dashboard/onboarding/portal/page.tsx           | 343 -
 app/dashboard/page.tsx                             |   2 +-
 app/dashboard/reportes/page.tsx                    |   2 +-
 app/solicitante/creditos/page.tsx                  |  15 +-
 app/solicitante/page.tsx                           |   2 +-
 migrations/20260526_001_onb_lenders_api_key_last4  |   3 -
 10 files changed, 10 insertions(+), 820 deletions(-)
```

**Interpretación:** `feat/landing-redesign` no tiene los commits de onboarding (portal config, API settings, migración api_key_last4) ni los filtros de estatus. La branch está stale — necesita rebase o merge de `main`.

---

## Resumen ejecutivo

| Aspecto | Estado |
|---------|--------|
| Landing | Monolítica en `app/page.tsx` (~875 líneas), todo inline |
| Hero | Líneas ~349-360, título + subtítulo |
| Flujograma | SVG inline líneas ~451-498, no es componente separado |
| Stripe | **No existe** — cobro manual por email |
| Pricing | Sección en landing + `/pricing/lead` + `/dashboard/plan` + PlanContext + PlanGate en ~12 archivos |
| Feature flags | Sistema básico existe (`client_features`), extensible para ocultar pricing/marketplace |
| `feat/landing-redesign` | Stale, 2 commits detrás de `main`, -820 líneas (le faltan features de onboarding) |
