'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getPlan, connectionUpgrades, SIGNUP_PLAN_OPTIONS, PLAN_LIST, type Plan } from '@/lib/plans'
import ConnectionWarning from '@/components/ConnectionWarning'

function planLabel(p: Plan) {
  if (p.kind === 'trial') return `${p.name} — ${p.price === 0 ? 'FREE' : `$${p.price}`}`
  if (p.kind === 'monthly') {
    const m = p.months || 1
    return m === 1 ? `1 month · 1 connection — $${p.price}/month` : `${m} months · 1 connection — $${p.price}`
  }
  if (p.kind === 'annual') return `Annual · ${p.connections} connection${p.connections > 1 ? 's' : ''} — $${p.price}/year${p.badge ? ` (${p.badge})` : ''}`
  return `Lifetime · ${p.connections} connection${p.connections > 1 ? 's' : ''} — $${p.price} one-time`
}

type CustomerType = 'new' | 'current' | null

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkedPlan = getPlan(searchParams.get('plan'))

  // New or current customer? (current customers renew their existing line instead of getting a new one)
  const [customerType, setCustomerType] = useState<CustomerType>(searchParams.get('existing') === '1' ? 'current' : null)

  // New customers: start with the plan picked on the homepage (if any)
  const [planId, setPlanId] = useState<string>(linkedPlan && !linkedPlan.renewOnly ? linkedPlan.id : '')
  // Current customers: renewal / upgrade choice
  const [renewPlanId, setRenewPlanId] = useState<string>(linkedPlan && linkedPlan.kind !== 'trial' ? linkedPlan.id : 'monthly-1')
  const plan = customerType === 'current' ? getPlan(renewPlanId) : getPlan(planId)

  const [tvUser, setTvUser] = useState('')
  const [tvPass, setTvPass] = useState('')
  const [showTvPass, setShowTvPass] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)

  const [showWarning, setShowWarning] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in? Skip signup and go to checkout or the account page.
  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (d.user && !accountCreated) router.replace(plan ? `/pay?plan=${plan.id}` : '/dashboard')
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (customerType === 'current') {
      if (!tvUser.trim() || !tvPass.trim()) {
        setError('Enter the username and password from your TV app.')
        return
      }
      await createAccount(plan)
      return
    }
    // New customers: last chance to add connections
    if (plan && connectionUpgrades(plan).length > 0) {
      setShowWarning(true)
      return
    }
    await createAccount(plan)
  }

  const createAccount = async (finalPlan: Plan | null) => {
    setError('')
    setLoading(true)
    try {
      if (!accountCreated) {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Signup failed')
          setLoading(false)
          return
        }
        setAccountCreated(true)
      }

      if (customerType === 'current') {
        // Connect their existing line (checked against the IPTV panel, case-sensitive)
        const res = await fetch('/api/account/link-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ iptvUsername: tvUser.trim(), iptvPassword: tvPass.trim() }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setError(`Your website account is created, but we couldn’t connect your TV login: ${data.error || 'please try again.'}`)
          setLoading(false)
          return
        }
      }

      // Plan chosen -> checkout (renewals extend the connected line). No plan -> account page.
      router.push(finalPlan ? `/pay?plan=${finalPlan.id}&confirmed=1` : '/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const groups: { label: string; kind: Plan['kind'] }[] = [
    { label: 'Try it first', kind: 'trial' },
    { label: 'Monthly', kind: 'monthly' },
    { label: 'Annual', kind: 'annual' },
    { label: 'Lifetime (one-time payment)', kind: 'lifetime' },
  ]
  const renewPlans = PLAN_LIST.filter((p) => p.kind === 'monthly')
  const upgradePlans = PLAN_LIST.filter((p) => p.kind === 'annual')
  const lifetimePlans = PLAN_LIST.filter((p) => p.kind === 'lifetime')

  const toggleStyle = (active: boolean) => ({
    padding: '14px 16px',
    borderColor: active ? 'rgba(238,48,47,.75)' : undefined,
    background: active ? 'rgba(238,48,47,.10)' : undefined,
  })

  return (
    <div className="portal-narrow animate-in">
      <div className="text-center mb-7">
        <span className="eyebrow">Create your account</span>
        <h1 className="page-title">{customerType === 'current' ? 'Welcome back to WKTV' : 'Start watching WKTV'}</h1>
        <p className="page-sub">
          {customerType === 'current'
            ? 'Connect the TV login you already have, then renew or upgrade.'
            : plan ? 'Create your account, then complete your order.' : 'One account for your plan, renewals, and support.'}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Step 1: new or current customer */}
          <div>
            <p className="field-label">Are you new to WKTV?</p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Customer type">
              <button type="button" role="radio" aria-checked={customerType === 'new'} onClick={() => { setCustomerType('new'); setError('') }}
                className="tile text-left" style={toggleStyle(customerType === 'new')} disabled={accountCreated}>
                <span className="font-bold block">I’m a new customer</span>
                <span className="text-sm text-muted">First time with WKTV</span>
              </button>
              <button type="button" role="radio" aria-checked={customerType === 'current'} onClick={() => { setCustomerType('current'); setError('') }}
                className="tile text-left" style={toggleStyle(customerType === 'current')} disabled={accountCreated}>
                <span className="font-bold block">I’m a current customer</span>
                <span className="text-sm text-muted">I already have a WKTV login</span>
              </button>
            </div>
          </div>

          {customerType && <div className="divider" />}

          {customerType === 'current' && (
            <>
              <div className="alert alert-warn text-sm">
                Use the <b>username and password from your TV app</b>. They’re <b>case-sensitive</b>: type capital and small letters exactly as they appear.
              </div>
              <div>
                <label htmlFor="tv-user" className="field-label">TV app username</label>
                <input id="tv-user" type="text" value={tvUser} onChange={(e) => setTvUser(e.target.value)}
                  autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  placeholder="Exactly as it appears in your app" maxLength={64} required disabled={loading} />
              </div>
              <div>
                <label htmlFor="tv-pass" className="field-label">TV app password</label>
                <div className="flex gap-2">
                  <input id="tv-pass" type={showTvPass ? 'text' : 'password'} value={tvPass} onChange={(e) => setTvPass(e.target.value)}
                    autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={64} required disabled={loading} />
                  <button type="button" className="btn-secondary" style={{ minHeight: 40, padding: '8px 14px', fontSize: 13 }}
                    onClick={() => setShowTvPass((v) => !v)}>{showTvPass ? 'Hide' : 'Show'}</button>
                </div>
                <p className="field-hint">We check it with your TV service so your renewal goes on the right line.</p>
              </div>
              <div>
                <label htmlFor="renew-select" className="field-label">Renew or upgrade</label>
                <select id="renew-select" value={renewPlanId} onChange={(e) => setRenewPlanId(e.target.value)} disabled={loading}>
                  <optgroup label="Renew your service">
                    {renewPlans.map((p) => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
                  </optgroup>
                  <optgroup label="Upgrade to annual">
                    {upgradePlans.map((p) => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
                  </optgroup>
                  <optgroup label="Lifetime (one-time payment)">
                    {lifetimePlans.map((p) => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
                  </optgroup>
                  <option value="">Just connect my account for now</option>
                </select>
                {plan && (
                  <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(238,48,47,.08)', border: '1px solid rgba(238,48,47,.3)' }}>
                    <span className="text-sm text-gray-200">{plan.name} · added to your current line</span>
                    <span className="font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>${plan.price}</span>
                  </div>
                )}
              </div>
              <div className="divider" />
            </>
          )}

          {customerType === 'new' && (
            <>
              <div>
                <label htmlFor="plan-select" className="field-label">Choose your plan</label>
                <select id="plan-select" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">Create my account now, pick a plan later</option>
                  {groups.map((g) => (
                    <optgroup key={g.kind} label={g.label}>
                      {SIGNUP_PLAN_OPTIONS.filter((p) => p.kind === g.kind).map((p) => (
                        <option key={p.id} value={p.id}>{planLabel(p)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {plan && (
                  <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(238,48,47,.08)', border: '1px solid rgba(238,48,47,.3)' }}>
                    <span className="text-sm text-gray-200">{plan.name}</span>
                    <span className="font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>{plan.price === 0 ? 'FREE' : `$${plan.price}`}</span>
                  </div>
                )}
              </div>
              <div className="divider" />
            </>
          )}

          {customerType && (
            <>
              <p className="text-sm text-muted" style={{ marginBottom: -4 }}>Your wktv.live account</p>
              <div>
                <label htmlFor="name" className="field-label">Full name</label>
                <input id="name" type="text" autoComplete="name" value={formData.name} disabled={accountCreated}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Smith" required />
              </div>

              <div>
                <label htmlFor="phone" className="field-label">Phone number <span className="text-muted font-normal">(optional)</span></label>
                <input id="phone" type="tel" autoComplete="tel" value={formData.phone} disabled={accountCreated}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(555) 123-4567" />
                <p className="field-hint">Helps us recover your account if you get locked out.</p>
              </div>

              <div>
                <label htmlFor="email" className="field-label">Email</label>
                <input id="email" type="email" autoComplete="email" value={formData.email} disabled={accountCreated}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" required />
              </div>

              <div>
                <label htmlFor="password" className="field-label">Website password</label>
                <input id="password" type="password" autoComplete="new-password" value={formData.password} disabled={accountCreated}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="At least 8 characters" minLength={8} required />
                {customerType === 'current' && <p className="field-hint">For signing in to wktv.live. It can be different from your TV app password.</p>}
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading
                  ? (customerType === 'current' ? 'Checking your TV login…' : 'Creating account…')
                  : customerType === 'current'
                    ? (accountCreated ? 'Try connecting again →' : plan ? 'Create account & continue →' : 'Create account & connect →')
                    : plan ? (plan.price === 0 ? 'Create account & start trial →' : 'Create account & continue →') : 'Create account →'}
              </button>
              {accountCreated && customerType === 'current' && (
                <p className="text-sm text-muted text-center">
                  Can’t get it to connect? <Link href="/support?topic=account_link" className="link">Ask us to connect it for you</Link>.
                </p>
              )}
            </>
          )}
        </form>

        <p className="text-center text-muted text-sm mt-6">
          Already have a wktv.live account?{' '}
          <Link href={plan ? `/login?plan=${plan.id}` : '/login'} className="link">Sign in</Link>
        </p>
      </div>

      <p className="text-center text-xs text-muted mt-5">🔒 Your password is stored securely. We never share your information.</p>

      {plan && customerType === 'new' && (
        <ConnectionWarning
          plan={plan}
          open={showWarning}
          busy={loading}
          onClose={() => setShowWarning(false)}
          onChoose={(chosen) => {
            setPlanId(chosen.id)
            setShowWarning(false)
            createAccount(chosen)
          }}
        />
      )}
    </div>
  )
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SignupContent />
    </Suspense>
  )
}
