'use client'

import { useEffect, useRef, type DetailsHTMLAttributes, type ReactNode } from 'react'

/**
 * A collapsible <details> section that remembers whether it was left open or
 * closed (per browser), so the admin page comes back the way it was left.
 */
export default function RememberedDetails({
  storageKey,
  defaultOpen = true,
  children,
  ...rest
}: {
  storageKey: string
  defaultOpen?: boolean
  children: ReactNode
} & Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'open'>) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const key = `admin:open:${storageKey}`
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) el.open = saved === '1'
    } catch {}
    const save = () => {
      try { localStorage.setItem(key, el.open ? '1' : '0') } catch {}
    }
    el.addEventListener('toggle', save)
    return () => el.removeEventListener('toggle', save)
  }, [storageKey])

  return (
    <details ref={ref} open={defaultOpen} {...rest}>
      {children}
    </details>
  )
}
