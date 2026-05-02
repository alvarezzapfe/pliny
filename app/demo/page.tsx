import { Suspense } from "react";
import DemoWizard from "./DemoWizard";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#091530" }} />}>
      <DemoWizard />
    </Suspense>
  );
}
