import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionCookieName } from '@/lib/auth'
import { getPlan } from '@/lib/plans'
import { applyPromo } from '@/lib/promo'

export const dynamic = 'force-dynamic'

// Checkout: check a promo code for a plan. Body: { planId, code }
// The real price is worked out again on the server when the order is placed.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(getSessionCookieName())?.value
  const user = token ? await getSession(token) : null
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan = getPlan(body?.planId)
  if (!plan) return NextResponse.json({ ok: false, error: 'Please choose a valid plan.' }, { status: 400 })
  const result = applyPromo(plan, body?.code)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
