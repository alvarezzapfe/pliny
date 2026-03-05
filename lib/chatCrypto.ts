// lib/chatCrypto.ts
// AES-GCM encryption using Web Crypto API (built into browsers)
// Key is derived from solicitud_id + both user IDs — never leaves the client

export async function deriveKey(solicitudId: string, uid1: string, uid2: string): Promise<CryptoKey> {
  const sorted = [uid1, uid2].sort().join(":");
  const raw = `plinius:${solicitudId}:${sorted}`;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(raw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("pliniussalt2025"), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMsg(text: string, key: CryptoKey): Promise<{ content: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return {
    content: btoa(String.fromCharCode(...new Uint8Array(buf))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptMsg(content: string, ivB64: string, key: CryptoKey): Promise<string> {
  try {
    const buf = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    const iv  = Uint8Array.from(atob(ivB64),   c => c.charCodeAt(0));
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, buf);
    return new TextDecoder().decode(dec);
  } catch {
    return "[mensaje cifrado]";
  }
}
