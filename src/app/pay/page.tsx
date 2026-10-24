'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { siteConfig } from '@/config/site'
import { getPlan, connectionUpgrades } from '@/lib/plans'
import ConnectionWarning from '@/components/ConnectionWarning'
import { USERNAME_RULE, PASSWORD_RULE, normalizeUsername, usernameError, passwordError } from '@/lib/iptv-login'


function PaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = getPlan(searchParams.get('plan'))
  const planId = plan?.id
  
  const [cashAppName, setCashAppName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  // Already confirmed on the signup page? Then don't ask again.
  const alreadyConfirmed = searchParams.get('confirmed') === '1'
  const [showWarning, setShowWarning] = useState(false)
  const [copied, setCopied] = useState(false)
  // New customers (no TV line yet) choose the login they'll type into the IPTV app
  const [needsLogin, setNeedsLogin] = useState(false)
  const [iptvUsername, setIptvUsername] = useState('')
  const [iptvPassword, setIptvPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    // No (or unknown) plan in the link -> send them to their account to pick one
    if (!plan) {
      router.replace('/dashboard')
      return
    }
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user) {
        router.push(`/signup?plan=${planId}`)
        return
      }
      setUser(data.user)
      let sub: any = null
      try {
        sub = await (await fetch('/api/subscription', { cache: 'no-store' })).json()
      } catch {}
      // No line on file yet -> they pick their TV app username and password here
      setNeedsLogin(!sub?.username)
      // First-time customers (no plan on file yet) get the add-connections warning
      // before they see payment instructions, since connections can't be added later.
      if (!alreadyConfirmed && connectionUpgrades(plan).length > 0) {
        if (!sub || sub.status === 'unlinked' || sub.status === 'pending') setShowWarning(true)
      }
    } catch {
      router.push(`/signup?plan=${planId}`)
    } finally {
      setCheckingAuth(false)
    }
  }

  async function submitRequest(body: Record<string, string>) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/cashapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Returns the login fields to send, or null (and shows an error) if they're not valid
  function loginFields(): Record<string, string> | null {
    if (!needsLogin) return {}
    const uname = normalizeUsername(iptvUsername)
    const problem = usernameError(uname) || passwordError(iptvPassword.trim(), uname)
    if (problem) {
      setError(problem)
      return null
    }
    return { iptvUsername: uname, iptvPassword: iptvPassword.trim() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plan) return
    const login = loginFields()
    if (!login) return
    if (!cashAppName.trim()) {
      setError('Please enter your Cash App name')
      return
    }

    // Only the plan, login choice and Cash App name are sent; the server sets the price
    await submitRequest({ planId: plan.id, cashAppName: cashAppName.trim(), ...login })
  }

  async function handleTrial(e: React.FormEvent) {
    e.preventDefault()
    if (!plan) return
    const login = loginFields()
    if (!login) return
    await submitRequest({ planId: plan.id, ...login })
  }

  const loginBlock = needsLogin ? (
    <div className="mb-6">
      <p className="field-label">Your TV app login</p>
      <p className="field-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Pick the username and password you’ll type into the WKTV / IPTV app. They’ll work as soon as we activate your plan.
      </p>
      <label htmlFor="iptv-username" className="field-label" style={{ fontSize: 13 }}>Username</label>
      <input id="iptv-username" type="text" value={iptvUsername} autoComplete="off" autoCapitalize="none" spellCheck={false}
        onChange={(e) => setIptvUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
        placeholder="e.g. tony24" maxLength={16} required />
      <p className="field-hint">{USERNAME_RULE}.</p>
      <label htmlFor="iptv-password" className="field-label mt-4" style={{ fontSize: 13 }}>Password</label>
      <div className="flex gap-2">
        <input id="iptv-password" type={showPassword ? 'text' : 'password'} value={iptvPassword} autoComplete="new-password"
          onChange={(e) => setIptvPassword(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          placeholder="Easy to type on a TV remote" maxLength={20} required />
        <button type="button" className="btn-secondary" style={{ minHeight: 40, padding: '8px 14px', fontSize: 13 }}
          onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
      </div>
      <p className="field-hint">{PASSWORD_RULE}. Don’t reuse your email password. You can always see it on your account page.</p>
    </div>
  ) : null

  if (checkingAuth || !plan) {
    return (
      <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
    )
  }

  const cashTag = siteConfig.cashAppTag
  const cashLink = `https://cash.app/${cashTag}/${plan.price}`

  if (success) {
    return (
      <div className="portal-narrow animate-in text-center">
        <div className="card">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: 'rgba(34,197,94,.14)', border: '1px solid rgba(34,197,94,.4)' }}>✓</div>
          <span className="eyebrow">{plan.price === 0 ? 'Trial requested' : 'Payment submitted'}</span>
          <h1 className="page-title">{plan.price === 0 ? 'You’re on the list!' : 'Thanks! We got it.'}</h1>
          <p className="page-sub mb-6">
            {plan.price === 0
              ? 'We’ll activate your free trial shortly. Your account page will show it as active once it’s ready.'
              : 'We’ll verify your Cash App payment and activate your plan within a few hours. Your account page will show it as active once it’s ready.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard" className="btn-primary w-full">Go to my account →</Link>
            <a href="/support.html#connect" className="btn-secondary w-full">Get your device ready</a>
          </div>
        </div>
      </div>
    )
  }

  if (plan.price === 0) {
    // Free trial - no payment needed, just request it
    return (
      <div className="portal-narrow animate-in">
        <div className="text-center mb-7">
          <span className="eyebrow">Free 24-hour trial</span>
          <h1 className="page-title">Try WKTV free</h1>
          <p className="page-sub">No payment and no card needed. One trial per account.</p>
        </div>
        <div className="card">
          <ul className="space-y-3 mb-6 text-sm text-gray-200">
            <li>✓&nbsp; 24 hours of live TV, sports, movies &amp; series</li>
            <li>✓&nbsp; Trial includes 2 connections</li>
            <li>✓&nbsp; Choose a plan anytime from your account</li>
          </ul>
          <form onSubmit={handleTrial}>
            {loginBlock}
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Requesting…' : 'Request my free trial →'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-5">
            Rather pick a plan? <Link href="/renew" className="link">See all plans</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-medium animate-in">
      <div className="text-center mb-7">
        <span className="eyebrow">Checkout</span>
        <h1 className="page-title">Complete your payment</h1>
        <p className="page-sub">Two quick steps: send with Cash App, then confirm below.</p>
      </div>

      <div className="card">
        {/* Order summary */}
        <div className="tile mb-6" style={{ padding: 22 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Your plan</p>
              <p className="text-lg font-bold">{plan.name}</p>
              <p className="text-sm text-muted">{plan.connections} connection{plan.connections > 1 ? 's' : ''} · {plan.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">Total</p>
              <p className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>${plan.price}</p>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <Link href="/renew" className="link">Change plan</Link>
          </div>
        </div>

        {/* Step 1: Cash App */}
        <div className="mb-6">
          <p className="field-label"><span className="text-red">01</span>&nbsp; Send ${plan.price} with Cash App</p>
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(140deg, rgba(0,214,50,.12), rgba(0,0,0,.25))', border: '1px solid rgba(0,214,50,.35)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: '#4ade80' }}>{cashTag}</span>
              <button type="button" className="btn-secondary" style={{ minHeight: 40, padding: '8px 14px', fontSize: 13 }}
                onClick={() => { navigator.clipboard?.writeText(cashTag).then(() => setCopied(true)).catch(() => {}); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? 'Copied ✓' : 'Copy $Cashtag'}
              </button>
            </div>
            <a href={cashLink} target="_blank" rel="noopener noreferrer" className="btn-primary w-full mt-4" style={{ background: 'linear-gradient(135deg,#00d632,#00a827)', boxShadow: '0 10px 30px rgba(0,214,50,.2)' }}>
              Open Cash App · ${plan.price} ↗
            </a>
            <p className="text-xs text-muted mt-3">On a computer? Open Cash App on your phone → Pay → {cashTag} → ${plan.price}.</p>
          </div>
        </div>

        {/* Step 2: Confirm */}
        <form onSubmit={handleSubmit}>
          {loginBlock}
          <label htmlFor="cashapp" className="field-label"><span className="text-red">02</span>&nbsp; Your Cash App name or $Cashtag</label>
          <input id="cashapp" type="text" value={cashAppName} onChange={(e) => setCashAppName(e.target.value)}
            placeholder="$yourcashtag or display name" maxLength={60} required />
          <p className="field-hint">So we can match your payment.</p>
          {error && <div className="alert alert-error mt-4">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full mt-5">
            {loading ? 'Submitting…' : `I sent $${plan.price} →`}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-muted mt-5">
        Questions about paying? <Link href="/support?topic=billing" className="link">Contact support</Link>
      </p>

      <ConnectionWarning
        plan={plan}
        open={showWarning}
        onClose={() => setShowWarning(false)}
        onChoose={(chosen) => {
          setShowWarning(false)
          if (chosen.id !== plan.id) router.replace(`/pay?plan=${chosen.id}&confirmed=1`)
        }}
      />
    </div>
  )
}

function PaymentLoading() {
  return <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentLoading />}>
      <PaymentContent />
    </Suspense>
  )
}
