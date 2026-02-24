import React from "react";
import Topbar from "@/components/ui/Topbar";

export default function PageShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} right={right} />
      <div className="p-6">{children}</div>
    </div>
  );
}