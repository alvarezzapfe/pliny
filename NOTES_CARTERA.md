# NOTES_CARTERA — Estado al 7 may 2026 (noche)

## Branch
- feat/cartera-valuation
- Último commit pushed: a5a4319
- Cambios LOCALES sin commitear: components/cartera/UploadDropzone.tsx + app/dashboard/calculadora/page.tsx (step 4.2 código listo, pendiente validar)

## Entregables completados
- [x] 1. Schema + cleanup sidebar
- [x] 2. Endpoint upload + plantilla + validaciones
- [x] 3. Motor de cálculo financiero (71 tests)
- [x] 4.1 Endpoint /list paginado
- [~] 4.2 UploadDropzone — código escrito, sin validar visualmente

## Steps completados (UI)
- [x] 4.2 UploadDropzone — COMPLETED Y VALIDATED (commit 99b9dc5)
- [x] 4.3 Auto-trigger /calcular + polling + estados processing/completed/error — COMPLETED Y VALIDATED
  - Bug crítico resuelto: tasa_nominal_anual ahora acepta porcentaje (commit cb79ae8)
  - Happy path validado: cartera-test-v2.xlsx → NPV $6.7M / Saldo $6.5M / EL $64.8K

## Steps pendientes
- [ ] 4.4 Shell de tabs vacíos
- [ ] 4.5 TabResumenEjecutivo
- [ ] 4.6 TabDetalle (tabla virtualizada)
- [ ] 4.7 CreditDetailDrawer
- [ ] 4.8 TabStressTesting heatmap
- [ ] 4.9 TabConcentracion
- [ ] 4.10 ErrorsModal
- [ ] 4.11 Lista valuaciones previas
- [ ] 4.12 URL ?id=xxx persistence

## Bugs activos / deuda

### Crítico para arrancar mañana
- .env.local tiene NEXT_PUBLIC_SUPABASE_ANON_KEY con valor viejo formato "sb_publishable_..."
- Producción YA fue actualizada en Vercel con el JWT legacy correcto (eyJhbGci...) y funciona
- Local necesita el mismo JWT en .env.local
- Para conseguirlo: Supabase Dashboard → API Keys → "Legacy anon, service_role API keys" tab → Copy "anon public" JWT
- Una vez que se actualice .env.local, reiniciar dev server (Ctrl+C + npm run dev) para que tome el nuevo valor

### No crítico
- Preview de Vercel: Supabase Auth no acepta wildcard "https://*-...vercel.app/**" en redirect URLs. Workaround: desarrollar en localhost. Eventualmente arreglar agregando URLs de preview específicas o pidiendo a Supabase soporte para wildcards.

## Roadmap post-módulo Calculadora

### Cartera (PRIORIDAD ALTA — los clientes lo piden)
- /dashboard/cartera necesita rediseño completo estética Goldman/Bloomberg
- KPIs hero con tipografía mono para números
- Tabla de créditos con sort/filter/pagination (mismo componente que TabDetalle del módulo nuevo)
- Drawer al click en crédito (mismo CreditDetailDrawer)
- Reutilizar endpoint /upload y motor de cálculo (no duplicar código)
- Fusionar /dashboard/cartera con /dashboard/calculadora en una sola "Cartera" con modo individual y modo bulk
- "Nuevo crédito" debe usar mismo schema/validaciones del Excel upload

### Onboarding/Applicants
- /dashboard/onboarding/applicants tiene UI básica que no embona con la estética nueva
- /dashboard/onboarding/reglas — portal de configuración del flujo del usuario PRO necesita revisión
- Aplicar mismas tokens de diseño (paleta, tipografía, cards)

## Decisiones del día
- Abandonado el smoke test del preview de Vercel después de pelear 4h con env vars y URL Configuration de Supabase
- Confirmado que producción funciona correctamente con ANON_KEY actualizado
- Migrado workflow de validación a localhost en vez de preview deployments
- Step 4.2 desarrollado pero NO validado visualmente — pendiente para mañana

## Para arrancar mañana
1. Leer este archivo
2. Conseguir el JWT correcto de Supabase (anon public, legacy)
3. Actualizar .env.local
4. npm run dev
5. Validar UploadDropzone visualmente en localhost:3000/dashboard/calculadora
6. Si OK, commit + push step 4.2
7. Arrancar step 4.3

## Consolidación de entornos (dev / preview / production) — DEUDA TÉCNICA

### Bug sistémico identificado
10 archivos en app/api/admin/* y app/api/ekatena/* tienen createClient(SERVICE_ROLE_KEY) en module scope. Esto NO rompió producción porque SERVICE_ROLE_KEY siempre está disponible en build time, pero rompió previews (3+ build failures durante la sesión del 6 may por env vars faltantes).

Plan de remediación post-módulo Calculadora:
- Crear lib/supabaseService.ts con factory createServiceClient() lazy (similar al patrón de lib/supabaseClient.ts con Proxy)
- Migrar los 10 archivos uno por uno a la factory lazy
- Patrón: cada handler crea su instancia dentro de la función, no en module scope

### Inconsistencia entre env vars de Production y Preview
El 7 may descubrimos que NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel tenía:
- Production: formato viejo "sb_publishable_..." (que también estaba mal)
- Preview: nada (no marcado para Preview)
- Local (.env.local): formato viejo "sb_publishable_..."

Ese día actualizamos a JWT legacy correcto SOLO en Vercel (todos los environments). Falta:
- Actualizar .env.local con el JWT legacy correcto (PRIORIDAD ALTA, bloquea desarrollo)
- Verificar que TODAS las env vars (12 keys) estén marcadas para Production + Preview + Development en Vercel
- Revisar todas las env vars en .env.local vs Vercel para confirmar que están sincronizadas

### Vercel Authentication / Deployment Protection
Los previews están protegidos con auth de Vercel (solo cuentas de la organización pueden verlos). Esto está bien para seguridad pero complica el desarrollo — combinado con el problema de Supabase redirect URLs, los previews no funcionan para validar UI.

Decisión: desarrollar y validar en localhost, mergear a main solo cuando módulos completos estén listos.

### Supabase URL Configuration
Site URL: https://www.plinius.mx
Redirect URLs autorizadas (5):
- https://www.plinius.mx/reset-password
- https://www.plinius.mx/admin/login
- https://plinius.mx/auth/callback
- https://www.plinius.mx/auth/callback
- http://localhost:3000/auth/callback

Falta agregar (cuando decidamos atacarlo):
- Wildcard para previews de Vercel: https://*-luis-armando-alvarez-zapfes-projects.vercel.app/auth/callback (probablemente Supabase no lo acepta — lo intentamos el 7 may y no funcionó)
- Si no acepta wildcard, agregar manualmente las URLs de preview que importen

### Checklist al consolidar entornos (sesión separada, post-módulo Calculadora)
1. Listar TODAS las env vars necesarias en .env.example actualizado (currently desactualizado)
2. Verificar match Vercel ↔ .env.local
3. Migrar 10 archivos con createClient(SERVICE_ROLE_KEY) a factory lazy
4. Documentar en docs/DEPLOYMENT.md (no existe) el flujo de:
   - Cómo correr local
   - Cómo se promueve un cambio a preview
   - Cómo se promueve un cambio a producción
   - Cómo rotar keys (Supabase, Resend, futuras integraciones)
5. Decidir y documentar política de previews (con Auth de Vercel? Públicos?)
