import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#091530" }} />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
