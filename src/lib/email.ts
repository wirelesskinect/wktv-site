// Customer emails, sent through Resend (https://resend.com) from a no-reply @wktv.live address.
// Server-only. Settings (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  – API key from Resend (required to turn emails on)
//   EMAIL_FROM      – no-reply sender, e.g. "WKTV <no-reply@wktv.live>" (domain verified in Resend)
//   ADMIN_EMAIL     – the admin email customers should contact (shown in every email).
//                     If not set, the email of the admin account on the website is used.
// Emails say "don't reply" and point customers to the admin email only.
// If the settings are missing, nothing is sent and the website keeps working normally.

import { adminSupabase } from '@/lib/supabase-server'

const SITE_URL = 'https://www.wktv.live'
const BRAND = 'WKTV'
const RED = '#ee302f'

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

// Escape anything that came from a customer or the panel before it goes into HTML
function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

const day = (d: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : null

// The admin email on file: ADMIN_EMAIL, or the website's admin account
let adminEmailCache: string | null = null
async function adminContact(): Promise<string> {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL.trim()
  if (adminEmailCache) return adminEmailCache
  try {
    const { data } = await adminSupabase.from('users').select('email').eq('role', 'admin').order('created_at', { ascending: true }).limit(1)
    adminEmailCache = data?.[0]?.email || ''
  } catch {
    adminEmailCache = ''
  }
  return adminEmailCache || ''
}

// Never throws: an email problem must not break signup or approval
async function send(to: string, subject: string, bodyHtml: string, bodyText: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.log(`Email not configured, skipped: "${subject}"`)
    return false
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false
  const admin = await adminContact()
  const html = bodyHtml.replace('{{FOOTER}}', footerHtml(admin))
  const text = `${bodyText}\n\n---\n${footerText(admin)}`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.error(`Email "${subject}" failed: HTTP ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`Email "${subject}" failed:`, err instanceof Error ? err.message : 'unknown error')
    return false
  }
}

// Shared look: black background, white text, WKTV red accents
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0b0d;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16161a;border:1px solid #2a2a30;border-radius:14px">
<tr><td style="padding:22px 26px;border-bottom:3px solid ${RED}">
<span style="font-size:24px;font-weight:800;letter-spacing:1px;color:#ffffff">WK<span style="color:${RED}">TV</span></span>
</td></tr>
<tr><td style="padding:26px">
<h1 style="margin:0 0 14px;font-size:22px;color:#ffffff">${esc(title)}</h1>
${bodyHtml}
{{FOOTER}}
</td></tr>
</table>
</td></tr></table></body></html>`
}

// Every email ends with: no-reply notice + the admin email to contact
function footerHtml(admin: string): string {
  const contact = admin
    ? `please email <a href="mailto:${esc(admin)}" style="color:${RED}">${esc(admin)}</a> only`
    : `please use <a href="${SITE_URL}/support" style="color:${RED}">${SITE_URL.replace('https://', '')}/support</a>`
  return `<div style="margin:26px 0 0;padding:14px;border-top:1px solid #2a2a30;font-size:13px;line-height:1.5;color:#9a9aa6">
<b style="color:#e5e5ea">This is a no-reply email.</b> Replies to this address are not read.<br>
For help with your account, ${contact}.
</div>`
}
function footerText(admin: string): string {
  return `This is a no-reply email. Replies to this address are not read.\nFor help with your account, ${admin ? `please email ${admin} only` : `please use ${SITE_URL}/support`}.`
}

const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#e5e5ea">${html}</p>`
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${esc(label)}</a></p>`
function detailRows(rows: [string, string | null | undefined][]): string {
  const cells = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;color:#9a9aa6;font-size:14px;white-space:nowrap">${esc(k)}</td><td style="padding:8px 12px;font-size:16px;font-weight:700;color:#ffffff;font-family:Menlo,Consolas,monospace">${esc(v)}</td></tr>`)
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0b0b0d;border:1px solid #2a2a30;border-radius:10px;margin:6px 0 14px">${cells}</table>`
}

// 1) Welcome email after a website account is created. The website password is never emailed.
export async function sendWelcomeEmail(opts: { to: string; name?: string | null }) {
  const hi = opts.name ? `Hi ${esc(opts.name)},` : 'Hi,'
  const html = layout(`Welcome to ${BRAND}`, [
    p(hi),
    p(`Your ${BRAND} account is ready. Sign in any time with this email address and the password you chose.`),
    detailRows([['Login email', opts.to]]),
    p('Your TV app username and password will be emailed to you as soon as your plan is activated. You can also see them on your account page.'),
    button(`${SITE_URL}/dashboard`, 'Go to my account'),
    p('<span style="font-size:13px;color:#9a9aa6">Forgot your password? Email the admin address below and we’ll help you reset it. We’ll never ask for your password by email.</span>'),
  ].join(''))
  const text = `${opts.name ? `Hi ${opts.name},` : 'Hi,'}\n\nYour ${BRAND} account is ready. Sign in with ${opts.to} and the password you chose.\n\nYour TV app username and password will be emailed as soon as your plan is activated, and are always on your account page: ${SITE_URL}/dashboard`
  return send(opts.to, `Welcome to ${BRAND}: your account is ready`, html, text)
}

// 2) Plan activated: TV app login details
export async function sendPlanActivatedEmail(opts: {
  to: string
  name?: string | null
  planName: string
  connections: number
  username: string
  password: string
  expiresAt: Date | null
  renewal: boolean
  trial: boolean
  boxDevice?: string | null
}) {
  const hi = opts.name ? `Hi ${esc(opts.name)},` : 'Hi,'
  const lifetime = !!opts.expiresAt && opts.expiresAt.getFullYear() - new Date().getFullYear() > 50
  const expires = lifetime ? 'Lifetime' : day(opts.expiresAt)
  const title = opts.renewal ? 'Your plan has been renewed' : opts.trial ? 'Your free trial is ready' : 'Your plan is active'
  const intro = opts.renewal
    ? `Thanks for renewing! Your ${esc(opts.planName)} is active. Your TV app login stays the same.`
    : opts.trial
      ? 'Your WKTV trial is active. Enter these details in the WKTV / IPTV app to start watching.'
      : `Thanks for your order! Your ${esc(opts.planName)} is active. Enter these details in the WKTV / IPTV app to start watching.`
  const box = opts.boxDevice
    ? p(`We’re setting up your <b>${esc(opts.boxDevice)}</b> box with WKTV and will ship it to you soon. It will arrive already signed in.`)
    : ''
  const html = layout(title, [
    p(hi),
    p(intro),
    detailRows([
      ['Username', opts.username],
      ['Password', opts.password],
      ['Plan', opts.planName],
      ['Connections', String(opts.connections)],
      ['Expires', expires],
    ]),
    box,
    p('Keep this email private. Your username and password are also on your account page any time.'),
    button(`${SITE_URL}/dashboard`, 'View my account'),
    p(`Need help installing the app? <a href="${SITE_URL}/support.html#connect" style="color:${RED}">See the setup guide</a>.`),
  ].join(''))
  const text = `${opts.name ? `Hi ${opts.name},` : 'Hi,'}\n\n${title}.\n\nUsername: ${opts.username}\nPassword: ${opts.password}\nPlan: ${opts.planName}\nConnections: ${opts.connections}\n${expires ? `Expires: ${expires}\n` : ''}${opts.boxDevice ? `\nWe're setting up your ${opts.boxDevice} box and will ship it soon.\n` : ''}\nYour login is also on your account page: ${SITE_URL}/dashboard\nSetup guide: ${SITE_URL}/support.html#connect`
  return send(opts.to, `${title}: your ${BRAND} login`, html, text)
}

// 3) Renewal done by admin, or a free month added
export async function sendExtendedEmail(opts: {
  to: string
  name?: string | null
  username: string
  expiresAt: Date | null
  reason: 'renewal' | 'referral' | 'free'
  planName?: string | null
}) {
  const hi = opts.name ? `Hi ${esc(opts.name)},` : 'Hi,'
  const title = opts.reason === 'renewal' ? 'Your plan has been renewed' : 'You got a free month!'
  const intro = opts.reason === 'renewal'
    ? `Thanks for renewing${opts.planName ? ` your ${esc(opts.planName)}` : ''}! Your service has been extended.`
    : opts.reason === 'referral'
      ? 'Thanks for referring a friend to WKTV! We added <b>1 free month</b> to your service.'
      : 'We added <b>1 free month</b> to your WKTV service.'
  const html = layout(title, [
    p(hi),
    p(intro),
    detailRows([['TV username', opts.username], ['New expiration', day(opts.expiresAt)]]),
    p('Nothing to change on your TV: keep using the same username and password.'),
    button(`${SITE_URL}/dashboard`, 'View my account'),
  ].join(''))
  const exp = day(opts.expiresAt)
  const text = `${opts.name ? `Hi ${opts.name},` : 'Hi,'}\n\n${title}\n\nTV username: ${opts.username}\n${exp ? `New expiration: ${exp}\n` : ''}\nKeep using the same username and password.\nYour account: ${SITE_URL}/dashboard`
  return send(opts.to, `${title} (${BRAND})`, html, text)
}
