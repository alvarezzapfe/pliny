import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const W = 210;
const M = 18;
const CW = W - 2 * M;
let y = 0;

const COLORS = {
  emerald: [5, 150, 105],
  darkSlate: [15, 23, 42],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  white: [255, 255, 255],
  lightBg: [248, 250, 252],
  accent: [0, 229, 160],
};

function addPage() {
  doc.addPage();
  y = M;
}

function checkPage(needed = 20) {
  if (y + needed > 275) addPage();
}

function title(text, size = 22) {
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(text, M, y);
  y += size * 0.5 + 2;
}

function subtitle(text, size = 14) {
  checkPage(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...COLORS.emerald);
  doc.text(text, M, y);
  y += size * 0.45 + 2;
}

function sectionHeader(text) {
  checkPage(18);
  y += 4;
  doc.setFillColor(5, 150, 105);
  doc.rect(M, y - 4, CW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(text.toUpperCase(), M + 4, y + 1);
  y += 10;
}

function body(text, indent = 0) {
  checkPage(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.darkSlate);
  const lines = doc.splitTextToSize(text, CW - indent);
  for (const line of lines) {
    checkPage(6);
    doc.text(line, M + indent, y);
    y += 5;
  }
  y += 1;
}

function bullet(text, indent = 4) {
  checkPage(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text("•", M + indent, y);
  const lines = doc.splitTextToSize(text, CW - indent - 6);
  for (let i = 0; i < lines.length; i++) {
    checkPage(6);
    doc.text(lines[i], M + indent + 5, y);
    y += 5;
  }
  y += 1;
}

function subBullet(text) {
  bullet(text, 10);
}

function codeBlock(text) {
  checkPage(12);
  doc.setFillColor(241, 245, 249);
  const lines = doc.splitTextToSize(text, CW - 10);
  const h = lines.length * 4.5 + 4;
  doc.rect(M + 2, y - 3, CW - 4, h, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  for (const line of lines) {
    doc.text(line, M + 5, y);
    y += 4.5;
  }
  y += 3;
}

function separator() {
  y += 3;
  doc.setDrawColor(232, 237, 245);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 5;
}

function tableRow(cells, isHeader = false) {
  checkPage(10);
  const colWidths = cells.length === 2 ? [CW * 0.35, CW * 0.65] : cells.map(() => CW / cells.length);
  if (isHeader) {
    doc.setFillColor(248, 250, 252);
    doc.rect(M, y - 4, CW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate400);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkSlate);
  }
  let x = M + 2;
  for (let i = 0; i < cells.length; i++) {
    const maxW = colWidths[i] - 4;
    const lines = doc.splitTextToSize(cells[i], maxW);
    doc.text(lines[0], x, y);
    x += colWidths[i];
  }
  y += 6;
}

// ════════════════════════════════════════════════════════════════
// COVER PAGE
// ════════════════════════════════════════════════════════════════
doc.setFillColor(10, 37, 24);
doc.rect(0, 0, W, 297, "F");

// Grid pattern simulation
doc.setDrawColor(255, 255, 255);
doc.setLineWidth(0.05);
for (let gx = 0; gx < W; gx += 15) {
  doc.setDrawColor(255, 255, 255);
  doc.line(gx, 0, gx, 297);
}
for (let gy = 0; gy < 297; gy += 15) {
  doc.line(0, gy, W, gy);
}

// Cover content
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(0, 229, 160);
doc.text("PLINIUS CREDIT OS", M, 50);

doc.setFont("helvetica", "bold");
doc.setFontSize(32);
doc.setTextColor(236, 253, 245);
doc.text("Technical Analysis", M, 70);

doc.setFont("helvetica", "bold");
doc.setFontSize(22);
doc.setTextColor(255, 255, 255);
doc.text("Solicitante / Créditos", M, 82);

doc.setFont("helvetica", "normal");
doc.setFontSize(12);
doc.setTextColor(148, 163, 184);
doc.text("CTO-Level Architecture Review", M, 96);
doc.text("& Improvement Roadmap", M, 103);

// Metadata box
const boxY = 140;
doc.setFillColor(0, 229, 160, 0.08);
doc.setDrawColor(0, 229, 160);
doc.setLineWidth(0.3);
doc.roundedRect(M, boxY, CW, 52, 3, 3, "FD");

doc.setFont("courier", "normal");
doc.setFontSize(8);
doc.setTextColor(0, 229, 160);
doc.text("DOCUMENT METADATA", M + 6, boxY + 8);

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(209, 250, 229);
doc.text("Project:        Plinius — Credit OS Platform", M + 6, boxY + 18);
doc.text("Page:           /solicitante/creditos", M + 6, boxY + 25);
doc.text("File:           pliny/app/solicitante/creditos/page.tsx", M + 6, boxY + 32);
doc.text("Date:           April 27, 2026", M + 6, boxY + 39);
doc.text("Author:         CTO Office — Architecture Review", M + 6, boxY + 46);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(100, 116, 139);
doc.text("Confidential — Internal Use Only", M, 260);
doc.text("Generated with Claude Code — Anthropic", M, 267);

// ════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ════════════════════════════════════════════════════════════════
addPage();
title("Table of Contents", 18);
y += 4;

const toc = [
  ["1.", "Executive Summary"],
  ["2.", "Page Overview & Purpose"],
  ["3.", "Architecture & Component Breakdown"],
  ["4.", "Technology Stack"],
  ["5.", "Data Model & Database Schema"],
  ["6.", "Routing & Navigation"],
  ["7.", "Authentication & Security"],
  ["8.", "UI/UX Design System"],
  ["9.", "State Management & Data Flow"],
  ["10.", "Identified Issues & Technical Debt"],
  ["11.", "Improvement Roadmap"],
  ["12.", "Performance Considerations"],
  ["13.", "Platform Security Audit: Admin Auth Vulnerability"],
  ["14.", "Recommendations Summary"],
];

for (const [num, name] of toc) {
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.emerald);
  doc.text(num, M + 2, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(name, M + 14, y);
  y += 7;
}

// ════════════════════════════════════════════════════════════════
// 1. EXECUTIVE SUMMARY
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("1. Executive Summary");

body("The /solicitante/creditos page is a core component of the Plinius Credit OS platform. It serves as the borrower's (solicitante's) primary interface for monitoring their active credits, reviewing amortization schedules, and tracking payment progress. The page is built as a Next.js 16 client-side rendered component using Supabase as the backend-as-a-service for authentication and data persistence.");

y += 2;
body("This page operates within a larger solicitante portal that includes 8 sibling routes covering solicitudes, financiamiento, ofertas, mensajes, verificación, datos, and a credit score dashboard. The architecture follows a single-page-per-route pattern with no shared component library, which presents both simplicity and technical debt implications.");

y += 2;
subtitle("Key Findings");
bullet("The page is fully functional and delivers a clear credit management experience for borrowers.");
bullet("Architecture is monolithic per-page: all components, styles, and utilities are co-located in a single 402-line file.");
bullet("Heavy use of inline styles (no Tailwind or CSS modules) creates maintenance burden and prevents design system consistency.");
bullet("All data types are 'any' — no TypeScript interfaces for credits or pagos, losing type safety benefits.");
bullet("No error handling on Supabase queries — silent failures could leave users with blank screens.");
bullet("No pagination, search, or filtering — will degrade with scale.");

// ════════════════════════════════════════════════════════════════
// 2. PAGE OVERVIEW
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("2. Page Overview & Purpose");

subtitle("What This Page Does");
body("The créditos page is the borrower's credit portfolio dashboard. When a solicitante logs in and navigates to this route, they see:");

y += 1;
bullet("A KPI summary bar showing: active credits count, total outstanding balance, total original amount, and overdue count.");
bullet("A payment progress section showing visual progress bars for each active credit with saldo vs. monto original.");
bullet("A full credit table listing all credits (active, overdue, settled, restructured, written-off) with key metadata.");
bullet("A detail modal that opens on click, showing complete credit information including amortization schedule.");

y += 3;
subtitle("User Journey");
body("1. User lands on the page → auth check runs → if unauthenticated, redirect to /login.");
body("2. Credits are fetched from the 'credits' table filtered by client_id = auth.user.id.");
body("3. KPIs are computed client-side from the fetched data (no server aggregation).");
body("4. User clicks a credit row → modal opens → pagos (payments) are fetched for that specific credit.");
body("5. Amortization table renders inside the modal showing each payment's status, amounts, and dates.");

y += 3;
subtitle("Target User");
body("The primary user is a 'solicitante' (borrower/applicant) — typically a Mexican SME or individual who has applied for credit through the Plinius platform. They use this page to: monitor debt obligations, understand upcoming payments, check if any credits are overdue, and review the full amortization breakdown of each credit.");

// ════════════════════════════════════════════════════════════════
// 3. ARCHITECTURE & COMPONENT BREAKDOWN
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("3. Architecture & Component Breakdown");

subtitle("File Structure");
codeBlock("pliny/app/solicitante/creditos/page.tsx  (402 lines, single file)");

y += 2;
subtitle("Component Tree");
body("The file defines 8 components, all co-located:");
y += 1;

bullet("Ic — Inline SVG icon helper. Renders a 16x16 SVG path with configurable size and color. Used throughout for inline icons without an icon library dependency.");
bullet("fmt(n) — Currency formatter for compact display ($1.5M, $250K). Uses Mexican locale (es-MX).");
bullet("fmtFull(n) — Full currency formatter with 2 decimal places for precise amounts.");
bullet("fmtDate(d) — Date formatter for long format (e.g., '27 abr 2026').");
bullet("fmtDateShort(d) — Short date formatter without year.");
bullet("EstatusPill — Visual status badge with colored dot, background, and border. Supports 5 states: activo, vencido, liquidado, castigado, reestructurado.");
bullet("DPDBadge — 'Days Past Due' indicator. Shows 'Al corriente' if 0, otherwise shows day count with color severity (>90 days = critical red, >30 = warning amber).");
bullet("ProgressBar — Horizontal bar showing payment completion percentage. Calculates (total - current) / total.");
bullet("CreditDetail — Modal component for individual credit view. Fetches pagos on mount, shows KPIs, progress, next payment alert, and full amortization table.");
bullet("CreditosPage — Main page export. Handles auth, fetches credits, renders header, KPI cards, progress section, credits table, and conditionally renders the modal.");

y += 3;
subtitle("Data Constants");
body("Two configuration objects define visual metadata:");
y += 1;
bullet("ESTATUS_META — Maps 5 credit statuses to label/color/dot configurations for the EstatusPill component.");
bullet("PAGO_META — Maps 4 payment statuses (pagado, pendiente, vencido, parcial) to label/color pairs for the amortization table.");

// ════════════════════════════════════════════════════════════════
// 4. TECHNOLOGY STACK
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("4. Technology Stack");

subtitle("Core Framework");
tableRow(["Technology", "Details"], true);
tableRow(["Next.js", "v16.1.6 — App Router with 'use client' directive. This page is fully client-side rendered."]);
tableRow(["React", "v19.2.3 — Latest stable. Uses hooks (useState, useEffect) exclusively."]);
tableRow(["TypeScript", "v5.x — Used but with significant 'any' type escape hatches."]);

y += 3;
subtitle("Backend & Data");
tableRow(["Technology", "Details"], true);
tableRow(["Supabase", "v2.97.0 — PostgreSQL backend-as-a-service. Handles auth, database, and real-time subscriptions."]);
tableRow(["Supabase SSR", "v0.9.0 — Available but NOT used on this page (all queries are client-side)."]);
tableRow(["Auth", "Supabase Auth with session persistence, auto-refresh, and URL detection."]);

y += 3;
subtitle("Styling");
tableRow(["Technology", "Details"], true);
tableRow(["Inline Styles", "Primary approach — all component styles are written as React style objects."]);
tableRow(["<style> tag", "A CSS string injected for animations (fadeUp, spin), hover effects, and shared classes (.card, .crow)."]);
tableRow(["Geist Font", "Google Fonts import — 'Geist' (sans) and 'Geist Mono' (monospace) from Vercel's font family."]);
tableRow(["Tailwind CSS", "v4.x — Available in the project but NOT used on this page."]);

y += 3;
subtitle("Other Project Dependencies (Not Used on This Page)");
tableRow(["Package", "Purpose"], true);
tableRow(["jspdf + autotable", "PDF generation (used elsewhere in the platform, e.g., contracts/pagarés)."]);
tableRow(["docx", "Word document generation."]);
tableRow(["xlsx", "Excel export capability."]);
tableRow(["zod", "Schema validation (not applied on this page)."]);
tableRow(["resend", "Email delivery service."]);
tableRow(["lucide-react", "Icon library — available but this page uses custom SVG paths instead."]);
tableRow(["@nodecfdi/*", "Mexican SAT (tax authority) integration for fiscal credential handling."]);
tableRow(["validate-rfc", "RFC (Mexican tax ID) validation."]);
tableRow(["bcryptjs", "Password hashing."]);

// ════════════════════════════════════════════════════════════════
// 5. DATA MODEL
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("5. Data Model & Database Schema");

subtitle("Credits Table (Supabase: 'credits')");
body("The page queries the 'credits' table with SELECT * filtered by client_id. Based on field usage, the inferred schema is:");
y += 2;

tableRow(["Column", "Type / Usage"], true);
tableRow(["id", "UUID — Primary key, also used as fallback display (first 8 chars)."]);
tableRow(["client_id", "UUID — Foreign key to auth.users.id. Filters credits per borrower."]);
tableRow(["folio", "String — Human-readable credit identifier."]);
tableRow(["deudor", "String — Debtor name / company name."]);
tableRow(["estatus", "Enum — 'activo', 'vencido', 'liquidado', 'castigado', 'reestructurado'."]);
tableRow(["monto_original", "Numeric — Original loan amount."]);
tableRow(["saldo_actual", "Numeric — Current outstanding balance."]);
tableRow(["tasa_anual", "Numeric — Annual interest rate (percentage)."]);
tableRow(["plazo_meses", "Integer — Loan term in months."]);
tableRow(["tipo_credito", "String — Credit type description."]);
tableRow(["amortiza", "String — Amortization type/frequency."]);
tableRow(["dpd", "Integer — Days past due."]);
tableRow(["fecha_inicio", "Date — Loan start date."]);
tableRow(["fecha_vencimiento", "Date — Loan maturity date."]);
tableRow(["ultimo_pago", "Date — Last payment received date."]);
tableRow(["garantia", "String (nullable) — Collateral description."]);
tableRow(["notas", "String (nullable) — Additional notes."]);
tableRow(["created_at", "Timestamp — Record creation timestamp (used for ordering)."]);

y += 3;
subtitle("Pagos Table (Supabase: 'pagos')");
body("Fetched in the CreditDetail modal, filtered by credit_id:");
y += 2;

tableRow(["Column", "Type / Usage"], true);
tableRow(["id", "UUID — Primary key."]);
tableRow(["credit_id", "UUID — Foreign key to credits.id."]);
tableRow(["numero_pago", "Integer — Payment number in sequence."]);
tableRow(["fecha_vencimiento", "Date — Payment due date."]);
tableRow(["capital", "Numeric — Principal portion of payment."]);
tableRow(["interes", "Numeric — Interest portion."]);
tableRow(["iva_interes", "Numeric — VAT on interest (16% in Mexico)."]);
tableRow(["monto_total", "Numeric — Total payment amount."]);
tableRow(["status", "Enum — 'pagado', 'pendiente', 'vencido', 'parcial'."]);

// ════════════════════════════════════════════════════════════════
// 6. ROUTING
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("6. Routing & Navigation");

subtitle("Current Page Route");
codeBlock("/solicitante/creditos → pliny/app/solicitante/creditos/page.tsx");

y += 2;
subtitle("Parent Layout");
body("This page is wrapped by pliny/app/solicitante/layout.tsx which provides:");
bullet("A collapsible dark sidebar (240px open / 64px closed) with Plinius branding.");
bullet("Navigation to all 8 solicitante sub-routes.");
bullet("Authentication guard — redirects to /login if unauthenticated.");
bullet("Onboarding guard — redirects to /onboarding/solicitante if onboarding not complete.");
bullet("Real-time unread message badge via Supabase Realtime channels.");
bullet("Pending offers badge count.");
bullet("Company profile display and logout functionality.");

y += 3;
subtitle("Sibling Routes (Solicitante Portal)");
tableRow(["Route", "Purpose"], true);
tableRow(["/solicitante", "Dashboard home — overview page."]);
tableRow(["/solicitante/solicitudes", "Credit applications management."]);
tableRow(["/solicitante/financiamiento", "Financing options and marketplace."]);
tableRow(["/solicitante/ofertas", "Offers received from lenders (with pending badge)."]);
tableRow(["/solicitante/creditos", "THIS PAGE — Credit portfolio & amortization."]);
tableRow(["/solicitante/mensajes", "Messaging with lenders (with unread badge)."]);
tableRow(["/solicitante/verificacion", "Identity/business verification."]);
tableRow(["/solicitante/datos", "Personal/company data management."]);
tableRow(["/solicitante/score", "Credit score dashboard."]);

y += 3;
subtitle("Related Platform Routes");
tableRow(["Route Area", "Purpose"], true);
tableRow(["/dashboard/*", "Lender (otorgante) portal — mirror functionality for the other side."]);
tableRow(["/fondeador/*", "Funder portal — for investors funding credits."]);
tableRow(["/admin/*", "Admin panel — superadmin, contracts, pagarés, verifications."]);
tableRow(["/onboarding/*", "Multi-step onboarding for both borrowers and lenders."]);
tableRow(["/login, /register", "Authentication flows."]);

// ════════════════════════════════════════════════════════════════
// 7. AUTH & SECURITY
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("7. Authentication & Security");

subtitle("Authentication Flow");
body("The page implements a client-side auth guard:");
y += 1;
codeBlock("const { data: auth } = await supabase.auth.getUser();\nif (!auth.user) { router.push('/login'); return; }");

y += 2;
body("This runs inside a useEffect on mount. The parent layout (SolicitanteLayout) also has its own auth guard, creating a double-check. However, both are client-side, meaning:");
y += 1;
bullet("The page briefly renders before the auth check completes (flash of loading state).");
bullet("No server-side protection — the page HTML is delivered regardless of auth status.");
bullet("Row-Level Security (RLS) on Supabase should be the actual security boundary, not the client-side redirect.");

y += 3;
subtitle("Data Access Control");
body("Credits are filtered by client_id = auth.user.id, which is correct. However:");
bullet("If Supabase RLS policies are not properly configured, a malicious client could bypass the client_id filter and access other users' credits by modifying the query.");
bullet("The pagos query in CreditDetail filters by credit_id but does NOT verify that the credit belongs to the current user — this is a potential IDOR vulnerability if RLS is not enforced.");

y += 3;
subtitle("Security Recommendations");
bullet("CRITICAL: Verify that Supabase RLS policies on 'credits' and 'pagos' tables enforce user ownership.");
bullet("Move auth checks to middleware or server components to prevent unauthorized page loads.");
bullet("Avoid SELECT * — only request columns that the UI actually uses.");

// ════════════════════════════════════════════════════════════════
// 8. UI/UX DESIGN SYSTEM
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("8. UI/UX Design System");

subtitle("Typography");
bullet("Primary font: 'Geist' (Vercel's font) — loaded via Google Fonts CDN.");
bullet("Monospace: 'Geist Mono' — used for numeric data, codes, and labels.");
bullet("Weight scale: 300-900, heavily using 700 (bold) and 800 (extra-bold).");
bullet("Letter-spacing: negative tracking (-0.03em to -0.04em) for headings, positive tracking for labels.");

y += 3;
subtitle("Color Palette");
tableRow(["Token", "Hex / Usage"], true);
tableRow(["Primary", "#059669 (Emerald 600) — progress bars, active states, positive indicators."]);
tableRow(["Text Primary", "#0F172A (Slate 900) — main body text and headings."]);
tableRow(["Text Secondary", "#94A3B8 (Slate 400) — labels, subtitles, metadata."]);
tableRow(["Text Tertiary", "#64748B (Slate 500) — mid-priority information."]);
tableRow(["Success", "#10B981 (Emerald 500) — 'al corriente', zero balance, active dot."]);
tableRow(["Warning", "#F59E0B / #92400E — amber tones for pending and upcoming payments."]);
tableRow(["Danger", "#F43F5E / #9F1239 — red/rose for overdue, vencido status."]);
tableRow(["Card BG", "#F8FAFC (Slate 50) — card interior backgrounds."]);
tableRow(["Border", "#E8EDF5 — card and section borders."]);

y += 3;
subtitle("Animation");
bullet("fadeUp — Entry animation with 8px translateY and opacity. 350ms with cubic-bezier(.16,1,.3,1).");
bullet("Staggered delays: .d1 (50ms), .d2 (100ms), .d3 (150ms) for cascading card entrances.");
bullet("spin — Loading spinner rotation at 700ms linear.");
bullet("Hover transitions: 120ms background change on credit rows.");

y += 3;
subtitle("Layout Patterns");
bullet("CSS Grid for KPI cards (4 columns) and amortization table (7 columns).");
bullet("Fixed-position modal with backdrop blur (4px) and dark overlay (45% opacity).");
bullet("85vh max-height modal with internal scroll for amortization table (260px max).");
bullet("Responsive concerns: Grid columns are fixed — no media queries exist. This will break on mobile.");

// ════════════════════════════════════════════════════════════════
// 9. STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("9. State Management & Data Flow");

subtitle("Component State (CreditosPage)");
tableRow(["State Variable", "Type / Purpose"], true);
tableRow(["credits", "any[] — Full list of user's credits from Supabase."]);
tableRow(["loading", "boolean — Controls skeleton/spinner display during fetch."]);
tableRow(["selected", "any | null — Currently selected credit for modal display."]);

y += 3;
subtitle("Component State (CreditDetail Modal)");
tableRow(["State Variable", "Type / Purpose"], true);
tableRow(["pagos", "any[] — Payment schedule for the selected credit."]);
tableRow(["loading", "boolean — Controls loading state inside the modal."]);

y += 3;
subtitle("Derived State (Computed on Every Render)");
tableRow(["Variable", "Computation"], true);
tableRow(["activos", "credits.filter(c => c.estatus === 'activo')"]);
tableRow(["totalSaldo", "Sum of saldo_actual for active credits."]);
tableRow(["totalOrig", "Sum of monto_original for active credits."]);
tableRow(["vencidos", "Count of credits with estatus === 'vencido'."]);
tableRow(["pagados (modal)", "Count of pagos with status === 'pagado'."]);
tableRow(["proxPago (modal)", "First pago with status 'pendiente' or 'vencido'."]);

y += 3;
subtitle("Data Flow Diagram");
codeBlock("Mount → auth.getUser() → credits.select(*) → setState\n                                                    ↓\n                                        KPIs computed (client-side)\n                                        Table rendered\n                                                    ↓\n                                    Click row → setSelected(credit)\n                                                    ↓\n                              Modal mounts → pagos.select(*) → setState\n                                                    ↓\n                                        Amortization table rendered");

// ════════════════════════════════════════════════════════════════
// 10. ISSUES & TECH DEBT
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("10. Identified Issues & Technical Debt");

subtitle("P0 — Critical");

bullet("No error handling on Supabase queries: If the credits query fails, the page silently shows an empty state with no error feedback. The user has no way to distinguish 'no credits' from 'query failed'. Same issue in the CreditDetail modal for pagos.");
y += 1;
bullet("Potential IDOR on pagos: The CreditDetail component fetches pagos by credit_id without verifying that the credit belongs to the authenticated user. If RLS is not configured, any user could view another user's amortization schedule by manipulating the credit object.");
y += 1;
bullet("No TypeScript types: All data is typed as 'any'. This means no compile-time validation, no autocomplete, and no refactoring safety. A typo in a field name (e.g., 'estatus' vs 'status') would silently fail at runtime.");

y += 3;
subtitle("P1 — High Priority");

bullet("No pagination or virtual scrolling: All credits are fetched with SELECT * in a single query. For a user with 100+ credits, this will cause slow load times and high memory usage.");
y += 1;
bullet("SELECT * antipattern: Fetching all columns when only ~15 are used wastes bandwidth and exposes potentially sensitive data to the client.");
y += 1;
bullet("Inline styles everywhere: ~200 style objects are defined inline, making the code difficult to read, impossible to theme, and preventing hover/focus/media-query styling without the <style> tag workaround.");
y += 1;
bullet("No responsive design: The 4-column KPI grid and 7-column amortization table have fixed widths. On screens below ~900px, content will overflow or compress illegibly.");
y += 1;
bullet("Double auth guard: Both the layout and the page run supabase.auth.getUser() independently. This is redundant and doubles the auth request on page load.");

y += 3;
subtitle("P2 — Medium Priority");

bullet("Stale data: Credits are fetched once on mount. If a payment is made in another tab or by an admin, the page won't reflect the change until refresh. No Supabase Realtime subscription exists for credits/pagos (unlike mensajes in the layout).");
y += 1;
bullet("No loading skeleton: The KPI cards show a gray rectangle during load, but it's not a proper skeleton. The progress section and table have better loading states but could benefit from content-aware skeletons.");
y += 1;
bullet("Modal not keyboard-accessible: No ESC key handler, no focus trap, no aria attributes. Screen readers cannot identify the modal or its purpose.");
y += 1;
bullet("Custom SVG icons instead of lucide-react: The project has lucide-react installed (v0.576.0) but this page creates custom SVG paths via the Ic component. This is inconsistent with other parts of the platform that may use lucide.");

// ════════════════════════════════════════════════════════════════
// 11. IMPROVEMENT ROADMAP
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("11. Improvement Roadmap");

subtitle("Phase 1 — Stability & Security (1-2 Weeks)");

bullet("Add TypeScript interfaces for Credit and Pago types. Replace all 'any' with proper types.");
subBullet("Define: interface Credit { id: string; folio: string; deudor: string; estatus: CreditStatus; ... }");
subBullet("Define: type CreditStatus = 'activo' | 'vencido' | 'liquidado' | 'castigado' | 'reestructurado';");

y += 1;
bullet("Implement error handling with user-facing error states:");
subBullet("Show error banner when query fails with retry button.");
subBullet("Distinguish empty state from error state.");

y += 1;
bullet("Audit and enforce Supabase RLS policies on 'credits' and 'pagos' tables.");
bullet("Replace SELECT * with explicit column lists.");
bullet("Add ESC key handler and focus trap to the CreditDetail modal.");

y += 4;
subtitle("Phase 2 — UX & Performance (2-4 Weeks)");

bullet("Migrate inline styles to Tailwind CSS classes (already installed in the project).");
bullet("Add responsive breakpoints: stack KPI cards to 2x2 on tablet, 1-column on mobile.");
bullet("Implement pagination or infinite scroll for the credits table.");
bullet("Add search/filter by estatus, folio, deudor, date range.");
bullet("Add Supabase Realtime subscription for credit status changes and payment updates.");
bullet("Extract reusable components (EstatusPill, ProgressBar, DPDBadge) to a shared component library.");

y += 4;
subtitle("Phase 3 — Features & Scale (1-2 Months)");

bullet("Server-side rendering: Move the initial data fetch to a server component for faster first paint and SEO.");
bullet("Add export functionality: PDF statement per credit, Excel export of amortization table (jspdf/xlsx already in deps).");
bullet("Payment action integration: Allow solicitantes to initiate or confirm payments from the detail modal.");
bullet("Push notifications: Notify when a payment is approaching due date or becomes overdue.");
bullet("Analytics dashboard: Historical trends, payment patterns, credit utilization charts.");
bullet("Consolidate auth to middleware using Next.js middleware.ts + Supabase SSR.");

// ════════════════════════════════════════════════════════════════
// 12. PERFORMANCE
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("12. Performance Considerations");

subtitle("Current Performance Profile");
body("The page has two data-fetching waterfalls:");
y += 1;
codeBlock("Waterfall 1 (on mount):\n  auth.getUser()  →  credits.select(*)  →  render\n  ~200ms            ~300-500ms            ~50ms\n\nWaterfall 2 (on modal open):\n  pagos.select(*)  →  render\n  ~200-400ms         ~30ms");

y += 3;
bullet("Total time to interactive: ~550-750ms for the main page, plus ~200-400ms additional for each modal open.");
bullet("No caching: Every mount triggers a fresh Supabase query. React Query or SWR could cache and deduplicate.");
bullet("No prefetching: When hovering over a credit row, pagos could be prefetched to make modal opening instant.");
bullet("Google Fonts: External font loading adds ~100-300ms on cold cache. Consider using next/font for self-hosting.");

y += 3;
subtitle("Bundle Impact");
bullet("The <style> tag with @import for Google Fonts blocks rendering until the font CSS is loaded. This is a render-blocking resource.");
bullet("The custom Ic SVG component is lightweight (~3 lines) but creates new SVG elements on every render. For static icons, these could be memoized.");
bullet("No code splitting beyond Next.js defaults. The modal component (CreditDetail) could be lazy-loaded with React.lazy() since it's not needed until a user clicks.");

y += 3;
subtitle("Scalability Concerns");
bullet("At 1,000+ credits: The client-side filter/reduce for KPIs would process all records on every render. Move aggregation to a Supabase view or RPC function.");
bullet("At 100+ pagos per credit: The 260px scrollable amortization table handles this reasonably, but virtual scrolling would be beneficial for very long-term credits (e.g., 360 months).");

// ════════════════════════════════════════════════════════════════
// 13. PLATFORM SECURITY AUDIT: ADMIN AUTH VULNERABILITY
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("13. Platform Security Audit: Admin Auth Vulnerability");

y += 2;
// Red alert box
doc.setFillColor(255, 241, 242);
doc.setDrawColor(254, 205, 211);
doc.setLineWidth(0.5);
doc.roundedRect(M, y - 3, CW, 16, 3, 3, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(159, 18, 57);
doc.text("CRITICAL — Shared Auth Surface Between Admin and User Login", M + 6, y + 5);
y += 20;

body("During the analysis of the /solicitante/creditos page's auth flow, a platform-wide security vulnerability was identified in how admin authentication is structured relative to user authentication. Both /login (users) and /admin/login (admins) authenticate against the same Supabase auth instance, the same auth.users table, and the same anon key. The differentiation between admin and user roles is enforced entirely on the client side.");

y += 3;
subtitle("Current Architecture");
codeBlock("User Login (/login)                    Admin Login (/admin/login)\n        \\                                    /\n         \\                                  /\n          → Same supabaseClient.ts ←\n          → Same auth.users table  ←\n          → Same anon key          ←\n                    |\n         localStorage 'bcl_session'\n         { role: 'client' | 'super_admin' }");

y += 3;
subtitle("What Admin Login Does Right");
bullet("Checks the 'super_admins' table after Supabase auth to verify the user has admin access.");
bullet("Requires TOTP MFA (2FA via authenticator app) — enrolled via Supabase MFA API.");
bullet("Signs out the user immediately if they are not found in the super_admins table.");

y += 3;
subtitle("Critical Vulnerabilities Identified");
y += 1;

// Vuln 1
doc.setFillColor(255, 247, 237);
doc.setDrawColor(254, 215, 170);
doc.setLineWidth(0.3);
checkPage(24);
doc.roundedRect(M, y - 3, CW, 20, 2, 2, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(154, 52, 18);
doc.text("V1: localStorage-Based Authorization (Trivially Bypassable)", M + 4, y + 2);
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
const v1lines = doc.splitTextToSize("Session role is stored in localStorage key 'bcl_session'. Functions like requireSuperAdminSession() simply read this value. Any user can open DevTools, set role to 'super_admin', and bypass all client-side route guards for /admin/*.", CW - 8);
let v1y = y + 7;
for (const line of v1lines) { doc.text(line, M + 4, v1y); v1y += 4; }
y += 24;

// Vuln 2
checkPage(24);
doc.setFillColor(255, 247, 237);
doc.setDrawColor(254, 215, 170);
doc.roundedRect(M, y - 3, CW, 20, 2, 2, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(154, 52, 18);
doc.text("V2: No Server-Side Route Protection (No middleware.ts)", M + 4, y + 2);
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
const v2lines = doc.splitTextToSize("The project has no Next.js middleware.ts file. The /admin page HTML, JavaScript bundle, and component code are served to every visitor regardless of authentication status. Supabase SSR package is installed (v0.9.0) but unused.", CW - 8);
let v2y = y + 7;
for (const line of v2lines) { doc.text(line, M + 4, v2y); v2y += 4; }
y += 24;

// Vuln 3
checkPage(24);
doc.setFillColor(255, 247, 237);
doc.setDrawColor(254, 215, 170);
doc.roundedRect(M, y - 3, CW, 20, 2, 2, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(154, 52, 18);
doc.text("V3: Admin Emails Hardcoded in Client Bundle", M + 4, y + 2);
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
const v3lines = doc.splitTextToSize("lib/auth.ts exports SUPER_ADMIN_EMAILS and ADMIN_EMAILS as Sets containing real email addresses (e.g., luis@crowdlink.mx, jero@crowdlink.mx). These are compiled into the client-side JS bundle and visible to anyone inspecting the source.", CW - 8);
let v3y = y + 7;
for (const line of v3lines) { doc.text(line, M + 4, v3y); v3y += 4; }
y += 24;

// Vuln 4
checkPage(24);
doc.setFillColor(255, 247, 237);
doc.setDrawColor(254, 215, 170);
doc.roundedRect(M, y - 3, CW, 20, 2, 2, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(154, 52, 18);
doc.text("V4: Cross-Login Probing", M + 4, y + 2);
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
const v4lines = doc.splitTextToSize("A regular user who logged in via /login can navigate to /admin/login, re-enter the same credentials, and discover whether they exist in the super_admins table via the error message 'No tienes acceso al panel de administracion'. This leaks role membership.", CW - 8);
let v4y = y + 7;
for (const line of v4lines) { doc.text(line, M + 4, v4y); v4y += 4; }
y += 24;

subtitle("Attack Scenario — Full Chain");
y += 1;
codeBlock("1. Attacker logs in as regular user via /login\n2. Opens DevTools → Console:\n   localStorage.setItem('bcl_session',\n     JSON.stringify({role:'super_admin',email:'x@y.com'}))\n3. Navigates to /admin\n4. All client-side guards pass (requireSuperAdminSession reads localStorage)\n5. Admin panel renders — attacker sees admin UI\n6. ONLY barrier: Supabase RLS policies on the DB queries\n   the admin panel makes (if configured correctly)");

y += 3;
subtitle("Affected Files");
tableRow(["File", "Issue"], true);
tableRow(["lib/auth.ts", "Session stored in localStorage; admin emails hardcoded in client bundle."]);
tableRow(["app/admin/login/AdminLoginClient.tsx", "Auth + super_admins check is good, but bypassable via localStorage."]);
tableRow(["app/admin/SuperAdminClient.tsx", "Admin panel with no server-side protection."]);
tableRow(["app/login/page.tsx", "User login uses same Supabase client; role stored in localStorage."]);
tableRow(["(missing) middleware.ts", "Does not exist — no server-side route guards."]);

y += 3;
subtitle("Recommended Fix — Priority Order");
y += 1;

bullet("P0 — Create middleware.ts: Use Next.js middleware with Supabase SSR to validate auth server-side for /admin/* routes. Redirect unauthenticated or non-admin users before the page JS is even delivered.");
y += 1;
codeBlock("// middleware.ts (simplified)\nimport { createServerClient } from '@supabase/ssr'\nimport { NextResponse } from 'next/server'\n\nexport async function middleware(request) {\n  const supabase = createServerClient(...)\n  const { data: { user } } = await supabase.auth.getUser()\n  if (request.nextUrl.pathname.startsWith('/admin')) {\n    if (!user) return NextResponse.redirect('/login')\n    const { data: sa } = await supabase\n      .from('super_admins').select('user_id')\n      .eq('user_id', user.id).maybeSingle()\n    if (!sa) return NextResponse.redirect('/login')\n  }\n}");

y += 2;
bullet("P0 — Move admin session validation to server-side: Never trust localStorage for authorization. Use httpOnly cookies or Supabase SSR session tokens that cannot be manipulated client-side.");
y += 1;
bullet("P0 — Remove hardcoded admin emails from client bundle: Move ADMIN_EMAILS and SUPER_ADMIN_EMAILS to server-only code (e.g., env vars or DB-only checks). Mark the file with 'server-only' import.");
y += 1;
bullet("P1 — Separate admin auth surface: Consider using a different Supabase project for admin, or at minimum enforce strict RLS so admin panel queries fail without server-validated admin session.");
y += 1;
bullet("P1 — Add rate limiting on /admin/login: Prevent credential stuffing and brute-force attacks against the admin endpoint.");
y += 1;
bullet("P2 — Separate deployment: Deploy the admin panel on a different subdomain (e.g., admin.plinius.mx) with its own auth flow, making reconnaissance harder and blast radius smaller.");
y += 1;
bullet("P2 — Generic error messages: Change 'No tienes acceso al panel de administracion' to a generic 'Credenciales invalidas' to prevent role membership enumeration.");

// ════════════════════════════════════════════════════════════════
// 14. RECOMMENDATIONS SUMMARY
// ════════════════════════════════════════════════════════════════
addPage();
sectionHeader("14. Recommendations Summary");

y += 2;
subtitle("Priority Matrix");
y += 2;

const recs = [
  ["P0", "Create middleware.ts for /admin/* server-side auth", "1-2 days", "Blocks localStorage bypass attack"],
  ["P0", "Move admin session to server-side (httpOnly cookies)", "1-2 days", "Eliminates client-side role spoofing"],
  ["P0", "Remove hardcoded admin emails from client bundle", "0.5 days", "Prevents admin identity enumeration"],
  ["P0", "Add TypeScript interfaces for all data types", "1-2 days", "Type safety, refactor confidence"],
  ["P0", "Add error handling on all Supabase queries", "1 day", "User trust, debuggability"],
  ["P0", "Audit RLS policies on credits/pagos tables", "0.5 days", "Data security, IDOR prevention"],
  ["P1", "Separate admin auth surface from user auth", "2-3 days", "Defense in depth, blast radius"],
  ["P1", "Add rate limiting on /admin/login", "1 day", "Prevents brute-force attacks"],
  ["P1", "Replace SELECT * with explicit columns", "0.5 days", "Performance, security"],
  ["P1", "Add responsive design / mobile support", "2-3 days", "Mobile user experience"],
  ["P1", "Migrate to Tailwind CSS (project already uses it)", "2-3 days", "Consistency, maintainability"],
  ["P1", "Add pagination to credits table", "1-2 days", "Scalability"],
  ["P1", "Deduplicate auth guard (layout already handles it)", "0.5 days", "Performance, clean code"],
  ["P2", "Use generic error messages on admin login", "0.5 days", "Prevents role membership leaking"],
  ["P2", "Consider separate admin subdomain deployment", "3-5 days", "Isolation, reconnaissance defense"],
  ["P2", "Add keyboard accessibility to modal", "1 day", "Accessibility compliance"],
  ["P2", "Implement Realtime subscriptions for live updates", "1-2 days", "Data freshness"],
  ["P2", "Extract shared components to component library", "2-3 days", "Reusability across portal"],
  ["P2", "Add search/filter capabilities", "2-3 days", "User productivity"],
  ["P3", "Server-side rendering migration", "3-5 days", "Performance, SEO"],
  ["P3", "Lazy-load CreditDetail modal", "0.5 days", "Bundle size"],
  ["P3", "Use next/font instead of Google Fonts @import", "0.5 days", "Performance"],
];

for (const [pri, desc, effort, impact] of recs) {
  checkPage(12);
  const priColor = pri === "P0" ? [159, 18, 57] : pri === "P1" ? [146, 64, 14] : pri === "P2" ? [30, 64, 175] : [100, 116, 139];
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...priColor);
  doc.text(pri, M + 2, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkSlate);
  const descLines = doc.splitTextToSize(desc, CW * 0.48);
  doc.text(descLines[0], M + 16, y);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate500);
  doc.text(effort, M + CW * 0.56, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate400);
  const impLines = doc.splitTextToSize(impact, CW * 0.25);
  doc.text(impLines[0], M + CW * 0.72, y);

  y += 6;
}

y += 6;
separator();

subtitle("Final Assessment");
body("The /solicitante/creditos page is a solid, functional credit dashboard that serves its core purpose well. The UI design is polished and the data presentation is thoughtful — the combination of KPI cards, progress bars, and detail modals creates a good user experience for borrowers monitoring their credit portfolio.");

y += 2;
body("However, the analysis uncovered two categories of urgent work. First, the page-level technical debt: missing TypeScript types, absent error handling, and no responsive design. Second — and more critically — a platform-wide security vulnerability where admin authentication relies on client-side localStorage role checks with no server-side middleware. This means any authenticated user can escalate to admin privileges by editing localStorage.");

y += 2;
body("The recommended approach is: (1) Immediately create middleware.ts to protect /admin/* routes server-side and remove hardcoded admin emails from the client bundle — this is a 1-2 day effort that closes the most dangerous attack vector. (2) Address the page-level P0 items (types, error handling, RLS audit) within the same sprint. (3) Work through P1 and P2 items systematically over the following 2-4 weeks as the platform matures.");

// ════════════════════════════════════════════════════════════════
// FOOTER ON ALL PAGES
// ════════════════════════════════════════════════════════════════
const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  if (i > 1) {
    doc.text(`Plinius Credit OS — Technical Analysis — /solicitante/creditos`, M, 290);
    doc.text(`Page ${i} of ${totalPages}`, W - M - 20, 290);
  }
}

// Save
const buffer = doc.output("arraybuffer");
fs.writeFileSync("s:/Plinius/pliny/Creditos_Page_Analysis.pdf", Buffer.from(buffer));
console.log("PDF generated: s:/Plinius/pliny/Creditos_Page_Analysis.pdf");
