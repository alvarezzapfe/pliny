"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import { supabase } from "@/lib/supabaseClient";

const INSTITUTION_TYPES = [
  { value: "bank", label: "Banco" },
  { value: "private_fund", label: "Fondo privado" },
  { value: "sofom", label: "SOFOM" },
  { value: "credit_union", label: "Caja de ahorro" },
  { value: "sofipo", label: "SOFIPO" },
  { value: "ifc_crowd", label: "IFC crowd" },
  { value: "sapi", label: "SAPI" },
  { value: "other", label: "Otro" },
] as const;

const COUNTRIES = [
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", dial: "+1", flag: "🇨🇦" },
  { code: "ES", name: "España", dial: "+34", flag: "🇪🇸" },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "PE", name: "Perú", dial: "+51", flag: "🇵🇪" },
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨" },
  { code: "GT", name: "Guatemala", dial: "+502", flag: "🇬🇹" },
  { code: "CR", name: "Costa Rica", dial: "+506", flag: "🇨🇷" },
  { code: "PA", name: "Panamá", dial: "+507", flag: "🇵🇦" },
  { code: "DO", name: "Rep. Dominicana", dial: "+1", flag: "🇩🇴" },
  { code: "SV", name: "El Salvador", dial: "+503", flag: "🇸🇻" },
  { code: "HN", name: "Honduras", dial: "+504", flag: "🇭🇳" },
  { code: "NI", name: "Nicaragua", dial: "+505", flag: "🇳🇮" },
  { code: "UY", name: "Uruguay", dial: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", dial: "+595", flag: "🇵🇾" },
  { code: "DE", name: "Alemania", dial: "+49", flag: "🇩🇪" },
] as const;

type Profile = {
  id: string;
  owner_id: string;
  institution_type: string;
  institution_name: string | null;
  rfc: string | null;

  legal_rep_first_names: string | null;
  legal_rep_last_name_paternal: string | null;
  legal_rep_last_name_maternal: string | null;

  legal_rep_email: string | null;

  legal_rep_phone_country: string | null;
  legal_rep_phone_national: string | null;
  legal_rep_phone_e164: string | null;
};

function onlyDigits(v: string) {
  return (v || "").replace(/[^\d]/g, "");
}

function normalizeRFC(v: string) {
  return (v || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isEmail(v: string) {
  const s = (v || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isProfile(x: any): x is Profile {
  return (
    x &&
    typeof x === "object" &&
    typeof x.id === "string" &&
    typeof x.owner_id === "string" &&
    typeof x.institution_type === "string" &&
    // institution_name y rfc pueden ser null
    "institution_name" in x &&
    "rfc" in x
  );
}

function validateRfcLoose(v: string) {
  const r = normalizeRFC(v);
  // RFC Persona moral: 12, física: 13. Para MVP aceptamos 10-13 para no bloquear por edgecases.
  return r.length >= 10 && r.length <= 13;
}

export default function DatosPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Institución
  const [institutionType, setInstitutionType] = useState("other");
  const [institutionName, setInstitutionName] = useState("");
  const [rfc, setRfc] = useState("");

  // Rep legal
  const [firstNames, setFirstNames] = useState("");
  const [lastP, setLastP] = useState("");
  const [lastM, setLastM] = useState("");
  const [repEmail, setRepEmail] = useState("");

  // Tel
  const [countryDial, setCountryDial] = useState("+52");
  const [phoneNational, setPhoneNational] = useState("");

  const phoneE164 = useMemo(() => {
    const d = (countryDial || "").trim();
    const n = onlyDigits(phoneNational).slice(0, 10);
    return d && n ? `${d}${n}` : "";
  }, [countryDial, phoneNational]);

  const onboardingComplete = useMemo(() => {
    const okInstitution =
      institutionType &&
      institutionName.trim().length > 1 &&
      validateRfcLoose(rfc);

    const okRep =
      firstNames.trim().length > 1 &&
      lastP.trim().length > 1 &&
      repEmail.trim() &&
      isEmail(repEmail) &&
      onlyDigits(phoneNational).length === 10 &&
      countryDial;

    return Boolean(okInstitution && okRep);
  }, [institutionType, institutionName, rfc, firstNames, lastP, repEmail, phoneNational, countryDial]);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setProfile(null);
        setErr("No hay sesión.");
        return;
      }

      const { data, error } = await supabase
        .from("lenders_profile")
        .select(
          [
            "id",
            "owner_id",
            "institution_type",
            "institution_name",
            "rfc",
            "legal_rep_first_names",
            "legal_rep_last_name_paternal",
            "legal_rep_last_name_maternal",
            "legal_rep_email",
            "legal_rep_phone_country",
            "legal_rep_phone_national",
            "legal_rep_phone_e164",
          ].join(",")
        )
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // onboarding nuevo
        setProfile(null);
        setInstitutionType("other");
        setInstitutionName("");
        setRfc("");

        setFirstNames("");
        setLastP("");
        setLastM("");
        setRepEmail(auth.user.email ?? "");

        setCountryDial("+52");
        setPhoneNational("");
        return;
      }

      if (!isProfile(data)) {
        // si supabase retornó algo raro (no debería), no casteamos
        setProfile(null);
        setErr("Formato inesperado al cargar perfil. Revisa la tabla lenders_profile.");
        return;
      }

      const p = data;
      setProfile(p);

      setInstitutionType(p.institution_type ?? "other");
      setInstitutionName(p.institution_name ?? "");
      setRfc(p.rfc ?? "");

      setFirstNames(p.legal_rep_first_names ?? "");
      setLastP(p.legal_rep_last_name_paternal ?? "");
      setLastM(p.legal_rep_last_name_maternal ?? "");
      setRepEmail(p.legal_rep_email ?? (auth.user.email ?? ""));

      setCountryDial(p.legal_rep_phone_country ?? "+52");
      setPhoneNational(p.legal_rep_phone_national ?? "");
    } catch (e: any) {
      setErr(String(e?.message ?? "Error cargando datos"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function validate(): string | null {
    if (!institutionName.trim()) return "Falta el nombre de la institución.";
    if (!validateRfcLoose(rfc)) return "RFC inválido o incompleto (institución).";

    if (!firstNames.trim()) return "Falta Nombre(s) del representante legal.";
    if (!lastP.trim()) return "Falta Apellido paterno del representante legal.";
    if (!repEmail.trim() || !isEmail(repEmail)) return "Correo del representante legal inválido.";

    const n = onlyDigits(phoneNational);
    if (n.length !== 10) return "El celular debe tener exactamente 10 dígitos (sin espacios).";

    return null;
  }

  async function save() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setErr(null);
    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No hay sesión.");

      const payload = {
        owner_id: auth.user.id,
        institution_type: institutionType,
        institution_name: institutionName.trim() || null,
        rfc: normalizeRFC(rfc) || null,

        legal_rep_first_names: firstNames.trim() || null,
        legal_rep_last_name_paternal: lastP.trim() || null,
        legal_rep_last_name_maternal: lastM.trim() || null,

        legal_rep_email: repEmail.trim().toLowerCase() || null,

        legal_rep_phone_country: countryDial || null,
        legal_rep_phone_national: onlyDigits(phoneNational).slice(0, 10) || null,
        legal_rep_phone_e164: phoneE164 || null,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("lenders_profile").upsert(payload, { onConflict: "owner_id" });
      if (error) throw error;

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? "Error guardando"));
    } finally {
      setSaving(false);
    }
  }

  // UX: limpiar error al cambiar inputs (para que no “asuste”)
  function clearErr() {
    if (err) setErr(null);
  }

  return (
    <PageShell
      title="Datos"
      subtitle="Onboarding del otorgante de crédito (institución + representante legal)"
      right={
        <button
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      }
    >
      {err ? (
        <div className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-100">
          {err}
        </div>
      ) : null}

      {/* progreso */}
      <div className="mb-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-slate-500">ONBOARDING</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-900">
              {onboardingComplete ? (
                <>
                  Estado: <span className="text-[#00E599]">Completo</span>
                </>
              ) : (
                <>
                  Estado: <span className="text-amber-700">Pendiente</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[12px] text-slate-500">
              Esto se usa para confianza, operación y configuración del sistema.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold ring-1",
                onboardingComplete
                  ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                  : "bg-amber-50 text-amber-900 ring-amber-100",
              ].join(" ")}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              {onboardingComplete ? "Listo" : "Faltan datos"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Institución" subtle="tipo & RFC">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
            <div className="grid gap-3">
              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-700">Tipo de institución</div>
                <select
                  value={institutionType}
                  onChange={(e) => {
                    clearErr();
                    setInstitutionType(e.target.value);
                  }}
                  className="h-[40px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-[#00E599]/30"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-700">Nombre de la institución</div>
                <input
                  value={institutionName}
                  onChange={(e) => {
                    clearErr();
                    setInstitutionName(e.target.value);
                  }}
                  placeholder="Ej. Fondo ABC, Banco XYZ…"
                  className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                />
              </div>

              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-700">RFC de la institución</div>
                <input
                  value={rfc}
                  onChange={(e) => {
                    clearErr();
                    setRfc(normalizeRFC(e.target.value));
                  }}
                  placeholder="Ej. ABC010203XYZ"
                  maxLength={13}
                  className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30 font-mono"
                />
                <div className="mt-1 text-[11px] text-slate-500">Se normaliza a mayúsculas y sin espacios.</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Representante legal" subtle="identidad & contacto">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
            <div className="grid gap-3">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="lg:col-span-3">
                  <div className="mb-1 text-[12px] font-semibold text-slate-700">Nombre(s)</div>
                  <input
                    value={firstNames}
                    onChange={(e) => {
                      clearErr();
                      setFirstNames(e.target.value);
                    }}
                    placeholder="Ej. Luis Armando"
                    className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className="mb-1 text-[12px] font-semibold text-slate-700">Apellido paterno</div>
                  <input
                    value={lastP}
                    onChange={(e) => {
                      clearErr();
                      setLastP(e.target.value);
                    }}
                    placeholder="Ej. Álvarez"
                    className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[12px] font-semibold text-slate-700">Apellido materno</div>
                  <input
                    value={lastM}
                    onChange={(e) => {
                      clearErr();
                      setLastM(e.target.value);
                    }}
                    placeholder="Ej. Zapfe"
                    className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-700">Correo</div>
                <input
                  value={repEmail}
                  onChange={(e) => {
                    clearErr();
                    setRepEmail(e.target.value);
                  }}
                  placeholder="correo@dominio.com"
                  className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                />
              </div>

              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-700">Celular</div>
                <div className="flex items-center gap-2">
                  <select
                    value={countryDial}
                    onChange={(e) => {
                      clearErr();
                      setCountryDial(e.target.value);
                    }}
                    className="h-[40px] w-[180px] rounded-xl border border-slate-200 bg-white px-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={`${c.code}-${c.dial}`} value={c.dial}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>

                  <input
                    value={phoneNational}
                    onChange={(e) => {
                      clearErr();
                      setPhoneNational(onlyDigits(e.target.value).slice(0, 10));
                    }}
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="10 dígitos"
                    className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30 font-mono"
                  />
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Solo números, máximo 10 dígitos.</span>
                  <span className="font-mono text-slate-700">{phoneE164 ? `E.164: ${phoneE164}` : "E.164: —"}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">Esto se usa para verificación y contacto operativo.</div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 text-[12px] text-slate-500">
        Estado actual: <span className="font-semibold text-slate-900">{profile ? "Perfil guardado" : "Sin perfil aún"}</span>
      </div>
    </PageShell>
  );
}