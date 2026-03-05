import { Suspense } from "react";
import LeadClient from "./LeadClient";

export default function LeadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0A2518,#051A10)" }} />}>
      <LeadClient />
    </Suspense>
  );
}
