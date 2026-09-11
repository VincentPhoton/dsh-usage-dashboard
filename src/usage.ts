/**
 * Balance and usage data sources.
 *
 * - Balance: DeepSeek API `GET /user/balance` with the key resolved through
 *   the credentials service (`DEEPSEEK_API_KEY`).
 * - Usage: token usage folded from the DSH session logs (`sessionPersistence`),
 *   one record per `assistant/message` event, bucketed by local day / hour.
 */
import { isValidSessionId, USAGE_WINDOW_DAYS } from './contract.ts'
import type { BalanceResponse, ModelSeriesPoint, ModelUsage, PeakSplit, PeriodUsage, SessionCost, SessionModelUsage, SessionUsageResponse, UsageCoverage, UsageData, UsageResponse, UsageSummary, UsageWindowDays, VisionDayPoint, VisionSession, VisionStats } from './contract.ts'
import type { ContentBlockFace, CredentialsFace, ImageAttachmentFace, SessionEventFace, SessionHeaderFace, SessionPersistenceFace } from './context.ts'
import { cacheSavingOf, costOf, costUnderPeakEra, estimateImageTokens, isPeak, pricingInfo } from './pricing.ts'
import { trackDailyConsumption } from './balance-tracker.ts'
import { createRevisionCache, type RevisionCache } from './session-cache.ts'

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))

/** Upper bound for credential resolution: the endpoint must always answer so
 *  the client's refresh never wedges on a stuck credentials service (the HTTP
 *  call below already bounds itself via AbortSignal.timeout). */
const CREDENTIAL_TIMEOUT_MS = 10_000

function errorMessage(err: unknown): string {
  return (err as { message?: string } | null)?.message ?? String(err)
}

/**
 * Balance + platform-accounted daily consumption.
 *
 * `statePath` is injectable so tests can point the balance-delta tracker at a
 * temp file instead of the real `~/.dsh` state; `credentialTimeoutMs` is
 * injectable so tests can exercise the resolution guard without waiting out
 * the production timeout.
 */
export async function fetchBalance(credentials: CredentialsFace | undefined, statePath?: string, credentialTimeoutMs?: number): Promise<BalanceResponse> {
  const resolveTimeoutMs = credentialTimeoutMs ?? CREDENTIAL_TIMEOUT_MS
  if (credentials === undefined) return { ok: false, error: '凭证服务不可用' }
  let cred: { value: string } | undefined
  try {
    cred = await Promise.race([
      credentials.resolve('DEEPSEEK_API_KEY'),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error(`超时（${Math.round(resolveTimeoutMs / 1000)} 秒无响应）`)), resolveTimeoutMs)
        // Never hold the process open just for this guard.
        ;(timer as unknown as { unref?: () => void }).unref?.()
      }),
    ])
  } catch (err) {
    return { ok: false, error: `读取 API Key 失败：${errorMessage(err)}` }
  }
  if (cred === undefined || cred.value === '') {
    return { ok: false, error: '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）' }
  }
  let res: Response
  try {
    res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: `Bearer ${cred.value}` },
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    return { ok: false, error: `请求余额接口失败：${errorMessage(err)}` }
  }
  if (!res.ok) return { ok: false, error: `余额接口返回错误（HTTP ${res.status}）` }
  let parsed: unknown
  try {
    parsed = await res.json()
  } catch {
    return { ok: false, error: '解析余额响应失败' }
  }
  const p = parsed as {
    is_available?: boolean
    balance_infos?: Array<{ currency?: string; total_balance?: string; granted_balance?: string; topped_up_balance?: string }>
  }
  const balances = (p.balance_infos ?? []).map(b => ({
    currency: b.currency ?? '',
    total: b.total_balance ?? '0',
    granted: b.granted_balance ?? '0',
    toppedUp: b.topped_up_balance ?? '0',
  }))
  // Platform-accounted daily consumption, folded from the balance delta. See
  // balance-tracker.ts for how the day's baseline is chosen.
  const daily = trackDailyConsumption(balances, Date.now(), statePath)
  return {
    ok: true,
    data: {
      isAvailable: p.is_available === true,
      balances,
      todayConsumed: daily.consumed,
      todayConsumedEstimated: daily.estimated,
    },
  }
}

interface Bucket {
  input: number
  output: number
  cache: number
  total: number
  cost: number
  calls: number
}

const emptyBucket = (): Bucket => ({ input: 0, output: 0, cache: 0, total: 0, cost: 0, calls: 0 })

/** Cost is computed once per event (it depends on the model and on whether
 *  the event landed in a peak window) and folded into every bucket that
 *  needs it — shared by the account-wide replay and the single-session one. */
function bump(map: Map<string, Bucket>, key: string, input: number, output: number, cache: number, cost: number): void {
  const bucket = map.get(key) ?? emptyBucket()
  bucket.input += input
  bucket.output += output
  bucket.cache += cache
  // reasoningTokens is a subset of outputTokens; never double-count it.
  bucket.total += input + output + cache
  bucket.cost += cost
  bucket.calls += 1
  map.set(key, bucket)
}

type OverallBucket = Bucket & { reasoning: number; cacheSavings: number }
const emptyOverall = (): OverallBucket => ({ ...emptyBucket(), reasoning: 0, cacheSavings: 0 })

/** Image usage folded one record at a time; `imageTokens`/`cost` are official-
 *  rule estimates, `bytes` is the counted payload size when refs carry one. */
interface VisionAcc {
  images: number
  imageTokens: number
  cost: number
  bytes: number
}

const emptyVision = (): VisionAcc => ({ images: 0, imageTokens: 0, cost: 0, bytes: 0 })

function bumpVisionInto(
  acc: VisionAcc,
  images: number,
  imageTokens: number,
  cost: number,
  bytes: number,
): void {
  acc.images += images
  acc.imageTokens += imageTokens
  acc.cost += cost
  acc.bytes += bytes
}

function bumpVisionMap(
  map: Map<string, VisionAcc>,
  key: string,
  images: number,
  imageTokens: number,
  cost: number,
  bytes: number,
): void {
  const acc = map.get(key) ?? emptyVision()
  bumpVisionInto(acc, images, imageTokens, cost, bytes)
  map.set(key, acc)
}

interface WindowAccumulator {
  days: UsageWindowDays
  startKey: string
  endKey: string
  dayMap: Map<string, Bucket>
  hourMap: Map<string, Bucket>
  overall: OverallBucket
  modelTotals: Map<string, Bucket>
  modelDays: Map<string, Map<string, Bucket>>
  modelHours: Map<string, Map<string, Bucket>>
  sessions: SessionCost[]
  vision: VisionAcc
  visionDays: Map<string, VisionAcc>
  visionSessions: Map<string, VisionAcc & { title: string }>
}

/** How many sessions the ranking keeps; the rest are summarised by count. */
const SESSION_TOP_N = 6

/**
 * One billed model call, reduced to the fields every aggregation needs.
 *
 * This is the unit the fold cache stores: ~1 record per `assistant/message`
 * event rather than the whole event (which also carries every message body and
 * tool payload). Caching these is what makes an unchanged session cost nothing
 * on the next replay, since reading a log means decompressing and JSON-parsing
 * every event in it.
 *
 * Image usage is pre-summed per record because the estimate depends only on the
 * attachment dimensions; the *cost* of those tokens is priced at merge time,
 * where the record's time and model are already being priced anyway.
 */
interface FoldedRecord {
  time: number
  provider: string
  model: string
  input: number
  output: number
  cache: number
  reasoning: number
  messageId: string | undefined
  turn: number | undefined
  /** Images carried by this call's prompt. */
  images: number
  imageTokens: number
  imageBytes: number
}

/** One session's folded log: everything the two endpoints derive from it. */
interface FoldedSession {
  /** Last `session/title` value seen, or '' when the log has none. */
  title: string
  records: FoldedRecord[]
  usageRecords: number
  skippedRecords: number
}

/** One session to replay: identity plus the metadata that orders and caches it. */
interface SessionEntry {
  id: string
  /** Opaque change token; undefined when the host cannot provide one. */
  revision: string | undefined
  /** 0 for a top-level session, parent depth + 1 for a subagent child. */
  delegationDepth: number
  createdAt: number
}

/**
 * Bound on the folded records held by the cache, not on sessions: a session's
 * cost is proportional to its call count, so this is the figure that actually
 * bounds memory. ~120k records is a few tens of MB and far beyond what a
 * dashboard tour touches; entries are dropped least-recently-used.
 */
const FOLD_CACHE_MAX_RECORDS = 120_000

/** Shared by both endpoints: /usage replays every log, /session exactly one. */
const foldCache: RevisionCache<FoldedSession> = createRevisionCache(FOLD_CACHE_MAX_RECORDS)

/**
 * Drop every cached fold. Test seam only: the cache is keyed by session id and
 * revision, and unit tests reuse ids with hand-written revisions, so a stale
 * entry from an earlier test could otherwise be served as a valid hit.
 */
export function clearFoldCache(): void {
  foldCache.retainOnly([])
}

const dayKeyOf = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/**
 * Roll the per-day buckets up into the windows the dashboard's summary card
 * shows. Everything is keyed by local date, matching how the buckets were
 * filled, so "today" means the user's today.
 */
function summarize(dayMap: Map<string, Bucket>, now: Date): UsageSummary {
  const sum = (matches: (key: string) => boolean): PeriodUsage => {
    const acc: PeriodUsage = { total: 0, cost: 0, calls: 0 }
    for (const [key, bucket] of dayMap) {
      if (!matches(key)) continue
      acc.total += bucket.total
      acc.cost += bucket.cost
      acc.calls += bucket.calls
    }
    return acc
  }
  const todayKey = dayKeyOf(now)
  const yesterdayKey = dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const monthPrefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthPrefix = `${lastMonth.getFullYear()}-${pad2(lastMonth.getMonth() + 1)}-`
  const dayOfMonth = now.getDate()
  return {
    today: sum(key => key === todayKey),
    yesterday: sum(key => key === yesterdayKey),
    month: sum(key => key.startsWith(monthPrefix)),
    lastMonthToDate: sum(key => key.startsWith(lastMonthPrefix) && Number(key.slice(8)) <= dayOfMonth),
  }
}

/**
 * Fold one session's event log into compact records.
 *
 * The model for every `assistant/message` usage record is the one from the
 * latest preceding `request/header` event (each request logs one before
 * dispatch), so usage can be attributed per model. Events without any
 * preceding header fall back to the `''`/`''` (unknown) bucket.
 *
 * Image blocks are collected alongside: `user/message` content and tool
 * results (`tool/result`, screenshots from tools) may carry `image` blocks,
 * and every pending image is attributed to the next usage record — the model
 * call whose prompt actually carried it. Images followed by no usage record
 * (the request failed or never ran) contribute nothing to the fold, since no
 * model call was billed for them.
 *
 * The result carries no timestamps beyond each record's own, because nothing
 * downstream needs session-level bounds; `fetchUsage` derives its coverage
 * range from the records it actually counts.
 */
function foldSession(events: SessionEventFace[] | undefined): FoldedSession {
  const fold: FoldedSession = { title: '', records: [], usageRecords: 0, skippedRecords: 0 }
  if (events === undefined) return fold
  let provider = ''
  let model = ''
  const pendingImages: ImageAttachmentFace[] = []
  for (const ev of events) {
    if (ev?.type === 'session/title') {
      // Append-only; the last one wins.
      const next = ev.data?.title
      if (typeof next === 'string' && next !== '') fold.title = next
      continue
    }
    if (ev?.type === 'request/header') {
      const cfg = ev.data?.header?.config
      if (cfg?.provider !== undefined && cfg?.model !== undefined) {
        provider = cfg.provider
        model = cfg.model
      }
      continue
    }
    pendingImages.push(...imagesInEvent(ev))
    if (ev?.type !== 'assistant/message') continue
    const usage = ev.data?.usage
    if (usage === undefined) continue
    const values = [usage.inputTokens, usage.outputTokens, usage.cacheReadTokens, usage.reasoningTokens]
      .map(value => value === undefined ? 0 : Number(value))
    if (typeof ev.time !== 'number' || !Number.isFinite(ev.time) || values.some(value => !Number.isFinite(value) || value < 0)) {
      fold.skippedRecords += 1
      continue
    }
    const [input = 0, output = 0, cache = 0, reasoning = 0] = values
    const rawMessageId = ev.data?.message?.id
    const messageId = typeof rawMessageId === 'string' && rawMessageId !== '' ? rawMessageId : undefined
    const rawTurn = ev.data?.turn
    const turn = typeof rawTurn === 'number' && Number.isFinite(rawTurn) ? rawTurn : undefined
    let images = 0
    let imageTokens = 0
    let imageBytes = 0
    for (const image of pendingImages) {
      images += 1
      imageTokens += estimateImageTokens(
        typeof image.width === 'number' ? image.width : 0,
        typeof image.height === 'number' ? image.height : 0,
      )
      imageBytes += typeof image.bytes === 'number' ? image.bytes : 0
    }
    pendingImages.length = 0
    fold.records.push({
      time: ev.time, provider, model, input, output, cache, reasoning, messageId, turn,
      images, imageTokens, imageBytes,
    })
    fold.usageRecords += 1
  }
  return fold
}

/** Every `image` attachment ref inside one content-block tree, including
 *  blocks nested in tool-result blocks (`tool/result` screenshots). */
function imageBlocks(blocks: ContentBlockFace[] | undefined): ImageAttachmentFace[] {
  const found: ImageAttachmentFace[] = []
  const walkAll = (items: ContentBlockFace[] | undefined): void => {
    for (const item of items ?? []) {
      if (item?.type === 'image' && item.attachment !== undefined && item.attachment !== null) {
        found.push(item.attachment)
      }
      if (Array.isArray(item?.content)) walkAll(item.content)
    }
  }
  walkAll(blocks)
  return found
}

/** Image attachment refs carried by one event: `user/message` blocks at
 *  `data.content`, `tool/result` blocks at `data.message.content`. */
function imagesInEvent(ev: SessionEventFace | undefined): ImageAttachmentFace[] {
  if (ev === undefined) return []
  return [
    ...imageBlocks(ev.data?.content),
    ...imageBlocks(ev.data?.message?.content),
  ]
}

/**
 * Read one session's full event log across host generations. Handle-era DSH
 * (the one without `readFrom`) exposes `open(id, 'read')` → slice reads that
 * must be looped until an empty slice, then `close()`; legacy hosts returned
 * the whole log from `readFrom(id, 0)`. One shared path so `fetchUsage` and
 * `fetchSessionUsage` close the handle on every outcome, success or failure.
 */
async function readSessionEvents(persistence: SessionPersistenceFace, id: string): Promise<SessionEventFace[] | undefined> {
  if (typeof persistence.open === 'function') {
    const handle = await persistence.open(id, 'read')
    try {
      const events: SessionEventFace[] = []
      for (;;) {
        const slice = await handle.read(events.length)
        const batch = slice.events ?? []
        if (batch.length === 0) return events
        // Loop, not spread: one slice can carry a whole long session and
        // `push(...batch)` would overflow the call-argument stack.
        for (const event of batch) events.push(event)
      }
    } finally {
      // A read handle has nothing durable to drain, and a close failure
      // must not mask the read's result or error.
      try { await handle.close() } catch { /* nothing to drain */ }
    }
  }
  if (persistence.readFrom === undefined) {
    throw new Error('宿主 sessionPersistence 缺少 open() 与 readFrom()，无法读取会话日志')
  }
  const { events } = await persistence.readFrom(id, 0)
  return events
}

/**
 * Normalise `list()` into the sessions to replay, and fix their order.
 *
 * Two things happen here that the endpoint depends on:
 *
 * 1. **Deduplication of the id list** — nothing forbids the host from listing a
 *    session twice, and a repeat would only cost a second read.
 * 2. **A deterministic ancestor-first order.** The host promises no order at
 *    all (`list()` is documented "in no promised order"), yet the cross-session
 *    message-id dedupe below is first-copy-wins. With an unordered list, which
 *    session got credited for a call — and which sessions vanished from the
 *    ranking entirely, since a session with no unique calls is dropped — could
 *    change between two identical replays. On-disk logs show why depth is the
 *    right key: a subagent session is *seeded* with its ancestor's event prefix,
 *    so one billed call appears in several logs at the same seq, and the copy
 *    belonging to the lowest-depth session is the one that actually made the
 *    call. `createdAt` and the id only break ties.
 */
function sessionEntries(headers: SessionHeaderFace[]): SessionEntry[] {
  const seen = new Set<string>()
  const entries: SessionEntry[] = []
  for (const listed of headers) {
    const header = listed.header ?? listed
    const id = header.id ?? header.sessionId ?? listed.id ?? listed.sessionId
    if (id === undefined || id === '') continue
    if (seen.has(id)) continue
    seen.add(id)
    const revision = listed.revision ?? header.revision
    entries.push({
      id,
      revision: typeof revision === 'string' && revision !== '' ? revision : undefined,
      delegationDepth: Number.isFinite(header.delegationDepth) ? Number(header.delegationDepth) : 0,
      createdAt: Number.isFinite(header.createdAt) ? Number(header.createdAt) : 0,
    })
  }
  entries.sort((a, b) =>
    a.delegationDepth - b.delegationDepth
    || a.createdAt - b.createdAt
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return entries
}

/**
 * The fold for one session, from the cache when its revision still matches and
 * from a fresh read otherwise. `foldCache` never stores or serves an entry
 * without a revision, so a host that cannot report one keeps the old
 * always-re-read behaviour instead of being served a stale fold.
 */
async function foldOf(persistence: SessionPersistenceFace, entry: SessionEntry): Promise<FoldedSession> {
  const cached = foldCache.get(entry.id, entry.revision)
  if (cached !== undefined) return cached
  const fold = foldSession(await readSessionEvents(persistence, entry.id))
  foldCache.set(entry.id, entry.revision, fold, fold.records.length)
  return fold
}

/**
 * Metadata-only revision for one session, used by the single-session endpoint
 * (which does not list). Undefined when the host has no `stat` or does not
 * report a revision — both mean "read the log".
 */
async function revisionOf(persistence: SessionPersistenceFace, id: string): Promise<string | undefined> {
  if (typeof persistence.stat !== 'function') return undefined
  try {
    const snapshot = await persistence.stat(id)
    const revision = snapshot?.revision
    return typeof revision === 'string' && revision !== '' ? revision : undefined
  } catch {
    // A failed stat must not fail the read; it only costs us the cache.
    return undefined
  }
}

export async function fetchUsage(persistence: SessionPersistenceFace | undefined, nowMs = Date.now()): Promise<UsageResponse> {
  if (persistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
  let headers: SessionHeaderFace[]
  try {
    headers = await persistence.list()
  } catch (err) {
    return { ok: false, error: `读取会话列表失败：${errorMessage(err)}` }
  }
  const dayMap = new Map<string, Bucket>()
  const hourMap = new Map<string, Bucket>()
  const overall = emptyOverall()
  // Per model: key `${provider}/${model}` -> totals and day/hour maps.
  const modelTotals = new Map<string, Bucket>()
  const modelDays = new Map<string, Map<string, Bucket>>()
  const modelHours = new Map<string, Map<string, Bucket>>()
  const sessions: SessionCost[] = []
  // Image usage across everything the replay sees. Day-keyed series mirrors
  // the daily bucket map; per-session tracks "which run kept sending pictures".
  const vision = emptyVision()
  const visionDays = new Map<string, VisionAcc>()
  const visionSessions = new Map<string, VisionAcc & { title: string }>()
  const coverage: UsageCoverage = {
    scope: 'local-dsh-session-logs',
    listedSessions: 0,
    scannedSessions: 0,
    usageRecords: 0,
    skippedRecords: 0,
    failedSessions: 0,
    earliestAt: null,
    latestAt: null,
  }
  // Peak / off-peak split, plus the same usage re-priced as if everything
  // had landed in an idle window (the shift-off-peak saving).
  const peakSplit: PeakSplit = {
    peak: { total: 0, cost: 0, calls: 0 },
    offPeak: { total: 0, cost: 0, calls: 0 },
    peakEraCost: 0,
    offPeakEraCost: 0,
  }

  const now = new Date(nowMs)
  const dateBefore = (days: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)

  // One API response is logged once per session that replays it: the parent
  // conversation re-records every subagent's `assistant/message` events with
  // the same message id, so naively summing sessions multiplies each request
  // by (1 + number of sessions containing it) — today's "calls" read ~3x the
  // platform's request count. Dedupe by message id across all sessions.
  const seenMessageIds = new Set<string>()
  const windowAggregates: WindowAccumulator[] = USAGE_WINDOW_DAYS.map(days => ({
    days,
    startKey: dayKeyOf(dateBefore(days - 1)),
    endKey: dayKeyOf(now),
    dayMap: new Map(),
    hourMap: new Map(),
    overall: emptyOverall(),
    modelTotals: new Map(),
    modelDays: new Map(),
    modelHours: new Map(),
    sessions: [],
    vision: emptyVision(),
    visionDays: new Map(),
    visionSessions: new Map(),
  }))

  const bumpOverall = (
    bucket: OverallBucket,
    input: number,
    output: number,
    cache: number,
    reasoning: number,
    cost: number,
    cacheSavings: number,
  ): void => {
    bucket.input += input
    bucket.output += output
    bucket.cache += cache
    bucket.reasoning += reasoning
    bucket.total += input + output + cache
    bucket.cost += cost
    bucket.cacheSavings += cacheSavings
    bucket.calls += 1
  }

  const bumpModel = (
    totals: Map<string, Bucket>,
    days: Map<string, Map<string, Bucket>>,
    hours: Map<string, Map<string, Bucket>>,
    modelKey: string,
    dayKey: string,
    hourKey: string,
    input: number,
    output: number,
    cache: number,
    cost: number,
  ): void => {
    bump(totals, modelKey, input, output, cache, cost)
    let dayBuckets = days.get(modelKey)
    if (dayBuckets === undefined) {
      dayBuckets = new Map()
      days.set(modelKey, dayBuckets)
    }
    bump(dayBuckets, dayKey, input, output, cache, cost)
    let hourBuckets = hours.get(modelKey)
    if (hourBuckets === undefined) {
      hourBuckets = new Map()
      hours.set(modelKey, hourBuckets)
    }
    bump(hourBuckets, hourKey, input, output, cache, cost)
  }

  const bumpSession = (session: SessionCost, time: number, total: number, cost: number): void => {
    session.total += total
    session.cost += cost
    session.calls += 1
    if (time > session.lastActive) session.lastActive = time
  }

  const entries = sessionEntries(headers)
  coverage.listedSessions = entries.length
  const liveSessionIds = new Set<string>()

  for (const entry of entries) {
    liveSessionIds.add(entry.id)
    try {
      const fold = await foldOf(persistence, entry)
      coverage.scannedSessions += 1
      // The session's own title, folded from its log; `session/title` events
      // are append-only and the last one wins. Readable fallback keeps the
      // ranking readable for a log that never set one.
      const title = fold.title !== '' ? fold.title : `会话 ${entry.id.slice(0, 8)}`
      const session: SessionCost = { id: entry.id, title, total: 0, cost: 0, calls: 0, lastActive: 0 }
      const windowSessions = windowAggregates.map((): SessionCost => ({ id: entry.id, title, total: 0, cost: 0, calls: 0, lastActive: 0 }))
      const sessionVision: VisionAcc & { title: string } = { ...emptyVision(), title }
      const windowVisionSessions = windowAggregates.map((): VisionAcc & { title: string } => ({ ...emptyVision(), title }))
      coverage.usageRecords += fold.usageRecords
      coverage.skippedRecords += fold.skippedRecords

      for (const record of fold.records) {
        const { time, provider, model, input, output, cache, reasoning, messageId } = record
        // A subagent session is seeded with its ancestor's event prefix, so one
        // billed call is present in several logs; count each one once. Sessions
        // are scanned ancestor-first (see sessionEntries), so the copy credited
        // is the one from the session that actually made the call.
        if (messageId !== undefined) {
          if (seenMessageIds.has(messageId)) continue
          seenMessageIds.add(messageId)
        }
        if (coverage.earliestAt === null || time < coverage.earliestAt) coverage.earliestAt = time
        if (coverage.latestAt === null || time > coverage.latestAt) coverage.latestAt = time
        const d = new Date(time)
        const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
        const hourKey = String(d.getHours())
        const modelKey = `${provider}/${model}`
        const cost = costOf(time, model, input, cache, output)
        const cacheSavings = cacheSavingOf(time, model, cache)
        const eventTotal = input + output + cache
        bump(dayMap, dayKey, input, output, cache, cost)
        bump(hourMap, hourKey, input, output, cache, cost)
        bumpModel(modelTotals, modelDays, modelHours, modelKey, dayKey, hourKey, input, output, cache, cost)
        bumpOverall(overall, input, output, cache, reasoning, cost, cacheSavings)
        bumpSession(session, time, eventTotal, cost)
        // Image tokens ride the record that consumed them: the estimate is
        // pre-summed in the fold (official resizing rule) and priced here at
        // that call's cache-miss input rate. Pricing the sum once equals
        // pricing each image, since the rate is linear in tokens.
        if (record.images > 0) {
          const imageTokensSum = record.imageTokens
          const imageCostSum = costOf(time, model, imageTokensSum, 0, 0)
          const imageBytesSum = record.imageBytes
          bumpVisionInto(vision, record.images, imageTokensSum, imageCostSum, imageBytesSum)
          bumpVisionMap(visionDays, dayKey, record.images, imageTokensSum, imageCostSum, imageBytesSum)
          bumpVisionInto(sessionVision, record.images, imageTokensSum, imageCostSum, imageBytesSum)
          for (let i = 0; i < windowAggregates.length; i++) {
            const aggregate = windowAggregates[i]
            if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue
            bumpVisionInto(aggregate.vision, record.images, imageTokensSum, imageCostSum, imageBytesSum)
            bumpVisionMap(aggregate.visionDays, dayKey, record.images, imageTokensSum, imageCostSum, imageBytesSum)
            bumpVisionInto(windowVisionSessions[i], record.images, imageTokensSum, imageCostSum, imageBytesSum)
          }
        }
        for (let i = 0; i < windowAggregates.length; i++) {
          const aggregate = windowAggregates[i]
          if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue
          bump(aggregate.dayMap, dayKey, input, output, cache, cost)
          bump(aggregate.hourMap, hourKey, input, output, cache, cost)
          bumpModel(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, modelKey, dayKey, hourKey, input, output, cache, cost)
          bumpOverall(aggregate.overall, input, output, cache, reasoning, cost, cacheSavings)
          bumpSession(windowSessions[i], time, eventTotal, cost)
        }
        const window = isPeak(time) ? peakSplit.peak : peakSplit.offPeak
        window.total += eventTotal
        window.cost += cost
        window.calls += 1
        peakSplit.peakEraCost += costUnderPeakEra(time, model, input, cache, output, false, nowMs)
        peakSplit.offPeakEraCost += costUnderPeakEra(time, model, input, cache, output, true, nowMs)
      }

      if (session.calls > 0) {
        sessions.push(session)
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowSession = windowSessions[i]
          if (windowSession.calls === 0) continue
          windowAggregates[i].sessions.push(windowSession)
        }
      }
      if (sessionVision.images > 0) {
        visionSessions.set(entry.id, sessionVision)
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowVision = windowVisionSessions[i]
          if (windowVision.images === 0) continue
          windowAggregates[i].visionSessions.set(entry.id, windowVision)
        }
      }
    } catch {
      // One broken session log must not sink the whole dashboard.
      coverage.failedSessions += 1
    }
  }
  // Sessions deleted from disk must not keep their folds (and their memory).
  foldCache.retainOnly(liveSessionIds)

  const makeDaily = (map: Map<string, Bucket>, count: number): UsageData['daily'] => {
    const result: UsageData['daily'] = []
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i))
      const b = map.get(key) ?? emptyBucket()
      result.push({ date: key, input: b.input, output: b.output, cache: b.cache, total: b.total, cost: b.cost, calls: b.calls })
    }
    return result
  }

  const makeHourly = (map: Map<string, Bucket>): UsageData['hourly'] => {
    const result: UsageData['hourly'] = []
    for (let i = 0; i < 24; i++) {
      const b = map.get(String(i)) ?? emptyBucket()
      result.push({ hour: i, total: b.total, cost: b.cost, calls: b.calls })
    }
    return result
  }

  const makeModels = (
    totals: Map<string, Bucket>,
    daysByModel: Map<string, Map<string, Bucket>>,
    hoursByModel: Map<string, Map<string, Bucket>>,
    dayCount: number,
  ): ModelUsage[] => {
    const result: ModelUsage[] = []
    for (const [modelKey, bucket] of totals) {
      const slash = modelKey.indexOf('/')
      const provider = slash < 0 ? '' : modelKey.slice(0, slash)
      const model = slash < 0 ? modelKey : modelKey.slice(slash + 1)
      const days = daysByModel.get(modelKey)
      const hours = hoursByModel.get(modelKey)
      const daily: ModelSeriesPoint[] = makeDaily(days ?? new Map(), dayCount)
        .map(point => ({ total: point.total, cost: point.cost, calls: point.calls }))
      const hourly: ModelSeriesPoint[] = makeHourly(hours ?? new Map())
        .map(point => ({ total: point.total, cost: point.cost, calls: point.calls }))
      result.push({
        provider,
        model,
        input: bucket.input,
        output: bucket.output,
        cache: bucket.cache,
        total: bucket.total,
        cost: bucket.cost,
        calls: bucket.calls,
        daily,
        hourly,
      })
    }
    result.sort((a, b) => b.total - a.total)
    return result
  }

  const daily = makeDaily(dayMap, 30)
  const hourly = makeHourly(hourMap)

  // 52 full weeks (364 days) rather than a calendar year, so the grid is
  // always a whole number of week-columns and never carries an orphan day.
  const heatmap: UsageData['heatmap'] = []
  for (let i = 363; i >= 0; i--) {
    const key = dayKeyOf(dateBefore(i))
    const b = dayMap.get(key) ?? emptyBucket()
    heatmap.push({ date: key, total: b.total, cost: b.cost, calls: b.calls })
  }

  const makeVisionDaily = (map: Map<string, VisionAcc>, count: number): VisionDayPoint[] => {
    const result: VisionDayPoint[] = []
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i))
      const b = map.get(key) ?? emptyVision()
      result.push({ date: key, images: b.images, imageTokens: b.imageTokens, cost: b.cost })
    }
    return result
  }

  const makeVisionSessions = (map: Map<string, VisionAcc & { title: string }>): VisionSession[] =>
    [...map.entries()]
      .map(([id, acc]) => ({
        id,
        title: acc.title !== '' ? acc.title : `会话 ${id.slice(0, 8)}`,
        images: acc.images,
        imageTokens: acc.imageTokens,
        cost: acc.cost,
      }))
      .sort((a, b) => b.images - a.images)
      .slice(0, SESSION_TOP_N)

  const models = makeModels(modelTotals, modelDays, modelHours, 30)
  const windows = windowAggregates.map(aggregate => ({
    days: aggregate.days,
    daily: makeDaily(aggregate.dayMap, aggregate.days),
    hourly: makeHourly(aggregate.hourMap),
    totals: { ...aggregate.overall },
    models: makeModels(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, aggregate.days),
    sessions: [...aggregate.sessions].sort((a, b) => b.cost - a.cost).slice(0, SESSION_TOP_N),
    sessionCount: aggregate.sessions.length,
    vision: { ...aggregate.vision },
    visionDaily: makeVisionDaily(aggregate.visionDays, aggregate.days),
    visionSessions: makeVisionSessions(aggregate.visionSessions),
  }))

  return {
    ok: true,
    data: {
      daily,
      hourly,
      heatmap,
      models,
      summary: summarize(dayMap, new Date(nowMs)),
      pricing: pricingInfo(nowMs),
      peakSplit,
      sessions: [...sessions].sort((a, b) => b.cost - a.cost).slice(0, SESSION_TOP_N),
      sessionCount: sessions.length,
      coverage,
      windows,
      vision: { ...vision },
      visionDaily: makeVisionDaily(visionDays, 30),
      visionSessions: makeVisionSessions(visionSessions),
      totals: {
        input: overall.input,
        output: overall.output,
        cache: overall.cache,
        reasoning: overall.reasoning,
        total: overall.total,
        cost: overall.cost,
        calls: overall.calls,
        cacheSavings: overall.cacheSavings,
      },
    },
  }
}

/**
 * Usage for exactly one session — the 「额度」tab's own conversation, as
 * opposed to `fetchUsage`'s account-wide replay. Reads a single session log
 * (not every session on disk), so it is cheap enough to call on every tab
 * mount without a TTL memo; the caller is expected to re-fetch whenever the
 * session id it cares about changes.
 */
/**
 * Usage for exactly one session — the 「额度」tab's own conversation, as
 * opposed to `fetchUsage`'s account-wide replay.
 *
 * Deliberately not memoized on a TTL: the point of this endpoint is to reflect
 * the session's live state. Freshness comes from the log's own revision
 * instead — an appended log changes it and is re-read, an untouched one is
 * served from the fold cache. That keeps the cost off the hot path (a long
 * session's log here is 5 MiB compressed / ~17 MiB of events, ~100ms of
 * decompress + parse) while still never showing a stale transcript tail.
 */
export async function fetchSessionUsage(persistence: SessionPersistenceFace | undefined, sessionId: string): Promise<SessionUsageResponse> {
  if (persistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
  if (typeof sessionId !== 'string' || sessionId === '') return { ok: false, error: '缺少会话 id' }
  // Defense in depth: src/index.ts already rejects a malformed `id` before
  // this function is ever called (see SESSION_ID_PATTERN in contract.ts),
  // but this function is also unit-tested and reachable directly, so the
  // same check is repeated here rather than trusted to the one caller.
  if (!isValidSessionId(sessionId)) return { ok: false, error: '会话 id 格式不合法' }

  const entry: SessionEntry = {
    id: sessionId,
    revision: await revisionOf(persistence, sessionId),
    delegationDepth: 0,
    createdAt: 0,
  }

  let fold: FoldedSession
  try {
    fold = await foldOf(persistence, entry)
  } catch (err) {
    return { ok: false, error: `读取会话日志失败：${errorMessage(err)}` }
  }

  const modelTotals = new Map<string, Bucket>()
  let total = 0
  let cost = 0
  let calls = 0
  let firstActive: number | null = null
  let lastActive: number | null = null
  const turnTotals = new Map<string, { messageId: string; total: number; cost: number; calls: number }>()

  for (const record of fold.records) {
    const { time, provider, model, input, output, cache, messageId, turn } = record
    const modelKey = `${provider}/${model}`
    const eventCost = costOf(time, model, input, cache, output)
    const eventTotal = input + output + cache
    bump(modelTotals, modelKey, input, output, cache, eventCost)
    total += eventTotal
    cost += eventCost
    calls += 1
    if (firstActive === null || time < firstActive) firstActive = time
    if (lastActive === null || time > lastActive) lastActive = time
    if (messageId !== undefined) {
      // A turn may make several model calls while tools run. The chat renders
      // one action strip beside its final assistant message, so keep replacing
      // the address while accumulating every step's usage under the turn id.
      const key = turn === undefined ? `message:${messageId}` : `turn:${turn}`
      const aggregate = turnTotals.get(key) ?? { messageId, total: 0, cost: 0, calls: 0 }
      aggregate.messageId = messageId
      aggregate.total += eventTotal
      aggregate.cost += eventCost
      aggregate.calls += 1
      turnTotals.set(key, aggregate)
    }
  }

  const models: SessionModelUsage[] = [...modelTotals.entries()]
    .map(([modelKey, bucket]): SessionModelUsage => {
      const slash = modelKey.indexOf('/')
      const provider = slash < 0 ? '' : modelKey.slice(0, slash)
      const model = slash < 0 ? modelKey : modelKey.slice(slash + 1)
      return {
        provider,
        model,
        input: bucket.input,
        output: bucket.output,
        cache: bucket.cache,
        total: bucket.total,
        cost: bucket.cost,
        calls: bucket.calls,
      }
    })
    .sort((a, b) => b.cost - a.cost)

  return {
    ok: true,
    data: {
      sessionId,
      title: fold.title !== '' ? fold.title : `会话 ${sessionId.slice(0, 8)}`,
      total,
      cost,
      calls,
      firstActive,
      lastActive,
      models,
      turns: [...turnTotals.values()],
    },
  }
}
