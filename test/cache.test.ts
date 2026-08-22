/**
 * Client cache semantics — in particular `sameDayOnly`, the rule that keeps a
 * pre-midnight payload from being served as fresh on the next Beijing day.
 * That rule is what makes 今日消耗 roll over on its own: the first poll of a
 * new day bypasses the client cache, hits the host, and the balance tracker
 * re-baselines without anyone restarting anything.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { beijingDayKey, createCache } from '../src/client/cache.ts'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

/** Run fn with Date.now() pinned to ms (the caches read it on every call). */
const withNow = <T>(ms: number, fn: () => T): T => {
  const realNow = Date.now
  Date.now = () => ms
  try {
    return fn()
  } finally {
    Date.now = realNow
  }
}

/** Minimal localStorage stand-in so persisted-entry paths run under Node. */
class MemoryStorage {
  private entries = new Map<string, string>()
  get length(): number { return this.entries.size }
  key(index: number): string | null { return [...this.entries.keys()][index] ?? null }
  getItem(key: string): string | null { return this.entries.get(key) ?? null }
  setItem(key: string, value: string): void { this.entries.set(key, String(value)) }
  removeItem(key: string): void { this.entries.delete(key) }
}

test('beijingDayKey maps timestamps onto Beijing calendar days', () => {
  // 23:59 and 00:00 Beijing belong to different days even when they are one
  // second apart in UTC terms.
  const lateTuesday = Date.UTC(2026, 7, 18, 15, 59) // → 2026-08-18 23:59 UTC+8
  const earlyWednesday = Date.UTC(2026, 7, 18, 16, 0) // → 2026-08-19 00:00 UTC+8
  assert.equal(beijingDayKey(lateTuesday), '2026-08-18')
  assert.equal(beijingDayKey(earlyWednesday), '2026-08-19')
})

test('sameDayOnly refuses a still-within-TTL entry from an earlier Beijing day', () => {
  const tuesdayEvening = Date.UTC(2026, 7, 18, 12) // 20:00 Beijing
  const wednesdayMorning = tuesdayEvening + 14 * HOUR_MS // 10:00 next day

  const dayAware = createCache<{ v: number }>(48 * HOUR_MS, undefined, undefined, { sameDayOnly: true })
  withNow(tuesdayEvening, () => dayAware.put({ v: 1 }))
  withNow(tuesdayEvening + HOUR_MS, () => assert.deepEqual(dayAware.getFresh(), { v: 1 }))
  // Next morning: TTL (48h) would still serve it, but the day changed.
  withNow(wednesdayMorning, () => assert.equal(dayAware.getFresh(), null))
  // The stale entry itself survives for the instant-first-paint path.
  withNow(wednesdayMorning, () => assert.deepEqual(dayAware.get()?.data, { v: 1 }))

  // Without the option, TTL alone governs (the old behaviour, kept for
  // non-day-scoped payloads).
  const ttlOnly = createCache<{ v: number }>(48 * HOUR_MS)
  withNow(tuesdayEvening, () => ttlOnly.put({ v: 2 }))
  withNow(wednesdayMorning, () => assert.deepEqual(ttlOnly.getFresh(), { v: 2 }))
})

test('a page reload restores yesterday’s persisted entry but never serves it as fresh', () => {
  const storage = new MemoryStorage()
  ;(globalThis as { localStorage?: unknown }).localStorage = storage
  try {
    const key = 'dsh-usage-dashboard:test:same-day'
    const tuesdayNight = Date.UTC(2026, 7, 18, 15, 30) // 23:30 Beijing

    withNow(tuesdayNight, () => createCache<number>(60_000, key, undefined, { sameDayOnly: true }).put(42))
    // Reload: a brand-new instance restores the entry from localStorage…
    const reloaded = createCache<number>(60_000, key, undefined, { sameDayOnly: true })
    assert.equal(reloaded.get()?.data, 42)

    // …but minutes past midnight it is already not "fresh" (day changed),
    // so mount-time polls go to the network instead of painting yesterday's
    // spend as today's.
    let fresh: number | null | undefined
    withNow(tuesdayNight + 45 * 60_000, () => { fresh = reloaded.getFresh() })
    assert.equal(fresh, null)
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage
  }
})
