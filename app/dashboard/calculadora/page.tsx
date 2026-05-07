// TEMPORARY smoke test — will be replaced in step 2 with UploadDropzone
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CalculadoraPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError("No session"); return; }
        const res = await fetch("/api/calculadora/cartera/list", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        setData(json);
      } catch (e: unknown) { setError(String(e)); }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace", fontSize: 12 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Smoke test /list</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <pre style={{ background: "#F8FAFC", padding: 12, borderRadius: 4, overflow: "auto" }}>
        {data ? JSON.stringify(data, null, 2) : "Loading..."}
      </pre>
    </div>
  );
}
