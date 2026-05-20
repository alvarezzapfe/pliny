import InvitationLanding from "./InvitationLanding";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitationLanding token={token} />;
}
