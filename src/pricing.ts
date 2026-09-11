/**
 * DeepSeek API price table and cost estimation.
 *
 * Every record is priced with the table that was in force at the moment it was
 * written — CNY per 1M tokens, from DeepSeek's official pricing page:
 *
 * - until 2026-08-17 00:00 Beijing: one flat price per model;
 * - 2026-08-17 00:00: peak/off-peak pricing — peak windows 09:00–12:00 and
 *   14:00–18:00 on workdays only, off-peak halves input/output;
 * - 2026-09-10 12:00: the V4.1-Flash price cut (flash 0.04/2/8 peak);
 * - 2026-09-14 12:00: `deepseek-v4-pro` requests are served by V4.1-Flash and
 *   billed at Flash rates until a V4.1 Pro ships.
 *
 * Peak windows are Beijing time 09:00–12:00 and 14:00–18:00. Weekends (Sat/Sun)
 * and Chinese statutory holidays (法定节假日) are entirely off-peak — verified
 * against the Open Platform bill for 2026-08-22, a Saturday inside the era the
 * announcement still described as "every day". Off-peak halves input/output
 * only; the cache-hit rate is the same in both windows (see halved()), which is
 * what makes these estimates line up with the platform bill.
 *
 * `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are legacy names for
 * the model now published as `deepseek-flash`; both keep billing at Flash
 * rates. Images cost tokens rather than a multiplier of their own: they are
 * converted by size and priced together with the text tokens. Historical days
 * therefore keep the price that was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 * The holiday calendar lives in CN_HOLIDAYS below — add a new year when the
 * State Council publishes its schedule.
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

/** Peak rates from 2026-08-17; off-peak halves input/output only — the
 *  cache-hit rate is the same in both windows (verified against the Open
 *  Platform bill: the off-peak total only matches when the cache-hit rate
 *  stays at its peak value). */
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

/** Off-peak = peak with input/output halved; cache-hit price is unchanged. */
const halved = (rates: PricingRates): PricingRates => ({
  cacheHit: rates.cacheHit,
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
 *  estimate does not drift with the machine's timezone.
 *
 *  Peak pricing applies on workdays only — weekends (Sat/Sun) and Chinese
 *  statutory holidays are entirely off-peak, so 09:00–12:00 / 14:00–18:00 on
 *  a Saturday or a holiday still pays the off-peak rate.
 *
 *  Make-up workdays (调休上班, e.g. a Sunday worked to extend a holiday) are
 *  deliberately NOT treated as peak days: per the billing rule weekends are
 *  always off-peak regardless of the adjusted work calendar.
 */
export function isPeak(timeMs: number): boolean {
  const beijing = new Date(timeMs + BEIJING_OFFSET_MS)
  const dow = beijing.getUTCDay()
  // Weekends are off-peak in every era: the 2026-08-22 (Saturday) usage was
  // charged at off-peak rates even though the announcement still said the
  // windows applied every day.
  if (dow === 0 || dow === 6) return false
  // Chinese statutory holidays are off-peak all day, whatever the weekday.
  if (isChineseHoliday(timeMs)) return false
  // Redundant with the weekend rule above (weekdaysOnly eras are Mon–Fri);
  // kept so the era flag and this predicate cannot drift apart.
  if (eraAt(timeMs).weekdaysOnly && !isBeijingWeekday(timeMs)) return false
  const hour = beijing.getUTCHours()
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/**
 * Chinese statutory public holidays (法定节假日), keyed by year. Values are the
 * "MM-DD" days off from the State Council's annual notice — the holiday days
 * themselves, not the make-up workdays (调休上班), which fall on weekends and
 * need no entry because weekends are already entirely off-peak.
 *
 * Years without an entry fall back to the weekday-only rule (no holiday
 * knowledge), which keeps the estimate correct for weekends at least.
 */
const CN_HOLIDAYS: Record<number, string[]> = {
  // 2024: 元旦 01-01 · 春节 02-10~17 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 06-10 · 中秋 09-15~17 · 国庆 10-01~07
  2024: [
    '01-01',
    '02-10', '02-11', '02-12', '02-13', '02-14', '02-15', '02-16', '02-17',
    '04-04', '04-05', '04-06',
    '05-01', '05-02', '05-03', '05-04', '05-05',
    '06-10',
    '09-15', '09-16', '09-17',
    '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07',
  ],
  // 2025: 元旦 01-01 · 春节 01-28~02-04 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 05-31~06-02 · 国庆+中秋 10-01~08
  2025: [
    '01-01',
    '01-28', '01-29', '01-30', '01-31', '02-01', '02-02', '02-03', '02-04',
    '04-04', '04-05', '04-06',
    '05-01', '05-02', '05-03', '05-04', '05-05',
    '05-31', '06-01', '06-02',
    '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08',
  ],
  // 2026: 元旦 01-01~03 · 春节 02-15~23 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 06-19~21 · 中秋 09-25~27 · 国庆 10-01~07
  2026: [
    '01-01', '01-02', '01-03',
    '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22', '02-23',
    '04-04', '04-05', '04-06',
    '05-01', '05-02', '05-03', '05-04', '05-05',
    '06-19', '06-20', '06-21',
    '09-25', '09-26', '09-27',
    '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07',
  ],
}

function isChineseHoliday(timeMs: number): boolean {
  const beijing = new Date(timeMs + BEIJING_OFFSET_MS)
  const list = CN_HOLIDAYS[beijing.getUTCFullYear()]
  if (list === undefined) return false
  const monthDay = `${String(beijing.getUTCMonth() + 1).padStart(2, '0')}-${String(beijing.getUTCDate()).padStart(2, '0')}`
  return list.includes(monthDay)
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

/** The price table to show the user: the two models the official docs list,
 *  so the rows match the page they come from — legacy names, image tokens and
 *  the pro routing live in the small print next to the table. */
export function pricingInfo(nowMs: number): PricingInfo {
  const era = eraAt(nowMs)
  const row = (model: string, tier: Tier) => ({ model, peak: era.peak[tier], offPeak: halved(era.peak[tier]) })
  return {
    currency: 'CNY',
    switchDate: '2026-08-17',
    inPeakNow: isPeak(nowMs),
    peakWindows: ['09:00–12:00', '14:00–18:00'],
    tiers: [row('deepseek-flash', 'flash'), row('deepseek-v4-pro', 'pro')],
  }
}
