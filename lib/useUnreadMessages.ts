"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadMessages(userId: string | null) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;

    async function fetchUnread() {
      // Get all convs where user participates
      const { data: convs } = await supabase
        .from("conversaciones")
        .select("id")
        .or(`otorgante_id.eq.${userId},solicitante_id.eq.${userId}`);

      if (!convs || convs.length === 0) { setUnread(0); return; }

      const convIds = convs.map(c => c.id);

      const { count } = await supabase
        .from("mensajes")
        .select("*", { count: "exact", head: true })
        .in("conversacion_id", convIds)
        .eq("leido", false)
        .neq("sender_id", userId);

      setUnread(count ?? 0);
    }

    fetchUnread();

    // Realtime: escuchar nuevos mensajes
    const channel = supabase
      .channel("unread_badge")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
      }, () => fetchUnread())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "mensajes",
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return unread;
}
