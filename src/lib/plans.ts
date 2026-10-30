// Single source of truth for WKTV plans and prices.
// The server uses this list to decide what a customer is charged,
// so prices can't be changed from the browser.

export type PlanKind = 'trial' | 'monthly' | 'annual' | 'lifetime' | 'bundle'

export interface Plan {
  id: string
  name: string
  price: number // whole US dollars
  connections: number
  duration: string
  kind: PlanKind
  badge?: string
  months?: number // length of service in months (used for bundles)
  device?: string // streaming box included with a bundle
  ships?: boolean // true = we ship a box, so checkout asks for a shipping address
}

export const PLAN_LIST: Plan[] = [
  { id: 'trial-free', name: 'Free 24-Hour Trial', price: 0, connections: 2, duration: '24 hours', kind: 'trial' },
  { id: 'trial-1mo', name: '1-Month Trial', price: 20, connections: 1, duration: '1 month', kind: 'trial' },
  { id: 'monthly-1', name: 'Monthly', price: 30, connections: 1, duration: '1 month', kind: 'monthly' },
  { id: 'annual-1', name: '1 Connection Annual', price: 175, connections: 1, duration: '1 year', kind: 'annual' },
  { id: 'annual-2', name: '2 Connections Annual', price: 225, connections: 2, duration: '1 year', kind: 'annual' },
  { id: 'annual-3', name: '3 Connections Annual', price: 250, connections: 3, duration: '1 year', kind: 'annual' },
  { id: 'annual-4', name: '4 Connections Annual', price: 275, connections: 4, duration: '1 year', kind: 'annual' },
  { id: 'annual-5', name: '5 Connections Annual', price: 300, connections: 5, duration: '1 year', kind: 'annual', badge: 'Best Value' },
  { id: 'lifetime-1', name: 'Lifetime 1 Connection', price: 600, connections: 1, duration: 'lifetime', kind: 'lifetime' },
  { id: 'lifetime-5', name: 'Lifetime 5 Connections', price: 850, connections: 5, duration: 'lifetime', kind: 'lifetime', badge: 'Best Lifetime Value' },
  // Streaming box with WKTV pre-installed + service, shipped to the customer
  { id: 'box-plus-2mo', name: 'ONN 4K Plus Box + 2 Months', price: 165, connections: 1, duration: '2 months', kind: 'bundle', months: 2, device: 'ONN 4K Plus', ships: true },
  { id: 'box-plus-1yr', name: 'ONN 4K Plus Box + 1 Year', price: 250, connections: 1, duration: '1 year', kind: 'bundle', months: 12, device: 'ONN 4K Plus', ships: true, badge: 'Best Value' },
  { id: 'box-pro-2mo', name: 'ONN 4K Pro Box + 2 Months', price: 200, connections: 1, duration: '2 months', kind: 'bundle', months: 2, device: 'ONN 4K Pro', ships: true },
  { id: 'box-pro-1yr', name: 'ONN 4K Pro Box + 1 Year', price: 285, connections: 1, duration: '1 year', kind: 'bundle', months: 12, device: 'ONN 4K Pro', ships: true, badge: 'Best Value' },
]

// Short code customers type in the payment note (Cash App / Zelle / Venmo), so payments
// can be matched without naming the service: A = annual, M = 1 month, L = lifetime,
// followed by the number of connections. Example: A2 = annual, 2 connections.
// Box bundles: PLUS2 / PLUS12 / PRO2 / PRO12 = which box + months of service.
export function paymentNoteCode(plan: Plan): string {
  if (plan.kind === 'bundle') return `${/pro/i.test(plan.device || '') ? 'PRO' : 'PLUS'}${plan.months || 1}`
  const letter = plan.kind === 'annual' ? 'A' : plan.kind === 'lifetime' ? 'L' : 'M'
  return `${letter}${plan.connections}`
}

export const PAYMENT_METHODS = ['cashapp', 'zelle', 'venmo'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { cashapp: 'Cash App', zelle: 'Zelle', venmo: 'Venmo' }

export const PLANS: Record<string, Plan> = Object.fromEntries(PLAN_LIST.map((p) => [p.id, p]))

export function getPlan(id: unknown): Plan | null {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null
}

// How many months of service a plan adds (lifetime = 1200)
export function planMonths(plan: Plan): number {
  if (plan.kind === 'lifetime') return 1200
  if (plan.months) return plan.months
  if (plan.kind === 'annual' || plan.duration === '1 year') return 12
  return 1
}

// Box bundles (box + service, shipped)
export const BUNDLE_PLANS: Plan[] = PLAN_LIST.filter((p) => p.kind === 'bundle')

// Plans an existing customer can buy or renew from their account.
export const RENEWABLE_PLANS: Plan[] = PLAN_LIST.filter((p) => p.kind !== 'trial')

// Larger-connection versions of the same plan type. Extra connections can only be
// chosen when the customer first signs up, so we offer these before they finish.
export function connectionUpgrades(plan: Plan | null): Plan[] {
  if (!plan) return []
  if (plan.kind === 'annual') {
    return PLAN_LIST.filter((p) => p.kind === 'annual' && p.connections > plan.connections)
  }
  if (plan.kind === 'lifetime') {
    return PLAN_LIST.filter((p) => p.kind === 'lifetime' && p.connections > plan.connections)
  }
  return []
}

// Plans offered in the signup dropdown, in display order
export const SIGNUP_PLAN_OPTIONS: Plan[] = PLAN_LIST
