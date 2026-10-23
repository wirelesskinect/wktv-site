'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { siteConfig } from '@/config/site'

const PLANS: Record<string, { name: string; price: number; connections: number; duration: string }> = {
  'trial-free': { name: 'Free 24-Hour Trial', price: 0, connections: 1, duration: '24 hours' },
  'trial-1mo': { name: '1-Month Trial', price: 20, connections: 1, duration: '1 month' },
  'monthly-1': { name: 'Monthly', price: 30, connections: 1, duration: '1 month' },
  'annual-1': { name: '1 Connection Annual', price: 175, connections: 1, duration: '1 year' },
  'annual-2': { name: '2 Connections Annual', price: 225, connections: 2, duration: '1 year' },
  'annual-3': { name: '3 Connections Annual', price: 250, connections: 3, duration: '1 year' },
  'annual-4': { name: '4 Connections Annual', price: 275, connections: 4, duration: '1 year' },
  'annual-5': { name: '5 Connections Annual', price: 300, connections: 5, duration: '1 year' },
  'lifetime-1': { name: 'Lifetime 1 Connection', price: 600, connections: 1, duration: 'lifetime' },
  'lifetime-5': { name: 'Lifetime 5 Connections', price: 800, connections: 5, duration: 'lifetime' },
}

function PaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planId = searchParams.get('plan') || 'annual-1'
  const plan = PLANS[planId] || PLANS['annual-1']
  
  const [cashAppName, setCashAppName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user) {
        router.push(`/signup?plan=${planId}`)
        return
      }
      setUser(data.user)
    } catch {
      router.push(`/signup?plan=${planId}`)
    } finally {
      setCheckingAuth(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cashAppName.trim()) {
      setError('Please enter your Cash App name')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payment/cashapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          planName: plan.name,
          amountCents: plan.price * 100,
          connections: plan.connections,
          duration: plan.duration,
          cashAppName: cashAppName.trim(),
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (plan.price === 0) {
    // Free trial - no payment needed
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <Image src="/wktv-logo.jpg" alt="WKTV" width={80} height={80} className="mx-auto mb-6 rounded" />
          <h1 className="text-2xl font-bold mb-4">FREE 24-HOUR TRIAL</h1>
          <p className="text-gray-400 mb-8">No payment required. Start watching now!</p>
          <Link href="/signup?plan=trial-free" className="btn-primary w-full block text-center">
            Start Free Trial
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold mb-4">PAYMENT SUBMITTED!</h1>
          <p className="text-gray-400 mb-2">We received your payment notification.</p>
          <p className="text-gray-400 mb-8">We'll verify your Cash App payment and activate your account within a few hours.</p>
          <p className="text-gray-500 text-sm mb-8">Check your email for confirmation.</p>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/wktv-logo.jpg" alt="WKTV" width={60} height={60} className="mx-auto rounded" />
          </Link>
        </div>

        {/* Payment Card */}
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-2">COMPLETE PAYMENT</h1>
          <p className="text-gray-400 text-center mb-8">Send payment via Cash App</p>

          {/* Plan Summary */}
          <div className="bg-gray-800 p-4 rounded mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Plan:</span>
              <span className="font-bold">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Connections:</span>
              <span>{plan.connections}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Duration:</span>
              <span>{plan.duration}</span>
            </div>
            <div className="border-t border-gray-700 my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total:</span>
              <span className="text-2xl font-bold text-red-500">${plan.price}</span>
            </div>
          </div>

          {/* Cash App Instructions */}
          <div className="bg-green-900/30 border border-green-700 p-4 rounded mb-6">
            <h3 className="font-bold text-green-400 mb-2">💵 Pay with Cash App</h3>
            <p className="text-gray-300 mb-3">
              Send <span className="font-bold text-white">${plan.price}</span> to:
            </p>
            <div className="bg-black p-3 rounded text-center mb-3">
              <span className="text-2xl font-bold text-green-400">{siteConfig.cashAppTag}</span>
            </div>
            <p className="text-gray-400 text-sm">
              Open Cash App → Pay → Enter <strong>{siteConfig.cashAppTag}</strong> → Send ${plan.price}
            </p>
          </div>

          {/* Confirmation Form */}
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 text-red-400 text-sm mb-4 rounded">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Cash App Name / $Cashtag
              </label>
              <input
                type="text"
                value={cashAppName}
                onChange={(e) => setCashAppName(e.target.value)}
                placeholder="$yourcashtag or display name"
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This helps us verify your payment
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'I Sent the Payment'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Need help? Contact us
          </p>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          <Link href="/" className="hover:text-white">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}

function PaymentLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentLoading />}>
      <PaymentContent />
    </Suspense>
  )
}
