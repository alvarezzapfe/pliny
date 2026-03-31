"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CreditType = "term_loan"|"revolvente"|"arrendamiento_puro"|"arrendamiento_financiero";
interface Credit {
  id: string; portfolio_id: string; acreditado: string; tipo: CreditType;
  monto: number; tasa: number; plazo: number; mora: number;
  garantia: string; sector: string; notas: string;
  rating: string; score: number; el: number; npv: number;
}
interface Portfolio {
  id: string; name: string; description: string; created_at: string; updated_at: string;
}

// ── MATH ──────────────────────────────────────────────────────────────────────
function calcNPV(monto:number,tasa:number,plazo:number,tipo:CreditType,discount=12):number {
  if(!monto||!tasa||!plazo) return 0;
  const r=tasa/100/12, d=discount/100/12;
  let flows:number[]=[-monto];
  if(tipo==="term_loan"||tipo==="revolvente"){
    const q=monto*r/(1-Math.pow(1+r,-plazo));
    for(let t=1;t<=plazo;t++) flows.push(q);
  } else if(tipo==="arrendamiento_puro"){
    const rent=monto*r/(1-Math.pow(1+r,-plazo))*0.95;
    for(let t=1;t<=plazo;t++) flows.push(rent);
  } else {
    const vr=monto*0.2, base=monto-vr/Math.pow(1+r,plazo);
    const q=base*r/(1-Math.pow(1+r,-plazo));
    for(let t=1;t<plazo;t++) flows.push(q);
    flows.push(q+vr);
  }
  return flows.reduce((acc,cf,t)=>acc+cf/Math.pow(1+d,t),0);
}
function calcRating(score:number,mora:number,garantia:string):string {
  if(mora>180)return"D"; if(mora>120)return"CC"; if(mora>90)return"CCC";
  const g=garantia?.toLowerCase()||"";
  const hasG=["hipotec","prend","aval","ranger","toyota","jeep","bmw","ford","chevrolet","explorer","outlander","corolla"].some(k=>g.includes(k));
  if(score>=85&&mora===0&&hasG)return"AAA"; if(score>=80&&mora===0)return"AA";
  if(score>=75&&mora<10)return"A"; if(score>=68&&mora<30)return"BBB";
  if(score>=58&&mora<60)return"BB"; if(score>=48&&mora<90)return"B";
  if(score>=35)return"CCC"; return"CC";
}
function calcScore(mora:number,tasa:number,monto:number):number {
  let s=80;
  if(mora>0) s-=Math.min(40,mora/4);
  if(tasa>30) s-=5; if(tasa>40) s-=5;
  if(monto>10_000_000) s+=3;
  return Math.max(10,Math.min(99,Math.round(s)));
}
function calcEL(monto:number,mora:number,garantia:string):number {
  const pd=mora>180?0.95:mora>90?0.45:mora>30?0.18:mora>0?0.08:0.025;
  const g=garantia?.toLowerCase()||"";
  const lgd=g.includes("hipotec")?0.35:g.includes("prend")?0.45:0.55;
  return monto*pd*lgd;
}
function enrich(c:Partial<Credit>):Partial<Credit> {
  const score=calcScore(c.mora||0,c.tasa||0,c.monto||0);
  const rating=calcRating(score,c.mora||0,c.garantia||"");
  const el=calcEL(c.monto||0,c.mora||0,c.garantia||"");
  const npv=calcNPV(c.monto||0,c.tasa||0,c.plazo||0,c.tipo||"term_loan");
  return{...c,score,rating,el,npv};
}

const fmtM=(n:number)=>Math.abs(n)>=1e6?`$${(n/1e6).toFixed(2)}M`:Math.abs(n)>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${n.toFixed(0)}`;
const fmtP=(n:number)=>`${n.toFixed(1)}%`;
const RC:Record<string,string>={AAA:"#065F46",AA:"#065F46",A:"#059669",BBB:"#1D4ED8",BB:"#D97706",B:"#EA580C",CCC:"#DC2626",CC:"#991B1B",D:"#7F1D1D"};
const RB:Record<string,string>={AAA:"#D1FAE5",AA:"#D1FAE5",A:"#ECFDF5",BBB:"#DBEAFE",BB:"#FEF3C7",B:"#FFEDD5",CCC:"#FEE2E2",CC:"#FEE2E2",D:"#FEE2E2"};
const TL:Record<CreditType,string>={term_loan:"Term Loan",revolvente:"Revolvente",arrendamiento_puro:"Arrend. Puro",arrendamiento_financiero:"Arrend. Fin."};
const EMPTY={acreditado:"",tipo:"term_loan" as CreditType,monto:0,tasa:0,plazo:12,mora:0,garantia:"",sector:"",notas:"",rating:"",score:0,el:0,npv:0};

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes cv-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  @keyframes cv-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
  @keyframes cv-spin{to{transform:rotate(360deg);}}
  .cv-in{animation:cv-in .3s cubic-bezier(.16,1,.3,1) forwards;}
  .cv-panel{background:#fff;border:1px solid rgba(13,20,38,.09);border-radius:14px;box-shadow:0 1px 4px rgba(13,20,38,.05);}
  .cv-inp{background:#F8FAFC;border:1.5px solid rgba(13,20,38,.1);border-radius:8px;padding:8px 11px;font-family:JetBrains Mono,monospace;font-size:12px;color:#0D1426;outline:none;width:100%;transition:border-color .15s;}
  .cv-inp:focus{border-color:#1D4ED8;background:#fff;}
  .cv-ie{background:transparent;border:none;border-bottom:1.5px solid rgba(29,78,216,.35);border-radius:0;padding:2px 4px;font-family:JetBrains Mono,monospace;font-size:12px;color:#0D1426;outline:none;}
  .cv-ie:focus{border-bottom-color:#1D4ED8;background:rgba(29,78,216,.025);}
  .cv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-family:DM Sans,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .18s;}
  .cv-btn-p{background:#1D4ED8;color:#fff;box-shadow:0 2px 8px rgba(29,78,216,.25);}
  .cv-btn-p:hover{background:#1E40AF;}
  .cv-btn-g{background:#fff;color:rgba(13,20,38,.6);border:1.5px solid rgba(13,20,38,.1);}
  .cv-btn-g:hover{border-color:rgba(13,20,38,.2);color:#0D1426;}
  .cv-btn-gr{background:#059669;color:#fff;}
  .cv-btn-gr:hover{background:#047857;}
  .cv-btn:disabled{opacity:.5;cursor:not-allowed;}
  .cv-ptab{padding:8px 14px;border-radius:8px;font-family:DM Sans,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;background:transparent;color:rgba(13,20,38,.45);width:100%;text-align:left;}
  .cv-ptab:hover{background:rgba(13,20,38,.05);color:#0D1426;}
  .cv-ptab.on{background:#EEF2FF;color:#1D4ED8;}
  .cv-tbl{width:100%;border-collapse:collapse;}
  .cv-tbl th{padding:9px 11px;text-align:left;font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(13,20,38,.35);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(13,20,38,.08);background:rgba(13,20,38,.02);white-space:nowrap;}
  .cv-tbl td{padding:8px 11px;border-bottom:1px solid rgba(13,20,38,.05);vertical-align:middle;}
  .cv-tbl tr.edi td{background:rgba(29,78,216,.025);}
  .cv-tbl tr:not(.edi):hover td{background:rgba(13,20,38,.012);}
  .cv-tbl tr:last-child td{border-bottom:none;}
  .cv-rt{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;letter-spacing:.04em;}
  .cv-sc{scrollbar-width:thin;scrollbar-color:rgba(13,20,38,.1) transparent;}
  .cv-sc::-webkit-scrollbar{height:4px;width:4px;}
  .cv-sc::-webkit-scrollbar-thumb{background:rgba(13,20,38,.1);border-radius:2px;}
  .cv-kpi{background:#fff;border:1px solid rgba(13,20,38,.09);border-radius:12px;padding:13px 15px;box-shadow:0 1px 3px rgba(13,20,38,.05);}
  .cv-sel{background:#F8FAFC;border:1.5px solid rgba(13,20,38,.1);border-radius:8px;padding:7px 10px;font-family:JetBrains Mono,monospace;font-size:12px;color:#0D1426;outline:none;cursor:pointer;}
  input[type=number]::-webkit-inner-spin-button{opacity:.3;}
  .cv-gr{background:linear-gradient(135deg,#7C3AED,#1D4ED8,#0891B2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .cv-ab{background:none;border:none;cursor:pointer;padding:4px 6px;border-radius:6px;transition:all .15s;font-size:13px;color:rgba(13,20,38,.28);}
  .cv-ab:hover{background:rgba(13,20,38,.06);color:#0D1426;}
  .cv-ab.del:hover{background:#FEE2E2;color:#DC2626;}
  .cv-ab.note{color:rgba(13,20,38,.28);}
  .cv-ab.note.on{color:#D97706;}
  .cv-overlay{position:fixed;inset:0;background:rgba(13,20,38,.4);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
  .cv-modal{background:#fff;border-radius:18px;padding:28px;width:540px;max-width:100%;box-shadow:0 24px 64px rgba(13,20,38,.22);}
`;

export default function CarteraValuacion() {
  const [ports,setPorts]=useState<Portfolio[]>([]);
  const [port,setPort]=useState<Portfolio|null>(null);
  const [credits,setCredits]=useState<Credit[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uid,setUid]=useState<string|null>(null);
  const [editId,setEditId]=useState<string|null>(null);
  const [buf,setBuf]=useState<Partial<Credit>>({});
  const [showNP,setShowNP]=useState(false);
  const [npName,setNpName]=useState("");
  const [npDesc,setNpDesc]=useState("");
  const [showAC,setShowAC]=useState(false);
  const [nc,setNc]=useState({...EMPTY});
  const [noteC,setNoteC]=useState<Credit|null>(null);
  const [noteT,setNoteT]=useState("");
  const [disc,setDisc]=useState(12);
  const [sortC,setSortC]=useState<keyof Credit>("monto");
  const [sortD,setSortD]=useState<"asc"|"desc">("desc");

  useEffect(()=>{sb.auth.getUser().then(({data})=>{if(data.user)setUid(data.user.id);});},[]);

  useEffect(()=>{
    if(!uid)return;
    setLoading(true);
    sb.from("portfolios").select("*").eq("owner_id",uid).order("updated_at",{ascending:false}).then(({data})=>{
      const ps=data||[];setPorts(ps);
      if(ps.length>0)setPort(ps[0]);
      setLoading(false);
    });
  },[uid]);

  useEffect(()=>{
    if(!port)return;
    sb.from("portfolio_credits").select("*").eq("portfolio_id",port.id).order("created_at").then(({data})=>setCredits((data||[]) as Credit[]));
  },[port]);

  const metrics=useMemo(()=>{
    if(!credits.length)return null;
    const tm=credits.reduce((s,c)=>s+c.monto,0);
    const tnpv=credits.reduce((s,c)=>s+calcNPV(c.monto,c.tasa,c.plazo,c.tipo,disc),0);
    const tel=credits.reduce((s,c)=>s+calcEL(c.monto,c.mora,c.garantia),0);
    const tirP=tm>0?credits.reduce((s,c)=>s+c.tasa*c.monto,0)/tm:0;
    const wal=tm>0?credits.reduce((s,c)=>s+c.plazo*c.monto,0)/tm/12:0;
    const rd=credits.reduce((acc,c)=>{acc[c.rating]=(acc[c.rating]||0)+1;return acc;},{} as Record<string,number>);
    const byR=Object.entries(rd).sort((a,b)=>["AAA","AA","A","BBB","BB","B","CCC","CC","D"].indexOf(a[0])-["AAA","AA","A","BBB","BB","B","CCC","CC","D"].indexOf(b[0]));
    const bs=credits.reduce((acc,c)=>{const k=c.sector||"Sin sector";acc[k]=(acc[k]||0)+c.monto;return acc;},{} as Record<string,number>);
    const topS=Object.entries(bs).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return{tm,tnpv,tel,tirP,wal,byR,topS,elPct:tm>0?(tel/tm)*100:0,npvPct:tm>0?((tnpv-tm)/tm)*100:0,count:credits.length};
  },[credits,disc]);

  async function createPort(){
    if(!npName.trim()||!uid)return;
    setSaving(true);
    const{data}=await sb.from("portfolios").insert({name:npName.trim(),description:npDesc.trim(),owner_id:uid}).select().single();
    if(data){const p=data as Portfolio;setPorts(pv=>[p,...pv]);setPort(p);setCredits([]);}
    setNpName("");setNpDesc("");setShowNP(false);setSaving(false);
  }
  async function delPort(id:string){
    if(!confirm("¿Eliminar esta cartera y todos sus créditos?"))return;
    await sb.from("portfolios").delete().eq("id",id);
    const rem=ports.filter(p=>p.id!==id);setPorts(rem);
    if(port?.id===id){setPort(rem[0]||null);setCredits([]);}
  }
  async function addCredit(){
    if(!nc.acreditado.trim()||!port)return;
    setSaving(true);
    const e=enrich({...nc,portfolio_id:port.id});
    const{data}=await sb.from("portfolio_credits").insert(e).select().single();
    if(data)setCredits(pv=>[...pv,data as Credit]);
    setNc({...EMPTY});setShowAC(false);setSaving(false);
    sb.from("portfolios").update({updated_at:new Date().toISOString()}).eq("id",port.id);
  }
  async function dupCredit(c:Credit){
    if(!port)return;
    const{id,portfolio_id,...rest}=c;
    const{data}=await sb.from("portfolio_credits").insert({...rest,portfolio_id:port.id,acreditado:c.acreditado+" (copia)"}).select().single();
    if(data)setCredits(pv=>[...pv,data as Credit]);
  }
  async function delCredit(id:string){
    await sb.from("portfolio_credits").delete().eq("id",id);
    setCredits(pv=>pv.filter(c=>c.id!==id));
  }
  function startEdit(c:Credit){setEditId(c.id);setBuf({...c});}
  async function saveEdit(){
    if(!editId)return;
    const e=enrich(buf);
    await sb.from("portfolio_credits").update(e).eq("id",editId);
    setCredits(pv=>pv.map(c=>c.id===editId?{...c,...e} as Credit:c));
    setEditId(null);setBuf({});
  }
  function cancelEdit(){setEditId(null);setBuf({});}
  async function saveNote(){
    if(!noteC)return;
    await sb.from("portfolio_credits").update({notas:noteT}).eq("id",noteC.id);
    setCredits(pv=>pv.map(c=>c.id===noteC.id?{...c,notas:noteT}:c));
    setNoteC(null);setNoteT("");
  }
  const eb=(f:keyof Credit,v:unknown)=>setBuf(p=>({...p,[f]:v}));
  function togSort(col:keyof Credit){if(sortC===col)setSortD(d=>d==="desc"?"asc":"desc");else{setSortC(col);setSortD("desc");}}
  const sorted=[...credits].sort((a,b)=>{
    const av=a[sortC],bv=b[sortC];
    if(typeof av==="number"&&typeof bv==="number")return sortD==="desc"?bv-av:av-bv;
    return sortD==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));
  });

  async function importXL(file:File){
    if(!port)return;
    const XLSX=await import("xlsx");
    const ab=await file.arrayBuffer();
    const wb=XLSX.read(ab,{type:"array"});
    let rows:Record<string,unknown>[]=[];
    for(const sn of wb.SheetNames){
      const ws=wb.Sheets[sn];
      const r=XLSX.utils.sheet_to_json(ws,{defval:"",raw:false}) as Record<string,unknown>[];
      if(r.length>rows.length)rows=r;
    }
    if(!rows.length)return;
    const headers=Object.keys(rows[0]);
    const al:Record<string,string[]>={
      acreditado:["acreditado","nombre","cliente","empresa","institucion","financiera","deudor"],
      monto:["saldo_a_la_fecha","saldo_fecha","saldo","monto","capital","importe_original","importe","amount","balance"],
      tasa:["tasa","rate","tasa_interes","tasa_anual","interest_rate"],
      plazo:["plazo","term","meses","months"],
      mora:["mora","dias_mora","days_past_due","dpd","atraso"],
      garantia:["garantia","garantias","avales","aval","colateral"],
      sector:["sector","destino","industria","giro","actividad","tipo_credito","tipo_de_credito"],
    };
    const fm:Record<string,string>={};
    for(const[field,keys]of Object.entries(al)){
      for(const h of headers){
        const hn=h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"_").replace(/_+/g,"_");
        if(keys.some(k=>hn.includes(k)||k.includes(hn))){if(!fm[field])fm[field]=h;break;}
      }
    }
    const ins=rows.filter(r=>Object.values(r).some(v=>v!==null&&v!==undefined&&v!=="")).map(r=>{
      const g=(f:string)=>fm[f]?r[fm[f]]??"":"";
      const monto=parseFloat(String(g("monto")).replace(/[,$\s]/g,""))||0;
      const tR=parseFloat(String(g("tasa")).replace(/[%,]/g,""))||0.15;
      const tasa=tR>0&&tR<1?tR*100:tR||15;
      const plazo=parseInt(String(g("plazo")))||12;
      const mora=parseInt(String(g("mora")))||0;
      const garantia=String(g("garantia"))||"";
      const sector=String(g("sector"))||"";
      const acreditado=String(g("acreditado"))||"Sin nombre";
      return enrich({portfolio_id:port.id,acreditado,tipo:"term_loan" as CreditType,monto,tasa,plazo,mora,garantia,sector,notas:""});
    });
    setSaving(true);
    const{data}=await sb.from("portfolio_credits").insert(ins).select();
    if(data)setCredits(pv=>[...pv,...(data as Credit[])]);
    sb.from("portfolios").update({updated_at:new Date().toISOString()}).eq("id",port.id);
    setSaving(false);
  }

  return(
    <div style={{fontFamily:"DM Sans,system-ui,sans-serif",background:"#F4F6FB",color:"#0D1426",minHeight:"100vh",paddingBottom:60}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid rgba(13,20,38,.09)",padding:"13px 26px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(244,246,251,.97)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <a href="/dashboard" style={{display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"rgba(13,20,38,.4)",fontSize:13,fontFamily:"JetBrains Mono,monospace"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
            Dashboard
          </a>
          <span style={{color:"rgba(13,20,38,.2)"}}>/</span>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,color:"rgba(13,20,38,.6)"}}>Cartera · Valuación</span>
          {saving&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"#1D4ED8",display:"flex",alignItems:"center",gap:5}}>
            <svg style={{animation:"cv-spin .7s linear infinite"}} width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
            Guardando...
          </span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:"rgba(29,78,216,.06)",border:"1px solid rgba(29,78,216,.15)",borderRadius:8}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#059669",display:"inline-block",animation:"cv-pulse 2s ease-in-out infinite"}}/>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"#1D4ED8"}}>PORTFOLIO ANALYTICS</span>
          </div>
          {port&&<label className="cv-btn cv-btn-g" style={{cursor:"pointer",fontSize:12,padding:"7px 14px"}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2h8l2 2v10H4V2zM8 6v6M5 9l3-3 3 3"/></svg>
            Importar Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)importXL(f);}}/>
          </label>}
        </div>
      </div>

      <div style={{maxWidth:1500,margin:"0 auto",padding:"22px 26px",display:"grid",gridTemplateColumns:"210px 1fr",gap:20,alignItems:"start"}}>

        {/* SIDEBAR */}
        <div style={{display:"flex",flexDirection:"column",gap:8,position:"sticky",top:74}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.32)",letterSpacing:".14em"}}>MIS CARTERAS</span>
            <button onClick={()=>setShowNP(true)} style={{background:"none",border:"none",cursor:"pointer",color:"#1D4ED8",fontSize:20,lineHeight:1}} title="Nueva">+</button>
          </div>
          {loading?<div style={{padding:16,textAlign:"center",fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(13,20,38,.3)"}}>Cargando...</div>
          :ports.length===0?<div style={{padding:16,textAlign:"center"}}>
            <div style={{fontSize:13,color:"rgba(13,20,38,.4)",marginBottom:10}}>Sin carteras</div>
            <button className="cv-btn cv-btn-p" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>setShowNP(true)}>+ Crear</button>
          </div>
          :ports.map(p=>(
            <div key={p.id} style={{position:"relative"}}>
              <button className={`cv-ptab${port?.id===p.id?" on":""}`} onClick={()=>setPort(p)}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:14}}>{p.name}</div>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.32)"}}>{new Date(p.updated_at).toLocaleDateString("es-MX")}</div>
              </button>
              {port?.id===p.id&&<button onClick={()=>delPort(p.id)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",cursor:"pointer",color:"rgba(13,20,38,.2)",fontSize:16,lineHeight:1}}>×</button>}
            </div>
          ))}
          {ports.length>0&&<button className="cv-btn cv-btn-g" style={{width:"100%",justifyContent:"center",fontSize:12,marginTop:4}} onClick={()=>setShowNP(true)}>+ Nueva cartera</button>}

          {port&&metrics&&<div className="cv-panel" style={{padding:"13px",marginTop:6}}>
            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.32)",letterSpacing:".12em",marginBottom:8}}>TASA DE DESCUENTO</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min={5} max={30} step={0.5} value={disc} onChange={e=>setDisc(parseFloat(e.target.value))} style={{flex:1,accentColor:"#1D4ED8"}}/>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,fontWeight:700,color:"#1D4ED8",width:36,textAlign:"right"}}>{disc}%</span>
            </div>
          </div>}
        </div>

        {/* MAIN */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {!port?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:400,gap:14}}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="rgba(13,20,38,.14)" strokeWidth="1.5" strokeLinecap="round"><rect x="8" y="8" width="36" height="36" rx="5"/><path d="M18 26h16M26 18v16"/></svg>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:"rgba(13,20,38,.38)",marginBottom:6}}>Crea tu primera cartera</div>
                <div style={{fontSize:13,color:"rgba(13,20,38,.28)",marginBottom:16}}>Guarda, valúa y edita carteras de crédito</div>
                <button className="cv-btn cv-btn-p" onClick={()=>setShowNP(true)}>+ Crear cartera</button>
              </div>
            </div>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <h1 style={{fontSize:21,fontWeight:800,letterSpacing:"-0.04em",marginBottom:3}}>{port.name}</h1>
                  {port.description&&<p style={{fontSize:13,color:"rgba(13,20,38,.42)"}}>{port.description}</p>}
                </div>
                <button className="cv-btn cv-btn-p" onClick={()=>setShowAC(true)}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v12M2 8h12"/></svg>
                  Agregar crédito
                </button>
              </div>

              {/* KPIs */}
              {metrics&&<div className="cv-in">
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9,marginBottom:10}}>
                  {[
                    {l:"Cartera Total",v:fmtM(metrics.tm),c:"#0D1426",s:undefined},
                    {l:"NPV Portafolio",v:fmtM(metrics.tnpv),c:metrics.tnpv>=metrics.tm?"#059669":"#DC2626",s:`${metrics.npvPct>=0?"+":""}${metrics.npvPct.toFixed(1)}% vs par`},
                    {l:"Pérdida Esperada",v:fmtM(metrics.tel),c:"#DC2626",s:`${metrics.elPct.toFixed(2)}%`},
                    {l:"TIR Ponderada",v:fmtP(metrics.tirP),c:"#1D4ED8",s:"por saldo"},
                    {l:"WAL",v:`${metrics.wal.toFixed(1)} años`,c:"#7C3AED",s:"vida pond."},
                    {l:"Créditos",v:String(metrics.count),c:"#0891B2",s:undefined},
                  ].map(k=>(
                    <div key={k.l} className="cv-kpi">
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.33)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>{k.l}</div>
                      <div style={{fontSize:17,fontWeight:800,letterSpacing:"-0.045em",color:k.c,lineHeight:1}}>{k.v}</div>
                      {k.s&&<div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.35)",marginTop:4}}>{k.s}</div>}
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:4}}>
                  <div className="cv-panel" style={{padding:"13px 15px"}}>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.32)",letterSpacing:".12em",marginBottom:9}}>RATING S&P/MOODYS</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {metrics.byR.map(([r,c])=>(
                        <div key={r} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:7,background:RB[r]||"#F3F4F6"}}>
                          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:RC[r]||"#374151"}}>{r}</span>
                          <span style={{fontSize:11,color:"rgba(13,20,38,.45)",fontWeight:600}}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="cv-panel" style={{padding:"13px 15px"}}>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.32)",letterSpacing:".12em",marginBottom:9}}>CONCENTRACIÓN POR SECTOR</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {metrics.topS.map(([sec,mnt])=>{
                        const pct=(mnt/metrics.tm)*100;
                        return(<div key={sec} style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,height:4,background:"rgba(13,20,38,.06)",borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#7C3AED,#1D4ED8)",borderRadius:2}}/>
                          </div>
                          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.45)",width:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sec}</span>
                          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",width:32,textAlign:"right"}}>{pct.toFixed(0)}%</span>
                        </div>);
                      })}
                    </div>
                  </div>
                </div>
              </div>}

              {/* TABLE */}
              {credits.length===0?(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"56px 0",gap:12}}>
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="rgba(13,20,38,.14)" strokeWidth="1.5" strokeLinecap="round"><rect x="6" y="6" width="30" height="30" rx="4"/><path d="M13 21h16M21 13v16"/></svg>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"rgba(13,20,38,.38)",marginBottom:6}}>Sin créditos</div>
                    <div style={{fontSize:12,color:"rgba(13,20,38,.26)",marginBottom:14}}>Agrega créditos o importa desde Excel</div>
                    <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                      <button className="cv-btn cv-btn-p" onClick={()=>setShowAC(true)}>+ Agregar</button>
                      <label className="cv-btn cv-btn-g" style={{cursor:"pointer"}}>
                        Importar Excel
                        <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)importXL(f);}}/>
                      </label>
                    </div>
                  </div>
                </div>
              ):(
                <div className="cv-panel" style={{overflow:"hidden"}}>
                  <div style={{overflowX:"auto"}} className="cv-sc">
                    <table className="cv-tbl">
                      <thead><tr>
                        {([["acreditado","Acreditado"],["tipo","Tipo"],["monto","Monto"],["tasa","Tasa"],["plazo","Plazo"],["mora","Mora"],["garantia","Garantía"],["sector","Sector"],["score","Score"],["rating","Rating"],["el","EL"],["npv","NPV"]] as [keyof Credit,string][]).map(([col,lbl])=>(
                          <th key={col}><button style={{background:"none",border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.35)",letterSpacing:".1em",textTransform:"uppercase",padding:0,display:"flex",alignItems:"center",gap:2}} onClick={()=>togSort(col)}>{lbl}{sortC===col?(sortD==="desc"?" ↓":" ↑"):""}</button></th>
                        ))}
                        <th style={{width:110}}></th>
                      </tr></thead>
                      <tbody>
                        {sorted.map(c=>{
                          const isE=editId===c.id;
                          const lScore=isE?calcScore(Number(buf.mora||0),Number(buf.tasa||0),Number(buf.monto||0)):c.score;
                          const lR=isE?calcRating(lScore,Number(buf.mora||0),String(buf.garantia||"")):c.rating;
                          const lNPV=isE?calcNPV(Number(buf.monto||0),Number(buf.tasa||0),Number(buf.plazo||0),(buf.tipo||"term_loan") as CreditType,disc):c.npv;
                          const lEL=isE?calcEL(Number(buf.monto||0),Number(buf.mora||0),String(buf.garantia||"")):c.el;
                          return(<tr key={c.id} className={isE?"edi":""}>
                            <td style={{minWidth:130,fontWeight:600}}>
                              {isE?<input className="cv-ie" value={String(buf.acreditado||"")} onChange={e=>eb("acreditado",e.target.value)} style={{minWidth:110}}/>
                              :<span style={{maxWidth:130,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.acreditado}</span>}
                            </td>
                            <td>
                              {isE?<select className="cv-sel" style={{fontSize:11,padding:"3px 6px"}} value={String(buf.tipo||"term_loan")} onChange={e=>eb("tipo",e.target.value)}>
                                {Object.entries(TL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                              </select>:<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.45)"}}>{TL[c.tipo]}</span>}
                            </td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>
                              {isE?<input className="cv-ie" type="number" value={Number(buf.monto||0)} onChange={e=>eb("monto",parseFloat(e.target.value)||0)} style={{width:85}}/>:fmtM(c.monto)}
                            </td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>
                              {isE?<input className="cv-ie" type="number" step="0.1" value={Number(buf.tasa||0)} onChange={e=>eb("tasa",parseFloat(e.target.value)||0)} style={{width:50}}/>:`${c.tasa.toFixed(1)}%`}
                            </td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>
                              {isE?<input className="cv-ie" type="number" value={Number(buf.plazo||0)} onChange={e=>eb("plazo",parseInt(e.target.value)||0)} style={{width:42}}/>:`${c.plazo}m`}
                            </td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:c.mora>90?"#DC2626":c.mora>30?"#D97706":"rgba(13,20,38,.45)"}}>
                              {isE?<input className="cv-ie" type="number" value={Number(buf.mora||0)} onChange={e=>eb("mora",parseInt(e.target.value)||0)} style={{width:42}}/>:`${c.mora}d`}
                            </td>
                            <td style={{fontSize:11,color:"rgba(13,20,38,.45)",maxWidth:100}}>
                              {isE?<input className="cv-ie" value={String(buf.garantia||"")} onChange={e=>eb("garantia",e.target.value)} style={{width:95}}/>
                              :<span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{c.garantia||"—"}</span>}
                            </td>
                            <td style={{fontSize:11,color:"rgba(13,20,38,.45)"}}>
                              {isE?<input className="cv-ie" value={String(buf.sector||"")} onChange={e=>eb("sector",e.target.value)} style={{width:75}}/>:<span>{c.sector||"—"}</span>}
                            </td>
                            <td>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:34,height:4,borderRadius:2,background:"rgba(13,20,38,.07)",overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${lScore}%`,background:lScore>=70?"#059669":lScore>=50?"#D97706":"#DC2626",borderRadius:2,transition:"width .3s"}}/>
                                </div>
                                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{lScore}</span>
                              </div>
                            </td>
                            <td><span className="cv-rt" style={{background:RB[lR]||"#F3F4F6",color:RC[lR]||"#374151",transition:"all .3s"}}>{lR||"—"}</span></td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:"#DC2626"}}>{fmtM(lEL)}</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:lNPV>=(isE?Number(buf.monto||0):c.monto)?"#059669":"#DC2626",fontWeight:600}}>{fmtM(lNPV)}</td>
                            <td>
                              {isE?(
                                <div style={{display:"flex",gap:4}}>
                                  <button className="cv-btn cv-btn-gr" style={{padding:"4px 10px",fontSize:11}} onClick={saveEdit}>✓ Guardar</button>
                                  <button className="cv-btn cv-btn-g" style={{padding:"4px 8px",fontSize:11}} onClick={cancelEdit}>✕</button>
                                </div>
                              ):(
                                <div style={{display:"flex",gap:2}}>
                                  <button className="cv-ab" onClick={()=>startEdit(c)} title="Editar">✏️</button>
                                  <button className={`cv-ab note${c.notas?" on":""}`} onClick={()=>{setNoteC(c);setNoteT(c.notas||"");}} title={c.notas?"Ver notas":"Agregar nota"}>📝</button>
                                  <button className="cv-ab" onClick={()=>dupCredit(c)} title="Duplicar">⧉</button>
                                  <button className="cv-ab del" onClick={()=>delCredit(c.id)} title="Eliminar">🗑</button>
                                </div>
                              )}
                            </td>
                          </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: NUEVA CARTERA */}
      {showNP&&<div className="cv-overlay" onClick={()=>setShowNP(false)}>
        <div className="cv-modal cv-in" onClick={e=>e.stopPropagation()}>
          <h2 style={{fontSize:18,fontWeight:800,letterSpacing:"-0.04em",marginBottom:6}}>Nueva cartera</h2>
          <p style={{fontSize:13,color:"rgba(13,20,38,.42)",marginBottom:20}}>Agrupa créditos o arrendamientos para valuarlos como portafolio.</p>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>NOMBRE *</label>
              <input className="cv-inp" placeholder="Ej. Cartera PyME Q1 2026" value={npName} onChange={e=>setNpName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&createPort()}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>DESCRIPCIÓN (OPCIONAL)</label>
              <input className="cv-inp" placeholder="Notas sobre esta cartera..." value={npDesc} onChange={e=>setNpDesc(e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="cv-btn cv-btn-p" onClick={createPort} disabled={saving||!npName.trim()}>{saving?"Creando...":"Crear cartera →"}</button>
            <button className="cv-btn cv-btn-g" onClick={()=>setShowNP(false)}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL: AGREGAR CRÉDITO */}
      {showAC&&<div className="cv-overlay" onClick={()=>setShowAC(false)}>
        <div className="cv-modal cv-in" style={{width:580}} onClick={e=>e.stopPropagation()}>
          <h2 style={{fontSize:18,fontWeight:800,letterSpacing:"-0.04em",marginBottom:18}}>Agregar crédito / arrendamiento</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:14}}>
            <div style={{gridColumn:"span 2"}}>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>ACREDITADO *</label>
              <input className="cv-inp" placeholder="Nombre del acreditado o institución" value={nc.acreditado} onChange={e=>setNc(p=>({...p,acreditado:e.target.value}))} autoFocus/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>TIPO</label>
              <select className="cv-inp" value={nc.tipo} onChange={e=>setNc(p=>({...p,tipo:e.target.value as CreditType}))}>
                {Object.entries(TL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>MONTO (MXN)</label>
              <input className="cv-inp" type="number" step="10000" placeholder="0" value={nc.monto||""} onChange={e=>setNc(p=>({...p,monto:parseFloat(e.target.value)||0}))}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>TASA ANUAL %</label>
              <input className="cv-inp" type="number" step="0.1" placeholder="0.0" value={nc.tasa||""} onChange={e=>setNc(p=>({...p,tasa:parseFloat(e.target.value)||0}))}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>PLAZO (MESES)</label>
              <input className="cv-inp" type="number" placeholder="12" value={nc.plazo} onChange={e=>setNc(p=>({...p,plazo:parseInt(e.target.value)||0}))}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>DÍAS DE MORA</label>
              <input className="cv-inp" type="number" placeholder="0" value={nc.mora} onChange={e=>setNc(p=>({...p,mora:parseInt(e.target.value)||0}))}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>GARANTÍA</label>
              <input className="cv-inp" placeholder="Hipotecaria, Prendaria, Aval..." value={nc.garantia} onChange={e=>setNc(p=>({...p,garantia:e.target.value}))}/>
            </div>
            <div>
              <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>SECTOR / DESTINO</label>
              <input className="cv-inp" placeholder="Manufactura, Comercio..." value={nc.sector} onChange={e=>setNc(p=>({...p,sector:e.target.value}))}/>
            </div>
          </div>
          {/* Live preview */}
          {nc.monto>0&&nc.tasa>0&&(()=>{
            const s=calcScore(nc.mora,nc.tasa,nc.monto);
            const r=calcRating(s,nc.mora,nc.garantia);
            const npv=calcNPV(nc.monto,nc.tasa,nc.plazo,nc.tipo,disc);
            const el=calcEL(nc.monto,nc.mora,nc.garantia);
            return<div style={{background:"rgba(13,20,38,.025)",border:"1px solid rgba(13,20,38,.07)",borderRadius:10,padding:"11px 14px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap"}}>
              {[
                {l:"RATING",v:<span className="cv-rt" style={{background:RB[r],color:RC[r],marginTop:4,display:"inline-flex"}}>{r}</span>},
                {l:"SCORE",v:<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:15,fontWeight:700}}>{s}</span>},
                {l:"NPV",v:<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:15,fontWeight:700,color:npv>=nc.monto?"#059669":"#DC2626"}}>{fmtM(npv)}</span>},
                {l:"PÉRD. ESP.",v:<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:15,fontWeight:700,color:"#DC2626"}}>{fmtM(el)}</span>},
              ].map(({l,v})=>(
                <div key={l}><div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.32)",letterSpacing:".1em",marginBottom:3}}>{l}</div>{v}</div>
              ))}
            </div>;
          })()}
          <div style={{display:"flex",gap:8}}>
            <button className="cv-btn cv-btn-p" onClick={addCredit} disabled={saving||!nc.acreditado.trim()}>{saving?"Guardando...":"Agregar →"}</button>
            <button className="cv-btn cv-btn-g" onClick={()=>setShowAC(false)}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL: NOTAS */}
      {noteC&&<div className="cv-overlay" onClick={()=>setNoteC(null)}>
        <div className="cv-modal cv-in" onClick={e=>e.stopPropagation()}>
          <h2 style={{fontSize:16,fontWeight:800,letterSpacing:"-0.03em",marginBottom:4}}>Notas · {noteC.acreditado}</h2>
          <p style={{fontSize:12,color:"rgba(13,20,38,.38)",marginBottom:14}}>Comentarios internos. Solo visibles para ti.</p>
          <textarea value={noteT} onChange={e=>setNoteT(e.target.value)} placeholder="Escribe tus notas aquí..."
            style={{width:"100%",height:130,padding:"10px 12px",fontFamily:"DM Sans,system-ui,sans-serif",fontSize:13,color:"#0D1426",background:"#F8FAFC",border:"1.5px solid rgba(13,20,38,.1)",borderRadius:10,outline:"none",resize:"vertical",marginBottom:14}}/>
          <div style={{display:"flex",gap:8}}>
            <button className="cv-btn cv-btn-p" onClick={saveNote}>Guardar</button>
            <button className="cv-btn cv-btn-g" onClick={()=>setNoteC(null)}>Cancelar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
