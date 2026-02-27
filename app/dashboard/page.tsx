"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LenderProfile = {
  id: string; owner_id: string; institution_type: string;
  institution_name: string | null; rfc: string | null;
  legal_rep_name: string | null; legal_rep_email: string | null; legal_rep_phone: string | null;
};

function fmtType(v: string) {
  const m: Record<string,string> = {
    bank:"Banco", private_fund:"Fondo privado", sofom:"SOFOM",
    credit_union:"Caja de ahorro", sofipo:"SOFIPO", ifc_crowd:"IFC crowd", sapi:"SAPI",
  };
  return m[v] ?? "Otro";
}

// ─── tiny SVG icon ────────────────────────────────────────────────────────────
function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

// ─── sparkline chart data (mock) ──────────────────────────────────────────────
const CHART_PTS = [42,48,44,55,51,60,58,67,63,72,69,78];
const maxPt = Math.max(...CHART_PTS);
const minPt = Math.min(...CHART_PTS);
function chartY(v: number, h: number) { return h - ((v - minPt) / (maxPt - minPt)) * h; }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [err,     setErr]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) { setErr("No hay sesión activa."); return; }
        const { data, error } = await supabase
          .from("lenders_profile")
          .select("id,owner_id,institution_type,institution_name,rfc,legal_rep_name,legal_rep_email,legal_rep_phone")
          .eq("owner_id", auth.user.id)
          .maybeSingle();
        if (error) throw error;
        setProfile((data as any) ?? null);
      } catch (e: any) { setErr(e?.message ?? "Error"); }
      finally { setLoading(false); }
    })();
  }, []);

  const ok = useMemo(() =>
    Boolean(profile?.institution_type && (profile?.legal_rep_name || profile?.legal_rep_email)),
  [profile]);

  const dateStr = new Date().toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });

  // mock empresas
  const empresas = [
    { name:"Desarrolladora Norte S.A.", type:"PyME", status:"Activo",    score:84, monto:"$3.2M", risk:"green" },
    { name:"Logística Central",         type:"Corp", status:"Revisión",  score:61, monto:"$1.5M", risk:"amber" },
    { name:"SOFOM Región Sur",          type:"SOFOM",status:"Activo",    score:77, monto:"$2.1M", risk:"green" },
    { name:"Fondo Infraestructura",     type:"Fondo",status:"Alerta",    score:38, monto:"$5.8M", risk:"red"   },
    { name:"Crédito PyME Batch 4",      type:"PyME", status:"Activo",    score:90, monto:"$890K", risk:"green" },
  ];

  const pipeline = [
    { label:"Nuevas",      n:"—", color:"#5B8DEF", bg:"#EFF6FF" },
    { label:"En revisión", n:"—", color:"#F5A623", bg:"#FFFBEB" },
    { label:"Aprobadas",   n:"—", color:"#00E5A0", bg:"#F0FDF9" },
    { label:"Rechazadas",  n:"—", color:"#F43F5E", bg:"#FFF1F2" },
  ];

  const activity = [
    { icon:"M2 12L6 7l3 3 3-4 2 2", ic:"#5B8DEF", bg:"#EFF6FF", title:"Dashboard iniciado",  sub:"Sistema cargado correctamente",      time:"Ahora"  },
    { icon:"M4 2h8v12H4z",           ic:"#00E5A0", bg:"#F0FDF9", title:"Perfil revisado",      sub:"Onboarding pendiente de completar",  time:"Hoy"    },
    { icon:"M8 2v12M2 8h12",         ic:"#F5A623", bg:"#FFFBEB", title:"Solicitudes: backlog", sub:"Intake + pre-score SAT/Buró",        time:"Pronto" },
  ];

  // sparkline path
  const W = 160, H = 44;
  const pts = CHART_PTS.map((v,i) => `${(i/(CHART_PTS.length-1))*W},${chartY(v,H)}`);
  const polyline = pts.join(" ");
  const areaPath = `M${pts[0]} ` + pts.slice(1).map(p=>`L${p}`).join(" ") + ` L${W},${H} L0,${H} Z`;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        :root{
          --blue:#0C1E4A; --blue2:#1B3F8A; --acc:#5B8DEF;
          --green:#00E5A0; --amber:#F5A623; --red:#F43F5E;
          --t1:#0F172A; --t2:#475569; --t3:#94A3B8;
          --border:#E8EDF5; --card:#fff; --bg:#F4F6FB;
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{from{background-position:-300px 0;}to{background-position:300px 0;}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes grow{from{width:0;}to{width:var(--w);}}

        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.04s;} .d2{animation-delay:.09s;}
        .d3{animation-delay:.14s;} .d4{animation-delay:.19s;}
        .d5{animation-delay:.24s;} .d6{animation-delay:.30s;}

        .card{
          background:var(--card); border:1px solid var(--border);
          border-radius:14px; padding:16px;
          transition:box-shadow .18s, border-color .18s;
        }
        .card:hover{box-shadow:0 6px 24px rgba(12,30,74,.07); border-color:#D4DCF0;}

        .mono{font-family:'Geist Mono',monospace;}
        .label{font-family:'Geist Mono',monospace;font-size:10px;color:var(--t3);letter-spacing:.09em;text-transform:uppercase;}

        .skel{
          background:linear-gradient(90deg,#F0F4FF 25%,#E8EDF5 50%,#F0F4FF 75%);
          background-size:300px 100%;
          animation:shimmer 1.3s ease-in-out infinite;
          border-radius:6px;
        }

        .pill{
          display:inline-flex;align-items:center;gap:4px;
          border-radius:999px;padding:3px 9px;
          font-family:'Geist Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.04em;
        }
        .p-green{background:#F0FDF9;color:#065F46;border:1px solid #D1FAE5;}
        .p-amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;}
        .p-red  {background:#FFF1F2;color:#9F1239;border:1px solid #FECDD3;}
        .p-blue {background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;}
        .p-slate{background:#F8FAFC;color:#475569;border:1px solid var(--border);}

        .btn-p{
          display:inline-flex;align-items:center;justify-content:center;gap:6px;
          background:linear-gradient(135deg,#0C1E4A,#1B3F8A);
          color:#fff;border:none;border-radius:9px;
          font-family:'Geist',sans-serif;font-size:12px;font-weight:600;
          padding:8px 14px;cursor:pointer;text-decoration:none;
          box-shadow:0 2px 10px rgba(12,30,74,.22);
          transition:opacity .15s,transform .15s;
        }
        .btn-p:hover{opacity:.9;transform:translateY(-1px);}

        .btn-g{
          display:inline-flex;align-items:center;justify-content:center;gap:6px;
          background:#F8FAFC;color:var(--t2);
          border:1px solid var(--border);border-radius:9px;
          font-family:'Geist',sans-serif;font-size:12px;font-weight:600;
          padding:8px 14px;cursor:pointer;text-decoration:none;
          transition:background .15s,border-color .15s;
        }
        .btn-g:hover{background:#EEF2FF;border-color:#C7D4F0;color:var(--t1);}

        .track{height:3px;background:#EEF2FF;border-radius:999px;overflow:hidden;}
        .fill{height:100%;border-radius:999px;animation:grow .9s cubic-bezier(.16,1,.3,1) .5s both;}

        .tr{
          display:grid;
          align-items:center;
          padding:9px 12px;
          border-bottom:1px solid var(--border);
          transition:background .12s;
          cursor:default;
        }
        .tr:last-child{border-bottom:none;}
        .tr:hover{background:#FAFBFF;}

        .qa{
          display:flex;align-items:center;gap:9px;
          padding:9px 12px;border-radius:10px;
          border:1px solid var(--border);background:#FAFBFF;
          text-decoration:none;color:var(--t1);font-size:12px;font-weight:500;
          transition:all .15s;cursor:pointer;width:100%;text-align:left;
        }
        .qa:hover{background:#EEF2FF;border-color:#C7D4F0;}
        .qa.prim{
          background:linear-gradient(135deg,#0C1E4A,#1B3F8A);
          color:#fff;border-color:transparent;
          box-shadow:0 2px 10px rgba(12,30,74,.20);
        }
        .qa.prim:hover{opacity:.92;}

        .qa-ico{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;flex-shrink:0;}

        .act-row{
          display:flex;align-items:flex-start;gap:10px;
          padding:10px 0;border-bottom:1px solid var(--border);
        }
        .act-row:last-child{border-bottom:none;}

        .pip-row{
          display:flex;align-items:center;gap:10px;
          padding:9px 12px;border-radius:10px;
          border:1px solid var(--border);background:#FAFBFF;
          transition:border-color .15s,background .15s;
          cursor:default;
        }
        .pip-row:hover{background:#F4F6FB;border-color:#C7D4F0;}

        @media(max-width:900px){
          .kpi-grid{grid-template-columns:1fr 1fr!important;}
          .lower-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.04em", lineHeight:1 }}>Dashboard</div>
          <div style={{ fontSize:12, color:"var(--t3)", marginTop:3, textTransform:"capitalize" }}>{dateStr}</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span className={`pill ${ok?"p-green":"p-amber"}`}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block" }}/>
            {ok ? "Onboarding: OK" : "Pendiente"}
          </span>
          <span className="pill p-blue">
            <span style={{ width:5,height:5,borderRadius:"50%",background:"#5B8DEF",animation:"blink 2.5s ease-in-out infinite",display:"inline-block" }}/>
            Sistema: OK
          </span>
          <Link href="/dashboard/solicitudes" className="btn-p" style={{ marginLeft:4 }}>
            + Nueva solicitud
          </Link>
        </div>
      </div>

      {/* ── ERROR ──────────────────────────────────────── */}
      {err && (
        <div style={{ background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,fontWeight:500,color:"#9F1239",display:"flex",alignItems:"center",gap:8 }}>
          <Ic d="M8 1.5a6.5 6.5 0 100 13M8 5v4M8 10.5h.01" c="#F43F5E" s={13}/>{err}
        </div>
      )}

      {/* ── ONBOARDING BANNER ──────────────────────────── */}
      {!loading && !ok && (
        <div className="fade d1" style={{
          marginBottom:16, padding:"14px 18px",
          background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)",
          borderRadius:14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16,
          boxShadow:"0 4px 20px rgba(12,30,74,.20)",
        }}>
          <div>
            <div className="mono" style={{ fontSize:9,color:"rgba(238,242,255,.5)",letterSpacing:".1em",marginBottom:4 }}>PRIMER PASO</div>
            <div style={{ fontSize:14,fontWeight:700,color:"#EEF2FF",letterSpacing:"-0.02em",marginBottom:2 }}>Completa tu perfil de otorgante</div>
            <div style={{ fontSize:12,color:"rgba(238,242,255,.6)" }}>Tipo de institución + representante legal · menos de 1 min</div>
          </div>
          <Link href="/dashboard/datos" style={{
            background:"#fff", color:"#0C1E4A",
            borderRadius:9, padding:"8px 16px",
            fontSize:12, fontWeight:700,
            textDecoration:"none", whiteSpace:"nowrap",
            boxShadow:"0 2px 8px rgba(0,0,0,.12)",
            transition:"opacity .15s",
          }}>Completar →</Link>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────── */}
      <div className="kpi-grid fade d2" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
        {/* Pipeline */}
        <div className="card">
          <div className="label" style={{ marginBottom:10 }}>Pipeline total</div>
          {loading ? <div className="skel" style={{ height:28,width:90,marginBottom:6 }}/> : <div style={{ fontSize:26,fontWeight:800,letterSpacing:"-0.05em",lineHeight:1 }}>—</div>}
          <div style={{ fontSize:11,color:"var(--t3)",marginTop:5,marginBottom:10 }}>Monto en evaluación</div>
          <div className="track"><div className="fill" style={{ "--w":"35%",width:"35%",background:"var(--acc)" } as any}/></div>
        </div>

        {/* Solicitudes */}
        <div className="card">
          <div className="label" style={{ marginBottom:10 }}>Solicitudes · 30d</div>
          {loading ? <div className="skel" style={{ height:28,width:60,marginBottom:6 }}/> : <div style={{ fontSize:26,fontWeight:800,letterSpacing:"-0.05em",lineHeight:1 }}>—</div>}
          <div style={{ fontSize:11,color:"var(--t3)",marginTop:5,marginBottom:10 }}>Nuevas solicitudes</div>
          <div style={{ display:"flex",gap:4 }}>
            <span className="pill p-slate">Intake: pendiente</span>
          </div>
        </div>

        {/* Clientes */}
        <div className="card">
          <div className="label" style={{ marginBottom:10 }}>Clientes activos</div>
          {loading ? <div className="skel" style={{ height:28,width:60,marginBottom:6 }}/> : <div style={{ fontSize:26,fontWeight:800,letterSpacing:"-0.05em",lineHeight:1 }}>5</div>}
          <div style={{ fontSize:11,color:"var(--t3)",marginTop:5,marginBottom:10 }}>Empresas en sistema</div>
          <div className="track"><div className="fill" style={{ "--w":"60%",width:"60%",background:"var(--green)" } as any}/></div>
        </div>

        {/* Portafolio chart */}
        <div className="card">
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
            <div className="label">Portafolio · 12M</div>
            <span className="pill p-green">+18.4%</span>
          </div>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display:"block",marginBottom:6 }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#cg)"/>
            <polyline points={polyline} stroke="#5B8DEF" strokeWidth="1.5" fill="none"/>
          </svg>
          <div style={{ fontSize:11,color:"var(--t3)" }}>Evolución simulada (mock)</div>
        </div>
      </div>

      {/* ── LOWER GRID ─────────────────────────────────── */}
      <div className="lower-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 280px", gap:10 }}>

        {/* ── Tabla de empresas ── */}
        <div className="card fade d3" style={{ padding:0, overflow:"hidden" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700,letterSpacing:"-0.02em" }}>Empresas</div>
              <div style={{ fontSize:11,color:"var(--t3)",marginTop:1 }}>Clientes registrados</div>
            </div>
            <Link href="/dashboard/clientes" className="btn-g" style={{ fontSize:11,padding:"6px 12px" }}>Ver todas →</Link>
          </div>
          {/* Table header */}
          <div className="tr" style={{ gridTemplateColumns:"1fr 70px 60px 80px 80px", background:"#FAFBFF" }}>
            {["Empresa","Tipo","Score","Monto","Estado"].map(h=>(
              <div key={h} className="mono" style={{ fontSize:10,color:"var(--t3)",letterSpacing:".06em" }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          {empresas.map((e,i)=>(
            <div key={i} className="tr" style={{ gridTemplateColumns:"1fr 70px 60px 80px 80px" }}>
              <div style={{ fontSize:12,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name}</div>
              <div style={{ fontSize:11,color:"var(--t3)" }}>{e.type}</div>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ flex:1,height:3,background:"#EEF2FF",borderRadius:999,overflow:"hidden" }}>
                  <div style={{ width:`${e.score}%`,height:"100%",background:e.risk==="green"?"var(--green)":e.risk==="amber"?"var(--amber)":"var(--red)",borderRadius:999 }}/>
                </div>
                <span className="mono" style={{ fontSize:10,color:"var(--t3)",flexShrink:0 }}>{e.score}</span>
              </div>
              <div className="mono" style={{ fontSize:11,color:"var(--t2)" }}>{e.monto}</div>
              <div>
                <span className={`pill ${e.risk==="green"?"p-green":e.risk==="amber"?"p-amber":"p-red"}`}>
                  <span style={{ width:4,height:4,borderRadius:"50%",background:"currentColor",display:"inline-block" }}/>
                  {e.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Actividad + Pipeline ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* Pipeline */}
          <div className="card fade d4">
            <div style={{ fontSize:13,fontWeight:700,letterSpacing:"-0.02em",marginBottom:10 }}>Pipeline</div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {pipeline.map(p=>(
                <div key={p.label} className="pip-row">
                  <div style={{ width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0 }}/>
                  <div style={{ flex:1,fontSize:12,fontWeight:500 }}>{p.label}</div>
                  <div style={{ fontSize:18,fontWeight:800,letterSpacing:"-0.04em",color:"var(--t1)" }}>{p.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad */}
          <div className="card fade d5" style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:700,letterSpacing:"-0.02em",marginBottom:10 }}>Actividad</div>
            {activity.map((a,i)=>(
              <div key={i} className="act-row">
                <div style={{ width:28,height:28,borderRadius:8,background:a.bg,display:"grid",placeItems:"center",flexShrink:0 }}>
                  <Ic d={a.icon} c={a.ic} s={12}/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--t1)" }}>{a.title}</div>
                  <div style={{ fontSize:11,color:"var(--t3)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.sub}</div>
                </div>
                <div className="mono" style={{ fontSize:10,color:"var(--t3)",flexShrink:0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="card fade d6" style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:13,fontWeight:700,letterSpacing:"-0.02em",marginBottom:6 }}>Acciones</div>

          <Link href="/dashboard/solicitudes" className="qa prim">
            <div className="qa-ico" style={{ background:"rgba(255,255,255,.12)" }}>
              <Ic d="M8 2v12M2 8h12" c="#fff" s={12}/>
            </div>
            Ver solicitudes
          </Link>
          <Link href="/dashboard/clientes" className="qa">
            <div className="qa-ico" style={{ background:"#EEF2FF" }}>
              <Ic d="M5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 14s.5-4 4-4M11 10l2 2 2-2" c="#5B8DEF" s={12}/>
            </div>
            Empresas / Clientes
          </Link>
          <Link href="/dashboard/portafolio" className="qa">
            <div className="qa-ico" style={{ background:"#F0FDF9" }}>
              <Ic d="M2 12L6 7l3 3 3-4 2 2" c="#00E5A0" s={12}/>
            </div>
            Portafolio
          </Link>
          <Link href="/dashboard/reportes" className="qa">
            <div className="qa-ico" style={{ background:"#FFFBEB" }}>
              <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" c="#F5A623" s={12}/>
            </div>
            Reportes PDF
          </Link>
          <Link href="/dashboard/datos" className="qa">
            <div className="qa-ico" style={{ background:"#F8FAFC" }}>
              <Ic d="M8 2a6 6 0 100 12M8 8h.01" c="var(--t3)" s={12}/>
            </div>
            Datos · Onboarding
          </Link>
          <button className="qa" style={{ borderStyle:"dashed",color:"var(--t3)",background:"none" }}
            onClick={()=>alert("Backlog: configuración / roles / API keys")}>
            <div className="qa-ico" style={{ background:"#F8FAFC" }}>
              <Ic d="M8 5a3 3 0 100 6M2.5 8h1M12.5 8h1M8 2.5v1M8 12.5v1" c="var(--t3)" s={12}/>
            </div>
            Configuración
          </button>

          {/* MVP note */}
          <div style={{
            marginTop:"auto", padding:"10px 12px",
            background:"linear-gradient(135deg,rgba(12,30,74,.04),rgba(27,63,138,.07))",
            border:"1px solid rgba(91,141,239,.18)", borderRadius:10,
          }}>
            <div className="mono" style={{ fontSize:9,color:"#5B8DEF",letterSpacing:".1em",marginBottom:3 }}>OBJETIVO MVP</div>
            <div style={{ fontSize:11,color:"var(--t2)",lineHeight:1.55 }}>
              Intake → pre-score (SAT/Buró) → decisión de crédito.
            </div>
          </div>

          {/* Sistema status */}
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:"#F0FDF9",border:"1px solid #D1FAE5",borderRadius:10 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#00E5A0",display:"inline-block",animation:"blink 2.5s ease-in-out infinite" }}/>
            <span className="mono" style={{ fontSize:10,color:"#065F46" }}>All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}