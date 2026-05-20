import DealDetail from "./DealDetail";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <DealDetail slug={slug} dealId={id} />;
}
