// Promo codes for checkout. Only used on the server (API routes), so the codes
// aren't shipped to the browser. Codes are not case-sensitive.
import type { Plan } from '@/lib/plans'

interface Promo {
  code: string
  label: string
  off: number // whole dollars off
  appliesTo: (plan: Plan) => boolean
  planLabel: string // shown when the code doesn't fit the chosen plan
}

const PROMOS: Promo[] = [
  {
    code: 'WKTV25OFF',
    label: 'Friends & Family',
    off: 25,
    appliesTo: (p) => p.kind === 'annual', // regular 1-year plans (not box bundles)
    planLabel: 'regular 1-year (annual) plans, not box bundles',
  },
  {
    code: 'LIFE50OFF',
    label: 'Lifetime',
    off: 50,
    appliesTo: (p) => p.kind === 'lifetime', // regular lifetime plans (box bundles already include $50 off)
    planLabel: 'regular lifetime plans, not box bundles',
  },
]

export type PromoResult =
  | { ok: true; code: string; label: string; discount: number; price: number }
  | { ok: false; error: string }

export function normalizePromo(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, '').toUpperCase().slice(0, 32) : ''
}

export function applyPromo(plan: Plan, raw: unknown): PromoResult {
  const code = normalizePromo(raw)
  const promo = PROMOS.find((p) => p.code === code)
  if (!promo) return { ok: false, error: 'That promo code isn’t valid.' }
  if (!promo.appliesTo(plan) || plan.price <= 0) {
    return { ok: false, error: `${promo.code} only works on ${promo.planLabel}.` }
  }
  const discount = Math.min(promo.off, plan.price)
  return { ok: true, code: promo.code, label: promo.label, discount, price: plan.price - discount }
}
