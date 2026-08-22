import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PEAK_PRICING_FROM_MS,
  cacheSavingOf,
  costOf,
  isPeak,
  pricingInfo,
  ratesAt,
  tierOf,
} from '../src/pricing.ts'

const atBeijing = (hour: number, minute = 0): number =>
  Date.UTC(2026, 7, 18, hour - 8, minute)

/** A wall-clock moment in Beijing time (UTC+8), in UTC ms. */
const atBeijingDate = (year: number, month: number, day: number, hour: number, minute = 0): number =>
  Date.UTC(year, month - 1, day, hour - 8, minute)

const closeTo = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}

test('model tiers use flash rates only for flash models', () => {
  assert.equal(tierOf('deepseek-v4-flash'), 'flash')
  assert.equal(tierOf('DEEPSEEK-V4-FLASH'), 'flash')
  assert.equal(tierOf('deepseek-v4-pro'), 'pro')
  assert.equal(tierOf('future-unknown-model'), 'pro')
})

test('weekends are entirely off-peak even inside peak hours', () => {
  // 2026-08-22 is a Saturday, 2026-08-23 a Sunday.
  assert.equal(isPeak(atBeijingDate(2026, 8, 22, 9)), false)
  assert.equal(isPeak(atBeijingDate(2026, 8, 22, 11, 59)), false)
  assert.equal(isPeak(atBeijingDate(2026, 8, 22, 14)), false)
  assert.equal(isPeak(atBeijingDate(2026, 8, 22, 17, 59)), false)
  assert.equal(isPeak(atBeijingDate(2026, 8, 23, 10)), false)
  // ...but the same hours on the Friday before were peak.
  assert.equal(isPeak(atBeijingDate(2026, 8, 21, 10)), true)
})

test('Chinese statutory holidays are entirely off-peak', () => {
  // 2026-10-01 (Thu) National Day and 2026-02-16 (Mon) Spring Festival are
  // workdays that fall inside the holiday calendar → off-peak all day.
  assert.equal(isPeak(atBeijingDate(2026, 10, 1, 10)), false)
  assert.equal(isPeak(atBeijingDate(2026, 10, 1, 14)), false)
  assert.equal(isPeak(atBeijingDate(2026, 2, 16, 9)), false)
  // 2026-05-01 (Fri) Labour Day → off-peak even though it is a Friday.
  assert.equal(isPeak(atBeijingDate(2026, 5, 1, 10, 30)), false)
  // The working day right before a holiday still peaks: 2026-09-30 (Wed).
  assert.equal(isPeak(atBeijingDate(2026, 9, 30, 10)), true)
})

test('years without a holiday calendar fall back to weekday-only rule', () => {
  // 2027-01-01 (Fri) is not yet announced, so it is judged as an ordinary
  // workday: 10:00 peaks, 08:00 does not.
  assert.equal(isPeak(atBeijingDate(2027, 1, 1, 10)), true)
  assert.equal(isPeak(atBeijingDate(2027, 1, 1, 8)), false)
  assert.equal(isPeak(atBeijingDate(2027, 1, 2, 10)), false) // Saturday
})

test('Beijing peak windows include their start and exclude their end', () => {
  const cases: Array<[number, number, boolean]> = [
    [8, 59, false],
    [9, 0, true],
    [11, 59, true],
    [12, 0, false],
    [13, 59, false],
    [14, 0, true],
    [17, 59, true],
    [18, 0, false],
  ]
  for (const [hour, minute, expected] of cases) {
    assert.equal(isPeak(atBeijing(hour, minute)), expected, `${hour}:${minute}`)
  }
})

test('rates switch exactly at 2026-08-17 00:00 Beijing time', () => {
  assert.deepEqual(ratesAt(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro'), {
    cacheHit: 0.025,
    input: 3,
    output: 6,
  })
  assert.deepEqual(ratesAt(PEAK_PRICING_FROM_MS, 'deepseek-v4-pro'), {
    cacheHit: 0.3,
    input: 4.5,
    output: 13.5,
  })
  assert.deepEqual(ratesAt(atBeijing(9), 'deepseek-v4-flash'), {
    cacheHit: 0.1,
    input: 3,
    output: 9,
  })
})

test('off-peak halves input/output only; cache-hit rate is unchanged', () => {
  // Verified against the Open Platform's bill: Saturday usage is ~96% cache
  // hits and the charged amount only matches when the cache rate stays at the
  // peak value during off-peak hours.
  const offPeak = ratesAt(atBeijing(8), 'deepseek-v4-flash') // 08:00 Tuesday = off-peak
  assert.deepEqual(offPeak, { cacheHit: 0.1, input: 1.5, output: 4.5 })
  const offPeakPro = ratesAt(atBeijing(8), 'deepseek-v4-pro')
  assert.deepEqual(offPeakPro, { cacheHit: 0.3, input: 4.5, output: 13.5 })
  // A weekend off-peak hour uses the same table.
  assert.deepEqual(ratesAt(atBeijingDate(2026, 8, 22, 10), 'deepseek-v4-flash'), { cacheHit: 0.1, input: 1.5, output: 4.5 })
})

test('cost and cache-saving calculations price every token component', () => {
  closeTo(costOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 21.05)
  closeTo(costOf(atBeijing(9, 30), 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 90.6)
  closeTo(cacheSavingOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 2_000_000), 5.95)
})

test('pricing metadata changes shape with the active pricing era', () => {
  const legacy = pricingInfo(PEAK_PRICING_FROM_MS - 1)
  assert.equal(legacy.splitActive, false)
  assert.equal(legacy.inPeakNow, false)
  assert.equal(legacy.tiers.every(tier => tier.offPeak === null), true)

  const peak = pricingInfo(atBeijing(10))
  assert.equal(peak.splitActive, true)
  assert.equal(peak.inPeakNow, true)
  assert.deepEqual(peak.peakWindows, ['09:00–12:00', '14:00–18:00'])
  assert.equal(peak.tiers.every(tier => tier.offPeak !== null), true)
})
