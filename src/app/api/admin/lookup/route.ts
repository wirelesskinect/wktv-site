import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
const AUTOMATION_URL = process.env.AUTOMATION_URL || 'http://149.56.97.159:3007';

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const admin = await getAdminFromRequest(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const username = req.nextUrl.searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const res = await fetch(`${AUTOMATION_URL}/api/lookup/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[LOOKUP] Error:', err.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
