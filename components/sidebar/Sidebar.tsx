"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV } from "./nav";
import { cx } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

// Opcional: sesión local custom
let clearSessionSafe: null | (() => void) = null;
try {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@/lib/auth");
  clearSessionSafe = mod?.clearSession ?? null;
} catch {
  clearSessionSafe = null;
}

type LenderProfileLite = {
  institution_type: string | null;
  institution_name: string | null;
  rfc: string | null;
  legal_rep_name: string | null;
  legal_rep_email: string | null;
  legal_rep_phone: string | null;
};

function isProfileComplete(p: LenderProfileLite | null) {
  if (!p) return false;
  return Boolean(
    p.institution_type &&
      p.institution_name &&
      p.rfc &&
      p.legal_rep_name &&
      p.legal_rep_email &&
      p.legal_rep_phone
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<LenderProfileLite | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const datosPending = useMemo(() => {
    // Si aún no carga, no pintamos warning agresivo
    if (!profileLoaded) return false;
    return !isProfileComplete(profile);
  }, [profile, profileLoaded]);

  const institutionLabel = useMemo(() => {
    const name = profile?.institution_name?.trim();
    if (name) return name;
    return null;
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (!mounted) return;
          setProfile(null);
          setProfileLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from("lenders_profile")
.select(
  "institution_type,institution_name,rfc,legal_rep_first_names,legal_rep_last_name_paternal,legal_rep_email,legal_rep_phone_country,legal_rep_phone_national"
)
          .eq("owner_id", auth.user.id)
          .maybeSingle();

        if (error) {
          if (!mounted) return;
          setProfile(null);
          setProfileLoaded(true);
          return;
        }

        if (!mounted) return;
        setProfile((data as any) ?? null);
        setProfileLoaded(true);
      } catch {
        if (!mounted) return;
        setProfile(null);
        setProfileLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    try {
      clearSessionSafe?.();
    } catch {
      // ignore
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cx(
        "fixed left-0 top-0 z-50 h-screen w-[260px]",
        "bg-white",
        "border-r border-slate-200/80",
        "shadow-[0_12px_30px_rgba(2,6,23,0.08)]"
      )}
    >
      {/* Tech top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#071A3A]/10 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-20 h-40 w-40 rounded-full bg-[#0B2E6B]/10 blur-2xl" />

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#071A3A] text-white grid place-items-center text-sm font-semibold shadow-sm">
              P
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[13px] font-semibold tracking-tight text-slate-900">
                Plinius
              </div>
              <div className="text-[12px] text-slate-500">Credit OS</div>
            </div>
          </div>

          {/* Console card */}
          <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200/70">
            <div className="text-[11px] font-semibold tracking-wide text-slate-400">
              CONSOLE
            </div>

            {institutionLabel ? (
              <div className="mt-0.5 text-[12px] font-semibold text-[#00E599] truncate">
                {institutionLabel}
              </div>
            ) : (
              <div className="mt-0.5 text-[12px] font-semibold text-slate-800">
                Sistema activo
              </div>
            )}

            <div className="mt-1 text-[12px] text-slate-500">
              {datosPending ? (
                <span className="text-amber-700 font-semibold">
                  ★ Falta completar Datos
                </span>
              ) : (
                "Online"
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
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

              const showDatosBadge = item.id === "datos" && datosPending;

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
                        active ? "bg-white" : "bg-slate-300 group-hover:bg-white"
                      )}
                    />

                    <span className="truncate flex-1">{item.title}</span>

                    {showDatosBadge ? (
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                          "text-[11px] font-semibold ring-1",
                          active
                            ? "bg-white/15 text-white ring-white/20"
                            : "bg-amber-50 text-amber-900 ring-amber-100 group-hover:bg-white/15 group-hover:text-white group-hover:ring-white/20"
                        )}
                      >
                        <span>★</span>
                        
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Nota fija cuando falta onboarding */}
          {datosPending ? (
            <div className="mt-4 px-2">
              <div className="rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-900 ring-1 ring-amber-100">
                Falta completar <span className="font-semibold">Datos</span> (tipo de institución, RFC y rep. legal).
              </div>
            </div>
          ) : null}

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
                  Console lista · Onboarding {datosPending ? "pendiente" : "OK"}
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