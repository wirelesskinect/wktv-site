// Single source of truth for WKTV plans and prices.
// The server uses this list to decide what a customer is charged,
// so prices can't be changed from the browser.

export type PlanKind = 'trial' | 'monthly' | 'annual' | 'lifetime' | 'bundle'

// Box bundle prices with 1 connection (shipping included)
export const BOX_BASE_PRICES: Record<string, number> = {
  'plus-2mo': 165,
  'plus-1yr': 250,
  'pro-2mo': 200,
  'pro-1yr': 285,
}
// Extra connections on a box bundle: 2nd +$50, 3rd/4th/5th +$25 each
export const BOX_EXTRA_CONNECTION_PRICES = [0, 50, 25, 25, 25]
export function boxExtraConnectionsPrice(connections: number): number {
  return BOX_EXTRA_CONNECTION_PRICES.slice(0, Math.max(1, Math.min(5, connections))).reduce((a, b) => a + b, 0)
}

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
  ...boxBundles(),
]

// Streaming box with WKTV pre-installed + service, shipped to the customer.
// Each box comes with 1 connection; extra connections cost BOX_EXTRA_CONNECTION_PRICES.
// IDs: box-plus-2mo (1 connection), box-plus-2mo-c2 … box-plus-2mo-c5
function boxBundles(): Plan[] {
  const boxes = [
    { key: 'plus', device: 'ONN 4K Plus' },
    { key: 'pro', device: 'ONN 4K Pro' },
  ]
  const terms = [
    { key: '2mo', label: '2 Months', duration: '2 months', months: 2 },
    { key: '1yr', label: '1 Year', duration: '1 year', months: 12 },
  ]
  const plans: Plan[] = []
  for (const box of boxes) {
    for (const term of terms) {
      const base = BOX_BASE_PRICES[`${box.key}-${term.key}`]
      for (let c = 1; c <= 5; c++) {
        plans.push({
          id: `box-${box.key}-${term.key}${c > 1 ? `-c${c}` : ''}`,
          name: `${box.device} Box + ${term.label}${c > 1 ? ` · ${c} Connections` : ''}`,
          price: base + boxExtraConnectionsPrice(c),
          connections: c,
          duration: term.duration,
          kind: 'bundle',
          months: term.months,
          device: box.device,
          ships: true,
          ...(term.months === 12 ? { badge: 'Best Value' } : {}),
        })
      }
    }
  }
  return plans
}

// Short code customers type in the payment note (Cash App / Zelle / Venmo), so payments
// can be matched without naming the service: A = annual, M = 1 month, L = lifetime,
// followed by the number of connections. Example: A2 = annual, 2 connections.
// Box bundles: PLUS2 / PLUS12 / PRO2 / PRO12 = which box + months of service.
export function paymentNoteCode(plan: Plan): string {
  if (plan.kind === 'bundle') return `${/pro/i.test(plan.device || '') ? 'PRO' : 'PLUS'}${plan.months || 1}${plan.connections > 1 ? `C${plan.connections}` : ''}`
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

// The same box + service length with a different number of connections (1–5)
export function bundleVariants(plan: Plan | null): Plan[] {
  if (!plan || plan.kind !== 'bundle') return []
  const base = plan.id.replace(/-c\d$/, '')
  return BUNDLE_PLANS.filter((p) => p.id.replace(/-c\d$/, '') === base).sort((a, b) => a.connections - b.connections)
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
export const SIGNUP_PLAN_OPTIONS: Plan[] = PLAN_LIST
