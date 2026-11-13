'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { saveRefFromUrl } from '@/lib/referral'

const FB_GROUP = 'https://www.facebook.com/groups/wktvsupport'

// Header shown on every portal page. Same menu as the marketing pages so
// customers can move between them without noticing a switch.
export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string | null; email: string; role: string } | null>(null)
  const [checked, setChecked] = useState(false)

  // Remember a referral link's ?ref= so it's filled in when the friend starts their trial
  useEffect(() => { saveRefFromUrl() }, [pathname])

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setUser(d.user || null); setChecked(true) } })
      .catch(() => { if (!cancelled) setChecked(true) })
    return () => { cancelled = true }
  }, [pathname])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <div className="site-offer">
        YOUR NEXT WATCH STARTS HERE.
        <Link href="/pay?plan=trial-free">Try WKTV free for 24 hours ↗</Link>
      </div>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="WKTV home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/wktv-logo.png" alt="WKTV Watch Anywhere" />
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="/#plans">Plans</a>
            <a href="/support.html#connect">How to connect</a>
            <a href="/troubleshooting.html">Troubleshooting</a>
            <a href="/support.html">Support</a>
          </nav>
          <div className="site-actions">
            <ThemeToggle />
            {!checked ? null : user ? (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin" className="btn-secondary">Admin</Link>
                )}
                <Link href="/dashboard" className="btn-primary">My Account</Link>
                <button onClick={logout} className="btn-ghost" type="button">Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">Member login</Link>
                <Link href="/signup" className="btn-primary">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}

// Light / dark switch. The click is handled by /theme.js (shared with the static pages).
function ThemeToggle() {
  return (
    <button type="button" className="theme-toggle" data-theme-toggle aria-label="Switch light or dark mode" title="Light / dark mode">
      <svg className="ti-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
      <svg className="ti-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" /></svg>
    </button>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a href="/">Home</a>
        <a href="/#plans">Plans</a>
        <a href="/support.html#connect">How to connect</a>
        <a href="/troubleshooting.html">Troubleshooting</a>
        <Link href="/support">Contact support</Link>
        <a href={FB_GROUP} target="_blank" rel="noopener noreferrer">Facebook support group ↗</a>
        <span className="copy">© 2026 WKTV</span>
      </div>
    </footer>
  )
}
