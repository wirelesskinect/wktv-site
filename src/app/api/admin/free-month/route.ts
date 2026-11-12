import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { adminSupabase } from '@/lib/supabase-server'
import { getPlan } from '@/lib/plans'
import { nxtConfigured, monthPackageForConnections, findLine, extendLine, setLineEnabled, NxtError } from '@/lib/nxt'
import { insertPayment, FREE_METHODS } from '@/lib/sales'

export const dynamic = 'force-dynamic'

const REASONS = ['referral', 'free'] as const

// Admin: give a customer 1 free month on their existing TV line.
// Extends the line on the IPTV panel (same number of connections) and records it as a $0
// "free month" so the sales dashboard can count it without treating it as revenue.
// Body: { userId, reason: 'referral' | 'free', note?, referredUserId? }
//   referredUserId: when paying out a referral from the Referrals list, the friend who bought.
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reason: (typeof REASONS)[number] = (REASONS as readonly string[]).includes(body?.reason) ? body.reason : 'referral'
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 120) : ''
  const referredUserId = typeof body?.referredUserId === 'string' ? body.referredUserId : ''
  let userId = typeof body?.userId === 'string' ? body.userId : ''

  // Paying out a tracked referral: find the referrer and claim the reward so it can't be given twice
  let referredEmail = ''
  if (referredUserId) {
    const { data: friend } = await adminSupabase
      .from('users')
      .select('id, email, referred_by, referred_by_user_id, referral_reward_at')
      .eq('id', referredUserId)
      .maybeSingle()
    if (!friend?.referred_by) return NextResponse.json({ error: 'This customer wasn’t referred by anyone.' }, { status: 404 })
    if (friend.referral_reward_at) return NextResponse.json({ error: 'The free month for this referral was already given.' }, { status: 409 })
    if (!friend.referred_by_user_id) {
      return NextResponse.json({ error: `"${friend.referred_by}" doesn’t match a website account, so the free month can’t be added automatically. Add it on your panel by hand.` }, { status: 400 })
    }
    userId = friend.referred_by_user_id
    referredEmail = friend.email
  }
  if (!userId) return NextResponse.json({ error: 'Choose a customer.' }, { status: 400 })

  const [{ data: user }, { data: sub }] = await Promise.all([
    adminSupabase.from('users').select('id, email').eq('id', userId).maybeSingle(),
    adminSupabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  if (!sub?.iptv_username) {
    return NextResponse.json({ error: 'This account has no TV line yet. Use “Add plan” to connect their line first.' }, { status: 400 })
  }
  if (getPlan(sub.plan_id)?.kind === 'lifetime') {
    return NextResponse.json({ error: `${sub.iptv_username} has a lifetime plan, so a free month wouldn’t add anything.` }, { status: 400 })
  }
  const connections = sub.connections || getPlan(sub.plan_id)?.connections || 1

  // Claim the referral first (only one request can win), and release it again if the panel step fails
  const releaseReferral = async () => {
    if (referredUserId) await adminSupabase.from('users').update({ referral_reward_at: null }).eq('id', referredUserId)
  }
  if (referredUserId) {
    const { data: claimed, error } = await adminSupabase
      .from('users')
      .update({ referral_reward_at: new Date().toISOString() })
      .eq('id', referredUserId)
      .is('referral_reward_at', null)
      .select('id')
    if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
    if (!claimed?.length) return NextResponse.json({ error: 'The free month for this referral was already given.' }, { status: 409 })
  }

  let expiresAt: Date | null = null
  let mode: 'panel' | 'manual' = 'manual'
  if (nxtConfigured()) {
    if (!sub.iptv_password) {
      await releaseReferral()
      return NextResponse.json({ error: `No password is saved for "${sub.iptv_username}". Click “Edit plan”, enter their TV password, save, then try again.` }, { status: 400 })
    }
    try {
      const pkg = await monthPackageForConnections(connections)
      if (!pkg) {
        await releaseReferral()
        return NextResponse.json({ error: `Couldn’t find a 1-month, ${connections}-connection package on your panel. Nothing was changed.` }, { status: 400 })
      }
      const line = await findLine(sub.iptv_username, sub.iptv_password)
      if (!line) {
        await releaseReferral()
        return NextResponse.json({ error: `Couldn’t find "${sub.iptv_username}" on the panel with the saved password. Click “Edit plan” to fix the password, then try again. Nothing was changed.` }, { status: 409 })
      }
      expiresAt = await extendLine(line.id, pkg.id)
      if (line.enabled === false) await setLineEnabled(line.id, true)
      if (!expiresAt) expiresAt = (await findLine(sub.iptv_username, sub.iptv_password))?.expiresAt || null
      mode = 'panel'
    } catch (err) {
      console.error('free month panel error:', err)
      await releaseReferral()
      const msg = err instanceof NxtError ? `IPTV panel: ${err.message}` : 'The panel didn’t respond. Nothing was changed; try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  } else {
    const current = sub.expires_at ? new Date(sub.expires_at) : null
    expiresAt = current && current > new Date() ? new Date(current) : new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  // Only the date changes: their plan, price and connections stay the same
  const { error: subError } = await adminSupabase
    .from('user_subscriptions')
    .update({ status: 'active', expires_at: expiresAt ? expiresAt.toISOString() : sub.expires_at, updated_at: new Date().toISOString() })
    .eq('id', sub.id)
  if (subError) console.error('free month save error:', subError)

  const label = reason === 'referral' ? 'Free month (referral)' : 'Free month'
  const detail = [referredEmail ? `referred ${referredEmail}` : '', note].filter(Boolean).join(' · ')
  const payError = await insertPayment({
    user_id: userId,
    subscription_id: sub.id,
    amount_cents: 0,
    payment_method: reason === 'referral' ? FREE_METHODS[0] : FREE_METHODS[1],
    payment_reference: `${label}${detail ? `: ${detail}` : ''}`,
    status: 'completed',
    plan_id: `free-${connections}`,
  })
  if (payError) console.error('free month record error:', payError)

  const when = expiresAt ? expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : 'unknown'
  return NextResponse.json({
    success: true,
    message: mode === 'panel'
      ? `Added 1 free month to ${sub.iptv_username} on the IPTV panel (${connections} connection${connections > 1 ? 's' : ''}). New expiration: ${when}.${subError ? ' The website’s date didn’t save; refresh and check it.' : ''}`
      : `Added 1 free month to ${sub.iptv_username} on the website (manual mode, panel not connected: add 1 month on your panel too). New expiration: ${when}.`,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  })
}
