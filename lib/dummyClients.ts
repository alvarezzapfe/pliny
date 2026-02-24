export type ClientStatus = "Active" | "Onboarding" | "Paused" | "Risk Hold";

export type DummyClient = {
  id: string; // ej: CL-0001
  companyName: string;
  rfc: string;
  status: ClientStatus;
  createdAt: string; // YYYY-MM-DD
};

function pad(n: number, width = 3) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function makeRFC(i: number) {
  const mid = pad(i, 6);
  const suffix = ["AAA", "BBB", "CCC", "DDD"][i % 4];
  return `PLN${mid}${suffix}`;
}

function makeDate(i: number) {
  const day = 1 + (i % 23);
  return `2026-02-${pad(day, 2)}`;
}

function statusFor(i: number): ClientStatus {
  const s: ClientStatus[] = ["Active", "Onboarding", "Paused", "Risk Hold"];
  return s[i % s.length];
}

export const DUMMY_CLIENTS: DummyClient[] = Array.from({ length: 150 }).map((_, idx) => {
  const i = idx + 1;
  return {
    id: `CL-${pad(i, 4)}`,
    companyName: `Cliente ${i} S.A. de C.V.`,
    rfc: makeRFC(i),
    status: statusFor(i),
    createdAt: makeDate(i),
  };
});

export function getDummyClientById(id: string): DummyClient | null {
  return DUMMY_CLIENTS.find((c) => c.id === id) ?? null;
}