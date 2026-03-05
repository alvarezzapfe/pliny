import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F8FAFC" }} />}>
      <AdminLoginClient />
    </Suspense>
  );
}
