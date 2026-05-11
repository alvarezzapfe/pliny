import { describe, it, expect } from "vitest";
import { validateMagicBytes, containsMacros, sanitizeCell, isTextSafe, validateNumber, parseDate } from "@/lib/cartera/sanitize";

describe("validateMagicBytes", () => {
  it("accepts valid XLSX magic bytes", () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(validateMagicBytes(buf)).toBe(true);
  });

  it("rejects non-XLSX bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG
    expect(validateMagicBytes(buf)).toBe(false);
  });

  it("rejects buffer too short", () => {
    expect(validateMagicBytes(Buffer.from([0x50, 0x4b]))).toBe(false);
  });
});

describe("containsMacros", () => {
  it("detects vbaProject.bin", () => {
    const buf = Buffer.from("some zip content vbaProject.bin more content");
    expect(containsMacros(buf)).toBe(true);
  });

  it("passes clean file", () => {
    const buf = Buffer.from("some zip content without macros");
    expect(containsMacros(buf)).toBe(false);
  });
});

describe("sanitizeCell", () => {
  it("trims whitespace", () => {
    expect(sanitizeCell("  hello  ")).toBe("hello");
  });

  it("strips angle brackets", () => {
    expect(sanitizeCell("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
  });

  it("prefixes formula injection characters", () => {
    expect(sanitizeCell("=CMD()")).toBe("'=CMD()");
    expect(sanitizeCell("+1")).toBe("'+1");
    expect(sanitizeCell("-1")).toBe("'-1");
    expect(sanitizeCell("@SUM")).toBe("'@SUM");
  });

  it("truncates at 200 chars", () => {
    const long = "a".repeat(300);
    expect(sanitizeCell(long).length).toBe(200);
  });

  it("handles null/undefined", () => {
    expect(sanitizeCell(null)).toBe("");
    expect(sanitizeCell(undefined)).toBe("");
  });

  it("converts numbers to string", () => {
    expect(sanitizeCell(42)).toBe("42");
  });
});

describe("isTextSafe", () => {
  it("accepts normal text with accents", () => {
    expect(isTextSafe("Agrícola del Norte S.A.")).toBe(true);
  });

  it("accepts text with numbers and hyphens", () => {
    expect(isTextSafe("CR-001-2024")).toBe(true);
  });

  it("rejects pipe characters", () => {
    expect(isTextSafe("test|injection")).toBe(false);
  });

  it("rejects semicolons", () => {
    expect(isTextSafe("DROP TABLE;")).toBe(false);
  });

  it("accepts empty string", () => {
    expect(isTextSafe("")).toBe(true);
  });
});

describe("validateNumber", () => {
  it("accepts valid number in range", () => {
    expect(validateNumber(0.15, 0, 2)).toBe(0.15);
  });

  it("rejects out of range", () => {
    expect(validateNumber(3, 0, 2)).toBeNull();
  });

  it("rejects NaN", () => {
    expect(validateNumber("abc", 0, 100)).toBeNull();
  });

  it("rejects Infinity", () => {
    expect(validateNumber(Infinity, 0, 100)).toBeNull();
  });
});

describe("parseDate", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseDate("2026-06-15")).toBe("2026-06-15");
  });

  it("parses Date object", () => {
    expect(parseDate(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });

  it("parses Excel serial date", () => {
    // 45658 ≈ 2024-12-25
    const result = parseDate(45658);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null for invalid", () => {
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});
