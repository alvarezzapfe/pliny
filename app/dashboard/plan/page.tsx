"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlan } from "@/lib/PlanContext";

type PlanConfig = {
  id: string; label: string; price_usd: number; price_mxn: number | null;
  description: string | null; features: string[]; limits: Record<string,number>; active: boolean;
};
type PlanKey = "free" | "basic" | "pro";

export default function MiPlanPage() {
  const router = useRouter();
  const { plan: rawPlan, since } = usePlan();
  const plan = (rawPlan ?? "free") as PlanKey;
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/producto")
      .then(r => r.json())
      .then(d => { setPlans(d.plans ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sinceStr = since
    ? new Date(since).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const PLAN_COLORS: Record<string, { color: string; bg: string; border: string; dot: string }> = {
    free:  { color: "#94A3B8", bg: "rgba(148,163,184,.08)", border: "rgba(148,163,184,.20)", dot: "#94A3B8" },
    basic: { color: "#38BDF8", bg: "rgba(56,189,248,.08)",  border: "rgba(56,189,248,.22)",  dot: "#38BDF8" },
    pro:   { color: "#00E5A0", bg: "rgba(0,229,160,.08)",   border: "rgba(0,229,160,.22)",   dot: "#00E5A0" },
  };

  const currentPlanConfig = plans.find(p => p.id === plan);
  const pc = PLAN_COLORS[plan] ?? PLAN_COLORS.free;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}.d3{animation-delay:.15s;}
  `;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#94A3B8", fontFamily:"Geist,sans-serif", fontSize:13 }}>
      Cargando plan...
    </div>
  );

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{CSS}</style>

      <div className="fade" style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", marginBottom:4 }}>Mi Plan</h1>
        <p style={{ fontSize:13, color:"#64748B" }}>Suscripción activa, funcionalidades y opciones de upgrade.</p>
      </div>

      {/* Plan actual */}
      <div className="fade d1" style={{ background: pc.bg, border:`1.5px solid ${pc.border}`, borderRadius:16, padding:"20px 24px", marginBottom:28, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`rgba(0,0,0,.06)`, border:`1.5px solid ${pc.border}`, display:"grid", placeItems:"center" }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:pc.dot, display:"inline-block", boxShadow:`0 0 8px ${pc.dot}` }}/>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:11, fontFamily:"'Geist Mono',monospace", fontWeight:800, color:pc.color, letterSpacing:".10em" }}>{currentPlanConfig?.label ?? plan.toUpperCase()}</span>
              <span style={{ fontSize:10, background:"#ECFDF5", color:"#059669", border:"1px solid #A7F3D0", borderRadius:20, padding:"2px 8px", fontWeight:600 }}>AL CORRIENTE</span>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>
              {currentPlanConfig ? (currentPlanConfig.price_usd === 0 ? "Gratis" : `$${currentPlanConfig.price_usd} USD/mes`) : "—"}
              {currentPlanConfig?.price_mxn ? <span style={{ fontSize:11, color:"#94A3B8", fontWeight:400, marginLeft:6 }}>(${currentPlanConfig.price_mxn.toLocaleString("es-MX")} MXN)</span> : null}
            </div>
            {sinceStr && <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>Cliente desde {sinceStr}</div>}
          </div>
        </div>
        {plan !== "pro" && (
          <a href="mailto:luis@plinius.mx?subject=Upgrade%20de%20plan" style={{ padding:"10px 20px", borderRadius:10, background:"#071A3A", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
            Hacer upgrade →
          </a>
        )}
      </div>

      {/* Comparativa */}
      <div className="fade d2" style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:16 }}>Comparativa de planes</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {plans.map(p => {
            const isCurrent = p.id === plan;
            const c = PLAN_COLORS[p.id] ?? PLAN_COLORS.free;
            return (
              <div key={p.id} style={{ background: isCurrent ? c.bg : "#fff", border:`1.5px solid ${isCurrent ? c.border : "#E2E8F0"}`, borderRadius:14, padding:"18px 20px", position:"relative" }}>
                {isCurrent && (
                  <div style={{ position:"absolute", top:12, right:12, fontSize:9, fontWeight:800, fontFamily:"'Geist Mono',monospace", background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:20, padding:"2px 8px", letterSpacing:".08em" }}>
                    ACTUAL
                  </div>
                )}
                <div style={{ fontSize:11, fontFamily:"'Geist Mono',monospace", fontWeight:800, color:c.color, letterSpacing:".10em", marginBottom:4 }}>{p.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#0F172A", marginBottom:4 }}>
                  {p.price_usd === 0 ? "Gratis" : `$${p.price_usd} USD/mes`}
                </div>
                {p.price_mxn ? <div style={{ fontSize:11, color:"#94A3B8", marginBottom:12 }}>${p.price_mxn.toLocaleString("es-MX")} MXN/mes</div> : <div style={{ marginBottom:12 }}/>}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {(p.features ?? []).map((f, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"#ECFDF5", border:"1px solid #A7F3D0", display:"grid", placeItems:"center", flexShrink:0, marginTop:1 }}>
                        <svg width={9} height={9} viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#059669" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      </div>
                      <span style={{ fontSize:12, color:"#374151", lineHeight:1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fade d3" style={{ marginTop:24, background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, padding:"16px 20px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#0F172A", marginBottom:12 }}>Información de pago</div>
        <div style={{ fontSize:12, color:"#64748B", lineHeight:1.8 }}>
          Los pagos se coordinan directamente con el equipo de Plinius.<br/>
          Para cambios en tu suscripción, facturación o contratos escríbenos a{" "}
          <a href="mailto:luis@plinius.mx" style={{ color:"#0B1F4B", fontWeight:600 }}>luis@plinius.mx</a>
        </div>
      </div>
    </div>
  );
}
