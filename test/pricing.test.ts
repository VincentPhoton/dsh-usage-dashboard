import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PEAK_PRICING_FROM_MS,
  cacheSavingOf,
  costOf,
  estimateImageTokens,
  isPeak,
  pricingInfo,
  ratesAt,
  tierOf,
} from '../src/pricing.ts'

const atBeijing = (hour: number, minute = 0): number =>
  Date.UTC(2026, 7, 18, hour - 8, minute)

const closeTo = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}

test('model tiers recognize flash and the vision model; anything else is pro', () => {
  assert.equal(tierOf('deepseek-v4-flash'), 'flash')
  assert.equal(tierOf('DEEPSEEK-V4-FLASH'), 'flash')
  assert.equal(tierOf('deepseek-v4-pro'), 'pro')
  assert.equal(tierOf('deepseek-v4-flash-vision-exp'), 'vision')
  // The name also contains "flash"; the vision check must win.
  assert.equal(tierOf('DeepSeek-V4-Flash-Vision-Exp'), 'vision')
  assert.equal(tierOf('future-unknown-model'), 'pro')
})

test('vision model is billed exactly like flash, including the legacy era', () => {
  assert.deepEqual(ratesAt(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-flash-vision-exp'), {
    cacheHit: 0.02,
    input: 1,
    output: 2,
  })
  assert.deepEqual(ratesAt(atBeijing(9), 'deepseek-v4-flash-vision-exp'), {
    cacheHit: 0.1,
    input: 3,
    output: 9,
  })
  closeTo(costOf(atBeijing(9), 'deepseek-v4-flash-vision-exp', 1_000_000, 0, 0), 3)
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
    cacheHit: 0.15,
    input: 4.5,
    output: 13.5,
  })
  assert.deepEqual(ratesAt(atBeijing(9), 'deepseek-v4-flash'), {
    cacheHit: 0.1,
    input: 3,
    output: 9,
  })
})

test('cost and cache-saving calculations price every token component', () => {
  closeTo(costOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 21.05)
  closeTo(costOf(atBeijing(9, 30), 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 90.6)
  closeTo(cacheSavingOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 2_000_000), 5.95)
})

test('pricing metadata always describes the active peak/off-peak table', () => {
  const peak = pricingInfo(atBeijing(10))
  assert.equal(peak.inPeakNow, true)
  const idle = pricingInfo(atBeijing(13))
  assert.equal(idle.inPeakNow, false)
  assert.deepEqual(peak.peakWindows, ['09:00–12:00', '14:00–18:00'])
  assert.equal(peak.tiers.length, 3)
  assert.equal(peak.tiers.every(tier => tier.offPeak !== null), true)
  const vision = peak.tiers.find(tier => tier.model === 'deepseek-v4-flash-vision-exp')
  assert.ok(vision !== undefined)
  const flash = peak.tiers.find(tier => tier.model === 'deepseek-v4-flash')
  assert.ok(flash !== undefined)
  assert.deepEqual(vision.peak, flash.peak)
  assert.deepEqual(vision.offPeak, flash.offPeak)
})

test('image token estimate follows the official resize rule and 384-token cap', () => {
  // At the 800×800 ceiling the estimate hits the cap exactly.
  closeTo(estimateImageTokens(800, 800), 384)
  // Oversized images are downscaled to ~800×800, so huge pictures cost the same.
  closeTo(estimateImageTokens(2000, 2000), 384)
  closeTo(estimateImageTokens(5000, 3000), 384)
  // Non-square aspect ratios are preserved through the resize.
  closeTo(estimateImageTokens(1600, 400), 384)
  // Small images are scaled UP to ~384×384 before conversion (roughly 88 tokens).
  const small = estimateImageTokens(100, 100)
  assert.ok(small > 80 && small < 100, String(small))
  // In-between sizes are proportional to the resized area.
  closeTo(estimateImageTokens(400, 400), 384 * (160_000 / 640_000))
  // Missing or invalid dimensions estimate zero rather than throwing.
  assert.equal(estimateImageTokens(0, 100), 0)
  assert.equal(estimateImageTokens(Number.NaN, 100), 0)
})
