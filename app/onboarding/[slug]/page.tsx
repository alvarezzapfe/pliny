import { notFound } from 'next/navigation'
import { OnboardingLanding } from '@/components/onboarding/OnboardingLanding'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { UpgradeRequiredScreen } from '@/components/onboarding/UpgradeRequiredScreen'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ start?: string }>
}

async function getLenderWithToken(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.plinius.mx'
  const res = await fetch(`${base}/api/onboarding/${slug}/token`, { cache: 'no-store' })
  if (res.status === 402) return { __requires_pro: true }
  if (!res.ok) return null
  return res.json()
}

async function getFlow(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.plinius.mx'
  const res = await fetch(`${base}/api/onboarding/${slug}`, { next: { revalidate: 60 } })
  if (res.status === 402) return { __requires_pro: true }
  if (!res.ok) return null
  return res.json()
}

export default async function OnboardingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { start } = await searchParams

  const [tokenData, ctx] = await Promise.all([
    getLenderWithToken(slug),
    getFlow(slug),
  ])

  // Plan gating: show upgrade screen
  if (
    (tokenData && '__requires_pro' in tokenData) ||
    (ctx && '__requires_pro' in ctx)
  ) {
    return <UpgradeRequiredScreen />
  }

  if (!tokenData || !ctx) notFound()

  const { token } = tokenData
  const { lender, flow } = ctx

  if (start === '1') {
    return (
      <main className="min-h-screen bg-gray-50">
        <OnboardingWizard lender={lender} flow={flow} apiKey={token} useToken />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <OnboardingLanding lender={lender} flow={flow} />
    </main>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ctx = await getFlow(slug)
  if (!ctx || '__requires_pro' in ctx) return {}
  return {
    title: `${ctx.lender.name} — Solicitud de crédito`,
    description: `Completa tu solicitud con ${ctx.lender.name}. Proceso 100% digital.`,
  }
}
