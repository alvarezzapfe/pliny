"use client";
import { CreditScoreCard, CreditScoreCompact } from "./CreditScore";
import { useState } from "react";
export default function Page() {
  const [theme, setTheme] = useState<"plinius"|"crowdlink">("plinius");
  return (
    <div style={{ minHeight:"100vh", background:"#030810", padding:"28px 20px" }}>
      <div style={{ maxWidth:780, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", gap:8 }}>
          {(["plinius","crowdlink"] as const).map(t => (
            <button key={t} onClick={()=>setTheme(t)}
              style={{ padding:"6px 16px", borderRadius:999, border:"none", cursor:"pointer",
                background: theme===t ? (t==="plinius"?"#0C1E4A":"#001A4A") : "#1E293B",
                color: theme===t ? (t==="plinius"?"#00E5A0":"#0066FF") : "#475569",
                fontWeight:700, fontSize:11, fontFamily:"sans-serif" }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <CreditScoreCompact themeKey={theme} logoUrl={theme==="crowdlink"?"/crowdlink-logo.png":undefined}/>
        <CreditScoreCard themeKey={theme} logoUrl={theme==="crowdlink"?"/crowdlink-logo.png":undefined} showSyntage/>
      </div>
    </div>
  );
}
