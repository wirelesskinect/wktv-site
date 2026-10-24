import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic'
import { adminSupabase } from '@/lib/supabase-server';
import { getSession, getSessionCookieName } from '@/lib/auth';

const PUSHOVER_USER = process.env.PUSHOVER_USER_KEY;
const PUSHOVER_TOKEN = process.env.PUSHOVER_APP_TOKEN;

async function sendPushover(title: string, message: string, priority: number = 0) {
  if (!PUSHOVER_USER || !PUSHOVER_TOKEN) {
    console.log('Pushover not configured, skipping notification');
    return;
  }

  try {
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: PUSHOVER_TOKEN,
        user: PUSHOVER_USER,
        title,
        message,
        priority,
        sound: priority >= 1 ? 'pushover' : 'cosmic',
      }),
    });
  } catch (err) {
    console.error('Pushover notification failed:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const name = clean(body.name, 100);
    const email = clean(body.email, 200);
    const subject = clean(body.subject, 40);
    const message = clean(body.message, 2000);

    if (!email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email and a message.' }, { status: 400 });
    }

    // Link to the account only from the login session (never trust an ID sent by the browser)
    const token = req.cookies.get(getSessionCookieName())?.value;
    const sessionUser = token ? await getSession(token) : null;
    const userId = sessionUser?.id || null;

    const subjectLabels: Record<string, string> = {
      account_link: 'Account Link Request',
      account: 'Login / Password Help',
      billing: 'Billing Question',
      technical: 'Technical Issue',
      other: 'General Inquiry',
    };

    // Save to database
    const { data, error } = await adminSupabase
      .from('support_requests')
      .insert({
        user_id: userId || null,
        name,
        email,
        subject: subjectLabels[subject] || subject,
        message,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save support request:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    // Send Pushover notification
    const pushTitle = `🎫 WKTV: ${subjectLabels[subject] || 'Support Request'}`;
    const pushMessage = `From: ${name || 'Unknown'} (${email})\n\n${message.slice(0, 200)}${message.length > 200 ? '...' : ''}`;
    
    // Higher priority for account link requests
    const priority = subject === 'account_link' ? 0 : -1;
    await sendPushover(pushTitle, pushMessage, priority);

    return NextResponse.json({ success: true, id: data.id });

  } catch (error: any) {
    console.error('Support API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
