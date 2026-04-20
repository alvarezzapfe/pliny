-- ============================================================================
-- MIGRACIÓN: fondeadores_institucionales — marketplace de fondeo B2B
-- Fecha:     2026-04-20
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABLA
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fondeadores_institucionales (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL,
  nombre              text NOT NULL,
  tipo                text NOT NULL CHECK (tipo IN (
    'banca_desarrollo',
    'banca_multiple',
    'fondo_deuda_privada',
    'family_office',
    'fintech_fondeo'
  )),
  logo_url            text,
  descripcion_corta   text,
  descripcion_larga   text,
  ticket_min_mxn      numeric(15,2),
  ticket_max_mxn      numeric(15,2),
  moneda              text DEFAULT 'MXN' CHECK (moneda IN ('MXN','USD','MXN/USD')),
  tasa_estimada_min   numeric(5,2),
  tasa_estimada_max   numeric(5,2),
  plazo_min_meses     integer,
  plazo_max_meses     integer,
  sectores_objetivo   text[],
  requisitos          text[],
  ventajas            text[],
  website             text,
  contacto_email      text,
  contacto_telefono   text,
  activo              boolean DEFAULT true,
  destacado           boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_fondeadores_tipo
  ON fondeadores_institucionales (tipo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_fondeadores_destacado
  ON fondeadores_institucionales (destacado) WHERE activo = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE fondeadores_institucionales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fondeadores_select_auth ON fondeadores_institucionales;
CREATE POLICY fondeadores_select_auth ON fondeadores_institucionales
  FOR SELECT TO authenticated
  USING (activo = true);

DROP POLICY IF EXISTS fondeadores_all_service ON fondeadores_institucionales;
CREATE POLICY fondeadores_all_service ON fondeadores_institucionales
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. SEED — 17 fondeadores institucionales
-- ════════════════════════════════════════════════════════════════════════════

-- ── BANCA DE DESARROLLO ─────────────────────────────────────────────────

INSERT INTO fondeadores_institucionales (
  slug, nombre, tipo, descripcion_corta, descripcion_larga,
  ticket_min_mxn, ticket_max_mxn, moneda, tasa_estimada_min, tasa_estimada_max,
  plazo_min_meses, plazo_max_meses, sectores_objetivo, requisitos, ventajas,
  website, activo, destacado
) VALUES
(
  'nafin', 'Nacional Financiera', 'banca_desarrollo',
  'Banca de desarrollo del Gobierno Federal enfocada en PyMEs e industria.',
  'Nacional Financiera (Nafin) es la banca de desarrollo del Gobierno Federal de México encargada de fomentar el desarrollo económico a través de la canalización de recursos financieros a PyMEs, emprendedores y proyectos estratégicos. Opera programas de garantías, crédito de segundo piso y esquemas de factoraje a través de intermediarios financieros bancarios y no bancarios.',
  5000000.00, 500000000.00, 'MXN', 8.00, 12.00,
  6, 60,
  ARRAY['pyme','industria','agro','tecnologia','emprendimiento'],
  ARRAY['Estar registrado como intermediario financiero ante Nafin','Contar con al menos 2 años de operación','Presentar estados financieros auditados del último ejercicio','Cumplir con normativa PLD/FT vigente','Tener cartera colocada mínima de $10M MXN'],
  ARRAY['Tasas preferenciales de banca de desarrollo','Garantía automática Nafin hasta 50% de la cartera','Fondeo de segundo piso sin competir por el cliente final','Acceso a programas especiales de apoyo PyME','Plazos amplios de hasta 60 meses'],
  'https://www.nafin.com.mx', true, true
),
(
  'fira', 'Fideicomisos Instituidos en Relación con la Agricultura', 'banca_desarrollo',
  'Fondeo de segundo piso especializado en sector agropecuario y rural.',
  'FIRA es un conjunto de fideicomisos públicos del Gobierno Federal, constituidos en el Banco de México, que operan como banca de desarrollo de segundo piso para el sector agropecuario, forestal, pesquero, alimentario y rural. Otorga crédito, garantías, capacitación y asistencia técnica a través de intermediarios financieros.',
  1000000.00, 200000000.00, 'MXN', 7.00, 11.00,
  12, 120,
  ARRAY['agro','rural','agroindustria','pesca','forestal'],
  ARRAY['Estar acreditado como intermediario financiero ante FIRA','Especialización en sector agropecuario o rural','Estados financieros auditados de los últimos 2 ejercicios','Cumplir calificación de riesgo mínima requerida','Plan de colocación de crédito agropecuario'],
  ARRAY['Las tasas más competitivas del mercado para sector agro','Garantía FIRA de hasta 50% del crédito','Acceso a programas de capacitación y asistencia técnica','Plazos de hasta 10 años para inversión fija','Esquemas de estacionalidad adaptados al ciclo agrícola'],
  'https://www.fira.gob.mx', true, true
),
(
  'bancomext', 'Banco Nacional de Comercio Exterior', 'banca_desarrollo',
  'Banca de desarrollo para empresas con operaciones de comercio exterior.',
  'Bancomext es la institución de banca de desarrollo del Gobierno Federal que promueve el comercio exterior mexicano, ofreciendo financiamiento, garantías y otros servicios financieros a empresas exportadoras e importadoras. Opera tanto crédito directo como de segundo piso a través de intermediarios financieros.',
  10000000.00, 1000000000.00, 'MXN/USD', 7.00, 10.00,
  12, 84,
  ARRAY['exportacion','comercio_exterior','manufactura','turismo'],
  ARRAY['Ser intermediario financiero registrado ante Bancomext','Acreditar operaciones de comercio exterior o cadenas de suministro exportadoras','Estados financieros auditados de al menos 2 ejercicios','Calificación crediticia institucional vigente','Programa de colocación enfocado en sector exportador'],
  ARRAY['Fondeo en dólares y pesos mexicanos','Líneas de crédito de largo plazo hasta 84 meses','Garantías de comercio exterior','Respaldo del Gobierno Federal','Acceso a red de corresponsales bancarios internacionales'],
  'https://www.bancomext.com', true, false
),
(
  'fnd', 'Financiera Nacional de Desarrollo Agropecuario', 'banca_desarrollo',
  'Financiamiento para el sector rural y agropecuario con enfoque social.',
  'La FND (anteriormente Financiera Rural) es una entidad del Gobierno Federal que otorga financiamiento al sector agropecuario, rural, forestal y pesquero. Opera directamente y a través de intermediarios financieros rurales, con enfoque especial en productores de pequeña y mediana escala que no tienen acceso al sistema financiero tradicional.',
  500000.00, 100000000.00, 'MXN', 7.00, 10.00,
  6, 60,
  ARRAY['agro','rural','pesca','forestal','comunidades_rurales'],
  ARRAY['Ser intermediario financiero rural acreditado ante FND','Colocación de crédito en zonas rurales y agropecuarias','Al menos 1 año de operación crediticia','Cumplir con normativa PLD/FT','Presentar programa de trabajo anual'],
  ARRAY['Tickets desde $500K MXN, accesibles para IFNBs pequeñas','Enfoque en inclusión financiera rural','Tasas de banca de desarrollo','Programas de acompañamiento técnico','Acceso a fondeo complementario con FIRA'],
  'https://www.fnd.gob.mx', true, false
),

-- ── BANCA MÚLTIPLE ──────────────────────────────────────────────────────

(
  'bbva-mexico', 'BBVA México', 'banca_multiple',
  'Banco líder en México con líneas de fondeo para intermediarios financieros.',
  'BBVA México es el banco más grande del país por activos totales. Su división de Banca de Empresas e Instituciones ofrece líneas de crédito para intermediarios financieros no bancarios (IFNBs), incluyendo esquemas de fondeo de segundo piso, líneas de crédito corporativas y estructuras de bursatilización de cartera.',
  10000000.00, 500000000.00, 'MXN', 9.00, 14.00,
  12, 60,
  ARRAY['pyme','corporativo','consumo','nomina'],
  ARRAY['Al menos 3 años de operación como IFNB','Cartera colocada mínima de $50M MXN','Estados financieros auditados por firma reconocida','Rating crediticio vigente (HR Ratings, Fitch o equivalente)','Cumplimiento regulatorio CNBV/Condusef demostrable'],
  ARRAY['Líneas de gran volumen hasta $500M MXN','Respaldo del grupo financiero más grande de México','Posibilidad de estructuras de bursatilización','Banca en línea empresarial de primer nivel','Relación bancaria integral con servicios adicionales'],
  'https://www.bbva.mx', true, false
),
(
  'banorte', 'Banorte', 'banca_multiple',
  'Banco mexicano con programas de fondeo para IFNBs y SOFOMes.',
  'Grupo Financiero Banorte es el banco mexicano más grande por capital de origen nacional. Su área de Banca Corporativa e Institucional tiene experiencia en otorgar líneas de fondeo a Sociedades Financieras de Objeto Múltiple (SOFOMes) y otros intermediarios financieros no bancarios, incluyendo líneas revolventes y a plazo.',
  5000000.00, 500000000.00, 'MXN', 9.00, 14.00,
  12, 60,
  ARRAY['pyme','corporativo','vivienda','consumo'],
  ARRAY['Mínimo 2 años de operación como IFNB','Cartera vigente mínima de $30M MXN','Auditoría externa de estados financieros','Calificación crediticia vigente','Gobierno corporativo formal documentado'],
  ARRAY['Banco 100% mexicano con decisiones locales','Programas específicos para SOFOMes y SOFIPOs','Tasas competitivas en segmento PyME','Acompañamiento con productos de tesorería','Potencial acceso a la red de corresponsalías Banorte'],
  'https://www.banorte.com', true, false
),
(
  'hsbc-mexico', 'HSBC México', 'banca_multiple',
  'Banco global con expertise en financiamiento estructurado para IFNBs.',
  'HSBC México forma parte del grupo financiero global HSBC Holdings y ofrece servicios de banca corporativa e institucional incluyendo líneas de fondeo para intermediarios financieros no bancarios. Cuenta con experiencia en estructuración de financiamiento, créditos sindicados y financiamiento de cadenas productivas.',
  10000000.00, 300000000.00, 'MXN', 9.00, 13.00,
  12, 48,
  ARRAY['pyme','corporativo','comercio_exterior','manufactura'],
  ARRAY['Al menos 3 años de operación con track record demostrable','Cartera colocada mínima de $50M MXN','Auditoría externa con firma Big 4 o equivalente','Rating crediticio mínimo de HR A- o equivalente','Estructura de gobierno corporativo robusta'],
  ARRAY['Respaldo de un banco global con presencia en 60+ países','Expertise en financiamiento estructurado y sindicado','Acceso a mercados internacionales de capital','Productos de cobertura cambiaria y de tasas','Estándares ESG alineados a mejores prácticas globales'],
  'https://www.hsbc.com.mx', true, false
),
(
  'santander-mexico', 'Santander México', 'banca_multiple',
  'Banco con programas de fondeo institucional y bursatilización.',
  'Santander México pertenece al grupo Banco Santander y es uno de los principales bancos del país. Su división de Banca Corporativa ofrece financiamiento a IFNBs mediante líneas de crédito revolventes, créditos a plazo, y ha participado como estructurador en emisiones de certificados bursátiles de SOFOMes.',
  5000000.00, 500000000.00, 'MXN', 9.00, 14.00,
  12, 60,
  ARRAY['pyme','corporativo','auto','consumo'],
  ARRAY['Mínimo 2 años de operación como intermediario financiero','Estados financieros auditados del último ejercicio','Calificación crediticia vigente','Cartera mínima de $30M MXN','Manual de políticas de crédito y cobranza documentado'],
  ARRAY['Parte de un grupo financiero global con amplia experiencia','Capacidad de estructuración de emisiones bursátiles','Líneas de fondeo flexibles (revolvente y a plazo)','Acceso a productos de tesorería y derivados','Asesoría en estructuración financiera'],
  'https://www.santander.com.mx', true, false
),

-- ── FONDOS DE DEUDA PRIVADA ─────────────────────────────────────────────

(
  'altum-capital', 'Altum Capital', 'fondo_deuda_privada',
  'Fondo de deuda privada mexicano especializado en IFNBs y PyMEs.',
  'Altum Capital es un fondo de deuda privada mexicano enfocado en proveer financiamiento a intermediarios financieros no bancarios (IFNBs), PyMEs y empresas en crecimiento. Ofrece soluciones de deuda mezzanine, senior secured y subordinada, con tickets desde $75M MXN hasta $250M MXN y esquemas flexibles adaptados al modelo de negocio del acreditado.',
  75000000.00, 250000000.00, 'MXN/USD', 12.00, 16.00,
  24, 60,
  ARRAY['pyme','ifnb','capital_privado','fintech'],
  ARRAY['Cartera colocada mínima de $100M MXN','Track record de al menos 2 años con métricas de morosidad','Modelo de negocio escalable y documentado','Equipo directivo con experiencia en sector financiero','Due diligence legal y financiero completo'],
  ARRAY['Tickets grandes de $75M a $250M MXN','Flexibilidad en estructura (senior, mezzanine, subordinada)','Proceso de decisión más ágil que banca tradicional','Acompañamiento estratégico y operativo','Posibilidad de fondeo en USD para operaciones dolarizadas'],
  'https://www.altumcapital.mx', true, true
),
(
  'fondo-de-fondos', 'Fondo de Fondos', 'fondo_deuda_privada',
  'Fondo público mexicano que invierte en fondos de capital y deuda privada.',
  'Fondo de Fondos es una institución pública mexicana que actúa como inversionista institucional en fondos de capital privado y deuda privada. Su mandato es catalizar la inversión en PyMEs mexicanas canalizando recursos a través de fondos administrados por GPs (General Partners) calificados. Invierte en fondos de deuda que a su vez fondean a IFNBs y empresas en crecimiento.',
  50000000.00, 500000000.00, 'MXN', 0.00, 0.00,
  24, 84,
  ARRAY['pyme','energia','venture_capital','impacto_social'],
  ARRAY['Ser un fondo de inversión constituido formalmente (GP/LP)','Track record de inversiones previas en México','Equipo con experiencia en administración de fondos','Tesis de inversión clara enfocada en PyMEs mexicanas','Cumplimiento con estándares de gobierno corporativo AMEXCAP'],
  ARRAY['Ancla institucional que facilita levantamiento de capital adicional','Tickets de $50M a $500M MXN como LP','Horizonte de inversión de largo plazo','Prestigio y validación institucional del fondo','Acceso a red de coinversionistas institucionales'],
  'https://www.fdf.mx', true, true
),
(
  'provi-capital', 'Provi Capital', 'fondo_deuda_privada',
  'Fondo de deuda privada enfocado en financiar IFNBs y fintech lenders.',
  'Provi Capital es un fondo mexicano de deuda privada enfocado en proveer líneas de fondeo a intermediarios financieros no bancarios y fintech lenders. Ofrece créditos senior y subordinados para escalar carteras de crédito PyME, consumo y microfinanzas, con un enfoque en análisis de portafolio y acompañamiento operativo.',
  20000000.00, 200000000.00, 'MXN', 13.00, 17.00,
  12, 48,
  ARRAY['pyme','ifnb','microfinanzas','consumo'],
  ARRAY['Cartera vigente mínima de $50M MXN','Al menos 18 meses de track record crediticio','Morosidad mayor a 90 días menor al 5%','Sistemas de originación y cobranza tecnológicos','Auditoría externa del último ejercicio fiscal'],
  ARRAY['Especialización en sector IFNB y fintech','Proceso de evaluación basado en análisis de portafolio','Decisión de crédito en 4-6 semanas','Flexibilidad en amortización y estructura','Líneas incrementales según desempeño de cartera'],
  NULL, true, false
),
(
  'mountain-capital', 'Mountain Capital', 'fondo_deuda_privada',
  'Fondo de deuda con enfoque en PyMEs y real estate en México.',
  'Mountain Capital es un fondo de deuda privada que otorga financiamiento a PyMEs y proyectos de real estate en México. Opera mediante créditos secured con garantías reales, ofreciendo tickets medianos con plazos de hasta 60 meses. Su tesis de inversión combina análisis crediticio riguroso con enfoque en garantías tangibles.',
  30000000.00, 300000000.00, 'MXN', 12.00, 16.00,
  18, 60,
  ARRAY['pyme','real_estate','construccion','infraestructura'],
  ARRAY['Garantía real o fiduciaria que cubra al menos 1.5x el crédito','Estados financieros auditados de 2 ejercicios','Proyecto o cartera con flujos de caja demostrables','Avalúo independiente de garantías','Experiencia del equipo directivo en el sector'],
  ARRAY['Tickets de $30M a $300M MXN','Acepta garantías inmobiliarias y fiduciarias','Plazos amplios de hasta 60 meses','Experiencia en financiamiento de proyectos','Combinación de análisis crediticio y de garantías'],
  NULL, true, false
),
(
  'alta-growth', 'Alta Growth Capital', 'fondo_deuda_privada',
  'Fondo de deuda para empresas de tecnología y alto crecimiento.',
  'Alta Growth Capital es un fondo de deuda privada mexicano enfocado en financiar empresas de tecnología y alto crecimiento, incluyendo fintech lenders e IFNBs con componente tecnológico. Ofrece estructuras de venture debt y growth debt que permiten escalar operaciones sin diluir a los accionistas.',
  20000000.00, 200000000.00, 'MXN', 13.00, 17.00,
  12, 48,
  ARRAY['pyme','tecnologia','fintech','saas','ecommerce'],
  ARRAY['Crecimiento de ingresos de al menos 30% anual','Modelo de negocio con unit economics positivos','Ronda de equity previa o plan de capitalización claro','Métricas de negocio transparentes y auditables','Equipo directivo con experiencia relevante'],
  ARRAY['Financiamiento sin dilución para founders','Estructura de venture/growth debt flexible','Enfoque en empresas de tecnología y alto crecimiento','Proceso de evaluación que entiende métricas tech','Red de contactos en ecosistema de venture capital'],
  NULL, true, false
),

-- ── FAMILY OFFICES ──────────────────────────────────────────────────────

(
  'mexico-ventures', 'Family Offices Sindicados MX', 'family_office',
  'Red de family offices mexicanos que coinvierten en deuda privada.',
  'México Ventures es una red de family offices mexicanos que sindicalizan inversiones en deuda privada, capital preferente y créditos mezzanine para PyMEs y nichos de mercado desatendidos. Operan con tickets individuales moderados pero con capacidad de sindicación para alcanzar montos mayores. Buscan retornos superiores al mercado con horizonte de corto-mediano plazo.',
  5000000.00, 50000000.00, 'MXN', 14.00, 18.00,
  12, 36,
  ARRAY['pyme','nicho','comercio','servicios'],
  ARRAY['Oportunidad de inversión con retorno atractivo (14%+)','Garantía personal o colateral tangible','Historial crediticio limpio del solicitante y empresa','Plan de negocio claro con proyecciones financieras','Referencia de intermediario financiero o advisor'],
  ARRAY['Decisiones de inversión rápidas (2-4 semanas)','Flexibilidad en términos y estructura','Sin burocracia bancaria','Posibilidad de relación de largo plazo','Acceso a red de empresarios e inversionistas'],
  NULL, true, false
),
(
  'agroindustrial-pd', 'Agroindustrial Private Debt', 'family_office',
  'Family office especializado en deuda privada para el sector agro.',
  'Agroindustrial Private Debt es un vehículo de inversión de un family office mexicano especializado en financiamiento de deuda para el sector agroindustrial. Provee capital de trabajo, financiamiento de cosechas, equipamiento agrícola e infraestructura de almacenamiento y procesamiento. Cuenta con experiencia directa en la cadena de valor agropecuaria.',
  10000000.00, 80000000.00, 'MXN', 13.00, 16.00,
  18, 60,
  ARRAY['agro','agroindustria','alimentos','ganaderia'],
  ARRAY['Operación en sector agropecuario o agroindustrial','Contratos de compraventa o off-take agreements vigentes','Garantías prendarias sobre inventarios o cosechas','Al menos 2 ciclos agrícolas de operación','Seguro agrícola vigente o plan de mitigación de riesgos'],
  ARRAY['Expertise profundo en sector agroindustrial','Entiende estacionalidad y ciclos de cosecha','Esquemas de pago alineados a flujos agrícolas','Relación directa con tomadores de decisión','Posibilidad de financiamiento de infraestructura agro'],
  NULL, true, false
),

-- ── FINTECHS DE FONDEO B2B ──────────────────────────────────────────────

(
  'clara', 'Clara', 'fintech_fondeo',
  'Plataforma fintech de crédito empresarial y capital de trabajo.',
  'Clara es una plataforma fintech que ofrece tarjetas corporativas, gestión de gastos y líneas de crédito para empresas en México y Latinoamérica. Su producto de crédito empresarial permite a IFNBs y empresas acceder a capital de trabajo de manera ágil y digital, con procesos de aprobación automatizados y desembolsos rápidos.',
  500000.00, 20000000.00, 'MXN', 14.00, 22.00,
  3, 24,
  ARRAY['pyme','capital_trabajo','saas','ecommerce','servicios'],
  ARRAY['Al menos 6 meses de operación con facturación demostrable','Cuenta bancaria empresarial activa','RFC y situación fiscal al corriente','Ingresos mensuales mínimos de $500K MXN','Conexión a plataforma de datos financieros (Open Banking)'],
  ARRAY['Proceso 100% digital, sin papelería','Aprobación en 24-72 horas','Desembolsos rápidos a cuenta bancaria','Sin garantía inmobiliaria requerida','Líneas incrementales según comportamiento de pago'],
  'https://www.clara.com', true, false
),
(
  'covalto', 'Credijusto / Covalto', 'fintech_fondeo',
  'Fintech de crédito empresarial con fondeo para PyMEs y MiPyMEs.',
  'Covalto (anteriormente Credijusto) es una de las fintech más grandes de México, ahora operando como banco digital tras la adquisición de Banco Finterra. Ofrece créditos empresariales, arrendamiento y factoraje a PyMEs y MiPyMEs, con procesos de análisis crediticio tecnológicos y acceso a fondeo diversificado incluyendo líneas bancarias y emisiones en mercados de capital.',
  1000000.00, 50000000.00, 'MXN', 13.00, 19.00,
  6, 36,
  ARRAY['pyme','mipyme','comercio','manufactura','servicios'],
  ARRAY['Al menos 1 año de operación','Facturación anual mínima de $5M MXN','Estados financieros o declaraciones fiscales del último ejercicio','Historial crediticio sin reestructuras activas','RFC y situación fiscal regular ante SAT'],
  ARRAY['Plataforma digital con análisis crediticio automatizado','Productos diversos: crédito simple, arrendamiento, factoraje','Ahora opera como banco regulado (mayor solidez)','Plazos flexibles de 6 a 36 meses','Atención personalizada con ejecutivo asignado'],
  'https://www.covalto.com', true, false
)
ON CONFLICT (slug) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. COMENTARIOS
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE fondeadores_institucionales IS
  'Marketplace de fondeadores institucionales para otorgantes (lenders) en Plinius.';
COMMENT ON COLUMN fondeadores_institucionales.ticket_min_mxn IS
  'Monto mínimo de fondeo en MXN (o equivalente si moneda = USD).';
COMMENT ON COLUMN fondeadores_institucionales.destacado IS
  'true = aparece con badge destacado y se ordena primero en el marketplace.';

COMMIT;
