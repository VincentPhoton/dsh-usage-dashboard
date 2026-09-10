/**
 * DeepSeek API price table and cost estimation.
 *
 * Every record is priced with the table that was in force at the moment it was
 * written — CNY per 1M tokens, from DeepSeek's official pricing page:
 *
 * - until 2026-08-17 00:00 Beijing: one flat price per model;
 * - 2026-08-17 00:00: peak/off-peak pricing — peak windows 09:00–12:00 and
 *   14:00–18:00 every day, off-peak exactly half of peak;
 * - 2026-09-10 12:00: the V4.1-Flash price cut (flash 0.04/2/8 peak), and the
 *   peak windows narrow to Monday–Friday;
 * - 2026-09-14 12:00: `deepseek-v4-pro` requests are served by V4.1-Flash and
 *   billed at Flash rates until a V4.1 Pro ships.
 *
 * `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are legacy names for
 * the model now published as `deepseek-flash`; both keep billing at Flash
 * rates. Images cost tokens rather than a multiplier of their own: they are
 * converted by size and priced together with the text tokens. Historical days
 * therefore keep the price that was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 */
import type { PricingInfo, PricingRates } from './contract.ts'

/** 2026-08-17 00:00 Beijing time (UTC+8), when peak/off-peak pricing took effect. */
export const PEAK_PRICING_FROM_MS = Date.UTC(2026, 7, 16, 16, 0, 0)

/** 2026-09-10 12:00 Beijing, when the V4.1-Flash prices and the weekday-only
 *  peak windows took effect. */
export const V41_FLASH_PRICING_FROM_MS = Date.UTC(2026, 8, 10, 4, 0, 0)

/** 2026-09-14 12:00 Beijing, from when `deepseek-v4-pro` requests are routed
 *  to V4.1-Flash and billed at Flash rates. */
export const PRO_ROUTED_TO_FLASH_FROM_MS = Date.UTC(2026, 8, 14, 4, 0, 0)

/** Peak hours in Beijing time, as [startHour, endHour) pairs. */
const PEAK_WINDOWS: Array<[number, number]> = [[9, 12], [14, 18]]

const BEIJING_OFFSET_MS = 8 * 3_600_000

type Tier = 'pro' | 'flash' | 'vision'

/** Flat rates in effect until 2026-08-17. */
const FLAT_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.025, input: 3, output: 6 },
  flash: { cacheHit: 0.02, input: 1, output: 2 },
  // The vision model billed at flash rates from day one, so its pre-switch
  // history is costed at the same flat prices as flash.
  vision: { cacheHit: 0.02, input: 1, output: 2 },
}

/** Peak rates from 2026-08-17; off-peak is exactly half of each. */
const PEAK_RATES_08_17: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.1, input: 3, output: 9 },
  // Official policy: the vision model is priced identically to flash; images
  // cost tokens, not their own multiplier.
  vision: { cacheHit: 0.1, input: 3, output: 9 },
}

/** Peak rates from 2026-09-10, the V4.1-Flash table; off-peak is half. */
const PEAK_RATES_09_10: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.04, input: 2, output: 8 },
  vision: { cacheHit: 0.04, input: 2, output: 8 },
}

/** One dated price table; `fromMs` is inclusive. */
interface PriceEra {
  readonly fromMs: number
  readonly peak: Record<Tier, PricingRates>
  /** Whether the peak windows apply Monday–Friday only. */
  readonly weekdaysOnly: boolean
}

/** Oldest first — the last entry whose `fromMs` has passed is the one in force. */
const PRICE_ERAS: readonly PriceEra[] = [
  { fromMs: PEAK_PRICING_FROM_MS, peak: PEAK_RATES_08_17, weekdaysOnly: false },
  { fromMs: V41_FLASH_PRICING_FROM_MS, peak: PEAK_RATES_09_10, weekdaysOnly: true },
]

/** The price table in force at a moment. */
function eraAt(timeMs: number): PriceEra {
  let era = PRICE_ERAS[0]
  for (const candidate of PRICE_ERAS) if (timeMs >= candidate.fromMs) era = candidate
  return era
}

const halved = (rates: PricingRates): PricingRates => ({
  cacheHit: rates.cacheHit / 2,
  input: rates.input / 2,
  output: rates.output / 2,
})

/** Which price tier a model name falls into; anything unrecognised is billed
 *  as pro, the conservative (more expensive) guess. Vision is matched first:
 *  `deepseek-v4-flash-vision-exp` also contains "flash". */
export function tierOf(model: string): Tier {
  const name = model.toLowerCase()
  if (name.includes('vision')) return 'vision'
  if (name.includes('flash')) return 'flash'
  return 'pro'
}

/** The tier a model actually bills at: from 2026-09-14 `deepseek-v4-pro`
 *  requests are served by V4.1-Flash and charged the Flash price. */
function billedTierOf(timeMs: number, model: string): Tier {
  const tier = tierOf(model)
  return tier === 'pro' && timeMs >= PRO_ROUTED_TO_FLASH_FROM_MS ? 'flash' : tier
}

/** Beijing-time Monday–Friday, which the peak windows honour from 2026-09-10. */
function isBeijingWeekday(timeMs: number): boolean {
  const day = new Date(timeMs + BEIJING_OFFSET_MS).getUTCDay()
  return day >= 1 && day <= 5
}

/**
 * Image token conversion (DeepSeek official rule, Vision guide):
 * - Images below roughly 384×384 pixels are scaled UP preserving aspect
 *   ratio; larger images are scaled DOWN so their pixel count is roughly that
 *   of an 800×800 image.
 * - Tokens are proportional to the (resized) pixel count, capped at 384
 *   tokens per image, so 2000×2000 and 5000×5000 cost the same.
 * - Each image is counted independently; `detail: low` caps at 512×512.
 *
 * The estimate is for the "how much came from images" breakdown; the exact
 * provider count is already folded into the usage record's `inputTokens`.
 * Returns tokens (possibly fractional) — 0 for missing/invalid dimensions.
 */
export function estimateImageTokens(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0
  const area = width * height
  const scaledArea = Math.min(800 * 800, Math.max(384 * 384, area))
  return 384 * (scaledArea / (800 * 800))
}

/** Whether a moment falls in a peak window, judged in Beijing time so the
 *  estimate does not drift with the machine's timezone. */
export function isPeak(timeMs: number): boolean {
  if (eraAt(timeMs).weekdaysOnly && !isBeijingWeekday(timeMs)) return false
  const hour = Math.floor((((timeMs + BEIJING_OFFSET_MS) % 86_400_000) + 86_400_000) % 86_400_000 / 3_600_000)
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/** Rates applying to one model at one moment. */
export function ratesAt(timeMs: number, model: string): PricingRates {
  if (timeMs < PEAK_PRICING_FROM_MS) return FLAT_RATES[tierOf(model)]
  const peak = eraAt(timeMs).peak[billedTierOf(timeMs, model)]
  return isPeak(timeMs) ? peak : halved(peak)
}

/**
 * What prefix caching saved on one record: the cache-hit tokens re-priced at
 * the cache-miss rate, minus what they actually cost.
 */
export function cacheSavingOf(timeMs: number, model: string, cache: number): number {
  const rates = ratesAt(timeMs, model)
  return (cache * (rates.input - rates.cacheHit)) / 1_000_000
}

const applyRates = (rates: PricingRates, input: number, cache: number, output: number): number =>
  (input * rates.input + cache * rates.cacheHit + output * rates.output) / 1_000_000

/** Estimated CNY cost of one usage record. */
export function costOf(timeMs: number, model: string, input: number, cache: number, output: number): number {
  return applyRates(ratesAt(timeMs, model), input, cache, output)
}

/**
 * The same record priced as if it had landed in an idle window — used to
 * answer "what would shifting work off-peak save me". Prices come from the
 * newest table, the one in force now: the question is about scheduling the
 * next batch, not about re-pricing history.
 */
export function costUnderPeakEra(timeMs: number, model: string, input: number, cache: number, output: number, forceOffPeak = false): number {
  const peak = PRICE_ERAS[PRICE_ERAS.length - 1].peak[billedTierOf(timeMs, model)]
  const rates = !forceOffPeak && isPeak(timeMs) ? peak : halved(peak)
  return applyRates(rates, input, cache, output)
}

/** The price table to show the user: the era in force now, with the pro row
 *  labelled with what it bills as once its requests are routed to Flash. */
export function pricingInfo(nowMs: number): PricingInfo {
  const era = eraAt(nowMs)
  const proTier = billedTierOf(nowMs, 'deepseek-v4-pro')
  const row = (model: string, tier: Tier) => ({ model, peak: era.peak[tier], offPeak: halved(era.peak[tier]) })
  return {
    currency: 'CNY',
    switchDate: '2026-08-17',
    inPeakNow: isPeak(nowMs),
    peakWindows: ['09:00–12:00', '14:00–18:00'],
    tiers: [
      row(proTier === 'flash' ? 'deepseek-v4-pro → deepseek-v4-flash' : 'deepseek-v4-pro', proTier),
      row('deepseek-v4-flash', 'flash'),
      row('deepseek-v4-flash-vision-exp', 'vision'),
    ],
  }
}
