/**
 * Platform-accurate daily consumption from balance deltas.
 *
 * The Open Platform exposes no usage-statistics API, so the only way to show
 * "今日消耗" identical to the console is to track the balance itself:
 *
 *   todayConsumed = dayStartTotal - currentTotal + (currentToppedUp - dayStartToppedUp)
 *
 * The day-start baseline (total / toppedUp) is persisted to a small state file
 * and reset on the first poll of each Beijing day. Mid-day top-ups are handled
 * by the toppedUp-delta term; refunds and rounding can only push the result
 * down, so it is clamped at zero. Returns null until a baseline exists (the
 * first poll of a day, or a missing/corrupt state file).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { BalanceInfo } from './contract.ts'

const BEIJING_OFFSET_MS = 8 * 3_600_000
const DEFAULT_STATE_PATH = join(homedir(), '.dsh', 'dsh-usage-dashboard-balance.json')

interface BalanceState {
  date: string
  total: number
  toppedUp: number
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))
const beijingDateKey = (nowMs: number): string => {
  const d = new Date(nowMs + BEIJING_OFFSET_MS)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function readState(path: string): BalanceState | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<BalanceState>
    if (typeof parsed.date === 'string' && typeof parsed.total === 'number' && typeof parsed.toppedUp === 'number') {
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

export function trackDailyConsumption(balances: BalanceInfo[], nowMs = Date.now(), statePath = DEFAULT_STATE_PATH): number | null {
  const primary = primaryOf(balances)
  if (primary === undefined) return null
  const total = Number(primary.total)
  const toppedUp = Number(primary.toppedUp)
  if (!Number.isFinite(total) || !Number.isFinite(toppedUp)) return null

  const date = beijingDateKey(nowMs)
  const state = readState(statePath)

  if (state === null || state.date !== date) {
    // First poll of a Beijing day (or the very first poll): record the baseline.
    writeState(statePath, { date, total, toppedUp })
    return null
  }
  const consumed = Math.max(0, state.total - total + (toppedUp - state.toppedUp))
  return Math.round(consumed * 100) / 100
}
