import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      {/* deja espacio del sidebar */}
      <div className="pl-[260px]">
        <div className="mx-auto max-w-[1480px] px-6 py-6">
          <main className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}