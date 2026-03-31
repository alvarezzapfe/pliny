"use client";
import React, { useState, useMemo, useCallback } from "react";

type AssetType = "term_loan"|"revolvente"|"arrendamiento_puro"|"arrendamiento_financiero";
type StressScenario = "base"|"moderado"|"severo"|"extremo";
type MainTab = "instrumento"|"cartera"|"reporte";

interface Inputs {
  assetType: AssetType;
  monto: number; tasa: number; plazoMeses: number; tasaDescuento: number;
  pd: number; lgd: number;
  utilizacion: number; lineaTotal: number;
  valorResidual: number; rentaMensual: number;
  stressScenario: StressScenario;
}
interface Results {
  vpn: number; tir: number; duration: number; convexity: number;
  expectedLoss: number; ead: number; riskAdjustedReturn: number;
  cashFlows: number[];
  stressVpn: Record<StressScenario,number>;
  stressTir: Record<StressScenario,number>;
  spreadBps: number;
}
interface CreditRow {
  id: string; acreditado: string; monto: number; tasa: number;
  plazo: number; mora: number; garantia: string; sector: string;
  score: number; rating: string; el: number; vpn: number;
}

// ── MATH ──────────────────────────────────────────────────────────────────────
function calcTIR(flows: number[], guess=0.01): number {
  let r=guess;
  for(let i=0;i<200;i++){
    let npv=0,dnpv=0;
    for(let t=0;t<flows.length;t++){const d=Math.pow(1+r,t);npv+=flows[t]/d;dnpv-=t*flows[t]/Math.pow(1+r,t+1);}
    const nr=r-npv/dnpv;
    if(Math.abs(nr-r)<1e-10)return nr;
    r=nr;
  }
  return r;
}
function calcVPN(flows:number[],r:number){return flows.reduce((a,c,t)=>a+c/Math.pow(1+r,t),0);}
function calcDuration(flows:number[],r:number){
  const price=flows.slice(1).reduce((a,c,i)=>a+c/Math.pow(1+r,i+1),0);
  if(!price)return 0;
  return flows.slice(1).reduce((a,c,i)=>a+(i+1)*c/Math.pow(1+r,i+1),0)/price;
}
function calcConvexity(flows:number[],r:number){
  const price=flows.slice(1).reduce((a,c,i)=>a+c/Math.pow(1+r,i+1),0);
  if(!price)return 0;
  return flows.slice(1).reduce((a,c,i)=>a+(i+1)*(i+2)*c/Math.pow(1+r,i+3),0)/price;
}
function genFlows(inp:Inputs):number[]{
  const{assetType,monto,tasa,plazoMeses,valorResidual,rentaMensual,utilizacion,lineaTotal}=inp;
  const r=tasa/100/12; const flows:number[]=[];
  if(assetType==="term_loan"){
    const q=monto*r/(1-Math.pow(1+r,-plazoMeses));
    flows.push(-monto);
    for(let t=1;t<=plazoMeses;t++)flows.push(q);
  } else if(assetType==="revolvente"){
    const used=lineaTotal*utilizacion/100;
    const q=used*r/(1-Math.pow(1+r,-plazoMeses));
    flows.push(-used);
    for(let t=1;t<plazoMeses;t++)flows.push(q);
    flows.push(q+used*0.01);
  } else if(assetType==="arrendamiento_puro"){
    flows.push(-monto);
    for(let t=1;t<=plazoMeses;t++)flows.push(rentaMensual);
  } else {
    const vr=monto*valorResidual/100;
    const base=monto-vr/Math.pow(1+r,plazoMeses);
    const q=base*r/(1-Math.pow(1+r,-plazoMeses));
    flows.push(-monto);
    for(let t=1;t<plazoMeses;t++)flows.push(q);
    flows.push(q+vr);
  }
  return flows;
}
function applyStress(flows:number[],sc:StressScenario,pd:number,lgd:number):number[]{
  const h={base:0,moderado:0.15,severo:0.30,extremo:0.55}[sc];
  const sPD=Math.min({base:pd,moderado:pd*1.5,severo:pd*2.5,extremo:pd*4}[sc],100)/100;
  return flows.map((c,t)=>t===0?c:c*(1-h)*(1-sPD*lgd/100));
}
function compute(inp:Inputs):Results{
  const flows=genFlows(inp);
  const r=inp.tasaDescuento/100/12;
  const vpn=calcVPN(flows,r);
  const tirM=calcTIR(flows);
  const tir=(Math.pow(1+tirM,12)-1)*100;
  const duration=calcDuration(flows,r)/12;
  const convexity=calcConvexity(flows,r);
  const ead=inp.assetType==="revolvente"?inp.lineaTotal*inp.utilizacion/100:inp.monto;
  const expectedLoss=ead*(inp.pd/100)*(inp.lgd/100);
  const riskAdjustedReturn=tir-(inp.pd/100)*(inp.lgd/100)*100;
  const scenarios:StressScenario[]=["base","moderado","severo","extremo"];
  const stressVpn={} as Record<StressScenario,number>;
  const stressTir={} as Record<StressScenario,number>;
  for(const sc of scenarios){
    const sf=applyStress(flows,sc,inp.pd,inp.lgd);
    stressVpn[sc]=calcVPN(sf,r);
    stressTir[sc]=(Math.pow(1+calcTIR(sf),12)-1)*100;
  }
  return{vpn,tir,duration,convexity,expectedLoss,ead,riskAdjustedReturn,cashFlows:flows,stressVpn,stressTir,spreadBps:(tir-10.5)*100};
}

// ── RATING ────────────────────────────────────────────────────────────────────
function calcRating(score:number,mora:number,garantia:string):string{
  if(mora>180)return"D"; if(mora>120)return"CC"; if(mora>90)return"CCC";
  const g=garantia?.toLowerCase()||"";
  const hasG=["hipotec","prend","aval","ranger","toyota","jeep","bmw","ford","explorer"].some(k=>g.includes(k));
  if(score>=85&&mora===0&&hasG)return"AAA"; if(score>=80&&mora===0)return"AA";
  if(score>=75&&mora<10)return"A"; if(score>=68&&mora<30)return"BBB";
  if(score>=58&&mora<60)return"BB"; if(score>=48&&mora<90)return"B";
  if(score>=35)return"CCC"; return"CC";
}
const RATING_COLOR:Record<string,string>={AAA:"#065F46",AA:"#065F46",A:"#059669",BBB:"#1D4ED8",BB:"#D97706",B:"#EA580C",CCC:"#DC2626",CC:"#991B1B",D:"#7F1D1D"};
const RATING_BG:Record<string,string>={AAA:"#D1FAE5",AA:"#D1FAE5",A:"#ECFDF5",BBB:"#DBEAFE",BB:"#FEF3C7",B:"#FFEDD5",CCC:"#FEE2E2",CC:"#FEE2E2",D:"#FEE2E2"};
const STRESS_COLORS:Record<StressScenario,string>={base:"#059669",moderado:"#D97706",severo:"#EA580C",extremo:"#DC2626"};
const STRESS_LABELS:Record<StressScenario,string>={base:"Base",moderado:"Moderado",severo:"Severo",extremo:"Extremo"};
const ASSET_TYPES=[
  {id:"term_loan" as AssetType,label:"Term Loan",icon:"M2 8h12M8 2v12"},
  {id:"revolvente" as AssetType,label:"Revolvente",icon:"M5 4h6M5 8h6M5 12h4"},
  {id:"arrendamiento_puro" as AssetType,label:"Arrend. Puro",icon:"M3 3h10v10H3z"},
  {id:"arrendamiento_financiero" as AssetType,label:"Arrend. Fin.",icon:"M3 13l4-4 3 3 4-6"},
];

// ── FORMATTERS ────────────────────────────────────────────────────────────────
const fmtM=(n:number)=>Math.abs(n)>=1e6?`$${(n/1e6).toFixed(2)}M`:Math.abs(n)>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${n.toFixed(0)}`;
const fmt=(n:number,d=2)=>new Intl.NumberFormat("es-MX",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

const DEFAULTS:Inputs={assetType:"term_loan",monto:0,tasa:0,plazoMeses:0,tasaDescuento:12,pd:3.5,lgd:45,utilizacion:70,lineaTotal:0,valorResidual:20,rentaMensual:0,stressScenario:"base"};
const EMPTY_CREDIT={acreditado:"",monto:0,tasa:18,plazo:24,mora:0,garantia:"",sector:""};

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
function Field({label,value,onChange,prefix,suffix,step=1,placeholder="0"}:{
  label:string;value:number;onChange:(v:number)=>void;
  prefix?:string;suffix?:string;step?:number;placeholder?:string;
}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.4)",letterSpacing:".1em"}}>{label}</label>
      <div style={{display:"flex",alignItems:"center",background:"#F8FAFC",border:"1.5px solid rgba(13,20,38,.1)",borderRadius:9,overflow:"hidden"}}>
        {prefix&&<span style={{padding:"0 10px",fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(13,20,38,.38)",borderRight:"1px solid rgba(13,20,38,.08)",whiteSpace:"nowrap",flexShrink:0}}>{prefix}</span>}
        <input
          type="number" value={value||""} step={step} placeholder={placeholder}
          onChange={e=>onChange(parseFloat(e.target.value)||0)}
          style={{flex:1,background:"transparent",border:"none",outline:"none",padding:"9px 11px",fontFamily:"JetBrains Mono,monospace",fontSize:13,color:"#0D1426",width:0,minWidth:0}}
        />
        {suffix&&<span style={{padding:"0 10px",fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(13,20,38,.38)",borderLeft:"1px solid rgba(13,20,38,.08)",flexShrink:0}}>{suffix}</span>}
      </div>
    </div>
  );
}

function KpiCard({label,value,sub,color,delta}:{label:string;value:string;sub?:string;color?:string;delta?:number;}){
  return(
    <div style={{background:"#fff",border:"1px solid rgba(13,20,38,.09)",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 3px rgba(13,20,38,.05)"}}>
      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.35)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.05em",color:color||"#0D1426",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",marginTop:5}}>{sub}</div>}
      {delta!==undefined&&<div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:delta>=0?"#059669":"#DC2626",marginTop:4}}>{delta>=0?"▲":"▼"} {Math.abs(delta).toFixed(0)} bps vs TIIE</div>}
    </div>
  );
}

function CFBar({flows}:{flows:number[]}){
  const vis=flows.slice(1,37);
  const max=Math.max(...vis);const min=Math.min(...vis,0);const range=max-min||1;
  const bw=Math.max(2,Math.floor(360/vis.length)-1);
  return(
    <svg width="100%" height={80} viewBox="0 0 360 80" preserveAspectRatio="none" style={{display:"block"}}>
      {vis.map((cf,i)=>{
        const pct=(cf-min)/range;const bh=Math.max(2,pct*76);
        return <rect key={i} x={(i/vis.length)*360} y={78-bh} width={bw} height={bh} fill={cf>=0?"#059669":"#DC2626"} opacity={0.75} rx={1}/>;
      })}
    </svg>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;}
  input[type=number]::-webkit-inner-spin-button{opacity:.3;}
  @keyframes cl-fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  @keyframes cl-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
  @keyframes cl-spin{to{transform:rotate(360deg);}}
  .cl-fade{animation:cl-fade .3s cubic-bezier(.16,1,.3,1) forwards;}
  .cl-panel{background:#fff;border:1px solid rgba(13,20,38,.09);border-radius:14px;padding:18px;box-shadow:0 1px 4px rgba(13,20,38,.05);}
  .cl-sec{font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(13,20,38,.35);letter-spacing:.16em;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .cl-sec::after{content:'';flex:1;height:1px;background:rgba(13,20,38,.08);}
  .cl-asset{background:#fff;border:1.5px solid rgba(13,20,38,.1);border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px;}
  .cl-asset:hover{border-color:rgba(29,78,216,.3);background:#EEF2FF;}
  .cl-asset.on{background:#EEF2FF;border-color:#1D4ED8;box-shadow:0 0 0 3px rgba(29,78,216,.1);}
  .cl-stress{padding:6px 12px;border-radius:7px;font-family:JetBrains Mono,monospace;font-size:10px;font-weight:600;border:1.5px solid rgba(13,20,38,.1);background:#fff;color:rgba(13,20,38,.4);cursor:pointer;transition:all .15s;}
  .cl-stress.on{color:#fff;border-color:transparent;}
  .cl-tab{padding:8px 18px;border-radius:9px;font-family:DM Sans,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;background:transparent;color:rgba(13,20,38,.42);}
  .cl-tab:hover{background:rgba(13,20,38,.05);color:#0D1426;}
  .cl-tab.on{background:#fff;color:#0D1426;box-shadow:0 1px 4px rgba(13,20,38,.1);}
  .cl-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-family:DM Sans,system-ui,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;}
  .cl-btn-p{background:#1D4ED8;color:#fff;box-shadow:0 2px 8px rgba(29,78,216,.2);}
  .cl-btn-p:hover{background:#1E40AF;}
  .cl-btn-g{background:#fff;color:rgba(13,20,38,.55);border:1.5px solid rgba(13,20,38,.1);}
  .cl-btn-g:hover{border-color:rgba(13,20,38,.2);color:#0D1426;}
  .cl-btn-d{background:#fff;color:#DC2626;border:1.5px solid rgba(220,38,38,.2);}
  .cl-btn-d:hover{background:#FEE2E2;}
  .cl-inp{background:#F8FAFC;border:1.5px solid rgba(13,20,38,.1);border-radius:9px;padding:9px 12px;font-family:JetBrains Mono,monospace;font-size:12px;color:#0D1426;outline:none;width:100%;transition:border-color .15s;}
  .cl-inp:focus{border-color:#1D4ED8;background:#fff;}
  .cl-tbl{width:100%;border-collapse:collapse;}
  .cl-tbl th{padding:9px 11px;text-align:left;font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(13,20,38,.35);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(13,20,38,.08);background:rgba(13,20,38,.02);}
  .cl-tbl td{padding:9px 11px;border-bottom:1px solid rgba(13,20,38,.05);}
  .cl-tbl tr:hover td{background:rgba(13,20,38,.012);}
  .cl-tbl tr:last-child td{border-bottom:none;}
  .cl-rt{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;}
  .cl-sc::-webkit-scrollbar{height:4px;width:4px;}
  .cl-sc::-webkit-scrollbar-thumb{background:rgba(13,20,38,.1);border-radius:2px;}
  .cl-drop{border:2px dashed rgba(13,20,38,.12);border-radius:14px;padding:40px 24px;text-align:center;cursor:pointer;transition:all .2s;background:#fff;}
  .cl-drop:hover,.cl-drop.over{border-color:#1D4ED8;background:#EEF2FF;}
  .cl-grad{background:linear-gradient(135deg,#7C3AED,#1D4ED8,#0891B2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
`;

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CalculadoraPage(){
  const [tab,setTab]=useState<MainTab>("instrumento");
  const [inp,setInp]=useState<Inputs>(DEFAULTS);
  const set=useCallback(<K extends keyof Inputs>(k:K,v:Inputs[K])=>setInp(p=>({...p,[k]:v})),[]);
  const [credits,setCredits]=useState<CreditRow[]>([]);
  const [fileName,setFileName]=useState("");
  const [dragging,setDragging]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [nc,setNc]=useState({...EMPTY_CREDIT});
  const [sortC,setSortC]=useState<keyof CreditRow>("monto");
  const [sortD,setSortD]=useState<"asc"|"desc">("desc");
  const [genPDF,setGenPDF]=useState(false);
  const [pdfDone,setPdfDone]=useState(false);
  const [filterR,setFilterR]=useState("");

  const hasInputs=inp.monto>0&&inp.tasa>0&&inp.plazoMeses>0;
  const results=useMemo(()=>{if(!hasInputs)return null;try{return compute(inp);}catch{return null;}},[inp,hasInputs]);

  // Portfolio metrics
  const portfolio=useMemo(()=>{
    if(!credits.length)return null;
    const tm=credits.reduce((s,c)=>s+c.monto,0);
    const tel=credits.reduce((s,c)=>s+c.el,0);
    const avgScore=credits.reduce((s,c)=>s+c.score,0)/credits.length;
    const avgTasa=tm>0?credits.reduce((s,c)=>s+c.tasa*c.monto,0)/tm:0;
    const rd=credits.reduce((acc,c)=>{acc[c.rating]=(acc[c.rating]||0)+1;return acc;},{} as Record<string,number>);
    const byR=Object.entries(rd).sort((a,b)=>["AAA","AA","A","BBB","BB","B","CCC","CC","D"].indexOf(a[0])-["AAA","AA","A","BBB","BB","B","CCC","CC","D"].indexOf(b[0]));
    return{tm,tel,avgScore,avgTasa,byR,elPct:tm>0?(tel/tm)*100:0,count:credits.length};
  },[credits]);

  // Excel import
  async function processFile(file:File){
    setFileName(file.name);
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
    const aliases:Record<string,string[]>={
      acreditado:["acreditado","nombre","cliente","empresa","institucion","financiera","deudor"],
      monto:["saldo_a_la_fecha","saldo_fecha","saldo","monto","capital","importe_original","importe","amount","balance"],
      tasa:["tasa","rate","tasa_interes","tasa_anual","interest_rate"],
      plazo:["plazo","term","meses","months"],
      mora:["mora","dias_mora","days_past_due","dpd","atraso"],
      garantia:["garantia","garantias","avales","aval","colateral"],
      sector:["sector","destino","industria","giro","actividad","tipo_credito"],
    };
    const fm:Record<string,string>={};
    for(const[field,keys]of Object.entries(aliases)){
      for(const h of headers){
        const hn=h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"_").replace(/_+/g,"_");
        if(keys.some(k=>hn.includes(k)||k.includes(hn))){if(!fm[field])fm[field]=h;break;}
      }
    }
    const parsed=rows.filter(r=>Object.values(r).some(v=>v!==null&&v!==undefined&&v!=="")).map((r,i)=>{
      const g=(f:string)=>fm[f]?r[fm[f]]??"":"";
      const monto=parseFloat(String(g("monto")).replace(/[,$\s]/g,""))||0;
      const tR=parseFloat(String(g("tasa")).replace(/[%,]/g,""))||0.15;
      const tasa=tR>0&&tR<1?tR*100:tR||15;
      const plazo=parseInt(String(g("plazo")))||12;
      const mora=parseInt(String(g("mora")))||0;
      const garantia=String(g("garantia"))||"";
      const sector=String(g("sector"))||"General";
      const acreditado=String(g("acreditado"))||`Credito ${i+1}`;
      const score=Math.max(30,Math.min(95,80-mora/3));
      const rating=calcRating(score,mora,garantia);
      const pd=mora>90?0.45:mora>30?0.18:mora>0?0.08:0.025;
      const lgd=garantia.toLowerCase().includes("hipotec")?0.35:0.55;
      const el=monto*pd*lgd;
      const rM=tasa/100/12;
      const vpn=rM>0&&plazo>0?monto*(1-1/Math.pow(1+rM,plazo))-monto*0.015:0;
      return{id:`r${i}`,acreditado,monto,tasa,plazo,mora,garantia,sector,score,rating,el,vpn};
    });
    setCredits(parsed);
  }

  function addCredit(){
    if(!nc.acreditado.trim())return;
    const score=Math.max(30,Math.min(95,80-nc.mora/3));
    const rating=calcRating(score,nc.mora,nc.garantia);
    const pd=nc.mora>90?0.45:nc.mora>30?0.18:nc.mora>0?0.08:0.025;
    const lgd=nc.garantia.toLowerCase().includes("hipotec")?0.35:0.55;
    const el=nc.monto*pd*lgd;
    const rM=nc.tasa/100/12;
    const vpn=rM>0&&nc.plazo>0?nc.monto*(1-1/Math.pow(1+rM,nc.plazo))-nc.monto*0.015:0;
    setCredits(p=>[...p,{id:`m${Date.now()}`,score,rating,el,vpn,...nc}]);
    setNc({...EMPTY_CREDIT});setShowAdd(false);
  }

  function removeCredit(id:string){setCredits(p=>p.filter(c=>c.id!==id));}
  function togSort(col:keyof CreditRow){if(sortC===col)setSortD(d=>d==="desc"?"asc":"desc");else{setSortC(col);setSortD("desc");}}
  const sorted=[...credits].sort((a,b)=>{
    const av=a[sortC],bv=b[sortC];
    if(typeof av==="number"&&typeof bv==="number")return sortD==="desc"?bv-av:av-bv;
    return sortD==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));
  }).filter(r=>!filterR||r.rating===filterR);

  async function generatePDF(){
    setGenPDF(true);
    try{
      const mod=await import("jspdf");
      const jsPDF=(mod.default||mod.jsPDF) as any;
      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const W=210,M=18;let y=0;
      const date=new Date().toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric"});
      doc.setFillColor(13,20,38);doc.rect(0,0,W,36,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(240,244,255);
      doc.text("Plinius.",M,21);
      doc.setFontSize(7);doc.setFont("helvetica","normal");doc.setTextColor(0,180,120);
      doc.text("CREDIT OS  -  CREDIT ANALYTICS v2",M,29);
      doc.setFontSize(8);doc.setTextColor(160,170,200);doc.text(date,W-M,21,{align:"right"});
      doc.text("CONFIDENCIAL",W-M,29,{align:"right"});
      y=50;
      doc.setFont("helvetica","bold");doc.setFontSize(22);doc.setTextColor(13,20,38);
      doc.text("Cartera Calificada",M,y);y+=9;
      doc.setFontSize(11);doc.setFont("helvetica","normal");doc.setTextColor(100,110,130);
      doc.text("Analisis cuantitativo  -  Calificacion S&P / Moodys",M,y);y+=14;
      doc.setDrawColor(220,225,240);doc.setLineWidth(0.4);doc.line(M,y,W-M,y);y+=12;
      if(portfolio){
        doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(100,110,130);
        doc.text("RESUMEN EJECUTIVO",M,y);y+=7;
        const kpis=[
          {l:"Cartera Total",v:fmtM(portfolio.tm)},
          {l:"No. Creditos",v:String(portfolio.count)},
          {l:"Score Promedio",v:fmt(portfolio.avgScore,1)},
          {l:"Tasa Pond.",v:`${fmt(portfolio.avgTasa,1)}%`},
          {l:"Perdida Esperada",v:fmtM(portfolio.tel)},
          {l:"% EL / Cartera",v:`${portfolio.elPct.toFixed(2)}%`},
        ];
        const cw=(W-2*M-8)/2;
        kpis.forEach((k,i)=>{
          const col=i%2,row=Math.floor(i/2),x=M+col*(cw+8),ky=y+row*17;
          doc.setFillColor(248,250,252);doc.roundedRect(x,ky,cw,13,2,2,"F");
          doc.setDrawColor(220,225,235);doc.setLineWidth(0.3);doc.roundedRect(x,ky,cw,13,2,2,"S");
          doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(120,130,150);doc.text(k.l.toUpperCase(),x+4,ky+5);
          doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(13,20,38);doc.text(k.v,x+4,ky+11);
        });
        y+=Math.ceil(kpis.length/2)*17+12;
        doc.setDrawColor(220,225,240);doc.line(M,y,W-M,y);y+=8;
        doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(100,110,130);
        doc.text("DISTRIBUCION POR RATING",M,y);y+=8;
        const ratings=["AAA","AA","A","BBB","BB","B","CCC","CC","D"];
        const rCols:Record<string,[number,number,number]>={AAA:[6,95,70],AA:[6,95,70],A:[5,150,105],BBB:[29,78,216],BB:[217,119,6],B:[234,88,12],CCC:[220,38,38],CC:[153,27,27],D:[127,29,29]};
        const bw2=(W-2*M)/ratings.length-2;
        ratings.forEach((r,i)=>{
          const cnt=portfolio.byR.find(([rt])=>rt===r)?.[1]||0;
          const x=M+i*(bw2+2);
          const[cr,cg,cb]=rCols[r]||[100,100,100];
          const mxH=18;const h2=portfolio.count?Math.max(cnt>0?2:0,(cnt/portfolio.count)*mxH):0;
          if(cnt>0){doc.setFillColor(cr,cg,cb);doc.roundedRect(x,y+mxH-h2,bw2,h2,1,1,"F");}
          doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.setTextColor(cr,cg,cb);doc.text(r,x+bw2/2,y+mxH+4.5,{align:"center"});
          doc.setFont("helvetica","normal");doc.setTextColor(100,110,130);doc.text(String(cnt),x+bw2/2,y+mxH+8.5,{align:"center"});
        });
        y+=34;
      }
      if(credits.length){
        doc.addPage();y=20;
        doc.setFillColor(13,20,38);doc.rect(0,0,W,13,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(240,244,255);
        doc.text("PLINIUS CREDIT OS  -  CARTERA CALIFICADA",M,9);doc.text(date,W-M,9,{align:"right"});
        y=22;
        doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(13,20,38);
        doc.text("Tabla de Creditos Calificados",M,y);y+=8;
        const cols=[{l:"Acreditado",w:42},{l:"Monto",w:24},{l:"Tasa",w:14},{l:"Plazo",w:12},{l:"Mora",w:12},{l:"Sector",w:22},{l:"Score",w:14},{l:"Rating",w:14},{l:"Perd.Esp.",w:22}];
        const rH=7;
        doc.setFillColor(13,20,38);doc.rect(M,y,W-2*M,rH,"F");
        let cx=M;
        cols.forEach(c=>{doc.setFont("helvetica","bold");doc.setFontSize(6);doc.setTextColor(180,190,220);doc.text(c.l.toUpperCase(),cx+2,y+5);cx+=c.w;});
        y+=rH;
        const rClrs:Record<string,[number,number,number]>={AAA:[6,95,70],AA:[6,95,70],A:[5,150,105],BBB:[29,78,216],BB:[217,119,6],B:[234,88,12],CCC:[220,38,38],CC:[153,27,27],D:[127,29,29]};
        credits.slice(0,60).forEach((r,ri)=>{
          if(y>272){doc.addPage();y=20;}
          doc.setFillColor(ri%2===0?250:245,ri%2===0?251:247,ri%2===0?253:251);doc.rect(M,y,W-2*M,rH,"F");
          cx=M;
          const cells=[r.acreditado.substring(0,22),fmtM(r.monto),`${r.tasa.toFixed(1)}%`,`${r.plazo}m`,`${r.mora}d`,r.sector.substring(0,14),String(r.score),r.rating,fmtM(r.el)];
          cells.forEach((cell,ci)=>{
            const[cr2,cg2,cb2]=rClrs[r.rating]||[60,70,90];
            doc.setFont("helvetica",ci===7?"bold":"normal");doc.setFontSize(6.5);
            if(ci===7)doc.setTextColor(cr2,cg2,cb2);
            else if(ci===4&&r.mora>90)doc.setTextColor(220,38,38);
            else doc.setTextColor(30,40,60);
            doc.text(cell,cx+2,y+5);cx+=cols[ci].w;
          });
          y+=rH;
        });
      }
      const np=(doc as any).internal.getNumberOfPages();
      for(let p=1;p<=np;p++){
        doc.setPage(p);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(160,170,190);
        doc.setDrawColor(200,210,230);doc.line(M,285,W-M,285);
        doc.text("Plinius Technologies Mexico LLC  -  plinius.mx  -  Confidencial",M,290);
        doc.text(`Pagina ${p} de ${np}`,W-M,290,{align:"right"});
      }
      doc.save(`plinius_cartera_${new Date().toISOString().slice(0,10)}.pdf`);
      setPdfDone(true);setTimeout(()=>setPdfDone(false),3000);
    }catch(e){console.error(e);alert("Error generando PDF.");}
    setGenPDF(false);
  }

  return (
    <div style={{fontFamily:"DM Sans,system-ui,sans-serif",background:"#F4F6FB",color:"#0D1426",minHeight:"100vh",paddingBottom:60}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid rgba(13,20,38,.09)",padding:"13px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(244,246,251,.97)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <a href="/dashboard" style={{display:"flex",alignItems:"center",gap:5,textDecoration:"none",color:"rgba(13,20,38,.4)",fontSize:13,fontFamily:"JetBrains Mono,monospace"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
            Dashboard
          </a>
          <span style={{color:"rgba(13,20,38,.2)"}}>/</span>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,color:"rgba(13,20,38,.6)"}}>Calculadora</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:"rgba(29,78,216,.06)",border:"1px solid rgba(29,78,216,.15)",borderRadius:8}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#059669",display:"inline-block",animation:"cl-pulse 2s ease-in-out infinite"}}/>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"#1D4ED8"}}>CREDIT ANALYTICS v2</span>
          </div>
          <label className="cl-btn cl-btn-g" style={{cursor:"pointer",fontSize:12,padding:"7px 14px"}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2h8l2 2v10H4V2zM8 6v6M5 9l3-3 3 3"/></svg>
            Subir Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);}}/>
          </label>
        </div>
      </div>

      <div style={{maxWidth:1400,margin:"0 auto",padding:"22px 28px"}}>

        {/* TITLE */}
        <div style={{marginBottom:18}}>
          <h1 style={{fontSize:24,fontWeight:800,letterSpacing:"-0.045em",marginBottom:3}}>
            Valuación de <span className="cl-grad">Cartera de Crédito</span>
          </h1>
          <p style={{fontSize:12,color:"rgba(13,20,38,.38)",fontFamily:"JetBrains Mono,monospace"}}>
            DCF · Risk-Adjusted Returns · Stress Testing · S&P/Moody's Rating
          </p>
        </div>

        {/* TABS */}
        <div style={{display:"inline-flex",background:"rgba(13,20,38,.05)",border:"1px solid rgba(13,20,38,.07)",borderRadius:11,padding:3,gap:2,marginBottom:20}}>
          {(["instrumento","cartera","reporte"] as MainTab[]).map(t=>(
            <button key={t} className={`cl-tab${tab===t?" on":""}`} onClick={()=>setTab(t)} style={{display:"flex",alignItems:"center",gap:6}}>
              {t==="instrumento"?"Instrumento":t==="cartera"?`Cartera${credits.length?` (${credits.length})`:""}` :"Reporte PDF"}
            </button>
          ))}
        </div>

        {/* TAB INSTRUMENTO */}
        {tab==="instrumento" && (
          <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20,alignItems:"start"}}>

            {/* LEFT */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>

              {/* Asset type */}
              <div className="cl-panel">
                <div className="cl-sec">Tipo de activo</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {ASSET_TYPES.map(at=>(
                    <button key={at.id} className={`cl-asset${inp.assetType===at.id?" on":""}`} onClick={()=>set("assetType",at.id)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={inp.assetType===at.id?"#1D4ED8":"rgba(13,20,38,.35)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={at.icon}/></svg>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:inp.assetType===at.id?"#1D4ED8":"rgba(13,20,38,.4)",letterSpacing:".06em",textAlign:"center"}}>{at.label.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Params */}
              <div className="cl-panel" style={{display:"flex",flexDirection:"column",gap:11}}>
                <div className="cl-sec">Parámetros</div>
                {inp.assetType==="revolvente" ? (
                  <>
                    <Field label="LÍNEA TOTAL" value={inp.lineaTotal} onChange={v=>set("lineaTotal",v)} prefix="MXN $" step={100000}/>
                    <Field label="UTILIZACIÓN" value={inp.utilizacion} onChange={v=>set("utilizacion",v)} suffix="%" step={5}/>
                  </>
                ) : inp.assetType==="arrendamiento_puro" ? (
                  <>
                    <Field label="VALOR DEL ACTIVO" value={inp.monto} onChange={v=>set("monto",v)} prefix="MXN $" step={100000}/>
                    <Field label="RENTA MENSUAL" value={inp.rentaMensual} onChange={v=>set("rentaMensual",v)} prefix="MXN $" step={1000}/>
                  </>
                ) : inp.assetType==="arrendamiento_financiero" ? (
                  <>
                    <Field label="VALOR DEL ACTIVO" value={inp.monto} onChange={v=>set("monto",v)} prefix="MXN $" step={100000}/>
                    <Field label="VALOR RESIDUAL" value={inp.valorResidual} onChange={v=>set("valorResidual",v)} suffix="%" step={1}/>
                  </>
                ) : (
                  <Field label="MONTO PRINCIPAL" value={inp.monto} onChange={v=>set("monto",v)} prefix="MXN $" step={100000}/>
                )}
                <Field label="TASA NOMINAL ANUAL" value={inp.tasa} onChange={v=>set("tasa",v)} suffix="% NAE" step={0.1}/>
                <Field label="PLAZO" value={inp.plazoMeses} onChange={v=>set("plazoMeses",v)} suffix="meses" step={1}/>
                <Field label="TASA DE DESCUENTO" value={inp.tasaDescuento} onChange={v=>set("tasaDescuento",v)} suffix="%" step={0.5}/>
              </div>

              {/* Risk */}
              <div className="cl-panel" style={{display:"flex",flexDirection:"column",gap:11}}>
                <div className="cl-sec">Riesgo crediticio</div>
                <Field label="PD — PROB. DEFAULT" value={inp.pd} onChange={v=>set("pd",v)} suffix="%" step={0.1}/>
                <Field label="LGD — PÉRDIDA EN DEFAULT" value={inp.lgd} onChange={v=>set("lgd",v)} suffix="%" step={1}/>
                <div style={{background:"rgba(220,38,38,.04)",border:"1px solid rgba(220,38,38,.1)",borderRadius:8,padding:"9px 12px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.4)"}}>EL ANUALIZADA</span>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"#DC2626",fontWeight:600}}>{((inp.pd/100)*(inp.lgd/100)*100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Stress */}
              <div className="cl-panel">
                <div className="cl-sec">Escenario de estrés</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(["base","moderado","severo","extremo"] as StressScenario[]).map(sc=>(
                    <button key={sc} className={`cl-stress${inp.stressScenario===sc?" on":""}`}
                      style={inp.stressScenario===sc?{background:STRESS_COLORS[sc],borderColor:STRESS_COLORS[sc]}:{}}
                      onClick={()=>set("stressScenario",sc)}>{STRESS_LABELS[sc].toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            {results ? (
              <div style={{display:"flex",flexDirection:"column",gap:12}} className="cl-fade">
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  <KpiCard label="VPN" value={fmtM(results.vpn)} sub={results.vpn>=0?"Valor positivo":"Valor negativo"} color={results.vpn>=0?"#059669":"#DC2626"}/>
                  <KpiCard label="TIR ANUAL" value={`${results.tir.toFixed(2)}%`} sub={`Spread ${results.spreadBps.toFixed(0)} bps`} color="#1D4ED8" delta={results.spreadBps}/>
                  <KpiCard label="DURACIÓN" value={`${results.duration.toFixed(2)} años`} sub={`Conv. ${results.convexity.toFixed(3)}`} color="#7C3AED"/>
                  <KpiCard label="RAROC" value={`${results.riskAdjustedReturn.toFixed(2)}%`} sub="Risk-Adj. Return" color={results.riskAdjustedReturn>=12?"#059669":"#D97706"}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  <KpiCard label="EAD" value={fmtM(results.ead)} sub="Exposure at Default"/>
                  <KpiCard label="PÉRDIDA ESPERADA" value={fmtM(results.expectedLoss)} sub={`PD ${inp.pd}% x LGD ${inp.lgd}%`} color="#DC2626"/>
                  <KpiCard label="PÉRDIDA INESPERADA (1s)" value={fmtM(results.ead*Math.sqrt(inp.pd/100*(1-inp.pd/100))*inp.lgd/100)} sub="Capital economico aprox." color="#D97706"/>
                </div>

                <div className="cl-panel">
                  <div className="cl-sec">Flujos de caja proyectados</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)"}}>{results.cashFlows.length-1} periodos · mensual</span>
                    <div style={{display:"flex",gap:14}}>
                      {[["#059669","Positivo"],["#DC2626","Negativo"]].map(([c,l])=>(
                        <span key={l} style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:c,display:"flex",alignItems:"center",gap:5}}>
                          <span style={{width:7,height:7,borderRadius:2,background:c,display:"inline-block"}}/>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <CFBar flows={results.cashFlows}/>
                </div>

                <div className="cl-panel">
                  <div className="cl-sec">Stress testing — VPN</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                    {(["base","moderado","severo","extremo"] as StressScenario[]).map(sc=>{
                      const val=results.stressVpn[sc];
                      const max=Math.max(...Object.values(results.stressVpn).map(Math.abs),1);
                      const pct=Math.abs(val)/max*50;
                      return(
                        <div key={sc} style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:68,fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",textAlign:"right",flexShrink:0}}>{STRESS_LABELS[sc]}</div>
                          <div style={{flex:1,height:20,background:"rgba(13,20,38,.05)",borderRadius:4,overflow:"hidden",position:"relative"}}>
                            <div style={{position:"absolute",left:"50%",width:`${pct}%`,height:"100%",background:STRESS_COLORS[sc],opacity:.7,borderRadius:4}}/>
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:STRESS_COLORS[sc],fontWeight:600}}>{fmtM(val)}</span>
                            </div>
                          </div>
                          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",width:44,textAlign:"right"}}>{results.stressTir[sc].toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {(["base","moderado","severo","extremo"] as StressScenario[]).map(sc=>(
                      <div key={sc} style={{textAlign:"center",padding:"9px 6px",background:"rgba(13,20,38,.02)",borderRadius:8,border:`1.5px solid ${STRESS_COLORS[sc]}33`}}>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:STRESS_COLORS[sc],letterSpacing:".08em",marginBottom:4}}>{STRESS_LABELS[sc].toUpperCase()}</div>
                        <div style={{fontSize:14,fontWeight:800,color:results.stressVpn[sc]>=0?STRESS_COLORS[sc]:"#DC2626"}}>{fmtM(results.stressVpn[sc])}</div>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.38)",marginTop:2}}>TIR {results.stressTir[sc].toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div className="cl-panel">
                    <div className="cl-sec">Sensibilidad precio</div>
                    {[{l:"-200 bps",dP:results.duration*2-results.convexity*4},{l:"-100 bps",dP:results.duration-results.convexity},{l:"Base",dP:0},{l:"+100 bps",dP:-results.duration+results.convexity},{l:"+200 bps",dP:-results.duration*2+results.convexity*4}].map((row,i)=>(
                      <div key={row.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 9px",background:i===2?"rgba(29,78,216,.04)":"rgba(13,20,38,.015)",borderBottom:i<4?"1px solid rgba(13,20,38,.05)":"none"}}>
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:i<2?"#059669":i>2?"#DC2626":"rgba(13,20,38,.55)"}}>{row.l}</span>
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:600,color:row.dP>=0?"#059669":"#DC2626"}}>{row.dP===0?"—":`${row.dP>=0?"+":""}${row.dP.toFixed(2)}%`}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cl-panel">
                    <div className="cl-sec">Resumen</div>
                    {[
                      {l:"Tipo",v:ASSET_TYPES.find(a=>a.id===inp.assetType)?.label||""},
                      {l:"Monto",v:fmtM(inp.assetType==="revolvente"?inp.lineaTotal:inp.monto)},
                      {l:"Tasa",v:`${inp.tasa}% NAE`},
                      {l:"Plazo",v:`${inp.plazoMeses} meses`},
                      {l:"Desc.",v:`${inp.tasaDescuento}%`},
                      {l:"PD / LGD",v:`${inp.pd}% / ${inp.lgd}%`},
                    ].map((row,i)=>(
                      <div key={row.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 9px",borderBottom:i<5?"1px solid rgba(13,20,38,.05)":"none",background:"rgba(13,20,38,.015)"}}>
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)"}}>{row.l.toUpperCase()}</span>
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.65)",fontWeight:600}}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:400,gap:12}}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="rgba(13,20,38,.14)" strokeWidth="1.5" strokeLinecap="round"><rect x="6" y="6" width="32" height="32" rx="4"/><path d="M14 22h16M22 14v16"/></svg>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"rgba(13,20,38,.38)",marginBottom:5}}>Ingresa los parámetros</div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"rgba(13,20,38,.25)"}}>Monto · Tasa · Plazo</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CARTERA */}
        {tab==="cartera" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <label className="cl-btn cl-btn-p" style={{cursor:"pointer"}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2h8l2 2v10H4V2zM8 6v6M5 9l3-3 3 3"/></svg>
                Subir Excel
                <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);}}/>
              </label>
              <button className="cl-btn cl-btn-g" onClick={()=>setShowAdd(v=>!v)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v12M2 8h12"/></svg>
                Agregar manual
              </button>
              {credits.length>0 && (
                <button className="cl-btn cl-btn-d" onClick={()=>{setCredits([]);setFileName("");}}>
                  Limpiar cartera
                </button>
              )}
              {fileName && <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",background:"rgba(13,20,38,.04)",border:"1px solid rgba(13,20,38,.07)",borderRadius:6,padding:"4px 10px"}}>{fileName}</span>}
            </div>

            {showAdd && (
              <div className="cl-panel cl-fade">
                <div className="cl-sec">Agregar crédito</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
                  <div style={{gridColumn:"span 2"}}>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>ACREDITADO *</label>
                    <input className="cl-inp" placeholder="Nombre del acreditado" value={nc.acreditado} onChange={e=>setNc(p=>({...p,acreditado:e.target.value}))} autoFocus/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>MONTO (MXN)</label>
                    <input className="cl-inp" type="number" placeholder="0" value={nc.monto||""} onChange={e=>setNc(p=>({...p,monto:parseFloat(e.target.value)||0}))}/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>TASA %</label>
                    <input className="cl-inp" type="number" step="0.1" value={nc.tasa||""} onChange={e=>setNc(p=>({...p,tasa:parseFloat(e.target.value)||0}))}/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>PLAZO (MESES)</label>
                    <input className="cl-inp" type="number" value={nc.plazo} onChange={e=>setNc(p=>({...p,plazo:parseInt(e.target.value)||0}))}/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>DIAS MORA</label>
                    <input className="cl-inp" type="number" value={nc.mora} onChange={e=>setNc(p=>({...p,mora:parseInt(e.target.value)||0}))}/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>GARANTIA</label>
                    <input className="cl-inp" placeholder="Hipotecaria, Aval..." value={nc.garantia} onChange={e=>setNc(p=>({...p,garantia:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:"rgba(13,20,38,.38)",letterSpacing:".1em",display:"block",marginBottom:5}}>SECTOR</label>
                    <input className="cl-inp" placeholder="Manufactura..." value={nc.sector} onChange={e=>setNc(p=>({...p,sector:e.target.value}))}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="cl-btn cl-btn-p" onClick={addCredit} disabled={!nc.acreditado.trim()}>Agregar</button>
                  <button className="cl-btn cl-btn-g" onClick={()=>setShowAdd(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {!credits.length && !showAdd && (
              <div className={`cl-drop${dragging?" over":""}`}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)processFile(f);}}
                onClick={()=>{const i=document.createElement("input");i.type="file";i.accept=".xlsx,.xls,.csv";i.onchange=(ev:Event)=>{const f=(ev.target as HTMLInputElement).files?.[0];if(f)processFile(f);};i.click();}}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="rgba(13,20,38,.2)" strokeWidth="1.5" strokeLinecap="round" style={{margin:"0 auto 12px",display:"block"}}><rect x="4" y="4" width="24" height="24" rx="3"/><path d="M10 16h12M16 10v12"/></svg>
                <div style={{fontSize:14,fontWeight:700,color:"#0D1426",marginBottom:5}}>Arrastra tu cartera aquí</div>
                <div style={{fontSize:12,color:"rgba(13,20,38,.38)"}}>o haz click · .xlsx, .xls, .csv · auto-deteccion de columnas</div>
              </div>
            )}

            {portfolio && (
              <div className="cl-fade">
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
                  {[
                    {l:"Cartera Total",v:fmtM(portfolio.tm),c:"#0D1426"},
                    {l:"No. Creditos",v:String(portfolio.count),c:"#1D4ED8"},
                    {l:"Score Prom.",v:fmt(portfolio.avgScore,1),c:"#7C3AED"},
                    {l:"Tasa Pond.",v:`${fmt(portfolio.avgTasa,1)}%`,c:"#0891B2"},
                    {l:"Perdida Esp.",v:fmtM(portfolio.tel),c:"#DC2626"},
                  ].map(k=>(
                    <div key={k.l} style={{background:"#fff",border:"1px solid rgba(13,20,38,.09)",borderRadius:12,padding:"12px 14px",boxShadow:"0 1px 3px rgba(13,20,38,.04)"}}>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.35)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>{k.l}</div>
                      <div style={{fontSize:18,fontWeight:800,letterSpacing:"-0.045em",color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff",border:"1px solid rgba(13,20,38,.09)",borderRadius:12,padding:"13px 15px",marginBottom:10,boxShadow:"0 1px 3px rgba(13,20,38,.04)"}}>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8.5,color:"rgba(13,20,38,.35)",letterSpacing:".12em",marginBottom:9}}>RATING S&P/MOODYS</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    {portfolio.byR.map(([r,c])=>(
                      <button key={r} onClick={()=>setFilterR(filterR===r?"":r)}
                        style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,border:`1.5px solid ${filterR===r?RATING_COLOR[r]:"rgba(13,20,38,.1)"}`,background:filterR===r?RATING_BG[r]:"#fff",cursor:"pointer"}}>
                        <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,fontWeight:700,color:RATING_COLOR[r]}}>{r}</span>
                        <span style={{fontSize:11,color:"rgba(13,20,38,.42)",fontWeight:600}}>{c}</span>
                      </button>
                    ))}
                    {filterR && <button onClick={()=>setFilterR("")} style={{fontSize:11,color:"rgba(13,20,38,.38)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>limpiar</button>}
                  </div>
                </div>
                <div style={{background:"#fff",border:"1px solid rgba(13,20,38,.09)",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(13,20,38,.04)"}}>
                  <div style={{padding:"11px 15px",borderBottom:"1px solid rgba(13,20,38,.07)",fontSize:13,fontWeight:700}}>{sorted.length} creditos{filterR?` · ${filterR}`:""}</div>
                  <div style={{overflowX:"auto"}} className="cl-sc">
                    <table className="cl-tbl">
                      <thead><tr>
                        {([["acreditado","Acreditado"],["monto","Monto"],["tasa","Tasa"],["plazo","Plazo"],["mora","Mora"],["garantia","Garantia"],["sector","Sector"],["score","Score"],["rating","Rating"],["el","EL"],["vpn","NPV"]] as [keyof CreditRow,string][]).map(([col,lbl])=>(
                          <th key={col}><button style={{background:"none",border:"none",cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:9,color:"rgba(13,20,38,.35)",letterSpacing:".1em",textTransform:"uppercase",padding:0}} onClick={()=>togSort(col)}>{lbl}{sortC===col?(sortD==="desc"?" ↓":" ↑"):""}</button></th>
                        ))}
                        <th></th>
                      </tr></thead>
                      <tbody>
                        {sorted.map(r=>(
                          <tr key={r.id}>
                            <td style={{fontWeight:600,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.acreditado}</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>{fmtM(r.monto)}</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>{fmt(r.tasa,1)}%</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12}}>{r.plazo}m</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:r.mora>90?"#DC2626":r.mora>30?"#D97706":"rgba(13,20,38,.45)"}}>{r.mora}d</td>
                            <td style={{fontSize:11,color:"rgba(13,20,38,.45)",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.garantia||"—"}</td>
                            <td style={{fontSize:11,color:"rgba(13,20,38,.45)"}}>{r.sector||"—"}</td>
                            <td>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:32,height:4,borderRadius:2,background:"rgba(13,20,38,.07)",overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${r.score}%`,background:r.score>=70?"#059669":r.score>=50?"#D97706":"#DC2626",borderRadius:2}}/>
                                </div>
                                <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{r.score}</span>
                              </div>
                            </td>
                            <td><span className="cl-rt" style={{background:RATING_BG[r.rating]||"#F3F4F6",color:RATING_COLOR[r.rating]||"#374151"}}>{r.rating}</span></td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:"#DC2626"}}>{fmtM(r.el)}</td>
                            <td style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:r.vpn>=r.monto?"#059669":"#DC2626",fontWeight:600}}>{fmtM(r.vpn)}</td>
                            <td><button onClick={()=>removeCredit(r.id)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(13,20,38,.22)",fontSize:16}}>×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB REPORTE */}
        {tab==="reporte" && (
          <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700}}>
            <div className="cl-panel">
              <div className="cl-sec">Contenido del reporte</div>
              {[
                {icon:"M4 2h8l2 2v10H4V2z",title:"Portada institucional",desc:"Logo Plinius, fecha, confidencial"},
                {icon:"M2 8h12M6 4l4 4-4 4",title:"Resumen ejecutivo",desc:"KPIs: cartera total, score, EL, tasa ponderada"},
                {icon:"M2 12L6 7l3 3 3-4 2 2",title:"Distribucion por rating",desc:"Grafica S&P/Moodys: AAA hasta D"},
                {icon:"M2 2h12v12H2z",title:"Tabla de creditos",desc:"Hasta 60 creditos con rating, EL y NPV individual"},
              ].map(item=>(
                <div key={item.title} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:"1px solid rgba(13,20,38,.05)"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:"rgba(29,78,216,.06)",border:"1px solid rgba(29,78,216,.1)",display:"grid",placeItems:"center",flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#1D4ED8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{item.title}</div>
                    <div style={{fontSize:12,color:"rgba(13,20,38,.42)"}}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(29,78,216,.04)",border:"1px solid rgba(29,78,216,.1)",borderRadius:11,padding:"13px 16px",fontSize:13,color:"rgba(13,20,38,.55)"}}>
              {credits.length ? <><span style={{fontWeight:700,color:"#059669"}}>{credits.length} creditos cargados</span> · Reporte listo</> : <><span style={{color:"#D97706",fontWeight:700}}>Sin cartera</span> · Carga un Excel o agrega creditos manuales</>}
            </div>
            <button onClick={generatePDF} disabled={genPDF}
              style={{padding:"13px 26px",background:pdfDone?"#059669":"linear-gradient(135deg,#7C3AED,#1D4ED8)",color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:9,alignSelf:"flex-start",boxShadow:"0 4px 14px rgba(29,78,216,.3)",opacity:genPDF?.7:1}}>
              {genPDF ? <><svg style={{animation:"cl-spin .7s linear infinite"}} width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Generando...</>
              : pdfDone ? <>Descargado!</>
              : <><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2v8M5 7l3 3 3-3M2 12h12"/></svg>Generar Cartera Calificada PDF</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
