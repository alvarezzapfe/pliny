"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { deriveKey, encryptMsg, decryptMsg } from "@/lib/chatCrypto";

type Conv = {
  id: string;
  otorgante_id: string;
  solicitante_id: string;
  solicitante_empresa: string | null;
  otorgante_email: string | null;
  last_message_at: string;
  unread?: number;
  last_msg?: string;
};

type Msg = {
  id: string;
  conversacion_id: string;
  sender_id: string;
  content: string;
  iv: string | null;
  created_at: string;
  leido: boolean;
  decrypted?: string; // client-side only
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
  .fade{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both}
  textarea{resize:none;font-family:'Geist',sans-serif;}
  textarea:focus{outline:none;}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:999px}
  .conv-item{cursor:pointer;transition:background .12s;}
  .conv-item:hover{background:rgba(255,255,255,.04);}
  .conv-item.active{background:rgba(0,229,160,.06);border-right:2px solid #00E5A0;}
`;

// Derive key for a conversation — memoized by conv id
const keyCache = new Map<string, CryptoKey>();
async function getKey(convId: string, uid1: string, uid2: string): Promise<CryptoKey> {
  if (keyCache.has(convId)) return keyCache.get(convId)!;
  const key = await deriveKey(convId, uid1, uid2);
  keyCache.set(convId, key);
  return key;
}

async function decryptAll(msgs: Msg[], convId: string, uid1: string, uid2: string): Promise<Msg[]> {
  const key = await getKey(convId, uid1, uid2);
  return Promise.all(
    msgs.map(async (m) => {
      if (!m.iv) return { ...m, decrypted: m.content }; // legacy plain text
      const text = await decryptMsg(m.content, m.iv, key);
      return { ...m, decrypted: text };
    })
  );
}

function ChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("conv");

  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState("free");
  const [role, setRole] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);
  const userRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUser(auth.user);
      userRef.current = auth.user;

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

  async function loadConvs(uid: string, userRole: string | null) {
    const field = userRole === "otorgante" ? "otorgante_id" : "solicitante_id";
    const { data: cs } = await supabase
      .from("conversaciones")
      .select("*")
      .eq(field, uid)
      .order("last_message_at", { ascending: false });

    if (!cs) return;

    const enriched = await Promise.all(
      cs.map(async (c) => {
        const [{ count }, { data: lastMsgs }] = await Promise.all([
          supabase.from("mensajes").select("*", { count: "exact", head: true })
            .eq("conversacion_id", c.id).eq("leido", false).neq("sender_id", uid),
          supabase.from("mensajes").select("content,iv").eq("conversacion_id", c.id)
            .order("created_at", { ascending: false }).limit(1),
        ]);

        // Decrypt last_msg preview
        let lastMsgText = "Sin mensajes aún";
        if (lastMsgs?.[0]) {
          const lm = lastMsgs[0];
          if (lm.iv) {
            try {
              const key = await getKey(c.id, c.otorgante_id, c.solicitante_id);
              lastMsgText = await decryptMsg(lm.content, lm.iv, key);
            } catch { lastMsgText = "🔒 Mensaje cifrado"; }
          } else {
            lastMsgText = lm.content;
          }
        }

        return { ...c, unread: count ?? 0, last_msg: lastMsgText };
      })
    );

    setConvs(enriched);

    if (preselect) {
      const found = enriched.find((c) => c.id === preselect);
      if (found) selectConv(found, uid);
    } else if (enriched.length > 0) {
      selectConv(enriched[0], uid);
    }
  }

  async function selectConv(conv: Conv, uid?: string) {
    setActiveConv(conv);
    setMsgsLoading(true);

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const { data: ms } = await supabase
      .from("mensajes")
      .select("*")
      .eq("conversacion_id", conv.id)
      .order("created_at", { ascending: true });

    const myId = uid || userRef.current?.id;

    // Decrypt all messages
    const decrypted = await decryptAll(
      ms ?? [],
      conv.id,
      conv.otorgante_id,
      conv.solicitante_id
    );
    setMsgs(decrypted);
    setMsgsLoading(false);

    // Mark as read
    if (myId) {
      await supabase.from("mensajes")
        .update({ leido: true, leido_at: new Date().toISOString() })
        .eq("conversacion_id", conv.id)
        .eq("leido", false)
        .neq("sender_id", myId);

      setConvs((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
    }

    // Realtime
    const channel = supabase
      .channel(`chat:${conv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
        filter: `conversacion_id=eq.${conv.id}`,
      }, async (payload) => {
        const raw = payload.new as Msg;
        // Decrypt incoming
        let decryptedText = raw.content;
        if (raw.iv) {
          try {
            const key = await getKey(conv.id, conv.otorgante_id, conv.solicitante_id);
            decryptedText = await decryptMsg(raw.content, raw.iv, key);
          } catch { decryptedText = "🔒 Mensaje cifrado"; }
        }
        const newMsg = { ...raw, decrypted: decryptedText };

        setMsgs((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Mark read if not mine
        const currentUser = userRef.current;
        if (newMsg.sender_id !== currentUser?.id) {
          supabase.from("mensajes")
            .update({ leido: true, leido_at: new Date().toISOString() })
            .eq("id", newMsg.id).then(() => {});
        }

        setConvs((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? { ...c, last_msg: decryptedText, last_message_at: newMsg.created_at }
              : c
          )
        );
      })
      .subscribe();

    channelRef.current = channel;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function sendMsg() {
    if (!input.trim() || !activeConv || sending) return;
    const plaintext = input.trim();
    setInput("");
    setSending(true);

    try {
      const key = await getKey(
        activeConv.id,
        activeConv.otorgante_id,
        activeConv.solicitante_id
      );
      const { content, iv } = await encryptMsg(plaintext, key);

      const { error } = await supabase.from("mensajes").insert({
        conversacion_id: activeConv.id,
        sender_id: user.id,
        content,
        iv,
      });

      if (!error) {
        await supabase.from("conversaciones")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", activeConv.id);
      }
    } catch (e) {
      console.error("Error al cifrar/enviar:", e);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  }

  const isOtorgante = role === "otorgante";
  const isPro = plan === "pro";
  const totalUnread = convs.reduce((s, c) => s + (c.unread || 0), 0);

  const otherName = (conv: Conv) => {
    if (isOtorgante) return conv.solicitante_empresa || "Solicitante";
    return conv.otorgante_email?.split("@")[0] || "Otorgante";
  };

  if (loading)
    return (
      <div style={{ minHeight: "100vh", background: "#040C18", display: "grid", placeItems: "center", fontFamily: "'Geist',sans-serif" }}>
        <style>{CSS}</style>
        <svg style={{ animation: "spin .8s linear infinite" }} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#334155" strokeWidth="2"><path d="M10 2a8 8 0 018 8" /></svg>
      </div>
    );

  if (isOtorgante && !isPro && convs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#040C18", display: "grid", placeItems: "center", fontFamily: "'Geist',sans-serif", padding: 24 }}>
        <style>{CSS}</style>
        <div className="fade" style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", display: "grid", placeItems: "center", margin: "0 auto 20px", fontSize: 28 }}>💬</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#F8FAFC", letterSpacing: "-0.04em", marginBottom: 8 }}>Chat con solicitantes</div>
          <div style={{ fontSize: 13, color: "#334155", marginBottom: 24, lineHeight: 1.6 }}>Necesitas el plan Pro para iniciar conversaciones con solicitantes en el marketplace.</div>
          <button onClick={() => router.push("/pricing")}
            style={{ height: 44, padding: "0 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", boxShadow: "0 4px 20px rgba(99,102,241,.35)" }}>
            Actualizar a Pro →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#040C18", fontFamily: "'Geist',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #0F1E2E", display: "flex", alignItems: "center", gap: 12, background: "rgba(4,12,24,.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.03em" }}>Mensajes</div>
        {totalUnread > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: "#00E5A0", color: "#040C18", borderRadius: 999, padding: "2px 7px" }}>{totalUnread}</span>
        )}
        <div style={{ flex: 1 }} />
        {/* E2E indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.12)" }}>
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none"><rect x="2" y="4" width="6" height="5" rx="1" stroke="#00E5A0" strokeWidth="1"/><path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke="#00E5A0" strokeWidth="1"/></svg>
          <span style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#00E5A0", fontWeight: 600, letterSpacing: "0.04em" }}>E2E CIFRADO</span>
        </div>
        {isOtorgante && !isPro && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 10, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)" }}>
            <span style={{ fontSize: 11, color: "#818CF8", fontWeight: 600 }}>Solo Pro puede iniciar chats</span>
            <button onClick={() => router.push("/pricing")}
              style={{ height: 26, padding: "0 10px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
              Upgrade →
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "calc(100vh - 53px)" }}>

        {/* ── SIDEBAR CONVS ── */}
        <div style={{ width: 280, borderRight: "1px solid #0F1E2E", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          {convs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 12, color: "#334155", fontFamily: "'Geist Mono',monospace" }}>
                {isOtorgante ? "Inicia una conversación desde el marketplace" : "Aún no tienes mensajes"}
              </div>
              {isOtorgante && (
                <button onClick={() => router.push("/dashboard/marketplace")}
                  style={{ marginTop: 16, height: 34, padding: "0 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                  Ir al marketplace →
                </button>
              )}
            </div>
          ) : (
            convs.map((conv) => (
              <div key={conv.id} className={`conv-item${activeConv?.id === conv.id ? " active" : ""}`}
                onClick={() => selectConv(conv)}
                style={{ padding: "14px 16px", borderBottom: "1px solid #0A1628" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                    {otherName(conv)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {(conv.unread || 0) > 0 && (
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#00E5A0", color: "#040C18", fontSize: 9, fontWeight: 900, display: "grid", placeItems: "center", fontFamily: "'Geist Mono',monospace" }}>
                        {conv.unread}
                      </span>
                    )}
                    <span style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155" }}>{timeAgo(conv.last_message_at)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.last_msg || "Sin mensajes aún"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── CHAT AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 12, color: "#334155", fontFamily: "'Geist Mono',monospace" }}>Selecciona una conversación</div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #0F1E2E", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,229,160,.08)", border: "1px solid rgba(0,229,160,.15)", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
                  {isOtorgante ? "🏢" : "💼"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>{otherName(activeConv)}</div>
                  <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#334155" }}>
                    {isOtorgante ? activeConv.solicitante_id.slice(0, 8) + "…" : activeConv.otorgante_email}
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={() => router.push("/dashboard/marketplace")}
                  style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid #1E293B", background: "transparent", color: "#334155", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                  Ver solicitud
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                {msgsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                    <svg style={{ animation: "spin .7s linear infinite" }} width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#334155" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
                  </div>
                ) : msgs.length === 0 ? (
                  <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>👋</div>
                      <div style={{ fontSize: 12, color: "#334155", fontFamily: "'Geist Mono',monospace" }}>Sé el primero en escribir</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {msgs.map((msg, i) => {
                      const isMine = msg.sender_id === user?.id;
                      const showDate =
                        i === 0 ||
                        new Date(msg.created_at).toDateString() !==
                          new Date(msgs[i - 1].created_at).toDateString();
                      const displayText = msg.decrypted ?? msg.content;

                      return (
                        <div key={msg.id} style={{ animation: "msgIn .2s cubic-bezier(.16,1,.3,1) both" }}>
                          {showDate && (
                            <div style={{ textAlign: "center", margin: "8px 0" }}>
                              <span style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#1E293B", background: "#0A1628", borderRadius: 999, padding: "3px 10px" }}>
                                {new Date(msg.created_at).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                              </span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                            <div style={{
                              maxWidth: "70%", padding: "10px 14px",
                              borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              background: isMine ? "linear-gradient(135deg,#0C1E4A,#1B3F8A)" : "#0A1628",
                              border: isMine ? "none" : "1px solid #1E293B",
                              boxShadow: isMine ? "0 2px 12px rgba(12,30,74,.4)" : "none",
                            }}>
                              <div style={{ fontSize: 13, color: "#F8FAFC", lineHeight: 1.5, wordBreak: "break-word" }}>{displayText}</div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                                {msg.iv && (
                                  <svg width={8} height={8} viewBox="0 0 10 10" fill="none" style={{ opacity: .4 }}>
                                    <rect x="2" y="4" width="6" height="5" rx="1" stroke="#00E5A0" strokeWidth="1.2"/>
                                    <path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke="#00E5A0" strokeWidth="1.2"/>
                                  </svg>
                                )}
                                <span style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: isMine ? "rgba(238,242,255,.3)" : "#1E293B" }}>{fmtTime(msg.created_at)}</span>
                                {isMine && (
                                  <span style={{ fontSize: 9, color: msg.leido ? "#00E5A0" : "rgba(238,242,255,.25)" }}>
                                    {msg.leido ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid #0F1E2E", flexShrink: 0 }}>
                {isOtorgante && !isPro ? (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#818CF8" }}>Necesitas Pro para enviar mensajes</span>
                    <button onClick={() => router.push("/pricing")}
                      style={{ height: 30, padding: "0 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                      Upgrade →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 1, background: "#0A1628", border: "1px solid #1E293B", borderRadius: 14, padding: "10px 14px", transition: "border-color .15s" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#334155")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#1E293B")}>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje… (Enter para enviar)"
                        rows={1}
                        style={{
                          width: "100%", background: "transparent", border: "none", color: "#F8FAFC",
                          fontSize: 13, lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                        }}
                      />
                    </div>
                    <button onClick={sendMsg} disabled={!input.trim() || sending}
                      style={{
                        width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0,
                        background: input.trim() ? "linear-gradient(135deg,#0C1E4A,#1B3F8A)" : "#0A1628",
                        cursor: input.trim() ? "pointer" : "not-allowed",
                        display: "grid", placeItems: "center",
                        boxShadow: input.trim() ? "0 2px 12px rgba(12,30,74,.4)" : "none",
                        transition: "all .15s", opacity: sending ? 0.6 : 1,
                      }}>
                      {sending ? (
                        <svg style={{ animation: "spin .6s linear infinite" }} width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M7 1a6 6 0 016 6" /></svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={input.trim() ? "#fff" : "#334155"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2L2 7l5 1.5M14 2l-5 12-2-5.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#1E293B", textAlign: "center" }}>
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
      <div style={{ minHeight: "100vh", background: "#040C18", display: "grid", placeItems: "center" }}>
        <svg style={{ animation: "spin .8s linear infinite" }} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#334155" strokeWidth="2"><path d="M10 2a8 8 0 018 8" /></svg>
      </div>
    }>
      <ChatInner />
    </Suspense>
  );
}
