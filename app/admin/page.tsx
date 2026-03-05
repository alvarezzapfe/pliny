import { Suspense } from "react";
import SuperAdminClient from "./SuperAdminClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F8FAFC" }} />}>
      <SuperAdminClient />
    </Suspense>
  );
}
