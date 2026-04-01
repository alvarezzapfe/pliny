"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { deriveKey, encryptMsg, decryptMsg } from "@/lib/chatCrypto";

type Conv = {
  id: string; otorgante_id: string; solicitante_id: string;
  solicitante_empresa: string | null; otorgante_email: string | null;
  last_message_at: string; unread?: number; last_msg?: string;
};
type Msg = {
  id: string; conversacion_id: string; sender_id: string;
  content: string; iv: string | null; created_at: string;
  leido: boolean; decrypted?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("es-MX", { day:"numeric", month:"short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });
}
function initials(name: string) {
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}

const keyCache = new Map<string, CryptoKey>();
async function getKey(convId: string, uid1: string, uid2: string): Promise<CryptoKey> {
  if (keyCache.has(convId)) return keyCache.get(convId)!;
  const key = await deriveKey(convId, uid1, uid2);
  keyCache.set(convId, key);
  return key;
}
async function decryptAll(msgs: Msg[], convId: string, uid1: string, uid2: string): Promise<Msg[]> {
  const key = await getKey(convId, uid1, uid2);
  return Promise.all(msgs.map(async m => {
    if (!m.iv) return { ...m, decrypted: m.content };
    const text = await decryptMsg(m.content, m.iv, key);
    return { ...m, decrypted: text };
  }));
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  textarea{resize:none;font-family:'Geist',sans-serif;}
  textarea:focus{outline:none;}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:999px}
  ::-webkit-scrollbar-thumb:hover{background:#CBD5E1}
  .conv-item{cursor:pointer;transition:background .1s;border-left:3px solid transparent;}
  .conv-item:hover{background:#F1F5F9;}
  .conv-item.active{background:#EFF6FF;border-left-color:#0B1F4B;}
  .send-btn:hover{transform:scale(1.05);}
`;

function ChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("conv");

  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState("free");
  const [role, setRole] = useState<string|null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<Conv|null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUser(auth.user); userRef.current = auth.user;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("plinius_profiles").select("plan").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle(),
      ]);
      setPlan(p?.plan || "free");
      setRole(r?.role || null);
      await loadConvs(auth.user.id, r?.role || null);
      setLoading(false);
    })();
  }, [router]);

  async function loadConvs(uid: string, userRole: string|null) {
    const field = userRole === "otorgante" ? "otorgante_id" : "solicitante_id";
    const { data: cs } = await supabase.from("conversaciones").select("*").eq(field, uid).order("last_message_at", { ascending: false });
    if (!cs) return;
    const enriched = await Promise.all(cs.map(async c => {
      const [{ count }, { data: lastMsgs }] = await Promise.all([
        supabase.from("mensajes").select("*", { count:"exact", head:true }).eq("conversacion_id", c.id).eq("leido", false).neq("sender_id", uid),
        supabase.from("mensajes").select("content,iv").eq("conversacion_id", c.id).order("created_at", { ascending:false }).limit(1),
      ]);
      let lastMsgText = "Sin mensajes aún";
      if (lastMsgs?.[0]) {
        const lm = lastMsgs[0];
        if (lm.iv) {
          try { const key = await getKey(c.id, c.otorgante_id, c.solicitante_id); lastMsgText = await decryptMsg(lm.content, lm.iv, key); }
          catch { lastMsgText = "🔒 Mensaje cifrado"; }
        } else { lastMsgText = lm.content; }
      }
      return { ...c, unread: count ?? 0, last_msg: lastMsgText };
    }));
    setConvs(enriched);
    if (preselect) {
      const found = enriched.find(c => c.id === preselect);
      if (found) selectConv(found, uid);
    } else if (enriched.length > 0) {
      selectConv(enriched[0], uid);
    }
  }

  async function selectConv(conv: Conv, uid?: string) {
    setActiveConv(conv); setMsgsLoading(true);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const { data: ms } = await supabase.from("mensajes").select("*").eq("conversacion_id", conv.id).order("created_at", { ascending: true });
    const myId = uid || userRef.current?.id;
    const decrypted = await decryptAll(ms ?? [], conv.id, conv.otorgante_id, conv.solicitante_id);
    setMsgs(decrypted); setMsgsLoading(false);
    if (myId) {
      await supabase.from("mensajes").update({ leido:true, leido_at:new Date().toISOString() }).eq("conversacion_id", conv.id).eq("leido", false).neq("sender_id", myId);
      setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread:0 } : c));
    }
    const channel = supabase.channel(`chat:${conv.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"mensajes", filter:`conversacion_id=eq.${conv.id}` }, async payload => {
        const raw = payload.new as Msg;
        let decryptedText = raw.content;
        if (raw.iv) {
          try { const key = await getKey(conv.id, conv.otorgante_id, conv.solicitante_id); decryptedText = await decryptMsg(raw.content, raw.iv, key); }
          catch { decryptedText = "🔒 Mensaje cifrado"; }
        }
        const newMsg = { ...raw, decrypted: decryptedText };
        setMsgs(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        const currentUser = userRef.current;
        if (newMsg.sender_id !== currentUser?.id) {
          supabase.from("mensajes").update({ leido:true, leido_at:new Date().toISOString() }).eq("id", newMsg.id).then(() => {});
        }
        setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, last_msg:decryptedText, last_message_at:newMsg.created_at } : c));
      }).subscribe();
    channelRef.current = channel;
  }

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function sendMsg() {
    if (!input.trim() || !activeConv || sending) return;
    const plaintext = input.trim();
    setInput(""); setSending(true);
    try {
      const key = await getKey(activeConv.id, activeConv.otorgante_id, activeConv.solicitante_id);
      const { content, iv } = await encryptMsg(plaintext, key);
      const { error } = await supabase.from("mensajes").insert({ conversacion_id:activeConv.id, sender_id:user.id, content, iv });
      if (!error) await supabase.from("conversaciones").update({ last_message_at:new Date().toISOString() }).eq("id", activeConv.id);
    } catch(e) { console.error(e); }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  }

  const isOtorgante = role === "otorgante";
  const isPro = plan === "pro";
  const totalUnread = convs.reduce((s,c) => s + (c.unread||0), 0);
  const otherName = (conv: Conv) => isOtorgante ? (conv.solicitante_empresa || "Solicitante") : (conv.otorgante_email?.split("@")[0] || "Otorgante");

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", display:"grid", placeItems:"center" }}>
      <style>{CSS}</style>
      <svg style={{ animation:"spin .8s linear infinite" }} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M10 2a8 8 0 018 8"/></svg>
    </div>
  );

  return (
    <div style={{ height:"calc(100vh - 60px)", background:"#F8FAFC", fontFamily:"'Geist',sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{CSS}</style>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:280, background:"#fff", borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          {/* Sidebar header */}
          <div style={{ padding:"16px 18px 12px", borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#0B1F4B" }}>
                Mensajes
                {totalUnread > 0 && <span style={{ marginLeft:8, fontSize:10, fontWeight:700, background:"#0B1F4B", color:"#fff", borderRadius:999, padding:"2px 7px" }}>{totalUnread}</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:6, background:"#F0FDF4", border:"1px solid #BBF7D0" }}>
                <svg width={8} height={8} viewBox="0 0 10 10" fill="none"><rect x="2" y="4" width="6" height="5" rx="1" stroke="#059669" strokeWidth="1.2"/><path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke="#059669" strokeWidth="1.2"/></svg>
                <span style={{ fontSize:9, color:"#059669", fontWeight:700, fontFamily:"monospace" }}>E2E</span>
              </div>
            </div>
          </div>

          {/* Conv list */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {convs.length === 0 ? (
              <div style={{ padding:32, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
                <div style={{ fontSize:12, color:"#94A3B8" }}>{isOtorgante ? "Inicia desde el marketplace" : "Aún no tienes mensajes"}</div>
                {isOtorgante && (
                  <button onClick={() => router.push("/dashboard/marketplace")}
                    style={{ marginTop:14, height:32, padding:"0 14px", borderRadius:8, border:"none", background:"#0B1F4B", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    Ir al marketplace →
                  </button>
                )}
              </div>
            ) : convs.map(conv => {
              const name = otherName(conv);
              const isActive = activeConv?.id === conv.id;
              return (
                <div key={conv.id} className={`conv-item${isActive ? " active" : ""}`}
                  onClick={() => selectConv(conv)}
                  style={{ padding:"12px 16px", borderBottom:"1px solid #F8FAFC" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {/* Avatar */}
                    <div style={{ width:38, height:38, borderRadius:"50%", background: isActive ? "#0B1F4B" : "#E2E8F0", display:"grid", placeItems:"center", flexShrink:0 }}>
                      <span style={{ fontSize:12, fontWeight:700, color: isActive ? "#fff" : "#64748B" }}>{initials(name)}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#0F172A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{name}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                          {(conv.unread||0) > 0 && <span style={{ width:18, height:18, borderRadius:"50%", background:"#0B1F4B", color:"#fff", fontSize:9, fontWeight:900, display:"grid", placeItems:"center" }}>{conv.unread}</span>}
                          <span style={{ fontSize:10, color:"#94A3B8" }}>{timeAgo(conv.last_message_at)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:"#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{conv.last_msg || "Sin mensajes aún"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#F8FAFC", minHeight:0 }}>
          {!activeConv ? (
            <div style={{ flex:1, display:"grid", placeItems:"center" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
                <div style={{ fontSize:14, fontWeight:600, color:"#475569" }}>Selecciona una conversación</div>
                <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Elige un contacto de la lista</div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding:"12px 20px", borderBottom:"1px solid #E2E8F0", background:"#fff", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#0B1F4B", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{initials(otherName(activeConv))}</span>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0B1F4B" }}>{otherName(activeConv)}</div>
                  <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"monospace" }}>
                    {isOtorgante ? activeConv.solicitante_id.slice(0,8)+"…" : activeConv.otorgante_email}
                  </div>
                </div>
                <div style={{ flex:1 }}/>
                <button onClick={() => router.push("/dashboard/marketplace")}
                  style={{ height:30, padding:"0 12px", borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#64748B", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  Ver solicitud
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", minHeight:0, display:"flex", flexDirection:"column", gap:4 }}>
                {msgsLoading ? (
                  <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
                    <svg style={{ animation:"spin .7s linear infinite" }} width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                  </div>
                ) : msgs.length === 0 ? (
                  <div style={{ flex:1, display:"grid", placeItems:"center" }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>👋</div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#475569" }}>Sé el primero en escribir</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {msgs.map((msg, i) => {
                      const isMine = msg.sender_id === user?.id;
                      const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(msgs[i-1].created_at).toDateString();
                      const showSender = i === 0 || msgs[i-1].sender_id !== msg.sender_id;
                      const displayText = msg.decrypted ?? msg.content;
                      return (
                        <div key={msg.id} style={{ animation:"msgIn .2s cubic-bezier(.16,1,.3,1) both" }}>
                          {showDate && (
                            <div style={{ textAlign:"center", margin:"12px 0 8px" }}>
                              <span style={{ fontSize:10, color:"#94A3B8", background:"#E2E8F0", borderRadius:999, padding:"3px 12px", fontFamily:"monospace" }}>
                                {new Date(msg.created_at).toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })}
                              </span>
                            </div>
                          )}
                          <div style={{ display:"flex", justifyContent:isMine?"flex-end":"flex-start", marginBottom:2 }}>
                            <div style={{ maxWidth:"68%" }}>
                              <div style={{
                                padding:"10px 14px",
                                borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                background: isMine ? "#0B1F4B" : "#fff",
                                border: isMine ? "none" : "1px solid #E2E8F0",
                                boxShadow: isMine ? "0 2px 8px rgba(11,31,75,.2)" : "0 1px 3px rgba(0,0,0,.06)",
                              }}>
                                <div style={{ fontSize:13, color: isMine ? "#fff" : "#1E293B", lineHeight:1.5, wordBreak:"break-word" }}>{displayText}</div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:isMine?"flex-end":"flex-start", marginTop:3, paddingLeft:isMine?0:4, paddingRight:isMine?4:0 }}>
                                <span style={{ fontSize:10, color:"#94A3B8" }}>{fmtTime(msg.created_at)}</span>
                                {isMine && <span style={{ fontSize:10, color: msg.leido ? "#059669" : "#94A3B8" }}>{msg.leido?"✓✓":"✓"}</span>}
                                {msg.iv && <span style={{ fontSize:9, color:"#CBD5E1" }}>🔒</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={msgsEndRef}/>
                  </>
                )}
              </div>

              {/* Input */}
              <div style={{ padding:"12px 20px 16px", borderTop:"1px solid #E2E8F0", background:"#fff", flexShrink:0 }}>
                {isOtorgante && !isPro ? (
                  <div style={{ padding:"12px 16px", borderRadius:12, background:"#EFF6FF", border:"1px solid #BFDBFE", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#1E40AF" }}>Necesitas Pro para enviar mensajes</span>
                    <button onClick={() => router.push("/pricing")}
                      style={{ height:30, padding:"0 14px", borderRadius:8, border:"none", background:"#1E40AF", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Upgrade →
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                    <div style={{ flex:1, background:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:14, padding:"10px 14px", transition:"border-color .15s" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor="#0B1F4B")}
                      onBlur={(e) => (e.currentTarget.style.borderColor="#E2E8F0")}>
                      <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje… (Enter para enviar)" rows={1}
                        style={{ width:"100%", background:"transparent", border:"none", color:"#1E293B", fontSize:13, lineHeight:1.5, maxHeight:120, overflowY:"auto" }}/>
                    </div>
                    <button onClick={sendMsg} disabled={!input.trim()||sending} className="send-btn"
                      style={{ width:42, height:42, borderRadius:12, border:"none", flexShrink:0,
                        background: input.trim() ? "#0B1F4B" : "#E2E8F0",
                        cursor: input.trim() ? "pointer" : "not-allowed",
                        display:"grid", placeItems:"center", transition:"all .15s", opacity:sending?0.6:1 }}>
                      {sending ? (
                        <svg style={{ animation:"spin .6s linear infinite" }} width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M7 1a6 6 0 016 6"/></svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={input.trim()?"#fff":"#94A3B8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2L2 7l5 1.5M14 2l-5 12-2-5.5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div style={{ marginTop:6, fontSize:9, color:"#CBD5E1", textAlign:"center", fontFamily:"monospace" }}>
                  Enter para enviar · Shift+Enter nueva línea · 🔒 cifrado extremo a extremo
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#F8FAFC", display:"grid", placeItems:"center" }}>
        <svg style={{ animation:"spin .8s linear infinite" }} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M10 2a8 8 0 018 8"/></svg>
      </div>
    }>
      <ChatInner/>
    </Suspense>
  );
}
