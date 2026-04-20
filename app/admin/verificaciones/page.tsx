"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const STATUS_CFG: Record<string,{label:string;bg:string;color:string}> = {
  pending_approval:  {label:"Pend. aprobacion", bg:"#FFFBEB", color:"#92400E"},
  pending_payment:   {label:"Pend. pago",       bg:"#FFF7ED", color:"#C2410C"},
  approved:          {label:"Aprobado",         bg:"#EFF6FF", color:"#1E40AF"},
  payment_confirmed: {label:"Pago confirmado",  bg:"#F5F3FF", color:"#5B21B6"},
  link_enviado:      {label:"Link enviado",     bg:"#F0FDF9", color:"#065F46"},
  processing:        {label:"En proceso",       bg:"#EDE9FE", color:"#5B21B6"},
  completed:         {label:"Completado",       bg:"#ECFDF5", color:"#065F46"},
  failed:            {label:"Fallido",          bg:"#FFF1F2", color:"#9F1239"},
};

function Ic({d,s=15,c="currentColor"}:{d:string;s?:number;c?:string}){
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function fmtDate(iso:string){
  if(!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
}

export default function VerificacionesAdminPage(){
  const router = useRouter();
  const [requests,     setRequests]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<any>(null);
  const [updating,     setUpdating]     = useState(false);
  const [notas,        setNotas]        = useState("");
  const [ekatenaLink,  setEkatenaLink]  = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userId,       setUserId]       = useState<string|null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [notifying,    setNotifying]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    (async()=>{
      const {data:auth} = await supabase.auth.getUser();
      if(!auth.user){router.push("/login");return;}
      setUserId(auth.user.id);
      await loadRequests();
    })();
  },[]);

  async function loadRequests(){
    setLoading(true);
    const {data,error} = await supabase
      .from("ekatena_requests")
      .select("*, borrowers_profile(company_name,rep_first_names,rep_last_name)")
      .order("created_at",{ascending:false});
    if(!error&&data) setRequests(data);
    setLoading(false);
  }

  async function updateStatus(id:string, status:string, extra?:any){
    setUpdating(true);
    const patch:any = {status, updated_at:new Date().toISOString(), ...(extra??{})};
    if(notas)  patch.notas_admin = notas;
    if(userId) patch.approved_by = userId;
    if(status==="approved")          patch.approved_at = new Date().toISOString();
    if(status==="payment_confirmed") patch.paid_at     = new Date().toISOString();
    if(status==="completed")         patch.approved_at = new Date().toISOString();
    await supabase.from("ekatena_requests").update(patch).eq("id",id);
    if(status==="completed"){
      const req = requests.find(r=>r.id===id);
      if(req?.owner_id){
        await supabase.from("borrowers_profile").update({
          ekatena_verificado:true, ekatena_consulta_id:id,
          ekatena_at:new Date().toISOString(), updated_at:new Date().toISOString(),
        }).eq("owner_id",req.owner_id);
      }
    }
    await loadRequests();
    setSelected(null); setNotas(""); setEkatenaLink(""); setUpdating(false);
  }

  async function enviarLinkEkatena(id:string){
    if(!ekatenaLink.trim()) return;
    setNotifying(true);
    const res = await fetch("/api/ekatena/notify",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id, ekatena_link:ekatenaLink.trim(), notas_admin:notas||undefined}),
    });
    const data = await res.json();
    if(data.ok){
      await updateStatus(id,"completed",{ekatena_link:ekatenaLink.trim()});
    }
    setNotifying(false);
  }

  async function uploadPDF(id:string, file:File){
    setUploading(true);
    const fd = new FormData();
    fd.append("file",file); fd.append("id",id);
    const res = await fetch("/api/ekatena/reporte",{method:"POST",body:fd});
    const data = await res.json();
    if(data.ok){ await loadRequests(); setSelected(null); }
    setUploading(false);
  }

  const filtered = filterStatus==="all" ? requests : requests.filter(r=>r.status===filterStatus);

  const CSS = `
    @import url("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap");
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
    .spinner{animation:spin .7s linear infinite}
    .row{display:grid;grid-template-columns:1fr 80px 140px 100px 180px;align-items:center;padding:12px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;gap:8px;}
    .row:hover{background:#F7FDF9;}
    .btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:8px;font-family:Geist,sans-serif;font-size:12px;font-weight:700;padding:7px 12px;cursor:pointer;transition:all .15s;white-space:nowrap;}
    .btn:disabled{opacity:.5;cursor:not-allowed;}
    .btn-green{background:linear-gradient(135deg,#064E3B,#059669);color:#fff;box-shadow:0 2px 8px rgba(6,78,59,.2);}
    .btn-blue{background:#EFF6FF;color:#1E40AF;}
    .btn-amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;}
    .btn-purple{background:#F5F3FF;color:#5B21B6;}
    .btn-gray{background:#F8FAFC;color:#475569;border:1px solid #E2E8F0;}
    .btn-red{background:#FFF1F2;color:#9F1239;}
    textarea,.inp-text{width:100%;border:1.5px solid #E2E8F0;border-radius:10px;padding:10px 14px;font-family:Geist,sans-serif;font-size:13px;color:#0F172A;outline:none;resize:vertical;}
    textarea:focus,.inp-text:focus{border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.10);}
    .inp-text{height:44px;resize:none;padding:10px 14px;}
  `;

  return(
    <div style={{fontFamily:"Geist,sans-serif",color:"#0F172A",padding:24}}>
      <style>{CSS}</style>
      <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}}
        onChange={e=>{const f=e.target.files?.[0];if(f&&selected) uploadPDF(selected.id,f);e.target.value="";}}/>

      <div className="fade" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.04em",marginBottom:4}}>Verificaciones Ekatena</div>
          <div style={{fontSize:12,color:"#94A3B8"}}>Aprueba, gestiona pagos y entrega reportes · $400 MXN c/u</div>
        </div>
        <button onClick={loadRequests} className="btn btn-gray"><Ic d="M2 8a6 6 0 0110.9-3M14 8a6 6 0 01-10.9 3" s={13}/> Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="fade" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
        {[
          {label:"Pend. aprobacion", val:requests.filter(r=>r.status==="pending_approval").length,  color:"#92400E",bg:"#FFFBEB"},
          {label:"Aprobados",        val:requests.filter(r=>r.status==="approved").length,           color:"#1E40AF",bg:"#EFF6FF"},
          {label:"Pago confirmado",  val:requests.filter(r=>r.status==="payment_confirmed").length,  color:"#5B21B6",bg:"#F5F3FF"},
          {label:"Procesando",       val:requests.filter(r=>r.status==="processing").length,         color:"#5B21B6",bg:"#F5F3FF"},
          {label:"Completados",      val:requests.filter(r=>r.status==="completed").length,          color:"#065F46",bg:"#ECFDF5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,border:`1px solid ${k.color}20`,borderRadius:12,padding:"10px 12px"}}>
            <div style={{fontSize:9,fontWeight:700,color:k.color,fontFamily:"Geist Mono,monospace",letterSpacing:".08em",marginBottom:4}}>{k.label.toUpperCase()}</div>
            <div style={{fontSize:24,fontWeight:900,color:k.color,fontFamily:"Geist Mono,monospace"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["all","pending_approval","approved","payment_confirmed","processing","completed","failed"].map(f=>(
          <button key={f} onClick={()=>setFilterStatus(f)}
            style={{padding:"5px 12px",borderRadius:999,border:`1px solid ${filterStatus===f?"#059669":"#E2E8F0"}`,background:filterStatus===f?"#ECFDF5":"#fff",color:filterStatus===f?"#065F46":"#64748B",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Geist Mono,monospace"}}>
            {f==="all"?"Todos":STATUS_CFG[f]?.label??f}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{background:"#fff",border:"1px solid #E8EDF5",borderRadius:14,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 80px 140px 100px 180px",padding:"10px 16px",background:"#F8FAFC",borderBottom:"1px solid #E8EDF5",gap:8}}>
          {["Empresa / RFC","Monto","Estado","Fecha","Acciones"].map(h=>(
            <div key={h} style={{fontSize:10,fontWeight:700,color:"#94A3B8",fontFamily:"Geist Mono,monospace",letterSpacing:".06em"}}>{h}</div>
          ))}
        </div>
        {loading?(
          <div style={{padding:32,display:"flex",justifyContent:"center"}}>
            <svg className="spinner" width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
          </div>
        ):filtered.length===0?(
          <div style={{padding:40,textAlign:"center",color:"#94A3B8",fontSize:13}}>Sin solicitudes</div>
        ):filtered.map((req,i)=>{
          const cfg=STATUS_CFG[req.status]??STATUS_CFG.pending_approval;
          return(
            <div key={req.id} className="row" onClick={()=>{setSelected(req);setNotas(req.notas_admin??"");setEkatenaLink(req.ekatena_link??"");}}
              style={{animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${i*40}ms both`}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{req.borrowers_profile?.company_name??"—"}</div>
                <div style={{fontSize:10,color:"#94A3B8",fontFamily:"Geist Mono,monospace"}}>{req.rfc}</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,fontFamily:"Geist Mono,monospace",color:"#059669"}}>${req.amount}</div>
              <div><span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:999,background:cfg.bg,color:cfg.color,fontFamily:"Geist Mono,monospace"}}>{cfg.label}</span></div>
              <div style={{fontSize:11,color:"#94A3B8"}}>{fmtDate(req.created_at)}</div>
              <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {req.status==="pending_approval"&&(
                  <button className="btn btn-green" onClick={()=>updateStatus(req.id,"approved")} disabled={updating}>Aprobar</button>
                )}
                {req.status==="pending_payment"&&(
                  <button className="btn btn-green" onClick={()=>updateStatus(req.id,"approved")} disabled={updating}>Aprobar</button>
                )}
                {req.status==="approved"&&(
                  <button className="btn btn-amber" onClick={()=>updateStatus(req.id,"payment_confirmed")} disabled={updating}>Confirmar pago</button>
                )}
                {req.status==="payment_confirmed"&&(
                  <button className="btn btn-purple" onClick={()=>{setSelected(req);setNotas(req.notas_admin??"");setEkatenaLink(req.ekatena_link??"");}} disabled={updating}>Enviar link</button>
                )}
                {req.status==="link_enviado"&&(
                  <button className="btn btn-green" onClick={()=>{setSelected(req);setNotas(req.notas_admin??"");setEkatenaLink(req.ekatena_link??"");}} disabled={uploading}>Subir PDF</button>
                )}
                {req.status==="processing"&&(
                  <button className="btn btn-green" onClick={()=>{setSelected(req);setNotas(req.notas_admin??"");setEkatenaLink(req.ekatena_link??"");}} disabled={uploading}>Subir PDF</button>
                )}
                {req.status==="completed"&&(
                  <button className="btn btn-gray" onClick={()=>{setSelected(req);setNotas(req.notas_admin??"");setEkatenaLink(req.ekatena_link??"");}}>Ver</button>
                )}
                {req.status==="failed"&&(
                  <button className="btn btn-amber" onClick={()=>updateStatus(req.id,"pending_approval")} disabled={updating}>Reactivar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer */}
      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:50,display:"flex",justifyContent:"flex-end"}}
          onClick={()=>{setSelected(null);setEkatenaLink("");}}>
          <div style={{width:460,background:"#fff",height:"100vh",overflowY:"auto",padding:28,boxShadow:"-4px 0 30px rgba(0,0,0,.1)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800}}>Detalle de solicitud</div>
              <button onClick={()=>{setSelected(null);setEkatenaLink("");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#94A3B8"}}>✕</button>
            </div>

            {/* Info */}
            <div style={{background:"#F8FAFC",border:"1px solid #E8EDF5",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
              {[
                ["ID",      selected.id.slice(0,8).toUpperCase()],
                ["RFC",     selected.rfc],
                ["Empresa", selected.borrowers_profile?.company_name??"—"],
                ["Rep.",    [selected.borrowers_profile?.rep_first_names,selected.borrowers_profile?.rep_last_name].filter(Boolean).join(" ")||"—"],
                ["Monto",   `$${selected.amount} MXN`],
                ["Status",  STATUS_CFG[selected.status]?.label??selected.status],
                ["Creado",  fmtDate(selected.created_at)],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F1F5F9"}}>
                  <span style={{fontSize:11,color:"#94A3B8"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:600,fontFamily:"Geist Mono,monospace"}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Link Ekatena */}
            {["payment_confirmed","link_enviado","processing","completed"].includes(selected.status)&&(
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748B",display:"block",marginBottom:6,letterSpacing:".04em"}}>LINK REPORTE EKATENA</label>
                <input
                  className="inp-text"
                  value={ekatenaLink}
                  onChange={e=>setEkatenaLink(e.target.value)}
                  placeholder="https://app.ekatena.com/reporte/..."
                  style={{width:"100%",height:44,border:"1.5px solid #E2E8F0",borderRadius:10,padding:"0 14px",fontFamily:"Geist,sans-serif",fontSize:13,color:"#0F172A",outline:"none"}}
                />
                {selected.status!=="completed"&&(
                  <button className="btn btn-green" style={{width:"100%",justifyContent:"center",padding:"12px",marginTop:8}}
                    onClick={()=>enviarLinkEkatena(selected.id)} disabled={notifying||!ekatenaLink.trim()}>
                    {notifying
                      ? <><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Enviando...</>
                      : <><Ic d="M2 3h12l-6 7zM2 3l6 7v6" s={13} c="#fff"/> Enviar link por email al cliente</>
                    }
                  </button>
                )}
                {ekatenaLink&&selected.status==="completed"&&(
                  <a href={ekatenaLink} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",display:"block",marginTop:8}}>
                    <button className="btn btn-gray" style={{width:"100%",justifyContent:"center",padding:"10px"}}>
                      <Ic d="M4 2h8l2 2v10H4zM4 2v12" s={13}/> Ver reporte
                    </button>
                  </a>
                )}
              </div>
            )}

            {/* PDF upload */}
            {["payment_confirmed","link_enviado","processing","completed"].includes(selected.status)&&(
              <div style={{marginBottom:16,padding:"14px 16px",background:"#F8FAFF",border:"1px solid #EEF2FF",borderRadius:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:".04em",marginBottom:10}}>SUBIR REPORTE PDF AL BUCKET</div>
                <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,lineHeight:1.6}}>Descarga el reporte de Ekatena y subelo aqui para que el cliente pueda descargarlo desde su perfil.</div>
                <button className="btn btn-green" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>fileRef.current?.click()} disabled={uploading}>
                  {uploading
                    ? <><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Subiendo PDF...</>
                    : "Subir reporte PDF al bucket"
                  }
                </button>
              </div>
            )}

            {selected.reporte_url&&(
              <div style={{marginBottom:16,padding:"12px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#065F46",marginBottom:8}}>PDF DISPONIBLE</div>
                <a href={selected.reporte_url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                  <button className="btn btn-green" style={{width:"100%",justifyContent:"center",padding:"10px"}}>
                    Descargar reporte PDF
                  </button>
                </a>
              </div>
            )}

            {/* Notas */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748B",display:"block",marginBottom:6,letterSpacing:".04em"}}>NOTAS INTERNAS</label>
              <textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Notas para el expediente..." style={{minHeight:72}}/>
            </div>

            {/* Acciones */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["pending_approval","pending_payment"].includes(selected.status)&&(
                <button className="btn btn-green" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>updateStatus(selected.id,"approved")} disabled={updating}>
                  Aprobar solicitud
                </button>
              )}
              {selected.status==="approved"&&(
                <button className="btn btn-amber" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>updateStatus(selected.id,"payment_confirmed")} disabled={updating}>
                  Confirmar pago recibido
                </button>
              )}
              {notas&&notas!==selected.notas_admin&&(
                <button className="btn btn-gray" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>updateStatus(selected.id,selected.status)} disabled={updating}>
                  Guardar notas
                </button>
              )}
              {!["failed","completed"].includes(selected.status)&&(
                <button className="btn btn-red" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>updateStatus(selected.id,"failed")} disabled={updating}>
                  Marcar como fallido
                </button>
              )}
              {selected.status==="failed"&&(
                <button className="btn btn-amber" style={{width:"100%",justifyContent:"center",padding:"12px"}}
                  onClick={()=>updateStatus(selected.id,"pending_approval")} disabled={updating}>
                  Reactivar solicitud
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
