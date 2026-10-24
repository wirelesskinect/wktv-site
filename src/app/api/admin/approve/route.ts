import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'wktv' },
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

// Helper to generate random credentials
function generateCredentials() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let username = 'wktv_'
  let password = ''
  for (let i = 0; i < 8; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length))
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return { username, password }
}

// Calculate expiry date based on plan
function calculateExpiry(planId: string): Date {
  const now = new Date()
  if (planId.includes('lifetime')) {
    // 100 years for lifetime
    now.setFullYear(now.getFullYear() + 100)
  } else if (planId.includes('annual')) {
    now.setFullYear(now.getFullYear() + 1)
  } else if (planId.includes('monthly') || planId.includes('trial-1mo')) {
    now.setMonth(now.getMonth() + 1)
  } else if (planId.includes('trial-free')) {
    now.setDate(now.getDate() + 1) // 24 hours
  } else {
    // Default to 1 month
    now.setMonth(now.getMonth() + 1)
  }
  return now
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { signupId } = await request.json()

    if (!signupId) {
      return NextResponse.json({ error: 'Missing signupId' }, { status: 400 })
    }

    // Get the pending signup
    const { data: signup, error: fetchError } = await adminSupabase
      .from('pending_signups')
      .select('*')
      .eq('id', signupId)
      .single()

    if (fetchError || !signup) {
      return NextResponse.json({ error: 'Signup not found' }, { status: 404 })
    }

    if (signup.status !== 'pending') {
      return NextResponse.json({ error: 'Signup already processed' }, { status: 400 })
    }

    // Generate credentials
    const { username, password } = generateCredentials()
    const expiresAt = calculateExpiry(signup.plan_id)

    // Extract connections from plan
    const connections = signup.plan_id.includes('-5') ? 5 :
                       signup.plan_id.includes('-4') ? 4 :
                       signup.plan_id.includes('-3') ? 3 :
                       signup.plan_id.includes('-2') ? 2 : 1

    // Create subscription record
    const { error: subError } = await adminSupabase
      .from('user_subscriptions')
      .upsert({
        user_id: signup.user_id,
        iptv_username: username,
        iptv_password: password,
        plan_id: signup.plan_id,
        plan_name: signup.plan_name,
        price_cents: signup.amount_cents,
        connections: connections,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        payment_method: 'cashapp',
        payment_reference: signup.cashapp_name,
      }, {
        onConflict: 'user_id'
      })

    if (subError) {
      console.error('Failed to create subscription:', subError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    // Update pending signup status
    await adminSupabase
      .from('pending_signups')
      .update({ status: 'approved' })
      .eq('id', signupId)

    // Update payment status
    await adminSupabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('user_id', signup.user_id)
      .eq('status', 'pending')

    // TODO: Send email/notification to customer with credentials

    return NextResponse.json({
      success: true,
      message: 'Signup approved',
      credentials: { username, password },
      expiresAt: expiresAt.toISOString(),
    })

  } catch (error: any) {
    console.error('Error approving signup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
