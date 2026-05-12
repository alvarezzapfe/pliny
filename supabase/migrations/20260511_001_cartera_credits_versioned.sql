-- ============================================================================
-- Migration: Versionar tabla credits (idempotente)
-- Fecha:     2026-05-11
-- Contexto:  La tabla credits fue creada directamente en Supabase Dashboard.
--            Esta migration la versiona y agrega columnas para el rewrite
--            del módulo /dashboard/cartera.
-- ============================================================================

-- ── 1. CREATE TABLE IF NOT EXISTS ──────────────────────────────────────────
-- Idempotente: si la tabla ya existe (producción), no hace nada.
-- Si la tabla no existe (entorno nuevo), la crea completa.

CREATE TABLE IF NOT EXISTS public.credits (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by        uuid        NOT NULL,                                -- auth.uid() del lender que creó el crédito
  client_id         uuid        REFERENCES public.clients(id),           -- FK a clients (deudor)
  solicitud_id      uuid,                                                -- FK opcional a solicitudes (origen)
  folio             text,                                                -- auto-generado por trigger: CRE-0001, CRE-0002...
  deudor            text        NOT NULL,                                -- razón social del deudor (denormalizado)
  rfc               text,                                                -- RFC del deudor (denormalizado)
  tipo_credito      text        NOT NULL,                                -- Crédito simple | Crédito revolvente | Arrendamiento puro | Arrendamiento financiero
  amortiza          text        DEFAULT 'SI',                            -- SI | BULLET | NO
  monto_original    numeric     NOT NULL,                                -- monto desembolsado en MXN
  saldo_actual      numeric     NOT NULL,                                -- saldo insoluto vigente en MXN
  tasa_anual        numeric,                                             -- tasa nominal anual (porcentaje, e.g. 18.5)
  plazo_meses       integer,                                             -- plazo total del crédito en meses
  garantia          text,                                                -- descripción de la garantía
  fecha_inicio      date,                                                -- fecha de desembolso / originación
  fecha_vencimiento date,                                                -- fecha de vencimiento contractual
  ultimo_pago       date,                                                -- fecha del último pago recibido
  dpd               integer     DEFAULT 0,                               -- days past due (días de mora)
  estatus           text        NOT NULL DEFAULT 'vigente',              -- vigente | mora_30 | mora_60 | mora_90 | liquidado | castigado
  notas             text,                                                -- notas internas del lender
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Comentario en tabla
COMMENT ON TABLE public.credits IS 'Cartera de créditos activos del lender. Cada fila = un crédito individual.';

-- ── 2. COLUMNAS NUEVAS PARA EL REWRITE ────────────────────────────────────
-- Cada ALTER es idempotente: ADD COLUMN IF NOT EXISTS.

-- Columna fuente: origen del crédito (manual, excel, solicitud, api)
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS fuente text DEFAULT 'manual';
COMMENT ON COLUMN public.credits.fuente IS 'Origen del registro: manual | excel | solicitud | api';

-- Sector del deudor (para concentración y defaults de PD/LGD)
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS sector text;
COMMENT ON COLUMN public.credits.sector IS 'Sector económico del deudor: Manufactura, Comercio, Agropecuario, etc.';

-- Métricas de valuación (escritas por el motor de cálculo)
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS npv_mxn numeric(15,2);
COMMENT ON COLUMN public.credits.npv_mxn IS 'Valor presente neto calculado en MXN';

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS expected_loss_mxn numeric(15,2);
COMMENT ON COLUMN public.credits.expected_loss_mxn IS 'Pérdida esperada calculada en MXN (PD × LGD × EAD)';

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS ytm numeric(8,6);
COMMENT ON COLUMN public.credits.ytm IS 'Yield to maturity (rendimiento al vencimiento) como decimal, e.g. 0.185';

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS duration_modified numeric(8,4);
COMMENT ON COLUMN public.credits.duration_modified IS 'Duración modificada en años';

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS last_valuation_at timestamptz;
COMMENT ON COLUMN public.credits.last_valuation_at IS 'Timestamp de la última valuación ejecutada sobre este crédito';

ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS last_valuation_id uuid REFERENCES public.cartera_valuaciones(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.credits.last_valuation_id IS 'FK a la última valuación de cartera que incluyó este crédito';

-- ── 3. ÍNDICES ─────────────────────────────────────────────────────────────
-- CREATE INDEX IF NOT EXISTS es idempotente.

CREATE INDEX IF NOT EXISTS idx_credits_created_by ON public.credits(created_by);
CREATE INDEX IF NOT EXISTS idx_credits_client_id  ON public.credits(client_id);
CREATE INDEX IF NOT EXISTS idx_credits_estatus    ON public.credits(estatus);
CREATE INDEX IF NOT EXISTS idx_credits_folio      ON public.credits(folio);

-- ── 4. TRIGGER: updated_at automático ──────────────────────────────────────
-- Función reutilizable para auto-actualizar updated_at.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop + create para idempotencia (CREATE OR REPLACE TRIGGER no existe en PG < 14)
DROP TRIGGER IF EXISTS trg_credits_updated_at ON public.credits;
CREATE TRIGGER trg_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. TRIGGER: auto-generar folio CRE-NNNN ───────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_credit_folio()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN folio ~ '^CRE-[0-9]+$'
           THEN CAST(SUBSTRING(folio FROM 5) AS integer)
           ELSE 0 END
    ), 0) + 1 INTO next_num
    FROM public.credits;

    NEW.folio = 'CRE-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credits_folio ON public.credits;
CREATE TRIGGER trg_credits_folio
  BEFORE INSERT ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.generate_credit_folio();

-- ── 6. RLS POLICIES ────────────────────────────────────────────────────────
-- Habilitar RLS (idempotente)
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Drop + create cada policy para idempotencia
DROP POLICY IF EXISTS "credits_select_own" ON public.credits;
CREATE POLICY "credits_select_own" ON public.credits
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "credits_insert_own" ON public.credits;
CREATE POLICY "credits_insert_own" ON public.credits
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "credits_update_own" ON public.credits;
CREATE POLICY "credits_update_own" ON public.credits
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "credits_delete_own" ON public.credits;
CREATE POLICY "credits_delete_own" ON public.credits
  FOR DELETE USING (auth.uid() = created_by);

-- Service role bypasses RLS by default (para API routes server-side)

-- ── 7. NORMALIZAR ESTATUS ──────────────────────────────────────────────────
-- El código viejo usaba 'activo' como default. Normalizamos a enum cerrado.
-- No hay datos reales en producción (solo 1 fila de prueba), safe to update.

-- 7a. Migrar filas con valores viejos al nuevo enum
UPDATE public.credits SET estatus = 'vigente' WHERE estatus = 'activo';
UPDATE public.credits SET estatus = 'vigente' WHERE estatus NOT IN ('vigente', 'mora_30', 'mora_60', 'mora_90', 'liquidado', 'castigado');

-- 7b. Cambiar default a 'vigente'
ALTER TABLE public.credits ALTER COLUMN estatus SET DEFAULT 'vigente';

-- 7c. CHECK constraint para enforcer enum cerrado
ALTER TABLE public.credits DROP CONSTRAINT IF EXISTS credits_estatus_check;
ALTER TABLE public.credits ADD CONSTRAINT credits_estatus_check
  CHECK (estatus IN ('vigente', 'mora_30', 'mora_60', 'mora_90', 'liquidado', 'castigado'));

-- 7d. Verificación: si quedan filas inválidas, el CHECK de arriba falla
--     y la migration se rollbackea automáticamente. No se necesita lógica extra.

-- ============================================================================
-- FIN DE MIGRATION
-- ============================================================================
