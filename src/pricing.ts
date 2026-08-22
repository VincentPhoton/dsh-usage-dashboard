/**
 * DeepSeek API price table and cost estimation.
 *
 * Two things the previous flat constant got wrong: every model was billed at
 * deepseek-v4-pro rates (flash is ~3x cheaper), and the 2026-08-17 switch to
 * peak/off-peak pricing was not modelled at all.
 *
 * Rates are CNY per 1M tokens, from DeepSeek's 2026-08-13 price announcement.
 * Peak windows are Beijing time 09:00–12:00 and 14:00–18:00 on workdays only:
 * weekends (Sat/Sun) and Chinese statutory holidays (法定节假日) are entirely
 * off-peak. Off-peak halves the input/output price; the cache-hit rate is the
 * same in both windows (see halved()). Usage recorded before the switch is
 * still costed at the old flat rates, so historical days keep the price that
 * was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 * The holiday calendar lives in CN_HOLIDAYS below — add a new year when the
 * State Council publishes its schedule.
 */
import type { PricingInfo, PricingRates } from './contract.ts'

/** 2026-08-17 00:00 Beijing time (UTC+8), when peak/off-peak pricing starts. */
export const PEAK_PRICING_FROM_MS = Date.UTC(2026, 7, 16, 16, 0, 0)

/** Peak hours in Beijing time, as [startHour, endHour) pairs. */
const PEAK_WINDOWS: Array<[number, number]> = [[9, 12], [14, 18]]

const BEIJING_OFFSET_MS = 8 * 3_600_000

type Tier = 'pro' | 'flash'

/** Flat rates in effect until 2026-08-17. */
const LEGACY_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.025, input: 3, output: 6 },
  flash: { cacheHit: 0.02, input: 1, output: 2 },
}

/** Peak rates from 2026-08-17. Off-peak halves input/output only — the
 *  cache-hit rate is the same in both windows (verified against the Open
 *  Platform's actual bill: a Saturday's usage is ~96% cache-hit tokens and
 *  only the un-halved cache rate matches the charged amount). */
const PEAK_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.1, input: 3, output: 9 },
}

/** Off-peak = peak with input/output halved; cache-hit price is unchanged. */
const halved = (rates: PricingRates): PricingRates => ({
  cacheHit: rates.cacheHit,
  input: rates.input / 2,
  output: rates.output / 2,
})

/** Which price tier a model name falls into; anything unrecognised is billed
 *  as pro, the conservative (more expensive) guess. */
export function tierOf(model: string): Tier {
  return model.toLowerCase().includes('flash') ? 'flash' : 'pro'
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
  if (dow === 0 || dow === 6) return false
  if (isChineseHoliday(timeMs)) return false
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
  const tier = tierOf(model)
  if (timeMs < PEAK_PRICING_FROM_MS) return LEGACY_RATES[tier]
  const peak = PEAK_RATES[tier]
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
 * The same record priced under the peak/off-peak table regardless of when it
 * happened — `forceOffPeak` prices it as if it had landed in an idle window.
 * Used to answer "what will the new pricing cost me" before the switch and
 * "what would shifting off-peak save" after it.
 */
export function costUnderPeakEra(timeMs: number, model: string, input: number, cache: number, output: number, forceOffPeak = false): number {
  const peak = PEAK_RATES[tierOf(model)]
  const rates = !forceOffPeak && isPeak(timeMs) ? peak : halved(peak)
  return applyRates(rates, input, cache, output)
}

/** The price table to show the user, describing whatever is in effect now. */
export function pricingInfo(nowMs: number): PricingInfo {
  const split = nowMs >= PEAK_PRICING_FROM_MS
  return {
    currency: 'CNY',
    switchDate: '2026-08-17',
    splitActive: split,
    inPeakNow: split && isPeak(nowMs),
    peakWindows: ['09:00–12:00', '14:00–18:00'],
    tiers: (['pro', 'flash'] as Tier[]).map(tier => ({
      model: tier === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
      peak: split ? PEAK_RATES[tier] : LEGACY_RATES[tier],
      offPeak: split ? halved(PEAK_RATES[tier]) : null,
    })),
  }
}
