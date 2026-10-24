'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { siteConfig } from '@/config/site'

interface Subscription {
  id: string
  iptv_username: string
  plan_name: string
  status: string
  expires_at: string | null
}

interface Plan {
  id: string
  name: string
  price: number
  connections: number
  duration: string
  badge?: string
}

const PLANS: Plan[] = [
  { id: 'monthly-1', name: 'Monthly', price: 30, connections: 1, duration: '1 month' },
  { id: 'annual-1', name: '1 Connection Annual', price: 175, connections: 1, duration: '1 year' },
  { id: 'annual-2', name: '2 Connections Annual', price: 225, connections: 2, duration: '1 year' },
  { id: 'annual-3', name: '3 Connections Annual', price: 250, connections: 3, duration: '1 year' },
  { id: 'annual-4', name: '4 Connections Annual', price: 275, connections: 4, duration: '1 year' },
  { id: 'annual-5', name: '5 Connections Annual', price: 300, connections: 5, duration: '1 year', badge: 'Best Value' },
]

export default function RenewPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1])
  const [cashAppName, setCashAppName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user) {
        router.push('/login')
        return
      }
      fetchSubscription()
    } catch {
      router.push('/login')
    }
  }

  async function fetchSubscription() {
    try {
      const res = await fetch('/api/subscription')
      const data = await res.json()
      if (data.subscription) {
        setSubscription(data.subscription)
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cashAppName.trim()) {
      setError('Please enter your Cash App name')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/payment/cashapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amountCents: selectedPlan.price * 100,
          connections: selectedPlan.connections,
          duration: selectedPlan.duration,
          cashAppName: cashAppName.trim(),
          isRenewal: !!subscription?.iptv_username,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold mb-4">PAYMENT SUBMITTED!</h1>
          <p className="text-gray-400 mb-2">We received your payment notification.</p>
          <p className="text-gray-400 mb-8">We'll verify your Cash App payment and update your subscription within a few hours.</p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const daysUntilExpiry = subscription?.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <Link href="/">
            <Image src="/wktv-logo.jpg" alt="WKTV" width={32} height={32} className="rounded" />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {subscription?.iptv_username ? 'RENEW SUBSCRIPTION' : 'SUBSCRIBE TO WKTV'}
          </h1>
          <p className="text-gray-400">Pay with Cash App</p>
        </div>

        {/* Current Subscription */}
        {subscription?.iptv_username && (
          <div className="bg-gray-900 border border-gray-800 p-4 rounded mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">@{subscription.iptv_username}</p>
                <p className={`text-sm ${
                  daysUntilExpiry && daysUntilExpiry <= 3 ? 'text-red-400' :
                  daysUntilExpiry && daysUntilExpiry <= 7 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {daysUntilExpiry !== null
                    ? daysUntilExpiry > 0
                      ? `Expires in ${daysUntilExpiry} days`
                      : 'Expired'
                    : subscription.status}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Select Plan</h3>
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full p-4 rounded text-left transition-all ${
                  selectedPlan.id === plan.id
                    ? 'bg-red-600 border-2 border-red-500'
                    : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="text-gray-400 text-sm">{plan.connections} Connection{plan.connections > 1 ? 's' : ''} • {plan.duration}</p>
                    {plan.badge && (
                      <span className="inline-block mt-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded">{plan.badge}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${plan.price}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cash App Payment */}
        <div className="bg-gray-900 border border-gray-800 rounded p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Pay with Cash App</h3>

          <div className="bg-green-900/30 border border-green-700 p-4 rounded mb-6">
            <p className="text-gray-300 mb-2">
              Send <span className="font-bold text-white">${selectedPlan.price}</span> to:
            </p>
            <div className="bg-black p-3 rounded text-center">
              <span className="text-2xl font-bold text-green-400">{siteConfig.cashAppTag}</span>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Open Cash App → Pay → Enter {siteConfig.cashAppTag} → Send ${selectedPlan.price}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-400 text-sm mb-4 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Your Cash App Name / $Cashtag</label>
              <input
                type="text"
                value={cashAppName}
                onChange={(e) => setCashAppName(e.target.value)}
                placeholder="$yourcashtag"
                className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">This helps us verify your payment</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : `I Sent $${selectedPlan.price}`}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Need help? <Link href="/support" className="text-red-500 hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  )
}
