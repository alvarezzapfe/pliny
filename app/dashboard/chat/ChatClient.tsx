"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { deriveKey, encryptMsg, decryptMsg } from "@/lib/chatCrypto";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

type Convo = {
  solicitud_id: string;
  solicitud_destino: string;
  solicitud_monto: number;
  other_id: string;
  last_msg: string;
  last_at: string;
  unread: number;
};

type Msg = {
  id: string;
  sender_id: string;
  content: string;
  iv: string;
  created_at: string;
  decrypted?: string;
};

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function ChatClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const initSolicitudId = sp.get("solicitud");
  const initOtherId = sp.get("other");

  const [userId, setUserId] = useState<string | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeConvo, setActiveConvo] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUserId(auth.user.id);
      await loadConvos(auth.user.id);
      setLoading(false);
    })();
  }, [router]);

  // Auto-open convo from query params
  useEffect(() => {
    if (!userId || !initSolicitudId || !initOtherId || convos.length === 0) return;
    const existing = convos.find(c => c.solicitud_id === initSolicitudId);
    if (existing) {
      openConvo(existing);
    } else {
      // New convo — fetch solicitud info
      (async () => {
        const { data: sol } = await supabase
          .from("solicitudes")
          .select("id,destino,monto")
          .eq("id", initSolicitudId)
          .maybeSingle();
        if (sol) {
          const newConvo: Convo = {
            solicitud_id: sol.id,
            solicitud_destino: sol.destino || "Solicitud",
            solicitud_monto: sol.monto,
            other_id: initOtherId,
            last_msg: "",
            last_at: new Date().toISOString(),
            unread: 0,
          };
          setConvos(prev => [newConvo, ...prev]);
          openConvo(newConvo);
        }
      })();
    }
  }, [userId, initSolicitudId, initOtherId, convos.length]);

  async function loadConvos(uid: string) {
    const { data } = await supabase
      .from("mensajes")
      .select("id,solicitud_id,sender_id,receiver_id,content,iv,created_at,read_at")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (!data) return;

    // Group by solicitud_id
    const map = new Map<string, Convo>();
    for (const m of data) {
      const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
      if (!map.has(m.solicitud_id)) {
        // Fetch solicitud info
        const { data: sol } = await supabase
          .from("solicitudes")
          .select("destino,monto")
          .eq("id", m.solicitud_id)
          .maybeSingle();

        map.set(m.solicitud_id, {
          solicitud_id: m.solicitud_id,
          solicitud_destino: sol?.destino || "Solicitud",
          solicitud_monto: sol?.monto || 0,
          other_id: otherId,
          last_msg: "...",
          last_at: m.created_at,
          unread: (!m.read_at && m.receiver_id === uid) ? 1 : 0,
        });
      } else {
        const c = map.get(m.solicitud_id)!;
        if (!m.read_at && m.receiver_id === uid) c.unread++;
      }
    }
    setConvos(Array.from(map.values()));
  }

  async function openConvo(convo: Convo) {
    if (!userId) return;
    setActiveConvo(convo);
    setLoadingMsgs(true);
    setCryptoKey(null);

    // Derive key
    const key = await deriveKey(convo.solicitud_id, userId, convo.other_id);
    setCryptoKey(key);

    // Load messages
    const { data } = await supabase
      .from("mensajes")
      .select("id,sender_id,content,iv,created_at,read_at")
      .eq("solicitud_id", convo.solicitud_id)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true });

    // Decrypt all
    const decrypted = await Promise.all(
      (data ?? []).map(async (m) => ({
        ...m,
        decrypted: await decryptMsg(m.content, m.iv, key),
      }))
    );
    setMsgs(decrypted);
    setLoadingMsgs(false);

    // Mark as read
    await supabase
      .from("mensajes")
      .update({ read_at: new Date().toISOString() })
      .eq("solicitud_id", convo.solicitud_id)
      .eq("receiver_id", userId)
      .is("read_at", null);

    setConvos(prev => prev.map(c =>
      c.solicitud_id === convo.solicitud_id ? { ...c, unread: 0 } : c
    ));

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    inputRef.current?.focus();
  }

  // Realtime subscription
  useEffect(() => {
    if (!activeConvo || !userId || !cryptoKey) return;

    const channel = supabase
      .channel(`chat:${activeConvo.solicitud_id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
        filter: `solicitud_id=eq.${activeConvo.solicitud_id}`,
      }, async (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id === userId) return; // already added optimistically
        const decrypted = await decryptMsg(m.content, m.iv, cryptoKey);
        setMsgs(prev => [...prev, { ...m, decrypted }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

        // Mark read
        await supabase.from("mensajes").update({ read_at: new Date().toISOString() }).eq("id", m.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvo, userId, cryptoKey]);

  async function sendMsg() {
    if (!input.trim() || !activeConvo || !userId || !cryptoKey || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const { content, iv } = await encryptMsg(text, cryptoKey);

    // Optimistic
    const tmpId = `tmp-${Date.now()}`;
    setMsgs(prev => [...prev, { id: tmpId, sender_id: userId, content, iv, created_at: new Date().toISOString(), decrypted: text }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    await supabase.from("mensajes").insert({
      solicitud_id: activeConvo.solicitud_id,
      sender_id: userId,
      receiver_id: activeConvo.other_id,
      content,
      iv,
    });

    setSending(false);
  }

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes msgIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
    .msg-in{animation:msgIn .2s cubic-bezier(.16,1,.3,1) both;}
    .spin{animation:spin .7s linear infinite;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:999px;}
    .convo-item{padding:12px 14px;border-radius:12px;cursor:pointer;transition:all .15s;border:1px solid transparent;}
    .convo-item:hover{background:#F8FAFF;border-color:#EFF6FF;}
    .convo-item.active{background:#EFF6FF;border-color:#BFDBFE;}
    .send-btn{height:40px;width:40px;border-radius:10px;border:none;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;cursor:pointer;display:grid;place-items:center;transition:opacity .15s,transform .15s;flex-shrink:0;}
    .send-btn:hover:not(:disabled){opacity:.9;transform:translateY(-1px);}
    .send-btn:disabled{opacity:.4;cursor:not-allowed;}
    .msg-input{flex:1;height:40px;border-radius:10px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 14px;font-size:13px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;transition:border-color .15s;}
    .msg-input:focus{border-color:#3B82F6;background:#fff;}
  `;

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A", height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div className="fade" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em" }}>Mensajes</div>
            {totalUnread > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "#00E5A0", color: "#05201A", borderRadius: 999, padding: "2px 8px", fontFamily: "'Geist Mono',monospace" }}>
                {totalUnread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Cifrado extremo a extremo · Solo Plinius Pro</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E5A0" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#065F46", fontFamily: "'Geist Mono',monospace" }}>AES-256 ENCRYPTED</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, minHeight: 0 }}>

        {/* Sidebar — convos */}
        <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 16, padding: 10, display: "flex", flexDirection: "column", gap: 4, overflow: "auto" }}>
          <div style={{ padding: "4px 6px 10px", borderBottom: "1px solid #F1F5F9", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".06em" }}>CONVERSACIONES</div>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <svg className="spin" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
            </div>
          ) : convos.length === 0 ? (
            <div style={{ padding: "20px 10px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F1F5F9", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <Ic d="M2 2h12v8H2zM5 14h6M8 10v4" s={18} c="#CBD5E1" />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Sin conversaciones</div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>Conecta con un solicitante desde el marketplace</div>
            </div>
          ) : (
            convos.map(c => (
              <div key={c.solicitud_id} className={`convo-item${activeConvo?.solicitud_id === c.solicitud_id ? " active" : ""}`} onClick={() => openConvo(c)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.solicitud_destino}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{fmt(c.solicitud_monto)}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.last_msg || "Nueva conversación"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'Geist Mono',monospace" }}>{fmtDate(c.last_at)}</div>
                    {c.unread > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#00E5A0", color: "#05201A", borderRadius: 999, padding: "1px 6px", fontFamily: "'Geist Mono',monospace" }}>
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat window */}
        <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 16, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", display: "grid", placeItems: "center" }}>
                <Ic d="M2 2h12v8a2 2 0 01-2 2H4a2 2 0 01-2-2V2zM6 14h4M8 12v2" s={28} c="#1E40AF" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Chat cifrado</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, maxWidth: "30ch" }}>
                  Selecciona una conversación o inicia una desde el marketplace con "Conectar".
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 999 }}>
                <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={12} c="#059669" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>Mensajes cifrados AES-256 · Solo tú y el solicitante pueden leerlos</span>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.03em" }}>{activeConvo.solicitud_destino}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>
                    {fmt(activeConvo.solicitud_monto)} · cifrado AES-256
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E5A0" }} />
                  <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#059669", fontWeight: 700 }}>E2E ENCRYPTED</span>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {loadingMsgs ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 10 }}>
                    <svg className="spin" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>Descifrando mensajes...</span>
                  </div>
                ) : msgs.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, opacity: .6 }}>
                    <Ic d="M2 2h12v8a2 2 0 01-2 2H4a2 2 0 01-2-2V2z" s={24} c="#CBD5E1" />
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>Sé el primero en escribir</div>
                  </div>
                ) : (
                  msgs.map((m, i) => {
                    const isMine = m.sender_id === userId;
                    const showDate = i === 0 || fmtDate(msgs[i - 1].created_at) !== fmtDate(m.created_at);
                    return (
                      <React.Fragment key={m.id}>
                        {showDate && (
                          <div style={{ textAlign: "center", margin: "8px 0" }}>
                            <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#94A3B8", background: "#F8FAFC", padding: "3px 10px", borderRadius: 999, border: "1px solid #E2E8F0" }}>
                              {fmtDate(m.created_at)}
                            </span>
                          </div>
                        )}
                        <div className="msg-in" style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                          {!isMine && (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <Ic d="M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" s={13} c="#1E40AF" />
                            </div>
                          )}
                          <div style={{
                            maxWidth: "65%",
                            padding: "9px 13px",
                            borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                            background: isMine ? "linear-gradient(135deg,#0C1E4A,#1B3F8A)" : "#F1F5F9",
                            color: isMine ? "#fff" : "#0F172A",
                            fontSize: 13,
                            lineHeight: 1.5,
                            boxShadow: isMine ? "0 2px 8px rgba(12,30,74,.2)" : "none",
                          }}>
                            {m.decrypted || m.content}
                            <div style={{ fontSize: 10, marginTop: 4, opacity: .6, textAlign: "right", fontFamily: "'Geist Mono',monospace" }}>
                              {fmtTime(m.created_at)}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 8, flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  className="msg-input"
                  placeholder="Escribe un mensaje cifrado..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  disabled={sending}
                />
                <button className="send-btn" onClick={sendMsg} disabled={!input.trim() || sending}>
                  {sending
                    ? <svg className="spin" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
                    : <Ic d="M2 8h10M9 5l3 3-3 3" s={14} c="#fff" />
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
