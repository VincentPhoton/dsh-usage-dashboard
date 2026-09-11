// src/contract.ts
var USAGE_WINDOW_DAYS = [7, 30, 90, 365];
var SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
var isValidSessionId = (id) => SESSION_ID_PATTERN.test(id);

// src/memo.ts
function memoize(ttlMs, compute) {
  const state = { entry: void 0, inflight: void 0 };
  const run = () => {
    if (state.inflight !== void 0) return state.inflight;
    const task = compute().then(
      (value) => {
        state.inflight = void 0;
        if (value.ok) state.entry = { value, setAt: Date.now() };
        return value;
      },
      (err) => {
        state.inflight = void 0;
        throw err;
      }
    );
    state.inflight = task;
    return task;
  };
  return {
    get: () => {
      const hit = state.entry;
      if (hit !== void 0 && hit.value.ok && Date.now() - hit.setAt < ttlMs) {
        return Promise.resolve(hit.value);
      }
      return run();
    },
    refresh: () => run()
  };
}

// src/trust-fence.ts
function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}
function isTrustedApiRequest(req) {
  const host = req.headers.host;
  if (host === void 0) return false;
  let hostUrl;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false;
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (origin === void 0) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

// src/pricing.ts
var PEAK_PRICING_FROM_MS = Date.UTC(2026, 7, 16, 16, 0, 0);
var V41_FLASH_PRICING_FROM_MS = Date.UTC(2026, 8, 10, 4, 0, 0);
var PRO_ROUTED_TO_FLASH_FROM_MS = Date.UTC(2026, 8, 14, 4, 0, 0);
var PEAK_WINDOWS = [[9, 12], [14, 18]];
var BEIJING_OFFSET_MS = 8 * 36e5;
var FLAT_RATES = {
  pro: { cacheHit: 0.025, input: 3, output: 6 },
  flash: { cacheHit: 0.02, input: 1, output: 2 },
  // The vision model billed at flash rates from day one, so its pre-switch
  // history is costed at the same flat prices as flash.
  vision: { cacheHit: 0.02, input: 1, output: 2 }
};
var PEAK_RATES_08_17 = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.1, input: 3, output: 9 },
  // Official policy: the vision model is priced identically to flash; images
  // cost tokens, not their own multiplier.
  vision: { cacheHit: 0.1, input: 3, output: 9 }
};
var PEAK_RATES_09_10 = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.04, input: 2, output: 8 },
  vision: { cacheHit: 0.04, input: 2, output: 8 }
};
var PRICE_ERAS = [
  { fromMs: PEAK_PRICING_FROM_MS, peak: PEAK_RATES_08_17, weekdaysOnly: false },
  { fromMs: V41_FLASH_PRICING_FROM_MS, peak: PEAK_RATES_09_10, weekdaysOnly: true }
];
function eraAt(timeMs) {
  let era = PRICE_ERAS[0];
  for (const candidate of PRICE_ERAS) if (timeMs >= candidate.fromMs) era = candidate;
  return era;
}
var halved = (rates) => ({
  cacheHit: rates.cacheHit,
  input: rates.input / 2,
  output: rates.output / 2
});
function tierOf(model) {
  const name2 = model.toLowerCase();
  if (name2.includes("vision")) return "vision";
  if (name2.includes("flash")) return "flash";
  return "pro";
}
function billedTierOf(timeMs, model) {
  const tier = tierOf(model);
  return tier === "pro" && timeMs >= PRO_ROUTED_TO_FLASH_FROM_MS ? "flash" : tier;
}
function isBeijingWeekday(timeMs) {
  const day = new Date(timeMs + BEIJING_OFFSET_MS).getUTCDay();
  return day >= 1 && day <= 5;
}
function estimateImageTokens(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0;
  const area = width * height;
  const scaledArea = Math.min(800 * 800, Math.max(384 * 384, area));
  return 384 * (scaledArea / (800 * 800));
}
function isPeak(timeMs) {
  const beijing = new Date(timeMs + BEIJING_OFFSET_MS);
  const dow = beijing.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (isChineseHoliday(timeMs)) return false;
  if (eraAt(timeMs).weekdaysOnly && !isBeijingWeekday(timeMs)) return false;
  const hour = beijing.getUTCHours();
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to);
}
var CN_HOLIDAYS = {
  // 2024: 元旦 01-01 · 春节 02-10~17 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 06-10 · 中秋 09-15~17 · 国庆 10-01~07
  2024: [
    "01-01",
    "02-10",
    "02-11",
    "02-12",
    "02-13",
    "02-14",
    "02-15",
    "02-16",
    "02-17",
    "04-04",
    "04-05",
    "04-06",
    "05-01",
    "05-02",
    "05-03",
    "05-04",
    "05-05",
    "06-10",
    "09-15",
    "09-16",
    "09-17",
    "10-01",
    "10-02",
    "10-03",
    "10-04",
    "10-05",
    "10-06",
    "10-07"
  ],
  // 2025: 元旦 01-01 · 春节 01-28~02-04 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 05-31~06-02 · 国庆+中秋 10-01~08
  2025: [
    "01-01",
    "01-28",
    "01-29",
    "01-30",
    "01-31",
    "02-01",
    "02-02",
    "02-03",
    "02-04",
    "04-04",
    "04-05",
    "04-06",
    "05-01",
    "05-02",
    "05-03",
    "05-04",
    "05-05",
    "05-31",
    "06-01",
    "06-02",
    "10-01",
    "10-02",
    "10-03",
    "10-04",
    "10-05",
    "10-06",
    "10-07",
    "10-08"
  ],
  // 2026: 元旦 01-01~03 · 春节 02-15~23 · 清明 04-04~06 · 劳动节 05-01~05 · 端午 06-19~21 · 中秋 09-25~27 · 国庆 10-01~07
  2026: [
    "01-01",
    "01-02",
    "01-03",
    "02-15",
    "02-16",
    "02-17",
    "02-18",
    "02-19",
    "02-20",
    "02-21",
    "02-22",
    "02-23",
    "04-04",
    "04-05",
    "04-06",
    "05-01",
    "05-02",
    "05-03",
    "05-04",
    "05-05",
    "06-19",
    "06-20",
    "06-21",
    "09-25",
    "09-26",
    "09-27",
    "10-01",
    "10-02",
    "10-03",
    "10-04",
    "10-05",
    "10-06",
    "10-07"
  ]
};
function isChineseHoliday(timeMs) {
  const beijing = new Date(timeMs + BEIJING_OFFSET_MS);
  const list = CN_HOLIDAYS[beijing.getUTCFullYear()];
  if (list === void 0) return false;
  const monthDay = `${String(beijing.getUTCMonth() + 1).padStart(2, "0")}-${String(beijing.getUTCDate()).padStart(2, "0")}`;
  return list.includes(monthDay);
}
function ratesAt(timeMs, model) {
  if (timeMs < PEAK_PRICING_FROM_MS) return FLAT_RATES[tierOf(model)];
  const peak = eraAt(timeMs).peak[billedTierOf(timeMs, model)];
  return isPeak(timeMs) ? peak : halved(peak);
}
function cacheSavingOf(timeMs, model, cache) {
  const rates = ratesAt(timeMs, model);
  return cache * (rates.input - rates.cacheHit) / 1e6;
}
var applyRates = (rates, input, cache, output) => (input * rates.input + cache * rates.cacheHit + output * rates.output) / 1e6;
function costOf(timeMs, model, input, cache, output) {
  return applyRates(ratesAt(timeMs, model), input, cache, output);
}
function costUnderPeakEra(timeMs, model, input, cache, output, forceOffPeak = false) {
  const peak = PRICE_ERAS[PRICE_ERAS.length - 1].peak[billedTierOf(timeMs, model)];
  const rates = !forceOffPeak && isPeak(timeMs) ? peak : halved(peak);
  return applyRates(rates, input, cache, output);
}
function pricingInfo(nowMs) {
  const era = eraAt(nowMs);
  const row = (model, tier) => ({ model, peak: era.peak[tier], offPeak: halved(era.peak[tier]) });
  return {
    currency: "CNY",
    switchDate: "2026-08-17",
    inPeakNow: isPeak(nowMs),
    peakWindows: ["09:00\u201312:00", "14:00\u201318:00"],
    tiers: [row("deepseek-flash", "flash"), row("deepseek-v4-pro", "pro")]
  };
}

// src/balance-tracker.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
var BEIJING_OFFSET_MS2 = 8 * 36e5;
var DEFAULT_STATE_PATH = join(homedir(), ".dsh", "dsh-usage-dashboard-balance.json");
var pad2 = (n) => n < 10 ? `0${n}` : String(n);
var beijingDateKey = (nowMs) => {
  const d = new Date(nowMs + BEIJING_OFFSET_MS2);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
function readState(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed.date === "string" && typeof parsed.total === "number" && typeof parsed.toppedUp === "number") {
      return parsed;
    }
  } catch {
  }
  return null;
}
function writeState(path, state) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state), "utf8");
  } catch {
  }
}
var primaryOf = (balances) => balances.find((balance) => balance.currency === "CNY") ?? balances[0];
function trackDailyConsumption(balances, nowMs = Date.now(), statePath = DEFAULT_STATE_PATH) {
  const primary = primaryOf(balances);
  if (primary === void 0) return null;
  const total = Number(primary.total);
  const toppedUp = Number(primary.toppedUp);
  if (!Number.isFinite(total) || !Number.isFinite(toppedUp)) return null;
  const date = beijingDateKey(nowMs);
  const state = readState(statePath);
  if (state === null || state.date !== date) {
    writeState(statePath, { date, total, toppedUp });
    return null;
  }
  const consumed = Math.max(0, state.total - total + (toppedUp - state.toppedUp));
  return Math.round(consumed * 100) / 100;
}

// src/usage.ts
var pad22 = (n) => n < 10 ? `0${n}` : String(n);
var CREDENTIAL_TIMEOUT_MS = 1e4;
function errorMessage(err) {
  return err?.message ?? String(err);
}
async function fetchBalance(credentials, statePath, credentialTimeoutMs) {
  const resolveTimeoutMs = credentialTimeoutMs ?? CREDENTIAL_TIMEOUT_MS;
  if (credentials === void 0) return { ok: false, error: "\u51ED\u8BC1\u670D\u52A1\u4E0D\u53EF\u7528" };
  let cred;
  try {
    cred = await Promise.race([
      credentials.resolve("DEEPSEEK_API_KEY"),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error(`\u8D85\u65F6\uFF08${Math.round(resolveTimeoutMs / 1e3)} \u79D2\u65E0\u54CD\u5E94\uFF09`)), resolveTimeoutMs);
        timer.unref?.();
      })
    ]);
  } catch (err) {
    return { ok: false, error: `\u8BFB\u53D6 API Key \u5931\u8D25\uFF1A${errorMessage(err)}` };
  }
  if (cred === void 0 || cred.value === "") {
    return { ok: false, error: "\u672A\u914D\u7F6E DEEPSEEK_API_KEY\uFF08\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u6A21\u578B\u300D\u4E2D\u586B\u5199\uFF09" };
  }
  let res;
  try {
    res = await fetch("https://api.deepseek.com/user/balance", {
      headers: { authorization: `Bearer ${cred.value}` },
      signal: AbortSignal.timeout(2e4)
    });
  } catch (err) {
    return { ok: false, error: `\u8BF7\u6C42\u4F59\u989D\u63A5\u53E3\u5931\u8D25\uFF1A${errorMessage(err)}` };
  }
  if (!res.ok) return { ok: false, error: `\u4F59\u989D\u63A5\u53E3\u8FD4\u56DE\u9519\u8BEF\uFF08HTTP ${res.status}\uFF09` };
  let parsed;
  try {
    parsed = await res.json();
  } catch {
    return { ok: false, error: "\u89E3\u6790\u4F59\u989D\u54CD\u5E94\u5931\u8D25" };
  }
  const p = parsed;
  const balances = (p.balance_infos ?? []).map((b) => ({
    currency: b.currency ?? "",
    total: b.total_balance ?? "0",
    granted: b.granted_balance ?? "0",
    toppedUp: b.topped_up_balance ?? "0"
  }));
  return {
    ok: true,
    data: {
      isAvailable: p.is_available === true,
      balances,
      todayConsumed: trackDailyConsumption(balances, Date.now(), statePath)
    }
  };
}
var emptyBucket = () => ({ input: 0, output: 0, cache: 0, total: 0, cost: 0, calls: 0 });
function bump(map, key, input, output, cache, cost) {
  const bucket = map.get(key) ?? emptyBucket();
  bucket.input += input;
  bucket.output += output;
  bucket.cache += cache;
  bucket.total += input + output + cache;
  bucket.cost += cost;
  bucket.calls += 1;
  map.set(key, bucket);
}
var emptyOverall = () => ({ ...emptyBucket(), reasoning: 0, cacheSavings: 0 });
var emptyVision = () => ({ images: 0, imageTokens: 0, cost: 0, bytes: 0 });
function bumpVisionInto(acc, images, imageTokens, cost, bytes) {
  acc.images += images;
  acc.imageTokens += imageTokens;
  acc.cost += cost;
  acc.bytes += bytes;
}
function bumpVisionMap(map, key, images, imageTokens, cost, bytes) {
  const acc = map.get(key) ?? emptyVision();
  bumpVisionInto(acc, images, imageTokens, cost, bytes);
  map.set(key, acc);
}
var SESSION_TOP_N = 6;
function titleOf(events, id) {
  let title = "";
  if (events !== void 0) {
    for (const ev of events) {
      if (ev?.type !== "session/title") continue;
      const next = ev.data?.title;
      if (typeof next === "string" && next !== "") title = next;
    }
  }
  return title !== "" ? title : `\u4F1A\u8BDD ${id.slice(0, 8)}`;
}
var dayKeyOf = (d) => `${d.getFullYear()}-${pad22(d.getMonth() + 1)}-${pad22(d.getDate())}`;
function summarize(dayMap, now) {
  const sum = (matches) => {
    const acc = { total: 0, cost: 0, calls: 0 };
    for (const [key, bucket] of dayMap) {
      if (!matches(key)) continue;
      acc.total += bucket.total;
      acc.cost += bucket.cost;
      acc.calls += bucket.calls;
    }
    return acc;
  };
  const todayKey = dayKeyOf(now);
  const yesterdayKey = dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const monthPrefix = `${now.getFullYear()}-${pad22(now.getMonth() + 1)}-`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonth.getFullYear()}-${pad22(lastMonth.getMonth() + 1)}-`;
  const dayOfMonth = now.getDate();
  return {
    today: sum((key) => key === todayKey),
    yesterday: sum((key) => key === yesterdayKey),
    month: sum((key) => key.startsWith(monthPrefix)),
    lastMonthToDate: sum((key) => key.startsWith(lastMonthPrefix) && Number(key.slice(8)) <= dayOfMonth)
  };
}
function addUsageEvent(events, onEvent) {
  const result = { usageRecords: 0, skippedRecords: 0 };
  if (events === void 0) return result;
  let provider = "";
  let model = "";
  const pendingImages = [];
  for (const ev of events) {
    if (ev?.type === "request/header") {
      const cfg = ev.data?.header?.config;
      if (cfg?.provider !== void 0 && cfg?.model !== void 0) {
        provider = cfg.provider;
        model = cfg.model;
      }
      continue;
    }
    pendingImages.push(...imagesInEvent(ev));
    if (ev?.type !== "assistant/message") continue;
    const usage = ev.data?.usage;
    if (usage === void 0) continue;
    const values = [usage.inputTokens, usage.outputTokens, usage.cacheReadTokens, usage.reasoningTokens].map((value) => value === void 0 ? 0 : Number(value));
    if (typeof ev.time !== "number" || !Number.isFinite(ev.time) || values.some((value) => !Number.isFinite(value) || value < 0)) {
      result.skippedRecords += 1;
      continue;
    }
    const [input = 0, output = 0, cache = 0, reasoning = 0] = values;
    const rawMessageId = ev.data?.message?.id;
    const messageId = typeof rawMessageId === "string" && rawMessageId !== "" ? rawMessageId : void 0;
    const rawTurn = ev.data?.turn;
    const turn = typeof rawTurn === "number" && Number.isFinite(rawTurn) ? rawTurn : void 0;
    onEvent(ev.time, input, output, cache, reasoning, provider, model, messageId, turn, pendingImages);
    pendingImages.length = 0;
    result.usageRecords += 1;
  }
  return result;
}
function imageBlocks(blocks) {
  const found = [];
  const walkAll = (items) => {
    for (const item of items ?? []) {
      if (item?.type === "image" && item.attachment !== void 0 && item.attachment !== null) {
        found.push(item.attachment);
      }
      if (Array.isArray(item?.content)) walkAll(item.content);
    }
  };
  walkAll(blocks);
  return found;
}
function imagesInEvent(ev) {
  if (ev === void 0) return [];
  return [
    ...imageBlocks(ev.data?.content),
    ...imageBlocks(ev.data?.message?.content)
  ];
}
async function readSessionEvents(persistence, id) {
  if (typeof persistence.open === "function") {
    const handle = await persistence.open(id, "read");
    try {
      const events2 = [];
      for (; ; ) {
        const slice = await handle.read(events2.length);
        const batch = slice.events ?? [];
        if (batch.length === 0) return events2;
        for (const event of batch) events2.push(event);
      }
    } finally {
      try {
        await handle.close();
      } catch {
      }
    }
  }
  if (persistence.readFrom === void 0) {
    throw new Error("\u5BBF\u4E3B sessionPersistence \u7F3A\u5C11 open() \u4E0E readFrom()\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7");
  }
  const { events } = await persistence.readFrom(id, 0);
  return events;
}
async function fetchUsage(persistence, nowMs = Date.now()) {
  if (persistence === void 0) return { ok: false, error: "\u4F1A\u8BDD\u6301\u4E45\u5316\u670D\u52A1\u4E0D\u53EF\u7528" };
  let headers;
  try {
    headers = await persistence.list();
  } catch (err) {
    return { ok: false, error: `\u8BFB\u53D6\u4F1A\u8BDD\u5217\u8868\u5931\u8D25\uFF1A${errorMessage(err)}` };
  }
  const dayMap = /* @__PURE__ */ new Map();
  const hourMap = /* @__PURE__ */ new Map();
  const overall = emptyOverall();
  const modelTotals = /* @__PURE__ */ new Map();
  const modelDays = /* @__PURE__ */ new Map();
  const modelHours = /* @__PURE__ */ new Map();
  const sessions = [];
  const vision = emptyVision();
  const visionDays = /* @__PURE__ */ new Map();
  const visionSessions = /* @__PURE__ */ new Map();
  const coverage = {
    scope: "local-dsh-session-logs",
    listedSessions: 0,
    scannedSessions: 0,
    usageRecords: 0,
    skippedRecords: 0,
    failedSessions: 0,
    earliestAt: null,
    latestAt: null
  };
  const peakSplit = {
    peak: { total: 0, cost: 0, calls: 0 },
    offPeak: { total: 0, cost: 0, calls: 0 },
    peakEraCost: 0,
    offPeakEraCost: 0
  };
  const now = new Date(nowMs);
  const dateBefore = (days) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const seenMessageIds = /* @__PURE__ */ new Set();
  const windowAggregates = USAGE_WINDOW_DAYS.map((days) => ({
    days,
    startKey: dayKeyOf(dateBefore(days - 1)),
    endKey: dayKeyOf(now),
    dayMap: /* @__PURE__ */ new Map(),
    hourMap: /* @__PURE__ */ new Map(),
    overall: emptyOverall(),
    modelTotals: /* @__PURE__ */ new Map(),
    modelDays: /* @__PURE__ */ new Map(),
    modelHours: /* @__PURE__ */ new Map(),
    sessions: [],
    vision: emptyVision(),
    visionDays: /* @__PURE__ */ new Map(),
    visionSessions: /* @__PURE__ */ new Map()
  }));
  const bumpOverall = (bucket, input, output, cache, reasoning, cost, cacheSavings) => {
    bucket.input += input;
    bucket.output += output;
    bucket.cache += cache;
    bucket.reasoning += reasoning;
    bucket.total += input + output + cache;
    bucket.cost += cost;
    bucket.cacheSavings += cacheSavings;
    bucket.calls += 1;
  };
  const bumpModel = (totals, days, hours, modelKey, dayKey, hourKey, input, output, cache, cost) => {
    bump(totals, modelKey, input, output, cache, cost);
    let dayBuckets = days.get(modelKey);
    if (dayBuckets === void 0) {
      dayBuckets = /* @__PURE__ */ new Map();
      days.set(modelKey, dayBuckets);
    }
    bump(dayBuckets, dayKey, input, output, cache, cost);
    let hourBuckets = hours.get(modelKey);
    if (hourBuckets === void 0) {
      hourBuckets = /* @__PURE__ */ new Map();
      hours.set(modelKey, hourBuckets);
    }
    bump(hourBuckets, hourKey, input, output, cache, cost);
  };
  const bumpSession = (session, time, total, cost) => {
    session.total += total;
    session.cost += cost;
    session.calls += 1;
    if (time > session.lastActive) session.lastActive = time;
  };
  const sessionIds = headers.map((header) => header.id ?? header.sessionId ?? header.header?.id ?? header.header?.sessionId).filter((sid) => sid !== void 0 && sid !== "");
  coverage.listedSessions = sessionIds.length;
  for (const sid of sessionIds) {
    try {
      const events = await readSessionEvents(persistence, sid);
      coverage.scannedSessions += 1;
      const session = { id: sid, title: "", total: 0, cost: 0, calls: 0, lastActive: 0 };
      const windowSessions = windowAggregates.map(() => ({ id: sid, title: "", total: 0, cost: 0, calls: 0, lastActive: 0 }));
      const sessionVision = { ...emptyVision(), title: "" };
      const windowVisionSessions = windowAggregates.map(() => ({ ...emptyVision(), title: "" }));
      const scanned = addUsageEvent(events, (time, input, output, cache, reasoning, provider, model, messageId, _turn, images) => {
        if (messageId !== void 0) {
          if (seenMessageIds.has(messageId)) return;
          seenMessageIds.add(messageId);
        }
        if (coverage.earliestAt === null || time < coverage.earliestAt) coverage.earliestAt = time;
        if (coverage.latestAt === null || time > coverage.latestAt) coverage.latestAt = time;
        const d = new Date(time);
        const dayKey = `${d.getFullYear()}-${pad22(d.getMonth() + 1)}-${pad22(d.getDate())}`;
        const hourKey = String(d.getHours());
        const modelKey = `${provider}/${model}`;
        const cost = costOf(time, model, input, cache, output);
        const cacheSavings = cacheSavingOf(time, model, cache);
        const eventTotal = input + output + cache;
        bump(dayMap, dayKey, input, output, cache, cost);
        bump(hourMap, hourKey, input, output, cache, cost);
        bumpModel(modelTotals, modelDays, modelHours, modelKey, dayKey, hourKey, input, output, cache, cost);
        bumpOverall(overall, input, output, cache, reasoning, cost, cacheSavings);
        bumpSession(session, time, eventTotal, cost);
        if (images.length > 0) {
          let imageTokensSum = 0;
          let imageCostSum = 0;
          let imageBytesSum = 0;
          for (const image of images) {
            const width = typeof image.width === "number" ? image.width : 0;
            const height = typeof image.height === "number" ? image.height : 0;
            const tokens = estimateImageTokens(width, height);
            imageTokensSum += tokens;
            imageCostSum += costOf(time, model, tokens, 0, 0);
            imageBytesSum += typeof image.bytes === "number" ? image.bytes : 0;
          }
          bumpVisionInto(vision, images.length, imageTokensSum, imageCostSum, imageBytesSum);
          bumpVisionMap(visionDays, dayKey, images.length, imageTokensSum, imageCostSum, imageBytesSum);
          bumpVisionInto(sessionVision, images.length, imageTokensSum, imageCostSum, imageBytesSum);
          for (let i = 0; i < windowAggregates.length; i++) {
            const aggregate = windowAggregates[i];
            if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue;
            bumpVisionInto(aggregate.vision, images.length, imageTokensSum, imageCostSum, imageBytesSum);
            bumpVisionMap(aggregate.visionDays, dayKey, images.length, imageTokensSum, imageCostSum, imageBytesSum);
            bumpVisionInto(windowVisionSessions[i], images.length, imageTokensSum, imageCostSum, imageBytesSum);
          }
        }
        for (let i = 0; i < windowAggregates.length; i++) {
          const aggregate = windowAggregates[i];
          if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue;
          bump(aggregate.dayMap, dayKey, input, output, cache, cost);
          bump(aggregate.hourMap, hourKey, input, output, cache, cost);
          bumpModel(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, modelKey, dayKey, hourKey, input, output, cache, cost);
          bumpOverall(aggregate.overall, input, output, cache, reasoning, cost, cacheSavings);
          bumpSession(windowSessions[i], time, eventTotal, cost);
        }
        const window = isPeak(time) ? peakSplit.peak : peakSplit.offPeak;
        window.total += eventTotal;
        window.cost += cost;
        window.calls += 1;
        peakSplit.peakEraCost += costUnderPeakEra(time, model, input, cache, output);
        peakSplit.offPeakEraCost += costUnderPeakEra(time, model, input, cache, output, true);
      });
      coverage.usageRecords += scanned.usageRecords;
      coverage.skippedRecords += scanned.skippedRecords;
      if (session.calls > 0) {
        const title = titleOf(events, sid);
        session.title = title;
        sessions.push(session);
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowSession = windowSessions[i];
          if (windowSession.calls === 0) continue;
          windowSession.title = title;
          windowAggregates[i].sessions.push(windowSession);
        }
      }
      if (sessionVision.images > 0) {
        sessionVision.title = titleOf(events, sid);
        visionSessions.set(sid, sessionVision);
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowVision = windowVisionSessions[i];
          if (windowVision.images === 0) continue;
          windowVision.title = sessionVision.title;
          windowAggregates[i].visionSessions.set(sid, windowVision);
        }
      }
    } catch {
      coverage.failedSessions += 1;
    }
  }
  const makeDaily = (map, count) => {
    const result = [];
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i));
      const b = map.get(key) ?? emptyBucket();
      result.push({ date: key, input: b.input, output: b.output, cache: b.cache, total: b.total, cost: b.cost, calls: b.calls });
    }
    return result;
  };
  const makeHourly = (map) => {
    const result = [];
    for (let i = 0; i < 24; i++) {
      const b = map.get(String(i)) ?? emptyBucket();
      result.push({ hour: i, total: b.total, cost: b.cost, calls: b.calls });
    }
    return result;
  };
  const makeModels = (totals, daysByModel, hoursByModel, dayCount) => {
    const result = [];
    for (const [modelKey, bucket] of totals) {
      const slash = modelKey.indexOf("/");
      const provider = slash < 0 ? "" : modelKey.slice(0, slash);
      const model = slash < 0 ? modelKey : modelKey.slice(slash + 1);
      const days = daysByModel.get(modelKey);
      const hours = hoursByModel.get(modelKey);
      const daily2 = makeDaily(days ?? /* @__PURE__ */ new Map(), dayCount).map((point) => ({ total: point.total, cost: point.cost, calls: point.calls }));
      const hourly2 = makeHourly(hours ?? /* @__PURE__ */ new Map()).map((point) => ({ total: point.total, cost: point.cost, calls: point.calls }));
      result.push({
        provider,
        model,
        input: bucket.input,
        output: bucket.output,
        cache: bucket.cache,
        total: bucket.total,
        cost: bucket.cost,
        calls: bucket.calls,
        daily: daily2,
        hourly: hourly2
      });
    }
    result.sort((a, b) => b.total - a.total);
    return result;
  };
  const daily = makeDaily(dayMap, 30);
  const hourly = makeHourly(hourMap);
  const heatmap = [];
  for (let i = 363; i >= 0; i--) {
    const key = dayKeyOf(dateBefore(i));
    const b = dayMap.get(key) ?? emptyBucket();
    heatmap.push({ date: key, total: b.total, cost: b.cost, calls: b.calls });
  }
  const makeVisionDaily = (map, count) => {
    const result = [];
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i));
      const b = map.get(key) ?? emptyVision();
      result.push({ date: key, images: b.images, imageTokens: b.imageTokens, cost: b.cost });
    }
    return result;
  };
  const makeVisionSessions = (map) => [...map.entries()].map(([id, acc]) => ({
    id,
    title: acc.title !== "" ? acc.title : `\u4F1A\u8BDD ${id.slice(0, 8)}`,
    images: acc.images,
    imageTokens: acc.imageTokens,
    cost: acc.cost
  })).sort((a, b) => b.images - a.images).slice(0, SESSION_TOP_N);
  const models = makeModels(modelTotals, modelDays, modelHours, 30);
  const windows = windowAggregates.map((aggregate) => ({
    days: aggregate.days,
    daily: makeDaily(aggregate.dayMap, aggregate.days),
    hourly: makeHourly(aggregate.hourMap),
    totals: { ...aggregate.overall },
    models: makeModels(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, aggregate.days),
    sessions: [...aggregate.sessions].sort((a, b) => b.cost - a.cost).slice(0, SESSION_TOP_N),
    sessionCount: aggregate.sessions.length,
    vision: { ...aggregate.vision },
    visionDaily: makeVisionDaily(aggregate.visionDays, aggregate.days),
    visionSessions: makeVisionSessions(aggregate.visionSessions)
  }));
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
        cacheSavings: overall.cacheSavings
      }
    }
  };
}
async function fetchSessionUsage(persistence, sessionId) {
  if (persistence === void 0) return { ok: false, error: "\u4F1A\u8BDD\u6301\u4E45\u5316\u670D\u52A1\u4E0D\u53EF\u7528" };
  if (typeof sessionId !== "string" || sessionId === "") return { ok: false, error: "\u7F3A\u5C11\u4F1A\u8BDD id" };
  if (!isValidSessionId(sessionId)) return { ok: false, error: "\u4F1A\u8BDD id \u683C\u5F0F\u4E0D\u5408\u6CD5" };
  let events;
  try {
    events = await readSessionEvents(persistence, sessionId);
  } catch (err) {
    return { ok: false, error: `\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7\u5931\u8D25\uFF1A${errorMessage(err)}` };
  }
  const modelTotals = /* @__PURE__ */ new Map();
  let total = 0;
  let cost = 0;
  let calls = 0;
  let firstActive = null;
  let lastActive = null;
  const turnTotals = /* @__PURE__ */ new Map();
  addUsageEvent(events, (time, input, output, cache, _reasoning, provider, model, messageId, turn) => {
    const modelKey = `${provider}/${model}`;
    const eventCost = costOf(time, model, input, cache, output);
    const eventTotal = input + output + cache;
    bump(modelTotals, modelKey, input, output, cache, eventCost);
    total += eventTotal;
    cost += eventCost;
    calls += 1;
    if (firstActive === null || time < firstActive) firstActive = time;
    if (lastActive === null || time > lastActive) lastActive = time;
    if (messageId !== void 0) {
      const key = turn === void 0 ? `message:${messageId}` : `turn:${turn}`;
      const aggregate = turnTotals.get(key) ?? { messageId, total: 0, cost: 0, calls: 0 };
      aggregate.messageId = messageId;
      aggregate.total += eventTotal;
      aggregate.cost += eventCost;
      aggregate.calls += 1;
      turnTotals.set(key, aggregate);
    }
  });
  const models = [...modelTotals.entries()].map(([modelKey, bucket]) => {
    const slash = modelKey.indexOf("/");
    const provider = slash < 0 ? "" : modelKey.slice(0, slash);
    const model = slash < 0 ? modelKey : modelKey.slice(slash + 1);
    return {
      provider,
      model,
      input: bucket.input,
      output: bucket.output,
      cache: bucket.cache,
      total: bucket.total,
      cost: bucket.cost,
      calls: bucket.calls
    };
  }).sort((a, b) => b.cost - a.cost);
  return {
    ok: true,
    data: {
      sessionId,
      title: titleOf(events, sessionId),
      total,
      cost,
      calls,
      firstActive,
      lastActive,
      models,
      turns: [...turnTotals.values()]
    }
  };
}

// src/wire.ts
function writeJson(res, status, body, headers) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

// src/index.ts
var name = "dsh-usage-dashboard";
var inject = ["webServer", "credentials", "sessionPersistence"];
var BALANCE_TTL_MS = 6e4;
var USAGE_TTL_MS = 5 * 6e4;
function apply(ctx) {
  const balanceMemo = memoize(BALANCE_TTL_MS, () => fetchBalance(ctx.credentials));
  const usageMemo = memoize(USAGE_TTL_MS, () => fetchUsage(ctx.sessionPersistence));
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/api/dsh-usage-dashboard",
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req)) {
        writeJson(res, 403, { ok: false, error: "forbidden" });
        return;
      }
      if (req.method !== "GET") {
        writeJson(res, 405, { ok: false, error: "method not allowed" });
        return;
      }
      const url = new URL(req.url ?? "/", "http://dsh.internal");
      const pathname = url.pathname;
      const force = url.searchParams.get("refresh") === "1";
      if (pathname === "/api/dsh-usage-dashboard/balance") {
        const payload = await (force ? balanceMemo.refresh() : balanceMemo.get());
        const headers = payload.ok ? { "cache-control": `private, max-age=${Math.round(BALANCE_TTL_MS / 1e3)}` } : { "cache-control": "no-store" };
        writeJson(res, 200, payload, headers);
      } else if (pathname === "/api/dsh-usage-dashboard/usage") {
        const payload = await (force ? usageMemo.refresh() : usageMemo.get());
        const headers = payload.ok ? { "cache-control": `private, max-age=${Math.round(USAGE_TTL_MS / 1e3)}` } : { "cache-control": "no-store" };
        writeJson(res, 200, payload, headers);
      } else if (pathname === "/api/dsh-usage-dashboard/session") {
        const id = url.searchParams.get("id");
        if (id === null || id.trim() === "" || !isValidSessionId(id)) {
          const error = id === null || id.trim() === "" ? "\u7F3A\u5C11\u4F1A\u8BDD id" : "\u4F1A\u8BDD id \u683C\u5F0F\u4E0D\u5408\u6CD5";
          writeJson(res, 400, { ok: false, error }, { "cache-control": "no-store" });
          return;
        }
        const payload = await fetchSessionUsage(ctx.sessionPersistence, id);
        writeJson(res, 200, payload, { "cache-control": "no-store" });
      } else {
        writeJson(res, 404, { ok: false, error: "not found" });
      }
    }
  }), "dsh-usage-dashboard: /api routes");
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
