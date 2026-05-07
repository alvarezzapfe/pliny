// lib/cartera/sanitize.ts — File validation and cell sanitization for cartera uploads
import * as crypto from "crypto";

// XLSX magic bytes: PK\x03\x04 (ZIP signature)
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Validate the first 4 bytes of a buffer match XLSX/ZIP signature.
 */
export function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer.subarray(0, 4).equals(XLSX_MAGIC);
}

/**
 * Check if an XLSX (ZIP) file contains VBA macros by scanning for vbaProject.bin entry.
 * Scans the raw buffer for the filename in the ZIP central directory.
 */
export function containsMacros(buffer: Buffer): boolean {
  const marker = Buffer.from("vbaProject.bin");
  return buffer.includes(marker);
}

/**
 * Compute SHA-256 hash of a buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Whitelist for safe text content
const SAFE_TEXT_RE = /^[\w\s\-.,#áéíóúñÁÉÍÓÚÑüÜ()/&']+$/;

// Characters that trigger formula injection in CSV/spreadsheets
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r", "\n"];

/**
 * Sanitize a single cell value from the spreadsheet.
 * Returns sanitized string or null if invalid.
 */
export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  // Hard limit on length
  if (str.length > 200) str = str.slice(0, 200);

  // Strip angle brackets (anti-XSS)
  str = str.replace(/[<>]/g, "");

  // Prefix formula-injection characters with apostrophe (for downstream safety)
  if (FORMULA_PREFIXES.some(p => str.startsWith(p))) {
    str = "'" + str;
  }

  return str;
}

/**
 * Validate a text cell against the safe regex.
 * Returns true if safe, false if contains disallowed characters.
 */
export function isTextSafe(value: string): boolean {
  if (!value) return true;
  return SAFE_TEXT_RE.test(value);
}

/**
 * Validate a numeric value is finite and within range.
 */
export function validateNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/**
 * Parse a date string or Excel serial number to YYYY-MM-DD.
 */
export function parseDate(value: unknown): string | null {
  if (!value) return null;

  // If it's already a Date object (SheetJS may parse dates)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  const str = String(value).trim();

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T12:00:00Z");
    if (isNaN(d.getTime())) return null;
    return str;
  }

  // Try Excel serial date (number of days since 1900-01-01)
  const serial = Number(str);
  if (Number.isFinite(serial) && serial > 30000 && serial < 100000) {
    // Convert Excel serial to JS date
    const epoch = new Date(1899, 11, 30); // Excel epoch
    const d = new Date(epoch.getTime() + serial * 86400000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  return null;
}
