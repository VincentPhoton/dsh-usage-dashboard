/**
 * Platform-accurate daily consumption from balance deltas.
 *
 * The Open Platform exposes no usage-statistics API, so the only way to show
 * "今日消耗" identical to the console is to track the balance itself:
 *
 *   todayConsumed = dayStartTotal - currentTotal + (currentToppedUp - dayStartToppedUp)
 *
 * The day-start baseline is persisted to a small state file. Mid-day top-ups
 * are handled by the toppedUp-delta term; refunds and rounding can only push
 * the result down, so it is clamped at zero. Returns `consumed: null` until a
 * baseline for the current Beijing day exists (the first poll of a day, or a
 * missing/corrupt state file).
 *
 * ## Where the baseline comes from
 *
 * Every poll records the observation it just made, not only the first one of
 * the day. When the day rolls over the new baseline is therefore taken from
 * the *last observation before midnight* rather than from whatever the first
 * poll of the new day happens to see. That matters for a machine that is
 * asleep at 00:00 — the common case — where seeding from the first poll would
 * silently drop every API call made between midnight and wake-up, including
 * calls made by another tool or machine on the same account.
 *
 * A pre-midnight sample is only trusted when it was taken within
 * {@link BASELINE_GRACE_MS} of the day boundary. A sample from yesterday
 * afternoon says nothing about the balance at midnight (the evening could have
 * been busy), so in that case the baseline falls back to the first poll of the
 * day and the result is flagged `estimated` — the number is still useful, it
 * just cannot be called exact. The flag is reported to the client so the card
 * can say so instead of presenting an estimate as a platform-grade figure.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { BalanceInfo } from './contract.ts'

const BEIJING_OFFSET_MS = 8 * 3_600_000
const DAY_MS = 24 * 3_600_000
const DEFAULT_STATE_PATH = join(homedir(), '.dsh', 'dsh-usage-dashboard-balance.json')

/**
 * How close to midnight the last pre-midnight observation must be for it to
 * serve as the next day's baseline. The widget polls every 60s while the host
 * runs, so an instance that was alive at midnight always has a sample within
 * one poll interval; 15 minutes leaves room for a suspended timer while still
 * rejecting an afternoon sample from a day the machine slept through.
 */
const BASELINE_GRACE_MS = 15 * 60_000

interface BalanceState {
  /** Beijing day the baseline belongs to. */
  date: string
  /** Balance at (or just before) the start of `date`. */
  total: number
  toppedUp: number
  /** `total`/`toppedUp` had to be seeded from the first poll of `date` because
   *  no observation was close enough to the day boundary. */
  estimatedBaseline: boolean
  /** Latest observation, the candidate baseline for the next day. */
  sampleAt: number
  sampleTotal: number
  sampleToppedUp: number
}

/** One day's platform-accounted consumption. */
export interface DailyConsumption {
  /** null until a baseline for the current Beijing day exists. */
  consumed: number | null
  /** Whether today's baseline was seeded at the first poll of the day rather
   *  than observed near midnight, so `consumed` can understate the platform. */
  estimated: boolean
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))
const beijingDateKey = (nowMs: number): string => {
  const d = new Date(nowMs + BEIJING_OFFSET_MS)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
/** Unix ms at which the Beijing day containing `nowMs` began. */
const beijingDayStart = (nowMs: number): number =>
  Math.floor((nowMs + BEIJING_OFFSET_MS) / DAY_MS) * DAY_MS - BEIJING_OFFSET_MS

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function readState(path: string): BalanceState | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<BalanceState>
    if (
      typeof parsed.date === 'string'
      && isFiniteNumber(parsed.total)
      && isFiniteNumber(parsed.toppedUp)
      && typeof parsed.estimatedBaseline === 'boolean'
      && isFiniteNumber(parsed.sampleAt)
      && isFiniteNumber(parsed.sampleTotal)
      && isFiniteNumber(parsed.sampleToppedUp)
    ) {
      return parsed as BalanceState
    }
  } catch {
    // missing or corrupt state file — treated as "no baseline yet"
  }
  return null
}

function writeState(path: string, state: BalanceState): void {
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(state), 'utf8')
  } catch {
    // never let state persistence break the balance endpoint
  }
}

/** The primary CNY balance; falls back to the first entry if CNY is absent. */
const primaryOf = (balances: BalanceInfo[]): BalanceInfo | undefined =>
  balances.find(balance => balance.currency === 'CNY') ?? balances[0]

export function trackDailyConsumption(balances: BalanceInfo[], nowMs = Date.now(), statePath = DEFAULT_STATE_PATH): DailyConsumption {
  const primary = primaryOf(balances)
  if (primary === undefined) return { consumed: null, estimated: false }
  const total = Number(primary.total)
  const toppedUp = Number(primary.toppedUp)
  if (!Number.isFinite(total) || !Number.isFinite(toppedUp)) return { consumed: null, estimated: false }

  const date = beijingDateKey(nowMs)
  const state = readState(statePath)
  // The observation made by this very poll; it becomes the next day's
  // rollover candidate and never the current day's baseline.
  const sample = { sampleAt: nowMs, sampleTotal: total, sampleToppedUp: toppedUp }

  if (state === null || state.date !== date) {
    // First poll of a Beijing day (or the very first poll): establish the
    // baseline. Prefer the last observation taken close enough to midnight;
    // otherwise record this poll and mark the day's numbers as estimated.
    const dayStart = beijingDayStart(nowMs)
    const observedNearMidnight = state !== null
      && state.sampleAt < dayStart
      && dayStart - state.sampleAt <= BASELINE_GRACE_MS
    const baseline = observedNearMidnight
      ? { total: state.sampleTotal, toppedUp: state.sampleToppedUp, estimatedBaseline: false }
      : { total, toppedUp, estimatedBaseline: true }
    writeState(statePath, { date, ...baseline, ...sample })
    return { consumed: null, estimated: baseline.estimatedBaseline }
  }

  const consumed = Math.max(0, state.total - total + (toppedUp - state.toppedUp))
  writeState(statePath, { ...state, ...sample })
  return { consumed: Math.round(consumed * 100) / 100, estimated: state.estimatedBaseline }
}
