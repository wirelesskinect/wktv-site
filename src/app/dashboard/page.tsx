'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
}

interface SubscriptionData {
  status: 'active' | 'expired' | 'pending' | 'unlinked'
  username?: string
  expiryDate?: string
  daysRemaining?: number
  planName?: string
  pendingRequest?: { planName: string; amount: number; method: string; requestedAt: string } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch current user from custom auth
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          fetchSubscription()
        } else {
          // Not logged in, middleware should have caught this but just in case
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription')
      const data = await res.json()
      setSubscription(data)
    } catch (err) {
      setSubscription({ status: 'unlinked' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold tracking-tight">WKTV</span>
            </Link>
            <div className="flex items-center gap-6">
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-12 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-8"></div>

          {/* Status Card Skeleton */}
          <div className="border border-gray-200 p-8 mb-8">
            <div className="h-16 bg-gray-100 animate-pulse rounded mb-6"></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
              </div>
              <div>
                <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </div>
          </div>

          {/* Quick Links Skeleton */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 p-6">
              <div className="h-5 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
            </div>
            <div className="border border-gray-200 p-6">
              <div className="h-5 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Customer'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="text-lg font-bold tracking-tight">WKTV</span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-gray-500 text-sm">Hi, {userName}</span>
            <button 
              onClick={handleLogout} 
              className="text-gray-400 hover:text-black text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8 tracking-tight">MY SUBSCRIPTION</h1>

        {/* Status Card */}
        <div className="border border-gray-200 p-8 mb-8">
          {subscription?.status === 'unlinked' || subscription?.status === 'pending' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📺</div>
              <h2 className="text-xl font-bold mb-2">
                {subscription?.status === 'pending' ? 'AWAITING CONFIRMATION' : 'WELCOME TO WKTV'}
              </h2>
              <p className="text-gray-500 mb-6">
                {subscription?.status === 'pending'
                  ? subscription?.pendingRequest
                    ? `We received your request for ${subscription.pendingRequest.planName}${subscription.pendingRequest.amount ? ` ($${subscription.pendingRequest.amount})` : ''}. We’ll activate it shortly.`
                    : 'Your account is being set up. We’ll activate it shortly.'
                  : 'Your account is ready. Choose a plan or start a free trial to begin streaming.'}
              </p>
              {subscription?.status !== 'pending' && (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/renew" className="btn-primary inline-block">
                    Choose a Plan
                  </Link>
                  <Link href="/pay?plan=trial-free" className="btn-secondary inline-block">
                    Free 24-Hour Trial
                  </Link>
                </div>
              )}
              <div className="mt-4">
                <Link href="/support" className="text-gray-400 hover:text-black text-sm transition-colors">
                  Need help? Contact Support
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className={`flex items-center gap-3 p-4 mb-6 ${
                subscription?.status === 'active' 
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <span className="text-2xl">
                  {subscription?.status === 'active' ? '✓' : '⚠'}
                </span>
                <div>
                  <p className={`font-semibold ${
                    subscription?.status === 'active' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {subscription?.status === 'active' ? 'Active Subscription' : 'Subscription Expired'}
                  </p>
                  {subscription?.daysRemaining !== undefined && (
                    <p className="text-sm text-gray-500">
                      {subscription.daysRemaining > 0 
                        ? `${subscription.daysRemaining} days remaining`
                        : 'Expired'}
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Username</p>
                  <p className="text-lg font-semibold">{subscription?.username || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Expires</p>
                  <p className="text-lg font-semibold">{subscription?.expiryDate || 'N/A'}</p>
                </div>
              </div>

              {/* Renew / upgrade */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                {subscription?.pendingRequest ? (
                  <p className="text-gray-600">
                    Your request for <b>{subscription.pendingRequest.planName}</b> is waiting for confirmation. We’ll update your plan shortly.
                  </p>
                ) : (
                  <Link href="/renew" className="btn-primary inline-block">
                    {subscription?.status !== 'active' || (subscription?.daysRemaining && subscription.daysRemaining < 7)
                      ? 'Renew Subscription'
                      : 'Renew or Upgrade'}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/support" className="border border-gray-200 p-6 hover:border-gray-400 transition-colors">
            <h3 className="font-bold mb-2">💬 NEED HELP?</h3>
            <p className="text-gray-500 text-sm">Chat with support or submit a request.</p>
          </Link>
          <a 
            href="https://www.youtube.com/@OmegaTV-IPTV" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="border border-gray-200 p-6 hover:border-gray-400 transition-colors"
          >
            <h3 className="font-bold mb-2">📺 SETUP GUIDE</h3>
            <p className="text-gray-500 text-sm">Watch video tutorials for your devices.</p>
          </a>
        </div>
      </main>
    </div>
  )
}
