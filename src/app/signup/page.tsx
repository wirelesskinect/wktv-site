'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { getPlan, connectionUpgrades, SIGNUP_PLAN_OPTIONS, type Plan } from '@/lib/plans'
import ConnectionWarning from '@/components/ConnectionWarning'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Start with the plan picked on the homepage (if any); the customer can change it here
  const [planId, setPlanId] = useState<string>(getPlan(searchParams.get('plan'))?.id || '')
  const plan = getPlan(planId)
  const [showWarning, setShowWarning] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    // Last chance to add connections: they can only be chosen at first signup
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

      // Plan chosen -> straight to checkout (warning already shown). No plan -> account page.
      router.push(finalPlan ? `/pay?plan=${finalPlan.id}&confirmed=1` : '/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/wktv-logo.jpg" alt="WKTV" width={80} height={80} className="mx-auto rounded" />
          </Link>
        </div>

        {/* Card */}
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-2 tracking-tight">CREATE ACCOUNT</h1>
          <p className="text-gray-400 text-center mb-8">
            {plan ? 'Create your account, then complete your order' : 'Sign up to start streaming'}
          </p>

          <div className="mb-6">
            <label htmlFor="plan-select" className="block text-sm font-medium text-gray-300 mb-2">Choose your plan</label>
            <select
              id="plan-select"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-red-500 focus:outline-none"
            >
              <option value="">Create my account now, pick a plan later</option>
              <optgroup label="Try it first">
                {SIGNUP_PLAN_OPTIONS.filter((p) => p.kind === 'trial').map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.price === 0 ? 'FREE' : `$${p.price}`}</option>
                ))}
              </optgroup>
              <optgroup label="Monthly">
                {SIGNUP_PLAN_OPTIONS.filter((p) => p.kind === 'monthly').map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (1 connection) — ${p.price}/month</option>
                ))}
              </optgroup>
              <optgroup label="Annual">
                {SIGNUP_PLAN_OPTIONS.filter((p) => p.kind === 'annual').map((p) => (
                  <option key={p.id} value={p.id}>{p.connections} connection{p.connections > 1 ? 's' : ''} — ${p.price}/year{p.badge ? ` (${p.badge})` : ''}</option>
                ))}
              </optgroup>
              <optgroup label="Lifetime (one-time payment)">
                {SIGNUP_PLAN_OPTIONS.filter((p) => p.kind === 'lifetime').map((p) => (
                  <option key={p.id} value={p.id}>{p.connections} connection{p.connections > 1 ? 's' : ''} — ${p.price} one-time</option>
                ))}
              </optgroup>
            </select>
            {plan && plan.connections < 5 && connectionUpgrades(plan).length > 0 && (
              <p className="mt-2 text-xs text-yellow-400">⚠ Extra connections can only be added at sign-up, not later.</p>
            )}
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 text-red-400 text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - for account recovery</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : plan ? (plan.price === 0 ? 'Create Account & Start Trial' : 'Create Account & Continue') : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href={plan ? `/login?plan=${plan.id}` : '/login'} className="text-red-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          <Link href="/" className="hover:text-white">← Back to Home</Link>
        </p>
      </div>

      {plan && (
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

function SignupLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupContent />
    </Suspense>
  )
}
