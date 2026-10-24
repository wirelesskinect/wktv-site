import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { nxtConfigured, accountInfo, listPackages, packageIdForPlan } from '@/lib/nxt'
import { PLAN_LIST } from '@/lib/plans'

export const dynamic = 'force-dynamic'

// Admin: test the IPTV panel connection and show packages + plan mapping
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plans = PLAN_LIST.map((p) => ({ id: p.id, name: p.name, packageId: packageIdForPlan(p.id) }))
  const missing = [
    !process.env.NXT_API_TOKEN && 'NXT_API_TOKEN',
    !(process.env.NXT_PANEL_DNS || process.env.IPTV_PANEL_URL) && 'NXT_PANEL_DNS',
    !process.env.IPTV_PANEL_USER && 'IPTV_PANEL_USER',
    !process.env.IPTV_PANEL_PASS && 'IPTV_PANEL_PASS',
  ].filter(Boolean)

  if (!nxtConfigured()) {
    return NextResponse.json({ connected: false, missing, plans })
  }

  try {
    const account = await accountInfo()
    // Only show harmless account fields
    const summary: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(account?.data ?? account ?? {})) {
      if (/pass|token|secret|key/i.test(k)) continue
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) summary[k] = v
    }
    const [official, trial] = await Promise.all([
      listPackages(false).catch(() => []),
      listPackages(true).catch(() => []),
    ])
    return NextResponse.json({ connected: true, account: summary, packages: { official, trial }, plans })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err?.message || 'Connection failed', plans })
  }
}
