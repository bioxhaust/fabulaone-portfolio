'use client'

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const YM_ID = process.env.NEXT_PUBLIC_YM_ID ?? ''

/** Yandex Metrika reachGoal — no-op until NEXT_PUBLIC_YM_ID is set. */
export function reachGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !YM_ID || typeof window.ym !== 'function') return
  try {
    window.ym(Number(YM_ID), 'reachGoal', goal, params)
  } catch {
    // ignore
  }
}

export const Goals = {
  productView: 'product_view',
  demoPlay: 'demo_play',
  beginCheckout: 'begin_checkout',
  payClick: 'pay_click',
  purchase: 'purchase',
  personalQuestionnaire: 'personal_questionnaire',
} as const
