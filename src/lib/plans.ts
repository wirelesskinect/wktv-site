// Single source of truth for WKTV plans and prices.
// The server uses this list to decide what a customer is charged,
// so prices can't be changed from the browser.

export type PlanKind = 'trial' | 'monthly' | 'annual' | 'lifetime'

export interface Plan {
  id: string
  name: string
  price: number // whole US dollars
  connections: number
  duration: string
  kind: PlanKind
  badge?: string
  months?: number // length for month-based plans (1, 3, 6)
  renewOnly?: boolean // offered to current customers only
}

export const PLAN_LIST: Plan[] = [
  { id: 'trial-free', name: 'Free 24-Hour Trial', price: 0, connections: 2, duration: '24 hours', kind: 'trial' },
  { id: 'trial-1mo', name: '1-Month Trial', price: 20, connections: 1, duration: '1 month', kind: 'trial', months: 1 },
  { id: 'monthly-1', name: 'Monthly', price: 30, connections: 1, duration: '1 month', kind: 'monthly', months: 1 },
  { id: 'months-3', name: '3 Months', price: 75, connections: 1, duration: '3 months', kind: 'monthly', months: 3, renewOnly: true },
  { id: 'months-6', name: '6 Months', price: 120, connections: 1, duration: '6 months', kind: 'monthly', months: 6, renewOnly: true },
  { id: 'annual-1', name: '1 Connection Annual', price: 175, connections: 1, duration: '1 year', kind: 'annual' },
  { id: 'annual-2', name: '2 Connections Annual', price: 225, connections: 2, duration: '1 year', kind: 'annual' },
  { id: 'annual-3', name: '3 Connections Annual', price: 250, connections: 3, duration: '1 year', kind: 'annual' },
  { id: 'annual-4', name: '4 Connections Annual', price: 275, connections: 4, duration: '1 year', kind: 'annual' },
  { id: 'annual-5', name: '5 Connections Annual', price: 300, connections: 5, duration: '1 year', kind: 'annual', badge: 'Best Value' },
  { id: 'lifetime-1', name: 'Lifetime 1 Connection', price: 600, connections: 1, duration: 'lifetime', kind: 'lifetime' },
  { id: 'lifetime-5', name: 'Lifetime 5 Connections', price: 850, connections: 5, duration: 'lifetime', kind: 'lifetime', badge: 'Best Lifetime Value' },
]

// Short code customers type in the payment note (Cash App / Zelle / Venmo), so payments
// can be matched without naming the service: A = annual and L = lifetime (followed by the
// number of connections, e.g. A2 = annual, 2 connections); M = months (M1, M3, M6).
export function paymentNoteCode(plan: Plan): string {
  if (plan.kind === 'annual') return `A${plan.connections}`
  if (plan.kind === 'lifetime') return `L${plan.connections}`
  return `M${plan.months || 1}`
}

export const PAYMENT_METHODS = ['cashapp', 'zelle', 'venmo'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { cashapp: 'Cash App', zelle: 'Zelle', venmo: 'Venmo' }

export const PLANS: Record<string, Plan> = Object.fromEntries(PLAN_LIST.map((p) => [p.id, p]))

export function getPlan(id: unknown): Plan | null {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null
}

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
export const SIGNUP_PLAN_OPTIONS: Plan[] = PLAN_LIST.filter((p) => !p.renewOnly)
