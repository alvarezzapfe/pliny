export type Role = "admin" | "super_admin" | "client" | "otorgante" | "solicitante" | "fondeador";

export type Session = {
  role: Role;
  email: string;
  customerId?: string;
  createdAt: string;

  demo?: boolean;

  // rol de negocio (para cliente)
  userRole?: "otorgante" | "solicitante" | "fondeador";
  onboardingDone?: boolean;

  // opcional si luego quieres trackearla (no es seguridad real)
  ip?: string;
};

const KEY = "bcl_session";

/** Admin “normal” (consola admin) */
export const ADMIN_EMAILS = new Set([
  "jero@crowdlink.mx",
  "luis@crowdlink.mx",
]);

/** Super admin (root) */
export const SUPER_ADMIN_EMAILS = new Set([
  "luis@crowdlink.mx",
  // agrega los que quieras
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

export function isSuperAdminEmail(email: string) {
  return SUPER_ADMIN_EMAILS.has(normalizeEmail(email));
}

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/** Cliente (usuario normal) */
export function requireClientSession(): Session | null {
  const s = getSession();
  if (!s || s.role !== "client") return null;
  return s;
}

/**
 * Admin console:
 * - Si quieres que super_admin también pueda entrar a /admin → deja como está.
 * - Si NO quieres eso, cambia a: (s.role !== "admin")
 */
export function requireAdminSession(): Session | null {
  const s = getSession();
  if (!s) return null;
  if (s.role !== "admin" && s.role !== "super_admin") return null;
  return s;
}

/** Super admin (root) */
export function requireSuperAdminSession(): Session | null {
  const s = getSession();
  if (!s || s.role !== "super_admin") return null;
  return s;
}

export function getUserRole(): "otorgante" | "solicitante" | "fondeador" | null {
  const s = getSession();
  return s?.userRole ?? null;
}