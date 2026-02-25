import ClientDashboard from "./ClientDashboard";

import SatPullPanel from "@/components/sat/SatPullPanel";
import SatMetricsCard from "@/components/sat/SatMetricsCard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDashboard clientId={decodeURIComponent(id)} />;
}