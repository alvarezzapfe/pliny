import ClientDetail from "./ClientDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDetail clientId={decodeURIComponent(id)} />;
}
