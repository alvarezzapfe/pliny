import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      <div className="pl-[260px]">
        <div className="mx-auto max-w-[1480px] px-6 py-6">
          {/* wrapper sin “encerrar todo” demasiado */}
          <main className="min-h-[calc(100vh-48px)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}