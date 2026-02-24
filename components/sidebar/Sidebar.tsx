"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV } from "./nav";
import { cx } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

// Opcional: si tú usas tu sesión local (según tu repo tienes lib/auth.ts)
let clearSessionSafe: null | (() => void) = null;
try {
  // @ts-ignore - puede no existir en algunos builds si no exportas clearSession
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@/lib/auth");
  clearSessionSafe = mod?.clearSession ?? null;
} catch {
  clearSessionSafe = null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      // 1) Supabase sign out (si estás usando Supabase Auth)
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    try {
      // 2) Si tienes sesión local custom, límpiala también
      clearSessionSafe?.();
    } catch {
      // ignore
    }

    // 3) Redirige
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cx(
        // ANCLADO A LA IZQUIERDA
        "fixed left-0 top-0 z-50 h-screen w-[260px]",
        // BASE
        "bg-white",
        "border-r border-slate-200/80",
        // sombra sutil
        "shadow-[0_12px_30px_rgba(2,6,23,0.08)]"
      )}
    >
      {/* Tech top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#071A3A]/10 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-20 h-40 w-40 rounded-full bg-[#0B2E6B]/10 blur-2xl" />

      {/* CONTENEDOR SCROLL */}
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#071A3A] text-white grid place-items-center text-sm font-semibold shadow-sm">
              P
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight text-slate-900">
                Plinius
              </div>
              <div className="text-[12px] text-slate-500">Credit OS</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200/70">
            <div className="text-[11px] font-semibold tracking-wide text-slate-400">
              CONSOLE
            </div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-800">
              Sistema activo
            </div>
          </div>
        </div>

        {/* Nav (con scroll si crece) */}
        <nav className="flex-1 overflow-auto px-3 pb-5">
          <div className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-slate-400">
            MENÚ
          </div>

          <ul className="space-y-1">
            {NAV.map((item) => {
              const active =
  item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2",
                      "text-[13px] font-medium",
                      "transition-colors",
                      active
                        ? "bg-[#071A3A] text-white shadow-sm"
                        : "text-slate-700 hover:bg-[#071A3A] hover:text-white"
                    )}
                  >
                    <span
                      className={cx(
                        "h-2 w-2 rounded-full",
                        active
                          ? "bg-white"
                          : "bg-slate-300 group-hover:bg-white"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Footer status */}
          <div className="mt-5 px-2">
            <div className="rounded-2xl bg-white ring-1 ring-slate-200/70">
              <div className="px-3 py-3">
                <div className="text-[11px] font-semibold tracking-wide text-slate-400">
                  ESTADO
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="text-[12px] font-semibold text-slate-800">
                    Online
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  Conectores listos (UI)
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-200/70 bg-white">
          <button
            onClick={handleLogout}
            className={cx(
              "w-full rounded-xl px-3 py-2",
              "text-[12px] font-semibold",
              "bg-slate-100 text-slate-800 hover:bg-slate-200",
              "transition-colors"
            )}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}