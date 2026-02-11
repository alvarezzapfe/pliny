export type Role = "admin" | "client";

export type Session = {
  role: Role;
  email: string;
  customerId?: string;
  createdAt: string;
  demo?: boolean; // ✅ agrega esto
};


const KEY = "bcl_session";

export const ADMIN_EMAILS = new Set([
  "jero@crowdlink.mx",
  "luis@crowdlink.mx",
]);

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
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

export function requireClientSession(): Session | null {
  const s = getSession();
  if (!s || s.role !== "client") return null;
  return s;
}

export function requireAdminSession(): Session | null {
  const s = getSession();
  if (!s || s.role !== "admin") return null;
  return s;
}
