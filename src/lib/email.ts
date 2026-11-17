// Customer emails, sent through Resend (https://resend.com) from a no-reply @wktv.live address.
// Server-only. Settings (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY – API key from Resend (required to turn emails on)
//   EMAIL_FROM     – no-reply sender, e.g. "WKTV <no-reply@wktv.live>" (domain verified in Resend)
//   ADMIN_EMAIL    – the admin email customers should contact (shown in every email).
//                    If not set, the email of the admin account on the website is used.
// Emails say "don't reply" and point customers to the admin email only.
// If the settings are missing, nothing is sent and the website keeps working normally.
//
// Design: black cinematic look with the WKTV banner (public/email/trial-header.jpg).
// Gmail's iPhone app "inverts" dark emails in dark mode (black turns light grey, white text turns black).
// To stop that, every background also uses a background-image gradient (Gmail never inverts images)
// and every piece of text is wrapped in t() (two blend-mode layers that flip Gmail's inversion back).
// Other email apps ignore the blend layers.
//
// Security: TV app passwords are never emailed. Customers create their own at checkout,
// and can always see it on their account page (wktv.live/dashboard) after signing in.

import { adminSupabase } from '@/lib/supabase-server'
import { referralLink } from '@/lib/referral'

const SITE_URL = 'https://www.wktv.live'
const BRAND = 'WKTV'
const HEADER_IMG = `${SITE_URL}/email/trial-header.jpg`
const SETUP_URL = `${SITE_URL}/support.html#connect`
const ACCOUNT_URL = `${SITE_URL}/dashboard`
const PLANS_URL = `${SITE_URL}/#plans`

// Colors
const BG = '#000000'
const CARD = '#1c1c1f'
const LINE = '#34343a'
const SOFT = '#e5e5ea'
const MUTED = '#a1a1aa'
const RED = '#e30613'
const FONT = `font-family:'Montserrat',Arial,Helvetica,sans-serif`

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

// Escape anything that came from a customer or the panel before it goes into HTML
function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

const day = (d: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : null
const dayTime = (d: Date | null) =>
  d ? `${day(d)} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET` : null
const isLifetime = (d: Date | null) => !!d && d.getFullYear() - new Date().getFullYear() > 50
// HTML snippet → plain text (for the text version of each email)
const plain = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/’/g, "'")
const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

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
  const html = bodyHtml.replace('{{HELP}}', helpHtml(admin)).split('{{ADMIN}}').join(adminLinkHtml(admin))
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

// ---------- Building blocks ----------

// Background that Gmail's dark mode can't flip
const bg = (c: string) => `background-color:${c};background-image:linear-gradient(${c},${c});`
// Text that Gmail's dark mode can't flip
const t = (html: string) => `<div class="gs"><div class="gd">${html}</div></div>`

function adminLinkHtml(admin: string): string {
  return admin
    ? `<a href="mailto:${esc(admin)}" style="color:#ffffff;text-decoration:underline">${esc(admin)}</a>`
    : `<a href="${SITE_URL}/support" style="color:#ffffff;text-decoration:underline">wktv.live/support</a>`
}

function helpHtml(admin: string): string {
  return t(`<p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${SOFT}">Need help? ${adminLinkHtml(admin)}</p>
<p style="margin:0 0 18px;font-size:15px"><a href="${SITE_URL}" style="color:#ffffff;text-decoration:underline">wktv.live</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED}">This is a no-reply email. Replies to this address are not read.</p>`)
}
function footerText(admin: string): string {
  return `Need help? ${admin ? `Email ${admin}` : `Visit ${SITE_URL}/support`}\nwktv.live\nThis is a no-reply email. Replies to this address are not read.`
}

// Full email: banner, big title, then the sections
function shell(preheader: string, title: string, sections: string[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<style>
u + .body .gs, u + #body .gs { background:#000; mix-blend-mode:screen; }
u + .body .gd, u + #body .gd { background:#000; mix-blend-mode:difference; }
@media (max-width:480px) { .px { padding-left:20px !important; padding-right:20px !important; } .h1 { font-size:30px !important; } }
</style></head>
<body class="body" id="body" style="margin:0;padding:0;${bg(BG)}${FONT};color:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(BG)}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;${bg(BG)}">
<tr><td style="padding:0"><a href="${SITE_URL}"><img src="${HEADER_IMG}" width="600" alt="${BRAND} · Watch Anywhere" style="display:block;width:100%;max-width:600px;height:auto;border:0;color:#ffffff;font-size:24px;font-weight:800;text-align:center"></a></td></tr>
<tr><td align="center" class="px" style="padding:6px 24px 0">${t(`<h1 class="h1" style="margin:0;font-size:36px;line-height:1.15;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${esc(title)}</h1>`)}</td></tr>
${sections.join('\n')}
<tr><td align="center" class="px" style="padding:32px 24px 36px">{{HELP}}</td></tr>
</table>
</td></tr></table></body></html>`
}

const row = (html: string, pad = '20px 40px 0', align = 'left') =>
  `<tr><td class="px" align="${align}" style="padding:${pad}">${html}</td></tr>`

// "Welcome to WKTV, Alex." + one friendly line
function greeting(headline: string, sub: string): string {
  return row(t(`<p style="margin:0 0 4px;font-size:20px;line-height:1.3;font-weight:800;color:#ffffff">${headline}</p>
<p style="margin:0;font-size:16px;line-height:1.5;color:${SOFT}">${sub}</p>`), '18px 40px 0')
}

// Rounded grey card with label / value rows
function details(rows: [string, string | null | undefined][]): string {
  const list = rows.filter(([, v]) => v) as [string, string][]
  const body = list
    .map(([k, v], i) => {
      const sep = i < list.length - 1 ? `<tr><td colspan="2" style="height:1px;padding:0;font-size:0;line-height:0;${bg(LINE)}">&nbsp;</td></tr>` : ''
      return `<tr><td valign="top" style="padding:13px 12px 13px 0;width:36%">${t(`<span style="font-size:16px;color:${SOFT}">${esc(k)}</span>`)}</td><td valign="top" style="padding:13px 0">${t(`<span style="font-size:17px;font-weight:700;color:#ffffff;overflow-wrap:anywhere;word-break:break-word">${esc(v)}</span>`)}</td></tr>${sep}`
    })
    .join('')
  return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(CARD)}border-radius:14px">
<tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`, '20px 28px 0')
}

const note = (html: string) =>
  row(t(`<p style="margin:0;font-size:14px;line-height:1.5;color:${SOFT};text-align:center">${html}</p>`), '16px 32px 0', 'center')

function button(href: string, label: string): string {
  return row(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td align="center" style="${bg(RED)}border-radius:10px">
<a href="${href}" style="display:block;min-width:220px;padding:15px 36px;color:#ffffff;text-decoration:none;font-weight:800;font-size:18px;text-align:center">${t(esc(label))}</a>
</td></tr></table>`, '20px 24px 0', 'center')
}

const divider = () =>
  row(`<div style="height:1px;font-size:0;line-height:0;${bg('#5a5a60')}">&nbsp;</div>`, '30px 40px 0')

// Numbered steps with an optional link under them
function steps(title: string, items: string[], link?: [string, string]): string {
  const list = items
    .map((text, i) => `<tr><td width="44" valign="middle" style="padding:6px 12px 6px 0"><div style="width:32px;height:32px;line-height:32px;border-radius:16px;${bg('#2a2a30')}text-align:center">${t(`<span style="color:#ffffff;font-weight:700;font-size:15px">${i + 1}</span>`)}</div></td><td valign="middle" style="padding:6px 0">${t(`<span style="font-size:16px;line-height:1.4;color:#ffffff">${text}</span>`)}</td></tr>`)
    .join('')
  const more = link ? t(`<p style="margin:12px 0 0;font-size:16px;text-align:center"><a href="${link[0]}" style="color:#ffffff;text-decoration:underline">${esc(link[1])}</a></p>`) : ''
  return row(`${t(`<h2 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;text-align:center">${esc(title)}</h2>`)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">${list}</table>${more}`, '26px 24px 0', 'center')
}

// Grey box with a title, text and an optional extra (link, code box…)
function box(title: string, textHtml: string, extraHtml = ''): string {
  return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${bg(CARD)}border-radius:14px">
<tr><td align="center" style="padding:24px 26px">
${t(`<h2 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ffffff">${esc(title)}</h2>
<p style="margin:0;font-size:16px;line-height:1.5;color:${SOFT}">${textHtml}</p>`)}${extraHtml}
</td></tr></table>`, '28px 20px 0')
}

// Refer a friend, with the customer's own link right in the email
function referBox(username: string | null | undefined): string {
  if (!username) return ''
  const link = referralLink(username)
  const shown = link.replace('https://www.', '')
  return box(
    'Refer a friend',
    'Share your personal link with friends and family. They get a free 24-hour trial, and when they buy a 1-year plan, you get <b style="color:#ffffff">1 free month</b>.',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;${bg('#2a2a30')}border-radius:10px"><tr><td align="center" style="padding:12px 14px">${t(`<a href="${esc(link)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;overflow-wrap:anywhere">${esc(shown).replace('&amp;ref=', '&amp;<wbr>ref=')}</a>`)}</td></tr></table>
${t(`<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${MUTED}">Friends can also type your username <b style="color:#ffffff">${esc(username)}</b> in the referral box when they sign up.</p>`)}`,
  )
}

function referText(username: string | null | undefined): string {
  return username
    ? `\n\nRefer a friend: share your link ${referralLink(username)}. They get a free 24-hour trial, and when they buy a 1-year plan, you get 1 free month.`
    : ''
}

const startWatching = (signIn = 'Sign in with your username and TV app password.') =>
  steps('Start watching', [
    'Open the setup guide and pick your device.',
    `Install the ${BRAND} app (it takes a few minutes).`,
    signIn,
  ], [SETUP_URL, 'View device setup guide'])

// Passwords are never emailed: say where the customer can find theirs
type PasswordSource = 'created' | 'same' | 'account'
const passwordValue = (src: PasswordSource) =>
  ({ created: 'The one you created', same: 'Same as before', account: 'On your account page' })[src]
const passwordNoteText = (src: PasswordSource) =>
  src === 'created'
    ? 'For your security, we never email passwords. Your TV app password is the one you created when you signed up. Forgot it? Sign in to your account to see it.'
    : src === 'same'
      ? 'For your security, we never email passwords. Your TV app password hasn’t changed. Forgot it? Sign in to your account to see it.'
      : 'For your security, we never email passwords. Sign in to your account to see your TV app password any time.'
function passwordNote(src: PasswordSource): string {
  const [lead, ...rest] = passwordNoteText(src).split('. ')
  return note(`<b style="color:#ffffff">${esc(lead)}.</b> ${esc(rest.join('. '))}<br>Username and password are case sensitive.`)
}

// ---------- The emails ----------

// 1) Welcome email after a website account is created. The website password is never emailed.
export async function sendWelcomeEmail(opts: { to: string; name?: string | null }) {
  const first = firstName(opts.name)
  const html = shell(`Your ${BRAND} account is ready. Here's what happens next.`, `Welcome to ${BRAND}`, [
    greeting(first ? `Hi ${esc(first)}, your account is ready.` : 'Your account is ready.', 'Sign in any time with this email address and the password you chose.'),
    details([['Login email', opts.to]]),
    button(ACCOUNT_URL, 'Go to my account'),
    divider(),
    steps('What happens next', [
      'Choose a plan or start your free 24-hour trial.',
      'We activate it and email you your TV login.',
      'Install the app on your device and start watching.',
    ], [PLANS_URL, 'See plans']),
    box('Forgot your account password?', `Email {{ADMIN}} and we’ll help you reset it. We’ll never ask for your password by email.`),
  ])
  const text = `${first ? `Hi ${first}, your` : 'Your'} ${BRAND} account is ready.\n\nSign in any time with ${opts.to} and the password you chose: ${ACCOUNT_URL}\n\nWhat happens next:\n1. Choose a plan or start your free 24-hour trial: ${PLANS_URL}\n2. We activate it and email you your TV login.\n3. Install the app on your device and start watching.\n\nForgot your account password? Email the help address below and we'll help you reset it. We'll never ask for your password by email.`
  return send(opts.to, `Welcome to ${BRAND}: your account is ready`, html, text)
}

// 2) Plan activated: TV app login details (free trial, paid plan, renewal, or box order)
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
  // true when the customer typed this password themselves at checkout
  passwordChosen?: boolean
}) {
  const first = firstName(opts.name)
  const name = first ? `, ${esc(first)}` : ''
  const kind = opts.boxDevice ? 'box' : opts.renewal ? 'renewal' : opts.trial ? 'trial' : 'plan'
  const expires = isLifetime(opts.expiresAt) ? 'Lifetime' : kind === 'trial' ? dayTime(opts.expiresAt) : day(opts.expiresAt)
  const length = /24/.test(opts.planName) ? '24-hour ' : ''
  // The password itself is never emailed (see the top of this file)
  const pwSrc: PasswordSource = kind === 'renewal' ? 'same' : opts.passwordChosen ? 'created' : 'account'

  const title = {
    trial: 'Your free trial is ready',
    plan: 'Your plan is active',
    renewal: 'Your plan has been renewed',
    box: 'Your box order is confirmed',
  }[kind]
  const headline = {
    trial: `Welcome to ${BRAND}${name}.`,
    plan: `Thanks for your order${name}!`,
    renewal: `Thanks for renewing${name}!`,
    box: `Thanks for your order${name}!`,
  }[kind]
  const sub = {
    trial: `Explore live TV, movies, shows, and sports during your ${length}trial.`,
    plan: `Your ${esc(opts.planName)} is active. Sign in on the ${BRAND} app with the details below.`,
    renewal: `Your ${esc(opts.planName)} is active. Nothing changes on your TV: keep using the same login.`,
    box: `We’re setting up your <b style="color:#ffffff">${esc(opts.boxDevice)}</b> box with ${BRAND} and will ship it to you soon. It arrives already signed in.`,
  }[kind]

  const next =
    kind === 'box'
      ? steps('What happens next', [
          `We set up your box and sign it in to ${BRAND}.`,
          'We ship it to you.',
          'Plug it into your TV and Wi-Fi, and start watching.',
        ])
      : kind === 'renewal'
        ? ''
        : startWatching(pwSrc === 'created' ? 'Sign in with your username and the TV app password you created.' : 'Sign in with your username and TV app password.')

  const html = shell(
    kind === 'renewal' ? `Your ${BRAND} plan is renewed. Same login, more watching.` : `Your ${BRAND} login is inside. Start watching in minutes.`,
    title,
    [
      greeting(headline, sub),
      details([
        ['Username', opts.username],
        ['Password', passwordValue(pwSrc)],
        ['Plan', opts.planName],
        ['Connections', String(opts.connections)],
        ['Expires', expires],
      ]),
      passwordNote(pwSrc),
      button(ACCOUNT_URL, 'View my account'),
      next ? divider() : '',
      next,
      referBox(opts.username),
    ],
  )

  const plainHead = { trial: `Welcome to ${BRAND}${first ? `, ${first}` : ''}.`, plan: `Thanks for your order${first ? `, ${first}` : ''}!`, renewal: `Thanks for renewing${first ? `, ${first}` : ''}!`, box: `Thanks for your order${first ? `, ${first}` : ''}!` }[kind]
  const plainNext =
    kind === 'box'
      ? `\n\nWhat happens next:\n1. We set up your box and sign it in.\n2. We ship it to you.\n3. Plug it into your TV and Wi-Fi, and start watching.`
      : kind === 'renewal'
        ? ''
        : `\n\nStart watching:\n1. Open the setup guide and pick your device: ${SETUP_URL}\n2. Install the ${BRAND} app.\n3. Sign in with your username and TV app password.`
  const text = `${plainHead}\n\n${plain(sub)}\n\nUsername: ${opts.username}\nPassword: ${passwordValue(pwSrc)}\nPlan: ${opts.planName}\nConnections: ${opts.connections}\n${expires ? `Expires: ${expires}\n` : ''}\n${passwordNoteText(pwSrc)} Username and password are case sensitive.\nYour account: ${ACCOUNT_URL}${plainNext}${referText(opts.username)}`

  const subject = kind === 'box' ? `Your ${BRAND} box order is confirmed` : `${title}: your ${BRAND} login`
  return send(opts.to, subject, html, text)
}

// 2c) Order received: sent right after checkout, before the admin approves it.
// Confirms the TV username they picked. The password is never emailed.
export async function sendOrderReceivedEmail(opts: {
  to: string
  name?: string | null
  planName: string
  kind: 'trial' | 'plan' | 'renewal' | 'box'
  username: string | null // the TV username they picked (or already have)
  passwordCreated: boolean // they created a TV password at this checkout
  amount?: string | null // e.g. "$20"
  paidWith?: string | null // e.g. "Cash App"
  boxDevice?: string | null
}) {
  const first = firstName(opts.name)
  const name = first ? `, ${esc(first)}` : ''
  const { kind } = opts
  const pwSrc: PasswordSource = opts.passwordCreated ? 'created' : opts.username ? 'same' : 'account'

  const title = {
    trial: 'Your free trial is almost ready',
    plan: 'We got your order',
    renewal: 'We got your renewal',
    box: 'We got your box order',
  }[kind]
  const sub = {
    trial: 'We’re activating your free trial now. We’ll email you the moment it’s live.',
    plan: `We’re confirming your payment and activating your ${esc(opts.planName)}. We’ll email you the moment it’s live.`,
    renewal: `We’re confirming your payment and renewing your ${esc(opts.planName)}. We’ll email you your new expiration date.`,
    box: `We’re confirming your payment. Then we’ll set up your <b style="color:#ffffff">${esc(opts.boxDevice || '')}</b> box and ship it to you, already signed in.`,
  }[kind]
  const status = kind === 'trial' ? 'Being activated' : 'Confirming payment'
  const payment = opts.amount ? `${opts.amount}${opts.paidWith ? ` via ${opts.paidWith}` : ''}` : null

  const nextItems = {
    trial: ['We activate your free trial.', 'We email you as soon as it’s live.', `Sign in on the ${BRAND} app and start watching.`],
    plan: ['We confirm your payment.', 'We activate your plan and email you.', `Sign in on the ${BRAND} app and start watching.`],
    renewal: ['We confirm your payment.', 'We extend your plan and email you the new date.', 'Nothing to change on your TV.'],
    box: ['We confirm your payment.', 'We set up your box and ship it to you.', 'Plug it into your TV and Wi-Fi, and start watching.'],
  }[kind]
  const getReady = kind === 'trial' || kind === 'plan'

  const html = shell(
    kind === 'trial' ? 'Your free trial request is in. Here’s what happens next.' : 'Your order is in. Here’s what happens next.',
    title,
    [
      greeting(`Thanks${name}!`, sub),
      details([
        ['Plan', opts.planName],
        ['Payment', payment],
        ['Username', opts.username],
        ['Password', opts.username ? passwordValue(pwSrc) : null],
        ['Status', status],
      ]),
      opts.username ? passwordNote(pwSrc) : '',
      getReady
        ? row(t(`<p style="margin:0;font-size:16px;line-height:1.5;color:${SOFT};text-align:center"><b style="color:#ffffff">Get ready while you wait:</b> install the ${BRAND} app now, so you can sign in as soon as you get our next email.</p>`), '24px 32px 0', 'center')
        : '',
      button(getReady ? SETUP_URL : ACCOUNT_URL, getReady ? 'Open the setup guide' : 'View my account'),
      divider(),
      steps('What happens next', nextItems),
    ],
  )

  const text = `Thanks${first ? `, ${first}` : ''}!\n\n${title}. ${plain(sub)}\n\nPlan: ${opts.planName}\n${payment ? `Payment: ${payment}\n` : ''}${opts.username ? `Username: ${opts.username}\nPassword: ${passwordValue(pwSrc)}\n` : ''}Status: ${status}\n${opts.username ? `\n${passwordNoteText(pwSrc)} Username and password are case sensitive.\n` : ''}${getReady ? `\nGet ready while you wait: install the ${BRAND} app now: ${SETUP_URL}\n` : ''}\nWhat happens next:\n${nextItems.map((s, i) => `${i + 1}. ${s.replace(/’/g, "'")}`).join('\n')}\n\nYour account: ${ACCOUNT_URL}`
  return send(opts.to, kind === 'trial' ? `We got your free trial request (${BRAND})` : `We got your order (${BRAND})`, html, text)
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
  const first = firstName(opts.name)
  const name = first ? `, ${esc(first)}` : ''
  const title = opts.reason === 'renewal' ? 'Your plan has been renewed' : opts.reason === 'referral' ? 'You earned a free month!' : 'You got a free month!'
  const headline = opts.reason === 'renewal' ? `Thanks for renewing${name}!` : opts.reason === 'referral' ? `Thank you${name}!` : `Good news${name}!`
  const sub = opts.reason === 'renewal'
    ? `${opts.planName ? `Your ${esc(opts.planName)} is` : 'Your service is'} extended.`
    : opts.reason === 'referral'
      ? `A friend you referred joined ${BRAND}, so we added <b style="color:#ffffff">1 free month</b> to your service.`
      : `We added <b style="color:#ffffff">1 free month</b> to your ${BRAND} service.`
  const expires = isLifetime(opts.expiresAt) ? 'Lifetime' : day(opts.expiresAt)

  const html = shell(`${title} New expiration: ${expires || 'see your account'}.`, title, [
    greeting(headline, sub),
    details([['TV username', opts.username], ['New expiration', expires]]),
    note('Nothing to change on your TV. Keep using the same username and password.'),
    button(ACCOUNT_URL, 'View my account'),
    referBox(opts.username),
  ])
  const plainHead = opts.reason === 'renewal' ? `Thanks for renewing${first ? `, ${first}` : ''}!` : opts.reason === 'referral' ? `Thank you${first ? `, ${first}` : ''}!` : `Good news${first ? `, ${first}` : ''}!`
  const text = `${plainHead}\n\n${plain(sub)}\n\nTV username: ${opts.username}\n${expires ? `New expiration: ${expires}\n` : ''}\nNothing to change on your TV. Keep using the same username and password.\nYour account: ${ACCOUNT_URL}${referText(opts.username)}`
  return send(opts.to, `${title} (${BRAND})`, html, text)
}
