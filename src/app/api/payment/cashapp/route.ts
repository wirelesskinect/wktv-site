import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, getSessionCookieName } from '@/lib/auth'
import { getPlan } from '@/lib/plans'
import { normalizeUsername, usernameError, passwordError } from '@/lib/iptv-login'

export const dynamic = 'force-dynamic'

// Admin client for database operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'wktv' },
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

// Send Pushover notification
async function sendPushover(title: string, message: string) {
  const PUSHOVER_APP_TOKEN = process.env.PUSHOVER_APP_TOKEN
  const PUSHOVER_USER_KEY = process.env.WKTV_PUSHOVER_USER_KEY

  if (!PUSHOVER_APP_TOKEN || !PUSHOVER_USER_KEY) {
    console.log('Pushover not configured, skipping notification')
    return
  }

  try {
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: PUSHOVER_APP_TOKEN,
        user: PUSHOVER_USER_KEY,
        title,
        message,
        sound: 'cashregister',
      }),
    })
  } catch (err) {
    console.error('Pushover notification failed:', err)
  }
}

// Creates a plan request: a Cash App payment for paid plans, or a free-trial request.
// Only the plan ID and Cash App name are taken from the browser. The price, plan name,
// and renewal status are all decided here on the server.
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value
    const user = token ? await getSession(token) : null
    if (!user) {
      return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const plan = getPlan(body?.planId)
    if (!plan) {
      return NextResponse.json({ error: 'Please choose a valid plan.' }, { status: 400 })
    }

    const isFreeTrial = plan.price === 0
    const cashAppName = typeof body?.cashAppName === 'string' ? body.cashAppName.trim() : ''
    if (!isFreeTrial) {
      if (!cashAppName) {
        return NextResponse.json({ error: 'Please enter your Cash App name or $Cashtag.' }, { status: 400 })
      }
      if (cashAppName.length > 60) {
        return NextResponse.json({ error: 'Cash App name is too long.' }, { status: 400 })
      }
    }

    // Free trial: one per account
    if (isFreeTrial) {
      const { data: priorTrials } = await adminSupabase
        .from('pending_signups')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_id', 'trial-free')
        .limit(1)
      if (priorTrials && priorTrials.length) {
        return NextResponse.json({ error: 'This account has already requested a free trial. Choose a plan to keep watching.' }, { status: 409 })
      }
    }

    // Don't allow stacking the same request while one is still waiting for review
    const { data: openRequests } = await adminSupabase
      .from('pending_signups')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_id', plan.id)
      .eq('status', 'pending')
      .limit(1)
    if (openRequests && openRequests.length) {
      return NextResponse.json({ error: 'You already have a request for this plan waiting for confirmation. We’ll activate it shortly.' }, { status: 409 })
    }

    // Renewal = the customer already has a line on file
    const { data: existingSub } = await adminSupabase
      .from('user_subscriptions')
      .select('id, iptv_username')
      .eq('user_id', user.id)
      .limit(1)
    const isRenewal = !!(existingSub && existingSub.length)
    const hasLine = !!(existingSub && existingSub[0]?.iptv_username)

    // New customers choose the username and password they'll type into the TV app
    let requestedUsername: string | null = null
    let requestedPassword: string | null = null
    if (!hasLine) {
      const uname = normalizeUsername(body?.iptvUsername)
      const pword = typeof body?.iptvPassword === 'string' ? body.iptvPassword.trim() : ''
      const problem = usernameError(uname) || passwordError(pword, uname)
      if (problem) {
        return NextResponse.json({ error: problem, field: 'iptv' }, { status: 400 })
      }
      const [{ data: takenLine }, { data: takenRequest }] = await Promise.all([
        adminSupabase.from('user_subscriptions').select('id').eq('iptv_username', uname).limit(1),
        adminSupabase
          .from('pending_signups')
          .select('id')
          .eq('requested_username', uname)
          .in('status', ['pending', 'processing'])
          .neq('user_id', user.id)
          .limit(1),
      ])
      if ((takenLine && takenLine.length) || (takenRequest && takenRequest.length)) {
        return NextResponse.json({ error: 'That username is already taken. Please choose another.', field: 'iptv' }, { status: 409 })
      }
      requestedUsername = uname
      requestedPassword = pword
    }

    const amountCents = plan.price * 100
    const userName = user.name || user.email?.split('@')[0] || 'Unknown'
    const userPhone = user.phone || null
    const userEmail = user.email || ''

    const baseRow = {
      user_id: user.id,
      name: userName,
      email: userEmail,
      phone: userPhone,
      plan_id: plan.id,
      plan_name: plan.name,
      amount_cents: amountCents,
      payment_method: isFreeTrial ? 'trial' : 'cashapp',
      cashapp_name: isFreeTrial ? null : cashAppName,
      status: 'pending',
    }
    let { data: signup, error: signupError } = await adminSupabase
      .from('pending_signups')
      .insert({ ...baseRow, requested_username: requestedUsername, requested_password: requestedPassword })
      .select()
      .single()
    // Database not updated yet (missing login columns): save the order anyway
    if (signupError && /requested_(username|password)/.test(signupError.message || '')) {
      console.error('pending_signups is missing the requested_username/password columns; run the 2026-10-25 migration')
      ;({ data: signup, error: signupError } = await adminSupabase.from('pending_signups').insert(baseRow).select().single())
    }

    if (signupError) {
      console.error('Failed to create pending signup:', signupError)
      return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 })
    }

    if (!isFreeTrial) {
      const { error: paymentError } = await adminSupabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount_cents: amountCents,
          payment_method: 'cashapp',
          payment_reference: cashAppName,
          status: 'pending',
        })
      if (paymentError) {
        console.error('Failed to create payment record:', paymentError)
      }
    }

    await sendPushover(
      isFreeTrial
        ? '🎁 WKTV Free Trial Request'
        : `💰 WKTV ${isRenewal ? 'Renewal' : 'Payment'} - $${plan.price}`,
      `Plan: ${plan.name}\nCustomer: ${userName}\nEmail: ${userEmail}` +
        (isFreeTrial ? '' : `\nCash App: ${cashAppName}`) +
        (requestedUsername ? `\nWants username: ${requestedUsername}` : '') +
        (userPhone ? `\nPhone: ${userPhone}` : '')
    )

    return NextResponse.json({
      success: true,
      message: isFreeTrial ? 'Free trial requested' : 'Payment submitted for verification',
      signupId: signup.id,
    })
  } catch (error: any) {
    console.error('Plan request error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
