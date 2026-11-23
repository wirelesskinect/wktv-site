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

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    let query = adminSupabase
      .from('pending_signups')
      .select('*')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: signups, error } = await query.limit(100)

    if (error) {
      console.error('Failed to fetch signups:', error)
      return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 })
    }

    // Label each order: does this customer already have a TV line (renewal) or not (new line)?
    const userIds = Array.from(new Set((signups || []).map((s: any) => s.user_id).filter(Boolean)))
    const { data: subs } = userIds.length
      ? await adminSupabase.from('user_subscriptions').select('user_id, iptv_username').in('user_id', userIds)
      : { data: [] as any[] }
    const lineByUser = new Map((subs || []).filter((s: any) => s.iptv_username).map((s: any) => [s.user_id, s.iptv_username]))
    const labeled = (signups || []).map((s: any) => ({ ...s, existing_tv_login: lineByUser.get(s.user_id) || null }))

    return NextResponse.json({ signups: labeled })
  } catch (error: any) {
    console.error('Error fetching signups:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
