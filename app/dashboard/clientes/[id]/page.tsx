import ClientDashboard from "./ClientDashboard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDashboard clientId={decodeURIComponent(id)} />;
}