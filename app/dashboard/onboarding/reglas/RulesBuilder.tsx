// RulesBuilder — UI de configuración de reglas de pre-aprobación para lender PRO
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

type Rule = {
  id: string; field: string; operator: string; value: unknown;
  message_if_fail: string | null; order_index: number;
};

const FIELD_META: Record<string, { label: string; type: string; operators: { val: string; label: string }[]; options?: string[] }> = {
  antiguedad_anos: { label: "Antigüedad (años)", type: "number", operators: [{ val: ">=", label: "Mayor o igual" }, { val: "<=", label: "Menor o igual" }, { val: ">", label: "Mayor que" }, { val: "<", label: "Menor que" }, { val: "==", label: "Igual a" }] },
  ventas_rango: { label: "Ventas anuales (rango)", type: "select", operators: [{ val: "in", label: "Es uno de" }, { val: "==", label: "Igual a" }], options: ["lt_1m", "1m_5m", "5m_20m", "20m_50m", "50m_100m", "100m_500m", "gt_500m"] },
  monto_solicitado_mxn: { label: "Monto solicitado (MXN)", type: "number", operators: [{ val: ">=", label: "Mayor o igual" }, { val: "<=", label: "Menor o igual" }, { val: ">", label: "Mayor que" }, { val: "<", label: "Menor que" }] },
  plazo_meses: { label: "Plazo (meses)", type: "number", operators: [{ val: ">=", label: "Mayor o igual" }, { val: "<=", label: "Menor o igual" }, { val: "==", label: "Igual a" }, { val: "in", label: "Es uno de" }] },
  sector: { label: "Sector", type: "select", operators: [{ val: "in", label: "Es uno de" }, { val: "==", label: "Igual a" }], options: ["Comercio", "Manufactura", "Servicios", "Construcción", "Tecnología", "Agro", "Salud", "Otro"] },
  estado: { label: "Estado", type: "select", operators: [{ val: "in", label: "Es uno de" }, { val: "==", label: "Igual a" }], options: ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"] },
  regimen_fiscal: { label: "Régimen fiscal", type: "select", operators: [{ val: "==", label: "Igual a" }], options: ["Persona Moral", "Personas Físicas con Actividades Empresariales y Profesionales", "Régimen Simplificado de Confianza (RESICO) PM", "Régimen Simplificado de Confianza (RESICO) PF"] },
};

const VENTAS_LABELS: Record<string, string> = { lt_1m: "<$1M", "1m_5m": "$1M–$5M", "5m_20m": "$5M–$20M", "20m_50m": "$20M–$50M", "50m_100m": "$50M–$100M", "100m_500m": "$100M–$500M", gt_500m: ">$500M" };

function evaluateRule(rule: Rule, data: Record<string, unknown>): boolean {
  const fieldVal = data[rule.field];
  const rv = rule.value;
  switch (rule.operator) {
    case ">=": return Number(fieldVal) >= Number(rv);
    case "<=": return Number(fieldVal) <= Number(rv);
    case ">": return Number(fieldVal) > Number(rv);
    case "<": return Number(fieldVal) < Number(rv);
    case "==": return String(fieldVal) === String(rv);
    case "!=": return String(fieldVal) !== String(rv);
    case "in": return Array.isArray(rv) && rv.includes(fieldVal);
    default: return false;
  }
}

export default function RulesBuilder() {
  const [status, setStatus] = useState<"loading" | "no_lender" | "requires_pro" | "ready">("loading");
  const [rules, setRules] = useState<Rule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [token, setToken] = useState("");

  // Modal form
  const [mField, setMField] = useState("");
  const [mOp, setMOp] = useState("");
  const [mValue, setMValue] = useState<unknown>("");
  const [mMsg, setMMsg] = useState("");
  const [mMulti, setMMulti] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Tester
  const [test, setTest] = useState<Record<string, unknown>>({ antiguedad_anos: "", ventas_rango: "", monto_solicitado_mxn: "", plazo_meses: "", sector: "", estado: "", regimen_fiscal: "" });

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus("loading"); return; }
    setToken(session.access_token);
    const res = await fetch("/api/onb-rules", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.status === 404) { setStatus("no_lender"); return; }
    if (res.status === 402) { setStatus("requires_pro"); return; }
    if (!res.ok) { setStatus("loading"); return; }
    const j = await res.json();
    setRules(j.rules ?? []);
    setStatus("ready");
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingRule(null); setMField(""); setMOp(""); setMValue(""); setMMsg(""); setMMulti([]); setShowModal(true);
  }
  function openEdit(r: Rule) {
    setEditingRule(r); setMField(r.field); setMOp(r.operator);
    if (r.operator === "in" && Array.isArray(r.value)) setMMulti(r.value as string[]);
    else setMValue(r.value);
    setMMsg(r.message_if_fail ?? ""); setShowModal(true);
  }

  async function saveRule() {
    setSaving(true);
    const value = mOp === "in" ? mMulti : (FIELD_META[mField]?.type === "number" ? Number(mValue) : mValue);
    const body = { field: mField, operator: mOp, value, message_if_fail: mMsg || null };
    const url = editingRule ? `/api/onb-rules/${editingRule.id}` : "/api/onb-rules";
    const method = editingRule ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { setShowModal(false); load(); flash(editingRule ? "Regla actualizada" : "Regla creada"); }
    else { const j = await res.json(); flash(j.error ?? "Error"); }
  }

  async function deleteRule(id: string) {
    if (!confirm("¿Eliminar esta regla?")) return;
    await fetch(`/api/onb-rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load(); flash("Regla eliminada");
  }

  const testResult = useMemo(() => {
    if (rules.length === 0) return null;
    const failed = rules.filter(r => !evaluateRule(r, test));
    return { passed: failed.length === 0, failed };
  }, [rules, test]);

  const fieldMeta = mField ? FIELD_META[mField] : null;
  const operatorsForField = fieldMeta?.operators ?? [];
  const needsMulti = mOp === "in" && fieldMeta?.options;

  // Styles
  const S = {
    page: { fontFamily: "'Geist', sans-serif", color: "#0F172A" } as React.CSSProperties,
    card: { background: "#fff", border: "1px solid #E8EDF5", borderRadius: 12, padding: "20px 24px", marginBottom: 14 } as React.CSSProperties,
    inp: { width: "100%", height: 40, borderRadius: 8, border: "1.5px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist', sans-serif", color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
    sel: { width: "100%", height: 40, borderRadius: 8, border: "1.5px solid #E2E8F0", padding: "0 10px", fontSize: 13, fontFamily: "'Geist', sans-serif", color: "#0F172A", background: "#fff", outline: "none", cursor: "pointer", boxSizing: "border-box" as const } as React.CSSProperties,
    btn: { height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700 as const, cursor: "pointer", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
    btnGhost: { height: 38, padding: "0 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 600 as const, cursor: "pointer", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
  };

  if (status === "loading") return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>Cargando...</div>;
  if (status === "no_lender") return (
    <div style={{ ...S.page, padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Aún no tienes portal de onboarding</div>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>Configura tu portal primero para poder definir reglas.</p>
      <a href="/dashboard/applicants" style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "0 20px", height: 40 }}>Configurar portal</a>
    </div>
  );
  if (status === "requires_pro") return (
    <div style={{ ...S.page, padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Esta función requiere plan PRO</div>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>Actualiza tu plan para configurar reglas de pre-aprobación.</p>
      <a href="/dashboard/plan" style={{ ...S.btn, textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "0 20px", height: 40 }}>Actualizar plan</a>
    </div>
  );

  return (
    <div style={S.page}>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, padding: "11px 16px", background: "#fff", border: "1px solid #D1FAE5", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#065F46", boxShadow: "0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Reglas de pre-aprobación</h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>Configura criterios para aprobar solicitudes automáticamente</p>
        </div>
        <button style={S.btn} onClick={openCreate}>+ Nueva regla</button>
      </div>

      {/* Rules list */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 10 }}>Reglas activas ({rules.length})</div>
        {rules.length === 0 && <div style={{ ...S.card, color: "#94A3B8", textAlign: "center", padding: "32px 20px" }}>Sin reglas configuradas. Crea tu primera regla para activar la pre-aprobación automática.</div>}
        {rules.map(r => (
          <div key={r.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{FIELD_META[r.field]?.label ?? r.field}</div>
              <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'Geist Mono', monospace" }}>
                {r.field} {r.operator} {Array.isArray(r.value) ? (r.value as string[]).join(", ") : String(r.value)}
              </div>
              {r.message_if_fail && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, fontStyle: "italic" }}>"{r.message_if_fail}"</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button style={{ ...S.btnGhost, height: 32, padding: "0 12px", fontSize: 12 }} onClick={() => openEdit(r)}>Editar</button>
              <button style={{ ...S.btnGhost, height: 32, padding: "0 12px", fontSize: 12, color: "#EF4444", borderColor: "#FECDD3" }} onClick={() => deleteRule(r.id)}>Borrar</button>
            </div>
          </div>
        ))}
        {rules.length > 0 && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Lógica: TODAS las reglas deben cumplirse (AND)</div>}
      </div>

      {/* Tester */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Probador de reglas</div>
        <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Simula un solicitante y prueba tus reglas:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Antigüedad (años)</label><input type="number" style={S.inp} value={String(test.antiguedad_anos ?? "")} onChange={e => setTest(t => ({ ...t, antiguedad_anos: Number(e.target.value) || "" }))} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Ventas anuales</label><select style={S.sel} value={String(test.ventas_rango ?? "")} onChange={e => setTest(t => ({ ...t, ventas_rango: e.target.value }))}><option value="">—</option>{FIELD_META.ventas_rango.options!.map(o => <option key={o} value={o}>{VENTAS_LABELS[o] ?? o}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Monto solicitado</label><input type="number" style={S.inp} value={String(test.monto_solicitado_mxn ?? "")} onChange={e => setTest(t => ({ ...t, monto_solicitado_mxn: Number(e.target.value) || "" }))} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Plazo (meses)</label><input type="number" style={S.inp} value={String(test.plazo_meses ?? "")} onChange={e => setTest(t => ({ ...t, plazo_meses: Number(e.target.value) || "" }))} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Sector</label><select style={S.sel} value={String(test.sector ?? "")} onChange={e => setTest(t => ({ ...t, sector: e.target.value }))}><option value="">—</option>{FIELD_META.sector.options!.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Estado</label><select style={S.sel} value={String(test.estado ?? "")} onChange={e => setTest(t => ({ ...t, estado: e.target.value }))}><option value="">—</option>{FIELD_META.estado.options!.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Régimen fiscal</label><select style={S.sel} value={String(test.regimen_fiscal ?? "")} onChange={e => setTest(t => ({ ...t, regimen_fiscal: e.target.value }))}><option value="">—</option>{FIELD_META.regimen_fiscal.options!.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        {rules.length > 0 && testResult && (
          <div style={{ padding: "14px 18px", borderRadius: 10, background: testResult.passed ? "#F0FDF9" : "#FFF1F2", border: `1px solid ${testResult.passed ? "#A7F3D0" : "#FECDD3"}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: testResult.passed ? "#065F46" : "#9F1239", marginBottom: testResult.failed.length > 0 ? 8 : 0 }}>
              {testResult.passed ? `✅ APROBADO — Cumple todas las reglas (${rules.length}/${rules.length})` : `❌ RECHAZADO — Falla en ${testResult.failed.length} de ${rules.length} reglas:`}
            </div>
            {testResult.failed.map(r => (
              <div key={r.id} style={{ fontSize: 12, color: "#9F1239", marginLeft: 16, lineHeight: 1.6 }}>• {r.message_if_fail ?? `${FIELD_META[r.field]?.label} no cumple (${r.field} ${r.operator} ${String(r.value)})`}</div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(4px)", zIndex: 100, display: "grid", placeItems: "center", padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, padding: "24px 28px", boxShadow: "0 32px 80px rgba(15,23,42,.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{editingRule ? "Editar regla" : "Nueva regla"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Campo a evaluar</label>
                <select style={S.sel} value={mField} onChange={e => { setMField(e.target.value); setMOp(""); setMValue(""); setMMulti([]); }}>
                  <option value="">Seleccionar campo...</option>
                  {Object.entries(FIELD_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {mField && <div><label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Operador</label>
                <select style={S.sel} value={mOp} onChange={e => { setMOp(e.target.value); setMMulti([]); }}>
                  <option value="">Seleccionar...</option>
                  {operatorsForField.map(o => <option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}
                </select>
              </div>}

              {mOp && !needsMulti && <div><label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Valor</label>
                {fieldMeta?.type === "number" ? (
                  <input type="number" style={S.inp} value={String(mValue ?? "")} onChange={e => setMValue(Number(e.target.value))} />
                ) : fieldMeta?.options ? (
                  <select style={S.sel} value={String(mValue ?? "")} onChange={e => setMValue(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {fieldMeta.options.map(o => <option key={o} value={o}>{VENTAS_LABELS[o] ?? o}</option>)}
                  </select>
                ) : (
                  <input style={S.inp} value={String(mValue ?? "")} onChange={e => setMValue(e.target.value)} />
                )}
              </div>}

              {needsMulti && <div><label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Valores aceptados</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {fieldMeta!.options!.map(o => (
                    <div key={o} onClick={() => setMMulti(m => m.includes(o) ? m.filter(x => x !== o) : [...m, o])}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${mMulti.includes(o) ? "#0C1E4A" : "#E2E8F0"}`, background: mMulti.includes(o) ? "#EFF4FF" : "#fff", color: mMulti.includes(o) ? "#0C1E4A" : "#64748B", fontSize: 12, cursor: "pointer", fontWeight: mMulti.includes(o) ? 600 : 400 }}>
                      {VENTAS_LABELS[o] ?? o}
                    </div>
                  ))}
                </div>
              </div>}

              <div><label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mensaje si no cumple (opcional)</label>
                <textarea style={{ ...S.inp, height: "auto", minHeight: 60, padding: "10px 12px", resize: "vertical" }} value={mMsg} onChange={e => setMMsg(e.target.value)} placeholder="Se mostrará al solicitante..." />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button style={S.btnGhost} onClick={() => setShowModal(false)}>Cancelar</button>
                <button style={{ ...S.btn, flex: 1, opacity: saving || !mField || !mOp ? 0.5 : 1 }} disabled={saving || !mField || !mOp} onClick={saveRule}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
