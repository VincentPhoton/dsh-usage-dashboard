window.__ModuleLoader__.load({ id: "@cassius0924/dsh-usage-dashboard", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/boundary.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var PREFIX = "dsh-usage-dashboard:";
function clearPluginStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
  }
}
var ErrorBoundary = class extends import_react.Component {
  state = { message: null };
  static getDerivedStateFromError(error) {
    return { message: error?.message ?? String(error) };
  }
  componentDidCatch(error, info) {
    console.error("[dsh-usage-dashboard] render failed", error, info.componentStack);
  }
  reset = () => {
    clearPluginStorage();
    location.reload();
  };
  render() {
    const { message } = this.state;
    if (message === null) return this.props.children;
    if (this.props.silent === true) return null;
    const { t } = this.props;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dq-balance", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dq-card-title", children: t("boundary.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dq-empty", children: t("boundary.body") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "dq-crash", children: message }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dq-refresh-btn", onClick: this.reset, children: t("boundary.reset") })
    ] }) });
  }
};

// src/client/cache.ts
var LS_VERSION = 2;
function loadPersisted(storageKey, isUsable) {
  if (typeof localStorage === "undefined") return null;
  const key = `${storageKey}:v${LS_VERSION}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (parsed.data === void 0 || typeof parsed.at !== "number") return null;
    if (isUsable !== void 0 && !isUsable(parsed.data)) {
      localStorage.removeItem(key);
      return null;
    }
    return { data: parsed.data, at: parsed.at };
  } catch {
    return null;
  }
}
function pruneOldVersions(storageKey) {
  if (typeof localStorage === "undefined") return;
  try {
    const current = `${storageKey}:v${LS_VERSION}`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`${storageKey}:v`) && key !== current) localStorage.removeItem(key);
    }
  } catch {
  }
}
function persist(storageKey, hit) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${storageKey}:v${LS_VERSION}`, JSON.stringify(hit));
  } catch {
  }
}
function createCache(ttlMs, storageKey, isUsable) {
  if (storageKey !== void 0) pruneOldVersions(storageKey);
  let hit = storageKey === void 0 ? null : loadPersisted(storageKey, isUsable);
  return {
    get: () => hit,
    getFresh: () => hit !== null && Date.now() - hit.at < ttlMs ? hit.data : null,
    put: (data) => {
      hit = { data, at: Date.now() };
      if (storageKey !== void 0) persist(storageKey, hit);
    }
  };
}

// src/contract.ts
var USAGE_WINDOW_DAYS = [7, 30, 90, 365];

// src/client/api.ts
var BALANCE_TTL_MS = 6e4;
var USAGE_TTL_MS = 5 * 6e4;
async function getJson(path, cache) {
  const res = await fetch(path, { headers: { accept: "application/json" }, cache });
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }
  return res.json();
}
var usageIsUsable = (res) => {
  if (res.ok !== true) return false;
  const data = res.data;
  return data !== void 0 && Array.isArray(data.daily) && Array.isArray(data.hourly) && Array.isArray(data.heatmap) && Array.isArray(data.models) && Array.isArray(data.sessions) && typeof data.sessionCount === "number" && data.coverage?.scope === "local-dsh-session-logs" && typeof data.coverage.scannedSessions === "number" && typeof data.coverage.skippedRecords === "number" && Array.isArray(data.windows) && data.windows.length === USAGE_WINDOW_DAYS.length && USAGE_WINDOW_DAYS.every((days) => data.windows.some((window2) => window2.days === days)) && data.windows.every((window2) => Array.isArray(window2.daily) && Array.isArray(window2.hourly) && Array.isArray(window2.models) && Array.isArray(window2.sessions)) && data.totals !== void 0 && typeof data.totals.cacheSavings === "number" && data.summary?.today !== void 0 && Array.isArray(data.pricing?.tiers) && data.peakSplit?.peak !== void 0;
};
var balanceIsUsable = (res) => res.ok === true && Array.isArray(res.data?.balances);
var balanceCache = createCache(BALANCE_TTL_MS, "dsh-usage-dashboard:balance", balanceIsUsable);
var usageCache = createCache(USAGE_TTL_MS, "dsh-usage-dashboard:usage", usageIsUsable);
var getCachedBalance = () => balanceCache.get()?.data ?? null;
var getCachedUsage = () => usageCache.get()?.data ?? null;
var getCachedUsageAt = () => usageCache.get()?.at ?? null;
var usageListeners = /* @__PURE__ */ new Set();
var subscribeUsage = (fn) => {
  usageListeners.add(fn);
  return () => {
    usageListeners.delete(fn);
  };
};
var balanceInflight = null;
var usageInflight = null;
async function fetchBalance(force = false) {
  if (!force) {
    const hit = balanceCache.getFresh();
    if (hit !== null) return hit;
    if (balanceInflight !== null) return balanceInflight;
  }
  const suffix = force ? "?refresh=1" : "";
  const task = getJson(`/api/dsh-usage-dashboard/balance${suffix}`, force ? "no-store" : "default").then((res) => {
    if (res.ok) balanceCache.put(res);
    return res;
  });
  if (!force) {
    balanceInflight = task.finally(() => {
      balanceInflight = null;
    });
    return balanceInflight;
  }
  return task;
}
async function fetchUsage(force = false) {
  if (!force) {
    const hit = usageCache.getFresh();
    if (hit !== null) return hit;
    if (usageInflight !== null) return usageInflight;
  }
  const suffix = force ? "?refresh=1" : "";
  const task = getJson(`/api/dsh-usage-dashboard/usage${suffix}`, force ? "no-store" : "default").then((res) => {
    if (res.ok) {
      usageCache.put(res);
      for (const listener of [...usageListeners]) listener();
    }
    return res;
  });
  if (!force) {
    usageInflight = task.finally(() => {
      usageInflight = null;
    });
    return usageInflight;
  }
  return task;
}
var sessionUsageInflight = /* @__PURE__ */ new Map();
var sessionUsageCache = /* @__PURE__ */ new Map();
var sessionUsageListeners = /* @__PURE__ */ new Map();
var getCachedSessionUsage = (sessionId) => sessionUsageCache.get(sessionId) ?? null;
var subscribeSessionUsage = (sessionId, fn) => {
  let listeners = sessionUsageListeners.get(sessionId);
  if (listeners === void 0) {
    listeners = /* @__PURE__ */ new Set();
    sessionUsageListeners.set(sessionId, listeners);
  }
  listeners.add(fn);
  return () => {
    listeners?.delete(fn);
    if (listeners?.size === 0) sessionUsageListeners.delete(sessionId);
  };
};
var publishSessionUsage = (sessionId, response) => {
  if (!response.ok) return;
  sessionUsageCache.set(sessionId, response);
  for (const listener of [...sessionUsageListeners.get(sessionId) ?? []]) listener();
};
async function fetchSessionUsage(sessionId, force = false) {
  if (typeof sessionId !== "string" || sessionId === "") {
    return { ok: false, error: "\u7F3A\u5C11\u4F1A\u8BDD id" };
  }
  if (!force) {
    const inflight = sessionUsageInflight.get(sessionId);
    if (inflight !== void 0) return inflight;
  }
  const task = getJson(`/api/dsh-usage-dashboard/session?id=${encodeURIComponent(sessionId)}`, "no-store").then((response) => {
    publishSessionUsage(sessionId, response);
    return response;
  });
  if (force) return task;
  const tracked = task.finally(() => {
    if (sessionUsageInflight.get(sessionId) === tracked) sessionUsageInflight.delete(sessionId);
  });
  sessionUsageInflight.set(sessionId, tracked);
  return tracked;
}

// src/client/dashboard.tsx
var import_react4 = require("react");

// src/client/budget.ts
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1e3;
function budgetSnapshot(spentValue, budgetValue, nowMs = Date.now()) {
  const spent = Number.isFinite(spentValue) ? Math.max(0, spentValue) : 0;
  const budget = Number.isFinite(budgetValue) ? Math.max(0, budgetValue) : 0;
  const beijingNow = new Date(nowMs + BEIJING_OFFSET_MS);
  const year = beijingNow.getUTCFullYear();
  const month = beijingNow.getUTCMonth();
  const start = Date.UTC(year, month, 1) - BEIJING_OFFSET_MS;
  const end = Date.UTC(year, month + 1, 1) - BEIJING_OFFSET_MS;
  const elapsedRatio = Math.min(1, Math.max(1 / (end - start), (nowMs - start) / (end - start)));
  const forecast = spent / elapsedRatio;
  const ratio = budget > 0 ? spent / budget : 0;
  const remaining = budget - spent;
  const forecastOver = budget > 0 ? Math.max(0, forecast - budget) : 0;
  const status = ratio >= 1 ? "over" : ratio >= 0.8 || forecastOver > 0 ? "risk" : "healthy";
  return { spent, budget, ratio, remaining, forecast, forecastOver, status };
}

// src/client/charts.tsx
var import_react3 = require("react");

// src/client/chart-focus.ts
function nextChartFocus(current, count, key, horizontalStep = 1) {
  if (count <= 0) return 0;
  const index = Math.min(Math.max(0, current), count - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = key === "ArrowLeft" || key === "ArrowRight" ? Math.max(1, horizontalStep) : 1;
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  return Math.min(Math.max(0, index + direction * step), count - 1);
}
function lastPopulatedIndex(values) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] > 0) return index;
  }
  return Math.max(0, values.length - 1);
}
function nextPinnedIndex(current, tapped) {
  return current === tapped ? null : tapped;
}
function isTapGesture(dx, dy, dt, moveThreshold = 10, timeThreshold = 500) {
  return Math.hypot(dx, dy) <= moveThreshold && dt <= timeThreshold;
}
function stackedTotals(series, count) {
  return Array.from({ length: count }, (_, i) => series.reduce((sum, s) => sum + (s.bars[i]?.value ?? 0), 0));
}
function maxOrOne(values) {
  let max = 0;
  for (const v of values) if (v > max) max = v;
  return max > 0 ? max : 1;
}

// src/client/i18n.tsx
var import_react2 = require("react");

// src/client/locales.ts
var NS = "dsh-usage-dashboard";
var zh = {
  "meta.locale": "zh",
  "nav.quota": "\u989D\u5EA6",
  "widget.title": "DeepSeek \u989D\u5EA6",
  "common.unknownModel": "\u672A\u77E5\u6A21\u578B",
  "common.calls": "{count} \u6B21\u8C03\u7528",
  "common.callsShort": "{count} \u6B21",
  "common.sessions": "{count} \u4E2A\u4F1A\u8BDD",
  "common.records": "{count} \u6761",
  "common.rows": "{count} \u884C",
  "common.input": "\u8F93\u5165",
  "common.output": "\u8F93\u51FA",
  "common.cacheHit": "\u7F13\u5B58\u547D\u4E2D",
  "common.status": "\u72B6\u6001",
  "common.available": "\u53EF\u7528",
  "common.unavailable": "\u4E0D\u53EF\u7528",
  "common.justNow": "\u521A\u521A",
  "common.minutesAgo": "{count} \u5206\u949F\u524D",
  "common.hoursAgo": "{count} \u5C0F\u65F6\u524D",
  "common.daysAgo": "{count} \u5929\u524D",
  "common.listSeparator": "\u3001",
  "common.period": "\u3002",
  "delta.noBaselineTitle": "{label}\u6CA1\u6709\u7528\u91CF\uFF0C\u65E0\u4ECE\u5BF9\u6BD4",
  "delta.noBaseline": "\u65E0\u5BF9\u6BD4",
  "delta.flat": "\u6301\u5E73",
  "period.volume": "{tokens} tokens \xB7 {calls}",
  "budget.unset": "\u8FD8\u6CA1\u8BBE\u7F6E\u6708\u5EA6\u9884\u7B97\uFF0C\u65E0\u6CD5\u63D0\u524D\u5224\u65AD\u662F\u5426\u4F1A\u8D85\u652F\u3002",
  "budget.configure": "\u8BBE\u7F6E\u9884\u7B97",
  "budget.over": "\u5DF2\u8D85\u9884\u7B97 \xA5{amount}",
  "budget.forecastOver": "\u7167\u5F53\u524D\u901F\u5EA6\uFF0C\u9884\u8BA1\u8D85\u51FA \xA5{amount}",
  "budget.forecast": "\u7167\u5F53\u524D\u901F\u5EA6\uFF0C\u9884\u8BA1\u6708\u5E95 \xA5{amount}",
  "budget.title": "\u672C\u6708\u9884\u7B97",
  "budget.progressLabel": "\u672C\u6708\u9884\u7B97\u4F7F\u7528\u8FDB\u5EA6",
  "budget.used": "\u5DF2\u4F7F\u7528 {percent}%\uFF0C{forecast}",
  "budget.remaining": "\u5269\u4F59 \xA5{amount}",
  "budget.exceeded": "\u8D85\u51FA \xA5{amount}",
  "pricing.title": "\u8BA1\u4EF7\u8BF4\u660E",
  "pricing.currentPeak": "\u5F53\u524D \u9AD8\u5CF0\u65F6\u6BB5",
  "pricing.currentOffPeak": "\u5F53\u524D \u95F2\u65F6",
  "pricing.model": "\u6A21\u578B",
  "pricing.period": "\u65F6\u6BB5",
  "pricing.unitPrice": "\u5355\u4EF7",
  "pricing.inputCacheHit": "\u8F93\u5165\xB7\u7F13\u5B58\u547D\u4E2D",
  "pricing.inputCacheMiss": "\u8F93\u5165\xB7\u672A\u547D\u4E2D",
  "pricing.output": "\u8F93\u51FA",
  "pricing.peak": "\u9AD8\u5CF0",
  "pricing.fixed": "\u56FA\u5B9A",
  "pricing.offPeak": "\u95F2\u65F6",
  "pricing.unit": "\u5355\u4F4D\uFF1A{currency} / \u767E\u4E07 tokens\u3002",
  "pricing.splitNote": "\u9AD8\u5CF0\u65F6\u6BB5\u4E3A\u5317\u4EAC\u65F6\u95F4\u5DE5\u4F5C\u65E5 {windows}\uFF1B\u5468\u672B\u3001\u6CD5\u5B9A\u8282\u5047\u65E5\u53CA\u5DE5\u4F5C\u65E5\u7684\u5176\u4F59\u65F6\u95F4\u90FD\u662F\u95F2\u65F6\uFF08input/output \u534A\u4EF7\uFF0C\u7F13\u5B58\u547D\u4E2D\u4EF7\u4E0D\u53D8\uFF09\u3002{date} \u4E4B\u524D\u7684\u7528\u91CF\u4ECD\u6309\u65E7\u4EF7\u4F30\u7B97\u3002",
  "pricing.switchNote": "{date} 00:00 \u8D77\u6539\u4E3A\u5CF0\u8C37\u5B9A\u4EF7\uFF08\u9AD8\u5CF0\uFF1A\u5317\u4EAC\u65F6\u95F4\u5DE5\u4F5C\u65E5 {windows}\uFF1B\u5176\u4F59\u65F6\u95F4\u2014\u2014\u542B\u6574\u4E2A\u5468\u672B\u548C\u6CD5\u5B9A\u8282\u5047\u65E5\u2014\u2014\u4E3A\u95F2\u65F6\uFF0Cinput/output \u51CF\u534A\u3001\u7F13\u5B58\u547D\u4E2D\u4EF7\u4E0D\u53D8\uFF09\uFF0C\u5C4A\u65F6\u672C\u9875\u4F1A\u6309\u6BCF\u6761\u8BB0\u5F55\u7684\u65F6\u95F4\u81EA\u52A8\u5206\u6BB5\u8BA1\u4EF7\u3002",
  "pricing.unknown": "\u672A\u77E5\u6A21\u578B\u6309 deepseek-v4-pro \u8BA1\u4EF7\u3002",
  "coverage.noRange": "\u6682\u65E0\u6709\u6548\u7528\u91CF\u65F6\u95F4",
  "coverage.title": "\u7EDF\u8BA1\u8303\u56F4",
  "coverage.gaps": "\u5B58\u5728\u7F3A\u53E3",
  "coverage.complete": "\u672C\u673A\u8BFB\u53D6\u5B8C\u6574",
  "coverage.brief": "\u626B\u63CF {scanned} / {listed} \u4E2A\u4F1A\u8BDD \xB7 {records} \u6761\u7528\u91CF\u8BB0\u5F55",
  "coverage.scanned": "\u6210\u529F\u626B\u63CF",
  "coverage.failed": "\u8BFB\u53D6\u5931\u8D25",
  "coverage.skipped": "\u8DF3\u8FC7\u8BB0\u5F55",
  "coverage.time": "\u8BB0\u5F55\u65F6\u95F4\uFF1A{range}",
  "coverage.scope": "\u8FD9\u91CC\u53EA\u7EDF\u8BA1\u5F53\u524D\u8BBE\u5907\u4E0A\u7684 DSH \u4F1A\u8BDD\u65E5\u5FD7\uFF0C\u4E0D\u5305\u542B\u5176\u4ED6\u8BBE\u5907\u3001DeepSeek \u5E73\u53F0\u76F4\u63A5\u8C03\u7528\u6216\u5DF2\u5220\u9664\u7684\u672C\u5730\u65E5\u5FD7\u3002",
  "coverage.warning": "\u672C\u6B21\u56DE\u653E\u6709\u65E5\u5FD7\u65E0\u6CD5\u8BFB\u53D6\u6216\u7528\u91CF\u8BB0\u5F55\u683C\u5F0F\u5F02\u5E38\uFF0C\u9875\u9762\u6C47\u603B\u53EF\u80FD\u4F4E\u4E8E\u5B9E\u9645\u6D88\u8017\uFF1B\u53EF\u5237\u65B0\u91CD\u8BD5\uFF0C\u5E76\u4EE5 DeepSeek \u5B98\u65B9\u5E73\u53F0\u8D26\u5355\u4E3A\u51C6\u3002",
  "export.title": "\u5BFC\u51FA\u5168\u90E8\u672C\u673A DSH \u4F1A\u8BDD\u65E5\u5FD7\u6570\u636E\uFF08\u4E0D\u53D7\u7EDF\u8BA1\u5468\u671F\u5F71\u54CD\uFF09",
  "export.done": "\u5DF2\u5BFC\u51FA",
  "export.action": "\u5BFC\u51FA",
  "export.menuLabel": "\u9009\u62E9\u5BFC\u51FA\u683C\u5F0F",
  "export.dailyCsv": "\u9010\u5929 CSV",
  "export.modelCsv": "\u9010\u6A21\u578B CSV",
  "export.fullJson": "\u5B8C\u6574 JSON",
  "export.jsonHint": "\u542B\u56FE\u8868\u4E0E\u6392\u884C",
  "cache.empty": "\u8FD8\u6CA1\u6709 prompt token \u53EF\u7EDF\u8BA1\u7F13\u5B58\u547D\u4E2D\u3002",
  "cache.rate": "\u7F13\u5B58\u547D\u4E2D\u7387",
  "cache.saved": "\u5DF2\u8282\u7701\u8D39\u7528\uFF08\u4F30\u7B97\uFF09",
  "cache.allMiss": "\u82E5\u5168\u90E8\u672A\u547D\u4E2D",
  "cache.aria": "\u7F13\u5B58\u547D\u4E2D {hit}%\uFF0C\u672A\u547D\u4E2D {miss}%",
  "cache.hitLegend": "\u7F13\u5B58\u547D\u4E2D {tokens}",
  "cache.missLegend": "\u672A\u547D\u4E2D {tokens}\uFF08\u6309\u672A\u547D\u4E2D\u4EF7\u8BA1\u8D39\uFF09",
  "cache.lowHint": "\u547D\u4E2D\u7387\u504F\u4F4E\uFF1A\u9891\u7E41\u6539\u52A8 system prompt / \u5DE5\u5177\u5B9A\u4E49\u4F1A\u8BA9\u524D\u7F00\u7F13\u5B58\u5931\u6548\uFF0C\u628A\u7A33\u5B9A\u5185\u5BB9\u653E\u5728\u5BF9\u8BDD\u6700\u524D\u9762\u80FD\u63D0\u9AD8\u547D\u4E2D\u7387\u3002",
  "cache.goodHint": "\u524D\u7F00\u7F13\u5B58\u628A\u91CD\u590D\u7684 prompt \u524D\u7F00\u6309\u547D\u4E2D\u4EF7\u8BA1\u8D39\uFF0C\u662F\u8FD9\u4EFD\u8D26\u5355\u4E0A\u6700\u5927\u7684\u7701\u94B1\u6760\u6746\u3002",
  "peak.empty": "\u8FD8\u6CA1\u6709\u53EF\u6309\u65F6\u6BB5\u5F52\u7C7B\u7684\u7528\u91CF\u3002",
  "peak.aria": "\u9AD8\u5CF0\u65F6\u6BB5 {peak}%\uFF0C\u95F2\u65F6 {offPeak}%",
  "peak.peakLegend": "\u9AD8\u5CF0 {share}% \xB7 {tokens} tokens \xB7 {calls}",
  "peak.offPeakLegend": "\u95F2\u65F6 {share}% \xB7 {tokens} tokens \xB7 {calls}",
  "peak.newPrice": "\u540C\u6837\u7528\u91CF\u5728\u65B0\u4EF7\u4E0B",
  "peak.increase": "\u8F83\u73B0\u4EF7 +{percent}%",
  "peak.shift": "\u82E5\u9AD8\u5CF0\u7528\u91CF\u90FD\u632A\u5230\u95F2\u65F6",
  "peak.saving": "\u53EF\u7701 \xA5{amount}",
  "peak.schedule": "\u9AD8\u5CF0\u65F6\u6BB5\u4E3A\u5317\u4EAC\u65F6\u95F4\u5DE5\u4F5C\u65E5 {windows}\uFF1B\u5468\u672B\u548C\u6CD5\u5B9A\u8282\u5047\u65E5\u5168\u5929\u90FD\u662F\u95F2\u65F6\uFF08input/output \u534A\u4EF7\uFF0C\u7F13\u5B58\u547D\u4E2D\u4EF7\u4E0D\u53D8\uFF09\u3002",
  "peak.activeHint": "\u628A\u6279\u91CF\u3001\u53EF\u5EF6\u540E\u7684\u4EFB\u52A1\u653E\u5230\u95F2\u65F6\u8DD1\uFF0C\u540C\u6837\u7684 token \u53EA\u8981\u4E00\u534A\u7684\u94B1\u3002",
  "peak.futureHint": "\u65B0\u4EF7 {date} 00:00 \u751F\u6548\uFF1B\u4E0A\u9762\u4E24\u4E2A\u6570\u5B57\u662F\u6309\u4F60\u5DF2\u6709\u7684\u5168\u90E8\u7528\u91CF\u91CD\u7B97\u7684\u3002",
  "sessions.empty": "\u8FD8\u6CA1\u6709\u4EA7\u751F\u8D39\u7528\u7684\u4F1A\u8BDD\u3002",
  "sessions.detail": "{tokens} tokens \xB7 {calls} \xB7 {ago}",
  "sessions.share": "\u5360 {percent}%",
  "sessions.more": "\u5171 {count} \u4E2A\u4F1A\u8BDD\u6709\u7528\u91CF\uFF0C\u4E0A\u9762\u662F\u6700\u8D35\u7684 {shown} \u4E2A\u3002",
  "sessions.fallbackTitle": "\u4F1A\u8BDD {id}",
  "models.empty": "\u8FD8\u6CA1\u6709\u53EF\u5F52\u7C7B\u7684\u6A21\u578B\u7528\u91CF\u3002",
  "models.shareAria": "{name} \u5360\u603B\u8D39\u7528 {percent}%",
  "models.detail": "{tokens} tokens \xB7 {calls} \xB7 \u8F93\u5165 {input} / \u8F93\u51FA {output} / \u7F13\u5B58 {cache}",
  "models.all": "\u5168\u90E8\u6A21\u578B",
  "models.selected": "\u6A21\u578B \xD7{count}",
  "models.filterTitle": "\u7B5B\u9009\u56FE\u8868\u4E2D\u663E\u793A\u7684\u6A21\u578B",
  "models.filterLabel": "\u7B5B\u9009\u56FE\u8868\u6A21\u578B",
  "window.year": "\u8FD1 1 \u5E74",
  "window.days": "\u8FD1 {days} \u5929",
  "window.groupLabel": "\u7EDF\u8BA1\u5468\u671F",
  "window.viewTitle": "\u67E5\u770B{window}\u7684\u7528\u91CF\u4E0E\u6392\u884C",
  "window.yearButton": "1 \u5E74",
  "window.daysButton": "{days} \u5929",
  "metric.tokens": "tokens",
  "metric.usage": "\u7528\u91CF",
  "metric.cost": "\u8D39\u7528",
  "metric.calls": "\u8C03\u7528",
  "metric.groupLabel": "\u56FE\u8868\u6307\u6807",
  "metric.compareTitle": "\u6309{metric}\u6BD4\u8F83",
  "chart.dailyTitle": "{window} \xB7 \u9010\u5929{metric}",
  "chart.hourlyTitle": "{window} \xB7 {metric}\u6309\u5C0F\u65F6\u5206\u5E03\uFF080\u201323 \u70B9\uFF09",
  "chart.peak": "\u5CF0\u503C {value}",
  "chart.dimensionLabel": "\u5207\u6362\u56FE\u8868\u7EF4\u5EA6",
  "chart.daily": "\u9010\u5929",
  "chart.hourly": "\u9010\u5C0F\u65F6",
  "chart.noWindowData": "{window}\u6CA1\u6709\u7528\u91CF\u8BB0\u5F55\uFF0C\u6362\u4E2A\u66F4\u957F\u5468\u671F\u770B\u770B\u3002",
  "chart.heatmapTitle": "\u8FD1\u4E00\u5E74 \xB7 \u6BCF\u65E5\u7528\u91CF\u70ED\u529B\u56FE",
  "chart.empty": "\u8FD8\u6CA1\u6709\u7528\u91CF\u8BB0\u5F55\u3002\u5728 DSH \u91CC\u8DD1\u4E00\u8F6E\u5BF9\u8BDD\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u9010\u5929 / \u9010\u5C0F\u65F6\u7EDF\u8BA1\u4E0E\u8D39\u7528\u4F30\u7B97\u3002",
  "chart.hourPoint": "{hour} \u70B9",
  "chart.tooltip": "{head} \xB7 {tokens} tokens \xB7 \xA5{cost} \xB7 {calls}",
  "chart.less": "\u5C11",
  "chart.more": "\u591A",
  "chart.month1": "1\u6708",
  "chart.month2": "2\u6708",
  "chart.month3": "3\u6708",
  "chart.month4": "4\u6708",
  "chart.month5": "5\u6708",
  "chart.month6": "6\u6708",
  "chart.month7": "7\u6708",
  "chart.month8": "8\u6708",
  "chart.month9": "9\u6708",
  "chart.month10": "10\u6708",
  "chart.month11": "11\u6708",
  "chart.month12": "12\u6708",
  "number.tenThousand": "{value}\u4E07",
  "number.hundredMillion": "{value}\u4EBF",
  "fresh.none": "\u5C1A\u65E0\u6210\u529F\u8BB0\u5F55",
  "fresh.justNow": "\u521A\u521A\u66F4\u65B0",
  "fresh.minutes": "\u66F4\u65B0\u4E8E {count} \u5206\u949F\u524D",
  "fresh.hours": "\u66F4\u65B0\u4E8E {count} \u5C0F\u65F6\u524D",
  "fresh.days": "\u66F4\u65B0\u4E8E {count} \u5929\u524D",
  "sync.first": "\u9996\u6B21\u540C\u6B65\u4E2D",
  "sync.syncing": "\u540C\u6B65\u4E2D \xB7 \u5F53\u524D\u6570\u636E{age}",
  "sync.fresh": "\u5DF2\u540C\u6B65 \xB7 {age}",
  "sync.cached": "\u7F13\u5B58\u6570\u636E \xB7 {age}",
  "sync.fallback": "\u7F13\u5B58\u56DE\u9000 \xB7 {age}",
  "sync.error": "\u540C\u6B65\u5931\u8D25 \xB7 \u6682\u65E0\u53EF\u663E\u793A\u7684\u7528\u91CF",
  "status.neverSynced": "\u8FD8\u6CA1\u6709\u6210\u529F\u540C\u6B65\u8FC7\u7528\u91CF\u6570\u636E",
  "status.usageTime": "\u7528\u91CF\u6570\u636E\u65F6\u95F4\uFF1A{time}",
  "status.forceRefresh": "\u5F3A\u5236\u5237\u65B0\uFF08\u7ED5\u8FC7\u7F13\u5B58\uFF09",
  "status.refreshing": "\u5237\u65B0\u4E2D",
  "status.refresh": "\u5237\u65B0",
  "error.balanceLoad": "\u4F59\u989D\u52A0\u8F7D\u5931\u8D25",
  "error.usageLoad": "\u7528\u91CF\u52A0\u8F7D\u5931\u8D25",
  "error.refreshCached": "\u5237\u65B0\u5931\u8D25\uFF0C\u6B63\u5728\u5C55\u793A\u7F13\u5B58\u6570\u636E\uFF08{error}\uFF09",
  "error.balanceRefreshCached": "\u4F59\u989D\u5237\u65B0\u5931\u8D25\uFF0C\u6B63\u5728\u5C55\u793A\u7F13\u5B58\u4F59\u989D\uFF08{error}\uFF09",
  "error.usageRefreshCached": "\u7528\u91CF\u5237\u65B0\u5931\u8D25\uFF0C\u6B63\u5728\u5C55\u793A\u7F13\u5B58\u7528\u91CF\uFF08{error}\uFF09",
  "error.query": "\u67E5\u8BE2\u5931\u8D25",
  "error.credentialsUnavailable": "\u51ED\u8BC1\u670D\u52A1\u4E0D\u53EF\u7528",
  "error.credentialRead": "\u8BFB\u53D6 API Key \u5931\u8D25\uFF1A{detail}",
  "error.noApiKey": "\u672A\u914D\u7F6E DEEPSEEK_API_KEY\uFF08\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u6A21\u578B\u300D\u4E2D\u586B\u5199\uFF09",
  "error.balanceRequest": "\u8BF7\u6C42\u4F59\u989D\u63A5\u53E3\u5931\u8D25\uFF1A{detail}",
  "error.balanceHttp": "\u4F59\u989D\u63A5\u53E3\u8FD4\u56DE\u9519\u8BEF\uFF08HTTP {status}\uFF09",
  "error.balanceParse": "\u89E3\u6790\u4F59\u989D\u54CD\u5E94\u5931\u8D25",
  "error.persistenceUnavailable": "\u4F1A\u8BDD\u6301\u4E45\u5316\u670D\u52A1\u4E0D\u53EF\u7528",
  "error.sessionList": "\u8BFB\u53D6\u4F1A\u8BDD\u5217\u8868\u5931\u8D25\uFF1A{detail}",
  "error.sessionLogRead": "\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7\u5931\u8D25\uFF1A{detail}",
  "error.missingSessionId": "\u7F3A\u5C11\u4F1A\u8BDD id",
  "alert.lowTitle": "\u4F59\u989D {balance} {currency} \u5DF2\u4F4E\u4E8E\u9884\u8B66\u7EBF {threshold}",
  "alert.runway": "\uFF0C\u6309\u8FD1\u671F\u7528\u91CF\u4F30\u8BA1\u8FD8\u80FD\u6491 {days}",
  "alert.topUp": "\u53BB\u5145\u503C",
  "balance.title": "\u8D26\u6237\u4F59\u989D",
  "balance.remaining": "\u5269\u4F59\u4F59\u989D",
  "balance.breakdownTitle": "\u67E5\u770B\u5145\u503C\u4E0E\u8D60\u9001\u989D\u5EA6\u660E\u7EC6",
  "balance.toppedUp": "\u5145\u503C\u989D\u5EA6 {amount}",
  "balance.granted": "\u8D60\u9001\u989D\u5EA6 {amount}",
  "balance.runway": "\u9884\u8BA1\u53EF\u7528",
  "balance.runwayBreakdownTitle": "\u67E5\u770B\u9884\u8BA1\u53EF\u7528\u5929\u6570\u8BF4\u660E",
  "balance.days": "{count} \u5929",
  "balance.overYear": "> 365 \u5929",
  "balance.noRunway": "\u8FD1 {days} \u5929\u6CA1\u6709\u7528\u91CF\uFF0C\u65E0\u6CD5\u4F30\u7B97",
  "balance.runwayTitle": "\u6309\u8FD1 {days} \u5929\u65E5\u5747 \xA5{cost} \u4F30\u7B97\uFF08\u542B\u65E0\u7528\u91CF\u7684\u65E5\u5B50\uFF1B\u4ECA\u5929\u5C1A\u672A\u8FC7\u5B8C\uFF09",
  "balance.todayConsumed": "\u4ECA\u65E5\u6D88\u8017\uFF08\u5E73\u53F0\u6838\u7B97\uFF09",
  "balance.todayConsumedTitle": "\u6309\u4F59\u989D\u5DEE\u503C\u6838\u7B97\uFF1A\u4ECA\u6668\u4F59\u989D \u2212 \u5F53\u524D\u4F59\u989D + \u4ECA\u65E5\u5145\u503C\uFF0C\u4E0E\u5F00\u653E\u5E73\u53F0\u6D88\u8D39\u91D1\u989D\u4E00\u81F4",
  "balance.todayConsumedEmpty": "\u5F53\u65E5\u57FA\u51C6\u5C1A\u672A\u5EFA\u7ACB\uFF0C\u4E0B\u4E00\u6B21\u5237\u65B0\u540E\u5F00\u59CB\u6838\u7B97",
  "balance.empty": "\u8BFB\u4E0D\u5230\u4F59\u989D\u3002\u8BF7\u786E\u8BA4\u300C\u8BBE\u7F6E \u2192 \u6A21\u578B\u300D\u91CC\u5DF2\u586B DEEPSEEK_API_KEY\uFF0C\u7136\u540E\u70B9\u53F3\u4E0A\u89D2\u5237\u65B0\u3002",
  "sessionUsage.title": "\u5F53\u524D\u4F1A\u8BDD\u6D88\u8017\uFF08\u8D39\u7528\u4E3A\u4F30\u7B97\uFF09",
  "sessionUsage.cost": "\u672C\u4F1A\u8BDD\u8D39\u7528",
  "sessionUsage.tokens": "\u672C\u4F1A\u8BDD tokens",
  "sessionUsage.calls": "\u672C\u4F1A\u8BDD\u8C03\u7528",
  "sessionUsage.range": "\u6D3B\u8DC3\u65F6\u95F4 {range}",
  "sessionUsage.empty": "\u8FD9\u4E2A\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u4EA7\u751F\u7528\u91CF\u3002\u53D1\u4E00\u6761\u6D88\u606F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u8FD9\u4E2A\u4F1A\u8BDD\u4E13\u5C5E\u7684\u8D39\u7528\u4E0E\u6A21\u578B\u660E\u7EC6\u3002",
  "overview.title": "\u6D88\u8017\u6982\u89C8\uFF08\u8D39\u7528\u4E3A\u4F30\u7B97\uFF09",
  "overview.today": "\u4ECA\u65E5",
  "overview.month": "\u672C\u6708",
  "overview.total": "\u7D2F\u8BA1",
  "overview.vsYesterday": "\u8F83\u6628\u65E5",
  "overview.vsLastMonth": "\u8F83\u4E0A\u6708\u540C\u671F",
  "overview.empty": "\u8FD8\u6CA1\u6709\u53EF\u7EDF\u8BA1\u7684\u6D88\u8017\u3002",
  "usage.trendTitle": "\u7528\u91CF\u8D8B\u52BF\uFF08tokens\uFF09",
  "usage.windowInput": "{window}\u8F93\u5165",
  "usage.modelCalls": "\u6A21\u578B\u8C03\u7528",
  "heatmap.title": "\u7528\u91CF\u70ED\u529B\u56FE",
  "peak.title": "\u9AD8\u5CF0 / \u95F2\u65F6\u5206\u5E03",
  "cache.title": "\u7F13\u5B58\u547D\u4E2D\u4E0E\u8282\u7701",
  "models.title": "\u6A21\u578B\u6210\u672C\u6392\u884C \xB7 {window}",
  "sessions.title": "\u4F1A\u8BDD\u6210\u672C\u6392\u884C \xB7 {window}",
  "links.title": "\u5FEB\u6377\u5165\u53E3",
  "links.usage": "\u67E5\u770B\u989D\u5EA6 / \u7528\u91CF",
  "links.apiKey": "\u751F\u6210 API Key",
  "links.status": "\u670D\u52A1\u72B6\u6001",
  "settings.title": "\u8BBE\u7F6E",
  "settings.widget": "\u5728\u5176\u4ED6\u9875\u9762\u663E\u793A\u53F3\u4E0B\u89D2\u60AC\u6D6E\u989D\u5EA6\u7A97\u53E3",
  "settings.widgetHint": "\u989D\u5EA6\u9875\u4F1A\u81EA\u52A8\u9690\u85CF\u6D6E\u7A97\uFF1B\u5176\u4ED6\u9875\u9762\u662F\u5426\u5C55\u793A\u7531\u4E0B\u65B9\u9009\u62E9\u51B3\u5B9A\u3002",
  "settings.widgetTabs": "\u5C55\u793A\u6D6E\u7A97\u7684\u9875\u9762",
  "settings.widgetTabsHint": "\u9875\u9762\u5217\u8868\u6765\u81EA DSH \u7684\u5B9E\u65F6 Tab \u6CE8\u518C\u8868\uFF1B\u5176\u4ED6\u63D2\u4EF6\u65B0\u589E\u7684 Tab \u4E5F\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002",
  "settings.widgetTabsEmpty": "\u5F53\u524D\u6CA1\u6709\u53EF\u914D\u7F6E\u7684\u4F1A\u8BDD\u9875\u9762\u3002",
  "settings.lowBalance": "\u4F59\u989D\u9884\u8B66\u7EBF",
  "settings.lowBalanceOn": "\u4F59\u989D\u4F4E\u4E8E {amount} {currency} \u65F6\uFF0C\u8FD9\u91CC\u548C\u60AC\u6D6E\u7A97\u90FD\u4F1A\u8F6C\u4E3A\u8B66\u793A\u8272\u3002\u586B 0 \u5173\u95ED\u3002",
  "settings.lowBalanceOff": "\u5DF2\u5173\u95ED\u4F59\u989D\u9884\u8B66\u3002\u586B\u4E00\u4E2A\u5927\u4E8E 0 \u7684\u6570\u5F00\u542F\u3002",
  "settings.monthlyBudget": "\u6708\u5EA6\u9884\u7B97",
  "settings.monthlyBudgetOn": "\u6309\u5317\u4EAC\u65F6\u95F4\u81EA\u7136\u6708\u8DDF\u8E2A {amount} CNY \u9884\u7B97\uFF0C\u5E76\u5728\u6D88\u8017\u6982\u89C8\u9884\u6D4B\u6708\u5E95\u82B1\u8D39\u3002\u586B 0 \u5173\u95ED\u3002",
  "settings.monthlyBudgetOff": "\u586B\u4E00\u4E2A\u5927\u4E8E 0 \u7684\u91D1\u989D\uFF0C\u6D88\u8017\u6982\u89C8\u4F1A\u663E\u793A\u8FDB\u5EA6\u4E0E\u6708\u5E95\u9884\u6D4B\u3002",
  "widget.updatedNow": "\u521A\u521A\u66F4\u65B0",
  "widget.stale": "{minutes} \u5206\u949F\u524D\u7684\u6570\u636E\uFF0C\u70B9 \u21BB \u66F4\u65B0",
  "widget.loading": "\u67E5\u8BE2\u4E2D\u2026",
  "widget.lowTitle": "\u4F59\u989D\u4F4E\u4E8E\u9884\u8B66\u7EBF {amount}",
  "widget.todayCostTitle": "\u4ECA\u65E5\u6D88\u8017\uFF08\u4F30\u7B97\uFF09\xB7 {age}",
  "widget.todayCost": "\u4ECA\u65E5\u6D88\u8017",
  "widget.sessionCostTitle": "\u5F53\u524D\u4F1A\u8BDD\u7D2F\u8BA1\u6D88\u8017\uFF08\u4F30\u7B97\uFF09",
  "widget.sessionCost": "\u5F53\u524D\u4F1A\u8BDD",
  "widget.noBalance": "\u6682\u65E0\u4F59\u989D\u6570\u636E",
  "widget.dragCard": "\u62D6\u52A8\u5230\u56DB\u4E2A\u89D2\u843D",
  "widget.dragGrip": "\u62D6\u52A8\u4EE5\u79FB\u52A8",
  "widget.refresh": "\u5237\u65B0\u4F59\u989D\u4E0E\u4ECA\u65E5\u7528\u91CF",
  "widget.expand": "\u5C55\u5F00",
  "widget.collapse": "\u6536\u8D77",
  "widget.expandAria": "\u5C55\u5F00\u989D\u5EA6\u7A97\u53E3",
  "widget.collapseAria": "\u6536\u8D77\u989D\u5EA6\u7A97\u53E3",
  "messageCost.label": "\u672C\u8F6E\u8D39\u7528",
  "messageCost.tooltip": "\u7531 dsh-usage-dashboard \u63D0\u4F9B \xB7 \u672C\u8F6E\u5BF9\u8BDD\u8D39\u7528\u4E3A\u4F30\u7B97\u503C",
  "messageCost.aria": "{amount}\uFF0C\u672C\u8F6E\u5BF9\u8BDD\u4F30\u7B97\u8D39\u7528\uFF0C\u7531 dsh-usage-dashboard \u63D0\u4F9B",
  "boundary.title": "\u989D\u5EA6\u9762\u677F\u51FA\u9519\u4E86",
  "boundary.body": "\u6E32\u67D3\u65F6\u629B\u4E86\u5F02\u5E38\uFF0C\u901A\u5E38\u662F\u6D4F\u89C8\u5668\u91CC\u5B58\u7740\u65E7\u7248\u672C\u7684\u7F13\u5B58\u6570\u636E\u3002\u6E05\u6389\u672C\u63D2\u4EF6\u7684\u672C\u5730\u6570\u636E\u518D\u91CD\u65B0\u52A0\u8F7D\u5C31\u80FD\u6062\u590D\u3002",
  "boundary.reset": "\u6E05\u9664\u672C\u5730\u6570\u636E\u5E76\u91CD\u65B0\u52A0\u8F7D"
};
var en = {
  "meta.locale": "en",
  "nav.quota": "Usage",
  "widget.title": "DeepSeek Usage",
  "common.unknownModel": "Unknown model",
  "common.calls": "{count} calls",
  "common.callsShort": "{count} calls",
  "common.sessions": "{count} sessions",
  "common.records": "{count} records",
  "common.rows": "{count} rows",
  "common.input": "Input",
  "common.output": "Output",
  "common.cacheHit": "Cache hit",
  "common.status": "Status",
  "common.available": "Available",
  "common.unavailable": "Unavailable",
  "common.justNow": "Just now",
  "common.minutesAgo": "{count}m ago",
  "common.hoursAgo": "{count}h ago",
  "common.daysAgo": "{count}d ago",
  "common.listSeparator": ", ",
  "common.period": ".",
  "delta.noBaselineTitle": "No usage in {label}, so there is no baseline",
  "delta.noBaseline": "No baseline",
  "delta.flat": "No change",
  "period.volume": "{tokens} tokens \xB7 {calls}",
  "budget.unset": "Set a monthly budget to see whether current spending is on track.",
  "budget.configure": "Set budget",
  "budget.over": "Over budget by \xA5{amount}",
  "budget.forecastOver": "At this pace, \xA5{amount} over by month-end",
  "budget.forecast": "At this pace, \xA5{amount} by month-end",
  "budget.title": "Monthly budget",
  "budget.progressLabel": "Monthly budget usage",
  "budget.used": "{percent}% used. {forecast}",
  "budget.remaining": "\xA5{amount} remaining",
  "budget.exceeded": "\xA5{amount} over",
  "pricing.title": "Pricing details",
  "pricing.currentPeak": "Peak now",
  "pricing.currentOffPeak": "Off-peak now",
  "pricing.model": "Model",
  "pricing.period": "Period",
  "pricing.unitPrice": "Rate",
  "pricing.inputCacheHit": "Input \xB7 cache hit",
  "pricing.inputCacheMiss": "Input \xB7 cache miss",
  "pricing.output": "Output",
  "pricing.peak": "Peak",
  "pricing.fixed": "Fixed",
  "pricing.offPeak": "Off-peak",
  "pricing.unit": "Unit: {currency} / million tokens. ",
  "pricing.splitNote": "Peak periods are {windows} Beijing time on workdays; weekends, statutory holidays and all other hours are off-peak (input/output at half price; the cache-hit rate is unchanged). Usage before {date} is still estimated at the old rates. ",
  "pricing.switchNote": "Time-of-use pricing starts at 00:00 on {date} (peak: {windows} Beijing time on workdays; off-peak \u2014 including entire weekends and statutory holidays \u2014 halves input/output only, the cache-hit rate stays the same). This page will price each record by its timestamp. ",
  "pricing.unknown": "Unknown models use deepseek-v4-pro rates.",
  "coverage.noRange": "No valid usage timestamps",
  "coverage.title": "Coverage",
  "coverage.gaps": "Gaps found",
  "coverage.complete": "Local logs complete",
  "coverage.brief": "Scanned {scanned} / {listed} sessions \xB7 {records} usage records",
  "coverage.scanned": "Scanned",
  "coverage.failed": "Read failures",
  "coverage.skipped": "Skipped records",
  "coverage.time": "Record range: {range}",
  "coverage.scope": "Only DSH session logs on this device are included. Other devices, direct DeepSeek Platform calls, and deleted local logs are excluded.",
  "coverage.warning": "Some logs could not be read or contained invalid usage records, so totals may be lower than actual spend. Refresh to retry and use the DeepSeek Platform bill as the source of truth.",
  "export.title": "Export all local DSH session-log data (independent of the selected range)",
  "export.done": "Exported",
  "export.action": "Export",
  "export.menuLabel": "Choose export format",
  "export.dailyCsv": "Daily CSV",
  "export.modelCsv": "Model CSV",
  "export.fullJson": "Full JSON",
  "export.jsonHint": "Charts and rankings included",
  "cache.empty": "No prompt tokens are available for cache analysis yet.",
  "cache.rate": "Cache hit rate",
  "cache.saved": "Estimated savings",
  "cache.allMiss": "Cost with no hits",
  "cache.aria": "{hit}% cache hits, {miss}% misses",
  "cache.hitLegend": "Cache hits {tokens}",
  "cache.missLegend": "Misses {tokens} (charged at miss rate)",
  "cache.lowHint": "Low hit rate: frequent changes to the system prompt or tool definitions invalidate prefix caching. Put stable content first to improve reuse.",
  "cache.goodHint": "Prefix caching charges repeated prompt prefixes at the hit rate, making it the largest saving lever on this bill.",
  "peak.empty": "No usage can be classified by pricing period yet.",
  "peak.aria": "{peak}% peak, {offPeak}% off-peak",
  "peak.peakLegend": "Peak {share}% \xB7 {tokens} tokens \xB7 {calls}",
  "peak.offPeakLegend": "Off-peak {share}% \xB7 {tokens} tokens \xB7 {calls}",
  "peak.newPrice": "Same usage at new rates",
  "peak.increase": "+{percent}% vs current rates",
  "peak.shift": "If all peak usage moved off-peak",
  "peak.saving": "Save \xA5{amount}",
  "peak.schedule": "Peak periods are {windows} Beijing time on workdays; weekends and statutory holidays are entirely off-peak (input/output at half price; the cache-hit rate is unchanged). ",
  "peak.activeHint": "Run batch or delay-tolerant work off-peak to pay half as much for the same tokens.",
  "peak.futureHint": "New rates start at 00:00 on {date}; both figures recalculate all existing usage.",
  "sessions.empty": "No sessions have incurred cost yet.",
  "sessions.detail": "{tokens} tokens \xB7 {calls} \xB7 {ago}",
  "sessions.share": "{percent}% of total",
  "sessions.more": "{count} sessions have usage; the {shown} most expensive are shown above.",
  "sessions.fallbackTitle": "Session {id}",
  "models.empty": "No model usage can be classified yet.",
  "models.shareAria": "{name} accounts for {percent}% of total cost",
  "models.detail": "{tokens} tokens \xB7 {calls} \xB7 input {input} / output {output} / cache {cache}",
  "models.all": "All models",
  "models.selected": "{count} models",
  "models.filterTitle": "Filter models shown in the chart",
  "models.filterLabel": "Filter chart models",
  "window.year": "Last year",
  "window.days": "Last {days} days",
  "window.groupLabel": "Date range",
  "window.viewTitle": "View usage and rankings for {window}",
  "window.yearButton": "1 year",
  "window.daysButton": "{days} days",
  "metric.tokens": "tokens",
  "metric.usage": "usage",
  "metric.cost": "cost",
  "metric.calls": "calls",
  "metric.groupLabel": "Chart metric",
  "metric.compareTitle": "Compare by {metric}",
  "chart.dailyTitle": "{window} \xB7 daily {metric}",
  "chart.hourlyTitle": "{window} \xB7 {metric} by hour (00\u201323)",
  "chart.peak": "Peak {value}",
  "chart.dimensionLabel": "Chart interval",
  "chart.daily": "Daily",
  "chart.hourly": "Hourly",
  "chart.noWindowData": "No usage in {window}. Try a longer range.",
  "chart.heatmapTitle": "Last year \xB7 daily usage heatmap",
  "chart.empty": "No usage yet. Run a conversation in DSH to see daily and hourly totals with cost estimates.",
  "chart.hourPoint": "{hour}:00",
  "chart.tooltip": "{head} \xB7 {tokens} tokens \xB7 \xA5{cost} \xB7 {calls}",
  "chart.less": "Less",
  "chart.more": "More",
  "chart.month1": "Jan",
  "chart.month2": "Feb",
  "chart.month3": "Mar",
  "chart.month4": "Apr",
  "chart.month5": "May",
  "chart.month6": "Jun",
  "chart.month7": "Jul",
  "chart.month8": "Aug",
  "chart.month9": "Sep",
  "chart.month10": "Oct",
  "chart.month11": "Nov",
  "chart.month12": "Dec",
  "number.tenThousand": "{value}0K",
  "number.hundredMillion": "{value}00M",
  "fresh.none": "No successful sync yet",
  "fresh.justNow": "Updated just now",
  "fresh.minutes": "Updated {count}m ago",
  "fresh.hours": "Updated {count}h ago",
  "fresh.days": "Updated {count}d ago",
  "sync.first": "Syncing for the first time",
  "sync.syncing": "Syncing \xB7 current data {age}",
  "sync.fresh": "Synced \xB7 {age}",
  "sync.cached": "Cached data \xB7 {age}",
  "sync.fallback": "Using cache \xB7 {age}",
  "sync.error": "Sync failed \xB7 no usage to display",
  "status.neverSynced": "Usage has not synced successfully yet",
  "status.usageTime": "Usage data timestamp: {time}",
  "status.forceRefresh": "Force refresh (bypass cache)",
  "status.refreshing": "Refreshing",
  "status.refresh": "Refresh",
  "error.balanceLoad": "Balance failed to load",
  "error.usageLoad": "Usage failed to load",
  "error.refreshCached": "Refresh failed; showing cached data ({error})",
  "error.balanceRefreshCached": "Balance refresh failed; showing cached balance ({error})",
  "error.usageRefreshCached": "Usage refresh failed; showing cached usage ({error})",
  "error.query": "Request failed",
  "error.credentialsUnavailable": "Credential service is unavailable",
  "error.credentialRead": "Could not read the API key: {detail}",
  "error.noApiKey": "DEEPSEEK_API_KEY is not configured (add it under Settings \u2192 Models)",
  "error.balanceRequest": "Balance request failed: {detail}",
  "error.balanceHttp": "Balance endpoint returned HTTP {status}",
  "error.balanceParse": "Could not parse the balance response",
  "error.persistenceUnavailable": "Session persistence is unavailable",
  "error.sessionList": "Could not read the session list: {detail}",
  "error.sessionLogRead": "Could not read the session log: {detail}",
  "error.missingSessionId": "Missing session id",
  "alert.lowTitle": "Balance {balance} {currency} is below the {threshold} warning threshold",
  "alert.runway": "; about {days} left at recent usage",
  "alert.topUp": "Top up",
  "balance.title": "Account balance",
  "balance.remaining": "Remaining balance",
  "balance.breakdownTitle": "View topped-up and granted balance details",
  "balance.toppedUp": "Topped up {amount}",
  "balance.granted": "Granted {amount}",
  "balance.runway": "Estimated runway",
  "balance.runwayBreakdownTitle": "View estimated runway details",
  "balance.days": "{count} days",
  "balance.overYear": "> 365 days",
  "balance.noRunway": "No usage in the last {days} days, so runway cannot be estimated",
  "balance.runwayTitle": "Based on \xA5{cost} average daily spend over the last {days} days (including idle days; today is incomplete)",
  "balance.todayConsumed": "Spent today (platform)",
  "balance.todayConsumedTitle": "Derived from balance deltas: day-start balance \u2212 current balance + today's top-ups, matching the Open Platform",
  "balance.todayConsumedEmpty": "No day-start baseline yet; tracking begins after the next refresh",
  "balance.empty": "Balance is unavailable. Add DEEPSEEK_API_KEY under Settings \u2192 Models, then refresh.",
  "sessionUsage.title": "Current session spend (estimated)",
  "sessionUsage.cost": "This session",
  "sessionUsage.tokens": "Session tokens",
  "sessionUsage.calls": "Session calls",
  "sessionUsage.range": "Active {range}",
  "sessionUsage.empty": "No usage in this session yet. Send a message and this session\u2019s own cost and model breakdown will show up here.",
  "overview.title": "Spend overview (estimated)",
  "overview.today": "Today",
  "overview.month": "This month",
  "overview.total": "All time",
  "overview.vsYesterday": "vs yesterday",
  "overview.vsLastMonth": "vs same period last month",
  "overview.empty": "No spend to summarize yet.",
  "usage.trendTitle": "Usage trend (tokens)",
  "usage.windowInput": "{window} input",
  "usage.modelCalls": "Model calls",
  "heatmap.title": "Usage heatmap",
  "peak.title": "Peak / off-peak distribution",
  "cache.title": "Cache hits and savings",
  "models.title": "Model cost ranking \xB7 {window}",
  "sessions.title": "Session cost ranking \xB7 {window}",
  "links.title": "Quick Links",
  "links.usage": "View balance / usage",
  "links.apiKey": "Create API key",
  "links.status": "Service status",
  "settings.title": "Settings",
  "settings.widget": "Show the floating balance widget on other views",
  "settings.widgetHint": "The widget always hides on Usage; choose its other views below.",
  "settings.widgetTabs": "Show widget on",
  "settings.widgetTabsHint": "This live list comes from DSH\u2019s tab registry, including tabs added by other plugins.",
  "settings.widgetTabsEmpty": "There are no configurable conversation views right now.",
  "settings.lowBalance": "Balance warning",
  "settings.lowBalanceOn": "This page and the widget turn amber below {amount} {currency}. Enter 0 to disable.",
  "settings.lowBalanceOff": "Balance warnings are off. Enter an amount above 0 to enable them.",
  "settings.monthlyBudget": "Monthly budget",
  "settings.monthlyBudgetOn": "Track a {amount} CNY budget by Beijing calendar month and forecast month-end spend. Enter 0 to disable.",
  "settings.monthlyBudgetOff": "Enter an amount above 0 to show progress and a month-end forecast.",
  "widget.updatedNow": "Updated just now",
  "widget.stale": "Data from {minutes}m ago; press \u21BB to update",
  "widget.loading": "Loading\u2026",
  "widget.lowTitle": "Balance below warning threshold {amount}",
  "widget.todayCostTitle": "Today\u2019s spend (estimated) \xB7 {age}",
  "widget.todayCost": "Today\u2019s spend",
  "widget.sessionCostTitle": "Estimated spend for the current session",
  "widget.sessionCost": "Current session",
  "widget.noBalance": "No balance data",
  "widget.dragCard": "Drag to any corner",
  "widget.dragGrip": "Drag to move",
  "widget.refresh": "Refresh balance and today\u2019s usage",
  "widget.expand": "Expand",
  "widget.collapse": "Collapse",
  "widget.expandAria": "Expand balance widget",
  "widget.collapseAria": "Collapse balance widget",
  "messageCost.label": "Turn cost",
  "messageCost.tooltip": "Provided by dsh-usage-dashboard \xB7 estimated cost for this turn",
  "messageCost.aria": "{amount}, estimated cost for this turn, provided by dsh-usage-dashboard",
  "boundary.title": "The usage dashboard crashed",
  "boundary.body": "Rendering failed, usually because this browser still has cached data from an older version. Clear this plugin\u2019s local data and reload to recover.",
  "boundary.reset": "Clear local data and reload"
};

// src/client/i18n.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var fallbackT = (key, params) => {
  const template = zh[key];
  if (params === void 0) return template;
  return template.replace(/\{(\w+)\}/g, (match, name2) => name2 in params ? String(params[name2]) : match);
};
var TranslationContext = (0, import_react2.createContext)(fallbackT);
function LocaleProvider(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TranslationContext.Provider, { value: props.t, children: props.children });
}
function useI18n() {
  const t = (0, import_react2.useContext)(TranslationContext);
  return { t, locale: t("meta.locale") === "en" ? "en" : "zh" };
}
function localizeApiError(message, t, fallback) {
  if (message === void 0 || message === "") return t(fallback);
  if (message === "\u51ED\u8BC1\u670D\u52A1\u4E0D\u53EF\u7528") return t("error.credentialsUnavailable");
  if (message === "\u67E5\u8BE2\u5931\u8D25") return t("error.query");
  if (message === "\u4F59\u989D\u52A0\u8F7D\u5931\u8D25") return t("error.balanceLoad");
  if (message === "\u7528\u91CF\u52A0\u8F7D\u5931\u8D25") return t("error.usageLoad");
  if (message === "\u672A\u914D\u7F6E DEEPSEEK_API_KEY\uFF08\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u6A21\u578B\u300D\u4E2D\u586B\u5199\uFF09") return t("error.noApiKey");
  if (message === "\u89E3\u6790\u4F59\u989D\u54CD\u5E94\u5931\u8D25") return t("error.balanceParse");
  if (message === "\u4F1A\u8BDD\u6301\u4E45\u5316\u670D\u52A1\u4E0D\u53EF\u7528") return t("error.persistenceUnavailable");
  if (message === "\u7F3A\u5C11\u4F1A\u8BDD id") return t("error.missingSessionId");
  const mappings = [
    [/^读取 API Key 失败：(.*)$/, "error.credentialRead", "detail"],
    [/^请求余额接口失败：(.*)$/, "error.balanceRequest", "detail"],
    [/^余额接口返回错误（HTTP (\d+)）$/, "error.balanceHttp", "status"],
    [/^读取会话列表失败：(.*)$/, "error.sessionList", "detail"],
    [/^读取会话日志失败：(.*)$/, "error.sessionLogRead", "detail"]
  ];
  for (const [pattern, key, field] of mappings) {
    const match = message.match(pattern);
    if (match !== null) return t(key, { [field]: match[1] });
  }
  return message;
}

// src/client/charts.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function useChartTip() {
  const wrapRef = (0, import_react3.useRef)(null);
  const [tip, setTip] = (0, import_react3.useState)(null);
  const [pinned, setPinned] = (0, import_react3.useState)(null);
  const pinnedRef = (0, import_react3.useRef)(null);
  const touchStart = (0, import_react3.useRef)(null);
  const setPin = (next) => {
    pinnedRef.current = next;
    setPinned(next);
  };
  const showAt = (target, text, clientX, clientY) => {
    const wrap = wrapRef.current;
    if (text === void 0 || text === "" || wrap === null) return;
    const rect = wrap.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = Math.min(Math.max((clientX ?? targetRect.left + targetRect.width / 2) - rect.left, 70), Math.max(rect.width - 70, 70));
    const viewportY = clientY ?? targetRect.top;
    const y = viewportY - rect.top;
    setTip({ x, y, lines: text.split(" \xB7 "), above: viewportY > window.innerHeight - 160 });
  };
  const show = (e, text) => {
    if (e.pointerType === "touch") return;
    showAt(e.currentTarget, text, e.clientX, e.clientY);
  };
  const showFocused = (e, text) => {
    showAt(e.currentTarget, text);
  };
  const hide = () => {
    if (pinnedRef.current !== null) return;
    setTip(null);
  };
  const onPointStart = (e) => {
    if (e.pointerType === "touch") touchStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointEnd = (e, index, text) => {
    if (e.pointerType !== "touch") return;
    const start = touchStart.current;
    touchStart.current = null;
    if (start === null || !isTapGesture(e.clientX - start.x, e.clientY - start.y, Date.now() - start.t)) return;
    const next = nextPinnedIndex(pinnedRef.current, index);
    setPin(next);
    if (next === null) setTip(null);
    else showAt(e.currentTarget, text, e.clientX, e.clientY);
  };
  (0, import_react3.useEffect)(() => {
    if (pinned === null) return void 0;
    const onDocPointerDown = (e) => {
      const wrap = wrapRef.current;
      if (wrap !== null && e.target instanceof Node && wrap.contains(e.target)) return;
      setPin(null);
      setTip(null);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [pinned]);
  return { wrapRef, tip, pinned, show, showFocused, hide, onPointStart, onPointEnd };
}
function useRovingChartPoints(count, initial, horizontalStep = 1) {
  const refs = (0, import_react3.useRef)([]);
  const [active, setActive] = (0, import_react3.useState)(initial);
  (0, import_react3.useEffect)(() => setActive(Math.min(Math.max(0, initial), Math.max(0, count - 1))), [count, initial]);
  const onKeyDown = (event, index) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = nextChartFocus(index, count, event.key, horizontalStep);
    setActive(next);
    const target = refs.current[next];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return { active, refs, onKeyDown };
}
function ChartTip(props) {
  const { tip } = props;
  if (tip === null) return null;
  const [head, ...rows] = tip.lines;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: `dq-tip${tip.above ? " dq-tip--above" : ""}`, style: { left: `${tip.x}px`, top: `${tip.y}px` }, role: "tooltip", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-tip-head", children: head }),
    rows.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-tip-row", children: row }, i))
  ] });
}
var MODEL_COLORS = ["#4176e6", "#2da44e", "#e16f24", "#8250df", "#bf8700", "#cf222e", "#1f883d", "#0969da"];
function Bars(props) {
  const { data, height = 120, labelEvery = 1, minWidth } = props;
  const { wrapRef, tip, pinned, show, showFocused, hide, onPointStart, onPointEnd } = useChartTip();
  const scrollRef = (0, import_react3.useRef)(null);
  const initialFocus = lastPopulatedIndex(data.map((datum) => datum.value));
  const roving = useRovingChartPoints(data.length, initialFocus);
  (0, import_react3.useEffect)(() => {
    const scroll = scrollRef.current;
    if (scroll !== null && minWidth !== void 0) scroll.scrollLeft = scroll.scrollWidth;
  }, [data.length, minWidth]);
  let max = 0;
  for (const datum of data) if (datum.value > max) max = datum.value;
  const scale = max > 0 ? max : 1;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dq-chart-wrap", ref: wrapRef, onPointerLeave: hide, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bars-scroll", ref: scrollRef, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bars", style: { height: `${height + 18}px`, minWidth: minWidth === void 0 ? void 0 : `${minWidth}px` }, children: data.map((datum, i) => {
      const h = Math.max(1, Math.round(datum.value / scale * height));
      const text = datum.title ?? `${datum.label}: ${datum.value.toLocaleString()}`;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          className: `dq-bar-col${pinned === i ? " dq-bar-col--pinned" : ""}`,
          role: "img",
          "aria-label": text,
          "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown Home End",
          tabIndex: i === roving.active ? 0 : -1,
          ref: (element) => {
            roving.refs.current[i] = element;
          },
          onPointerMove: (e) => show(e, text),
          onPointerDown: onPointStart,
          onPointerUp: (e) => onPointEnd(e, i, text),
          onFocus: (e) => showFocused(e, text),
          onBlur: hide,
          onKeyDown: (e) => roving.onKeyDown(e, i),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bar", style: { height: `${h}px` } }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bar-label", style: { visibility: i % labelEvery === 0 ? "visible" : "hidden" }, children: datum.label })
          ]
        },
        i
      );
    }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ChartTip, { tip })
  ] });
}
function GroupedBars(props) {
  const { series, height = 120, labelEvery = 1, minWidth } = props;
  const { wrapRef, tip, pinned, show, showFocused, hide, onPointStart, onPointEnd } = useChartTip();
  const scrollRef = (0, import_react3.useRef)(null);
  const count = series.length > 0 ? series[0].bars.length : 0;
  const pointValues = Array.from({ length: count }, (_, i) => series.map((s) => s.bars[i]?.value ?? 0)).flat();
  const roving = useRovingChartPoints(pointValues.length, lastPopulatedIndex(pointValues));
  (0, import_react3.useEffect)(() => {
    const scroll = scrollRef.current;
    if (scroll !== null && minWidth !== void 0) scroll.scrollLeft = scroll.scrollWidth;
  }, [count, minWidth]);
  const scale = maxOrOne(stackedTotals(series, count));
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dq-chart-wrap", ref: wrapRef, onPointerLeave: hide, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bars-scroll", ref: scrollRef, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bars", style: { height: `${height + 18}px`, minWidth: minWidth === void 0 ? void 0 : `${minWidth}px` }, children: Array.from({ length: count }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        className: "dq-bar-col",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bar-group", children: series.map((s, seriesIndex) => {
            const datum = s.bars[i];
            const h = Math.max(1, Math.round(datum.value / scale * height));
            const text = datum.title ?? `${s.key}: ${datum.value.toLocaleString()}`;
            const pointIndex = i * series.length + seriesIndex;
            return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "div",
              {
                className: `dq-bar${pinned === pointIndex ? " dq-bar--pinned" : ""}`,
                style: { height: `${h}px`, background: s.color },
                role: "img",
                "aria-label": text,
                "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown Home End",
                tabIndex: pointIndex === roving.active ? 0 : -1,
                ref: (element) => {
                  roving.refs.current[pointIndex] = element;
                },
                onPointerMove: (e) => show(e, text),
                onPointerDown: onPointStart,
                onPointerUp: (e) => onPointEnd(e, pointIndex, text),
                onFocus: (e) => showFocused(e, text),
                onBlur: hide,
                onKeyDown: (e) => roving.onKeyDown(e, pointIndex)
              },
              s.key
            );
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-bar-label", style: { visibility: i % labelEvery === 0 ? "visible" : "hidden" }, children: series[0].bars[i].label })
        ]
      },
      i
    )) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ChartTip, { tip })
  ] });
}
function heatColor(level) {
  if (level <= 0) return "rgba(120,130,150,0.12)";
  if (level === 1) return "rgba(65,118,230,0.25)";
  if (level === 2) return "rgba(65,118,230,0.5)";
  if (level === 3) return "rgba(65,118,230,0.75)";
  return "rgba(65,118,230,1)";
}
function Heatmap(props) {
  const { data } = props;
  const { t, locale } = useI18n();
  const { wrapRef, tip, pinned, show, showFocused, hide, onPointStart, onPointEnd } = useChartTip();
  const roving = useRovingChartPoints(data.length, lastPopulatedIndex(data.map((datum) => datum.total)), 7);
  let max = 0;
  for (const datum of data) if (datum.total > max) max = datum.total;
  let firstDow = 0;
  if (data.length > 0) {
    const dt = /* @__PURE__ */ new Date(`${data[0].date}T00:00:00`);
    firstDow = Number.isNaN(dt.getTime()) ? 0 : dt.getDay();
  }
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (const datum of data) cells.push(datum);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  let lastMonth = "";
  const monthLabels = weeks.map((week) => {
    const first = week.find((cell) => cell !== null);
    if (first === void 0 || first === null) return "";
    const month = first.date.slice(0, 7);
    if (month === lastMonth) return "";
    lastMonth = month;
    return t(`chart.month${Number(first.date.slice(5, 7))}`);
  });
  const levelOf = (total) => {
    if (total <= 0) return 0;
    const r = max > 0 ? total / max : 0;
    return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dq-heat dq-chart-wrap", ref: wrapRef, onPointerLeave: hide, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dq-heat-scroll", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-heatmap", children: weeks.map((week, w) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-heat-week", children: week.map((datum, d) => {
        if (datum === null) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-heat-cell dq-heat-cell--pad" }, d);
        const text = t("chart.tooltip", {
          head: datum.date,
          tokens: datum.total.toLocaleString(locale === "en" ? "en-US" : "zh-CN"),
          cost: datum.cost.toFixed(2),
          calls: t("common.calls", { count: datum.calls })
        });
        const index = w * 7 + d - firstDow;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: `dq-heat-cell${pinned === index ? " dq-heat-cell--pinned" : ""}`,
            style: { background: heatColor(levelOf(datum.total)) },
            role: "img",
            "aria-label": text,
            "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown Home End",
            tabIndex: index === roving.active ? 0 : -1,
            ref: (element) => {
              roving.refs.current[index] = element;
            },
            onPointerMove: (e) => show(e, text),
            onPointerDown: onPointStart,
            onPointerUp: (e) => onPointEnd(e, index, text),
            onFocus: (e) => showFocused(e, text),
            onBlur: hide,
            onKeyDown: (e) => roving.onKeyDown(e, index)
          },
          d
        );
      }) }, w)) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-heat-months", "aria-hidden": "true", children: monthLabels.map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dq-heat-month", children: label }, i)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ChartTip, { tip }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dq-heat-scale", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("chart.less") }),
      [0, 1, 2, 3, 4].map((level) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dq-heat-key", style: { background: heatColor(level) } }, level)),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("chart.more") })
    ] })
  ] });
}
var fmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
var fmtInt = (v) => Math.round(Number(v) || 0).toLocaleString();
var fmtCompact = (v, locale = "zh") => {
  const n = Number(v) || 0;
  if (locale === "en") {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}\u4EBF`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}\u4E07`;
  return Math.round(n).toLocaleString();
};

// src/client/dom.ts
function getMainColumn(frame) {
  const anchor = frame.querySelector('[data-slot="conversation"]');
  const column = anchor?.parentElement ?? null;
  return column === frame ? null : column;
}
function slotElement(frame, slot, side) {
  const anchor = frame.querySelector(`[data-slot="${slot}"]`);
  if (anchor === null) return null;
  if (side === "child") {
    const el2 = anchor.firstElementChild;
    return el2 !== null && el2.getBoundingClientRect().height > 0 ? el2 : null;
  }
  let el = anchor.parentElement;
  for (let depth = 0; depth < 4 && el !== null && el !== frame; depth++) {
    if (el.getBoundingClientRect().height > 0) return el;
    el = el.parentElement;
  }
  return null;
}
function slotBox(frame, slot, side) {
  return slotElement(frame, slot, side)?.getBoundingClientRect() ?? null;
}
function getShellFrame(node) {
  const overlay = node !== null && typeof node.closest === "function" ? node.closest("[data-shell-overlay]") : null;
  return overlay?.parentElement ?? null;
}
function getComposerElement(frame) {
  if (frame === null) return null;
  return slotElement(frame, "conversation.composer.dock", "ancestor");
}
function getActiveConversationViewId(frame, viewIds) {
  if (viewIds.length === 0) return null;
  const header = frame === null ? null : slotElement(frame, "conversation.session.header", "child");
  const tablist = header?.querySelector('[role="tablist"]') ?? null;
  if (tablist === null) return viewIds[0] ?? null;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const activeIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  return activeIndex < 0 ? viewIds[0] ?? null : viewIds[activeIndex] ?? null;
}

// src/client/export.ts
var BEIJING_OFFSET_MS2 = 8 * 60 * 60 * 1e3;
function exportDateStamp(nowMs = Date.now()) {
  const date = new Date(nowMs + BEIJING_OFFSET_MS2);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("");
}
function csvCell(value) {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
var csv = (rows) => `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r
`;
function dailyUsageCsv(usage) {
  return csv([
    ["date", "input_tokens", "output_tokens", "cache_hit_tokens", "total_tokens", "calls", "estimated_cost_cny"],
    ...usage.daily.map((day) => [day.date, day.input, day.output, day.cache, day.total, day.calls, day.cost])
  ]);
}
function modelUsageCsv(usage) {
  return csv([
    ["provider", "model", "input_tokens", "output_tokens", "cache_hit_tokens", "total_tokens", "calls", "estimated_cost_cny"],
    ...usage.models.map((model) => [
      model.provider,
      model.model,
      model.input,
      model.output,
      model.cache,
      model.total,
      model.calls,
      model.cost
    ])
  ]);
}
function fullUsageJson(usage, nowMs = Date.now()) {
  return `${JSON.stringify({
    schemaVersion: 1,
    exportedAt: new Date(nowMs).toISOString(),
    scope: "local-dsh-session-logs",
    data: usage
  }, null, 2)}
`;
}
function downloadText(filename, text, mediaType) {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

// src/client/freshness.ts
function updatedText(updatedAt, nowMs = Date.now(), t = fallbackT) {
  if (updatedAt === null || !Number.isFinite(updatedAt)) return t("fresh.none");
  const elapsed = Math.max(0, nowMs - updatedAt);
  if (elapsed < 6e4) return t("fresh.justNow");
  const minutes = Math.floor(elapsed / 6e4);
  if (minutes < 60) return t("fresh.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("fresh.hours", { count: hours });
  return t("fresh.days", { count: Math.floor(hours / 24) });
}
function syncStatusText(state, updatedAt, nowMs = Date.now(), t = fallbackT) {
  const age = updatedText(updatedAt, nowMs, t);
  if (state === "syncing") return updatedAt === null ? t("sync.first") : t("sync.syncing", { age });
  if (state === "fresh") return t("sync.fresh", { age });
  if (state === "cached") return t("sync.cached", { age });
  if (state === "fallback") return t("sync.fallback", { age });
  return t("sync.error");
}

// src/client/metric.ts
var CHART_METRICS = ["tokens", "cost", "calls"];
var isChartMetric = (value) => typeof value === "string" && CHART_METRICS.some((metric) => metric === value);
function chartMetricValue(metric, point) {
  if (metric === "cost") return point.cost;
  if (metric === "calls") return point.calls;
  return point.total;
}
function chartMetricName(metric, t = fallbackT) {
  if (metric === "cost") return t("metric.cost");
  if (metric === "calls") return t("metric.calls");
  return t("metric.usage");
}

// src/client/prefs.ts
var PREFIX2 = "dsh-usage-dashboard:pref:";
var VERSION = 1;
var keyOf = (key) => `${PREFIX2}${key}:v${VERSION}`;
function loadPref(key, isValid, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(keyOf(key));
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function savePref(key, value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(keyOf(key), JSON.stringify(value));
  } catch {
  }
}
var isBoolean = (value) => typeof value === "boolean";

// src/client/store.ts
function createStore(key, isValid, fallback) {
  let current = loadPref(key, isValid, fallback);
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => current,
    set: (value) => {
      current = value;
      savePref(key, value);
      for (const listener of [...listeners]) listener();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    }
  };
}
var isThreshold = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
var widgetVisibleStore = createStore("widget.visible", isBoolean, true);
var isWidgetTabIds = (value) => value === null || Array.isArray(value) && value.every((id) => typeof id === "string" && id !== "") && new Set(value).size === value.length;
var widgetTabIdsStore = createStore("widget.tabIds", isWidgetTabIds, null);
var lowBalanceStore = createStore("alert.lowBalance", isThreshold, 10);
var monthlyBudgetStore = createStore("budget.monthly", isThreshold, 0);
var isUsageWindowDays = (value) => typeof value === "number" && USAGE_WINDOW_DAYS.some((days) => days === value);
var usageWindowStore = createStore("usage.windowDays", isUsageWindowDays, 30);
var chartMetricStore = createStore("usage.chartMetric", isChartMetric, "tokens");
var quotaViewActive = false;
var quotaViewListeners = /* @__PURE__ */ new Set();
var quotaViewActiveStore = {
  get: () => quotaViewActive,
  set: (value) => {
    if (value === quotaViewActive) return;
    quotaViewActive = value;
    for (const listener of [...quotaViewListeners]) listener();
  },
  subscribe: (fn) => {
    quotaViewListeners.add(fn);
    return () => {
      quotaViewListeners.delete(fn);
    };
  }
};

// src/client/dashboard.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var COMPOSER_FALLBACK_PX = 126;
function Skel(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-skel", style: { width: `${props.w}px`, height: `${props.h}px` } });
}
function BalanceSkeleton() {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-balance-grid", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 56, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 150, h: 22 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 28, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 48, h: 22 })
    ] })
  ] });
}
function SessionUsageSkeleton() {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-balance-grid", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 64, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 96, h: 18 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 70, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 80, h: 18 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 64, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 40, h: 18 })
    ] })
  ] });
}
function UsageSkeleton() {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-usage-totals", children: [44, 44, 62, 62].map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w, h: 11 }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: w > 70 ? 84 : 56, h: 20 })
    ] }, i)) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 140, h: 12 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-skel-bars", children: Array.from({ length: 30 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-skel dq-skel-bar", style: { height: `${18 + i * 37 % 82}px` } }, i)) })
  ] });
}
function HeatmapSkeleton() {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 140, h: 12 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-skel-bars", style: { height: "88px" }, children: Array.from({ length: 52 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-skel dq-skel-bar", style: { height: `${14 + i * 29 % 60}px` } }, i)) })
  ] });
}
function Delta(props) {
  const { t } = useI18n();
  const { current, previous, label } = props;
  if (previous <= 0) {
    if (current <= 0) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-delta dq-delta--new", title: t("delta.noBaselineTitle", { label }), children: t("delta.noBaseline") });
  }
  const percent = Math.round((current - previous) / previous * 100);
  const title = `${label} \xA5${fmt(previous)}`;
  if (percent === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-delta dq-delta--flat", title, children: t("delta.flat") });
  const up = percent > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: `dq-delta ${up ? "dq-delta--up" : "dq-delta--down"}`, title, children: [
    up ? "\u2191" : "\u2193",
    Math.abs(percent),
    "% ",
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-delta-label", children: label })
  ] });
}
function Period(props) {
  const { t, locale } = useI18n();
  const { period, previous, compare } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-period", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-period-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-period-label", children: props.label }),
      previous !== void 0 && compare !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Delta, { current: period.cost, previous: previous.cost, label: compare })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-period-cost", children: [
      "\xA5 ",
      fmt(period.cost)
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-period-sub", children: t("period.volume", {
      tokens: fmtCompact(period.total, locale),
      calls: t("common.calls", { count: fmtInt(period.calls) })
    }) })
  ] });
}
function BudgetMeter(props) {
  const { t } = useI18n();
  if (props.budget <= 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-budget dq-budget--unset", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("budget.unset") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dq-budget-action", onClick: props.onConfigure, children: t("budget.configure") })
    ] });
  }
  const snapshot = budgetSnapshot(props.spent, props.budget);
  const usedPercent = snapshot.ratio * 100;
  const barPercent = Math.min(100, usedPercent);
  const forecastText = snapshot.status === "over" ? t("budget.over", { amount: fmt(Math.abs(snapshot.remaining)) }) : snapshot.forecastOver > 0 ? t("budget.forecastOver", { amount: fmt(snapshot.forecastOver) }) : t("budget.forecast", { amount: fmt(snapshot.forecast) });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `dq-budget dq-budget--${snapshot.status}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-budget-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-budget-title", children: t("budget.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-budget-amount", children: [
        "\xA5 ",
        fmt(snapshot.spent),
        " / \xA5 ",
        fmt(snapshot.budget)
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        className: "dq-budget-track",
        role: "progressbar",
        "aria-label": t("budget.progressLabel"),
        "aria-valuemin": 0,
        "aria-valuemax": snapshot.budget,
        "aria-valuenow": Math.min(snapshot.spent, snapshot.budget),
        "aria-valuetext": t("budget.used", { percent: usedPercent.toFixed(1), forecast: forecastText }),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-budget-fill", style: { transform: `scaleX(${barPercent / 100})` } })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-budget-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: snapshot.remaining >= 0 ? t("budget.remaining", { amount: fmt(snapshot.remaining) }) : t("budget.exceeded", { amount: fmt(Math.abs(snapshot.remaining)) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: forecastText })
    ] })
  ] });
}
var rate = (value) => `\xA5${value.toLocaleString(void 0, { maximumFractionDigits: 3 })}`;
function PricingNote(props) {
  const { t } = useI18n();
  const { pricing } = props;
  const split = pricing.splitActive;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: "dq-pricing", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { className: "dq-pricing-summary", children: [
      t("pricing.title"),
      split && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `dq-pricing-now${pricing.inPeakNow ? " dq-pricing-now--peak" : ""}`, children: pricing.inPeakNow ? t("pricing.currentPeak") : t("pricing.currentOffPeak") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-pricing-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("table", { className: "dq-pricing-table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: t("pricing.model") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: split ? t("pricing.period") : t("pricing.unitPrice") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: t("pricing.inputCacheHit") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: t("pricing.inputCacheMiss") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { children: t("pricing.output") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("tbody", { children: pricing.tiers.map((tier) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { rowSpan: tier.offPeak !== null ? 2 : 1, children: tier.model }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: split ? t("pricing.peak") : t("pricing.fixed") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.peak.cacheHit) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.peak.input) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.peak.output) })
          ] }),
          tier.offPeak !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: t("pricing.offPeak") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.offPeak.cacheHit) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.offPeak.input) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { children: rate(tier.offPeak.output) })
          ] })
        ] }, tier.model)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "dq-pricing-foot", children: [
        t("pricing.unit", { currency: pricing.currency }),
        split ? t("pricing.splitNote", { windows: pricing.peakWindows.join(t("common.listSeparator")), date: pricing.switchDate }) : t("pricing.switchNote", { windows: pricing.peakWindows.join(t("common.listSeparator")), date: pricing.switchDate }),
        t("pricing.unknown")
      ] })
    ] })
  ] });
}
function CoverageDiagnostics(props) {
  const { t, locale } = useI18n();
  const { coverage } = props;
  const hasGaps = coverage.failedSessions > 0 || coverage.skippedRecords > 0 || coverage.scannedSessions < coverage.listedSessions;
  const coverageTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const range = coverage.earliestAt === null || coverage.latestAt === null ? t("coverage.noRange") : `${coverageTime.format(coverage.earliestAt)} \u2013 ${coverageTime.format(coverage.latestAt)}`;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("details", { className: `dq-coverage${hasGaps ? " dq-coverage--warn" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { className: "dq-coverage-summary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-coverage-title", children: t("coverage.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-coverage-status", children: hasGaps ? t("coverage.gaps") : t("coverage.complete") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-coverage-brief", children: t("coverage.brief", {
        scanned: fmtInt(coverage.scannedSessions),
        listed: fmtInt(coverage.listedSessions),
        records: fmtInt(coverage.usageRecords)
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-coverage-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("dl", { className: "dq-coverage-metrics", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("coverage.scanned") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: t("common.sessions", { count: fmtInt(coverage.scannedSessions) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("coverage.failed") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: t("common.sessions", { count: fmtInt(coverage.failedSessions) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dt", { children: t("coverage.skipped") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("dd", { children: t("common.records", { count: fmtInt(coverage.skippedRecords) }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-coverage-range", children: t("coverage.time", { range }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-coverage-note", children: t("coverage.scope") }),
      hasGaps && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-coverage-warning", children: t("coverage.warning") })
    ] })
  ] });
}
function Stat(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: props.label }),
    props.children
  ] });
}
function Link(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("a", { className: "dq-link", href: props.href, target: "_blank", rel: "noreferrer", children: props.children });
}
function ExportMenu(props) {
  const { t } = useI18n();
  const [open, setOpen] = (0, import_react4.useState)(false);
  const [done, setDone] = (0, import_react4.useState)(false);
  const rootRef = (0, import_react4.useRef)(null);
  const triggerRef = (0, import_react4.useRef)(null);
  const menuRef = (0, import_react4.useRef)(null);
  const doneTimerRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    if (!open) return;
    const onDown = (event) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.requestAnimationFrame(() => menuRef.current?.querySelector("button")?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  (0, import_react4.useEffect)(() => () => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
  }, []);
  const finish = () => {
    setOpen(false);
    setDone(true);
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
    doneTimerRef.current = window.setTimeout(() => setDone(false), 1400);
  };
  const exportDaily = () => {
    const stamp = exportDateStamp();
    downloadText(`dsh-usage-${stamp}.csv`, dailyUsageCsv(props.usage), "text/csv;charset=utf-8");
    finish();
  };
  const exportModels = () => {
    const stamp = exportDateStamp();
    downloadText(`dsh-usage-models-${stamp}.csv`, modelUsageCsv(props.usage), "text/csv;charset=utf-8");
    finish();
  };
  const exportJson = () => {
    const stamp = exportDateStamp();
    downloadText(`dsh-usage-${stamp}.json`, fullUsageJson(props.usage), "application/json;charset=utf-8");
    finish();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-export", ref: rootRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: `dq-export-btn${done ? " dq-export-btn--done" : ""}`,
        "aria-haspopup": "true",
        "aria-expanded": open,
        title: t("export.title"),
        onClick: () => setOpen((value) => !value),
        children: done ? t("export.done") : t("export.action")
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { ref: menuRef, className: "dq-export-menu", "aria-label": t("export.menuLabel"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: exportDaily, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("export.dailyCsv") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: t("common.rows", { count: props.usage.daily.length }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: exportModels, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("export.modelCsv") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: t("common.rows", { count: props.usage.models.length }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("button", { type: "button", onClick: exportJson, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("export.fullJson") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("small", { children: t("export.jsonHint") })
      ] })
    ] })
  ] });
}
var modelKeyOf = (m) => m.provider !== "" ? `${m.provider}/${m.model}` : m.model;
var modelNameOf = (m, t = fallbackT) => m.model !== "" ? m.model : t("common.unknownModel");
function SessionUsageCard(props) {
  const { t, locale } = useI18n();
  const { data } = props;
  if (data.calls === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("sessionUsage.empty") });
  const rangeTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const range = data.firstActive !== null && data.lastActive !== null ? data.firstActive === data.lastActive ? rangeTime.format(data.firstActive) : `${rangeTime.format(data.firstActive)} \u2013 ${rangeTime.format(data.lastActive)}` : null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-balance-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("sessionUsage.cost"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat-value", children: [
        "\xA5 ",
        fmt(data.cost)
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("sessionUsage.tokens"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtCompact(data.total, locale) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("sessionUsage.calls"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtInt(data.calls) }) })
    ] }),
    range !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-session-sub", children: t("sessionUsage.range", { range }) }),
    data.models.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank", children: data.models.map((m, index) => {
      const key = m.provider !== "" ? `${m.provider}/${m.model}` : m.model !== "" ? m.model : `model-${index}`;
      const name2 = m.model !== "" ? m.model : t("common.unknownModel");
      const color = MODEL_COLORS[index % MODEL_COLORS.length];
      const share = data.cost > 0 ? m.cost / data.cost : 0;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-rank-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-rank-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-name", title: key, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch", style: { background: color } }),
            name2
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-cost", children: [
            "\xA5 ",
            fmt(m.cost),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-share", children: [
              (share * 100).toFixed(1),
              "%"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            className: "dq-rank-track",
            role: "img",
            "aria-label": t("models.shareAria", { name: name2, percent: (share * 100).toFixed(1) }),
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank-fill", style: { width: `${Math.max(share * 100, 1.5)}%`, background: color } })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank-sub", children: t("models.detail", {
          tokens: fmtCompact(m.total, locale),
          calls: t("common.calls", { count: fmtInt(m.calls) }),
          input: fmtCompact(m.input, locale),
          output: fmtCompact(m.output, locale),
          cache: fmtCompact(m.cache, locale)
        }) })
      ] }, key);
    }) })
  ] });
}
function CacheCard(props) {
  const { t, locale } = useI18n();
  const { totals } = props;
  const prompt = totals.input + totals.cache;
  if (prompt === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("cache.empty") });
  const rate2 = totals.cache / prompt;
  const wouldHaveCost = totals.cost + totals.cacheSavings;
  const low = rate2 < 0.6;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-cache", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-cache-figures", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("cache.rate") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `dq-stat-value${low ? " dq-stat-value--warn" : " dq-stat-value--ok"}`, children: [
          (rate2 * 100).toFixed(1),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("cache.saved") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat-value", children: [
          "\xA5 ",
          fmt(totals.cacheSavings)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("cache.allMiss") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat-value dq-muted-value", children: [
          "\xA5 ",
          fmt(wouldHaveCost)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-cache-track", role: "img", "aria-label": t("cache.aria", { hit: (rate2 * 100).toFixed(1), miss: ((1 - rate2) * 100).toFixed(1) }), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-cache-fill", style: { width: `${rate2 * 100}%` } }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-cache-legend", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch dq-legend-swatch--hit" }),
        t("cache.hitLegend", { tokens: fmtCompact(totals.cache, locale) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch dq-legend-swatch--miss" }),
        t("cache.missLegend", { tokens: fmtCompact(totals.input, locale) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-cache-foot", children: low ? t("cache.lowHint") : t("cache.goodHint") })
  ] });
}
function PeakCard(props) {
  const { t, locale } = useI18n();
  const { split, pricing, currentCost } = props;
  const total = split.peak.total + split.offPeak.total;
  if (total === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("peak.empty") });
  const peakShare = split.peak.total / total;
  const shiftSaving = split.peakEraCost - split.offPeakEraCost;
  const increase = split.peakEraCost - currentCost;
  const increasePercent = currentCost > 0 ? increase / currentCost * 100 : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-peak", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        className: "dq-peak-track",
        role: "img",
        "aria-label": t("peak.aria", { peak: (peakShare * 100).toFixed(1), offPeak: ((1 - peakShare) * 100).toFixed(1) }),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-peak-fill", style: { width: `${peakShare * 100}%` } })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-peak-legend", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch dq-legend-swatch--peak" }),
        t("peak.peakLegend", {
          share: (peakShare * 100).toFixed(1),
          tokens: fmtCompact(split.peak.total, locale),
          calls: t("common.callsShort", { count: fmtInt(split.peak.calls) })
        })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch dq-legend-swatch--offpeak" }),
        t("peak.offPeakLegend", {
          share: ((1 - peakShare) * 100).toFixed(1),
          tokens: fmtCompact(split.offPeak.total, locale),
          calls: t("common.callsShort", { count: fmtInt(split.offPeak.calls) })
        })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-peak-figures", children: [
      !pricing.splitActive && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("peak.newPrice") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat-value", children: [
          "\xA5 ",
          fmt(split.peakEraCost),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-peak-delta", children: t("peak.increase", { percent: increasePercent.toFixed(0) }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("peak.shift") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat-value", children: [
          "\xA5 ",
          fmt(split.offPeakEraCost),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-peak-delta dq-peak-delta--save", children: t("peak.saving", { amount: fmt(shiftSaving) }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "dq-peak-foot", children: [
      t("peak.schedule", { windows: pricing.peakWindows.join(t("common.listSeparator")) }),
      pricing.splitActive ? t("peak.activeHint") : t("peak.futureHint", { date: pricing.switchDate })
    ] })
  ] });
}
function agoText(ms, t) {
  const minutes = Math.floor((Date.now() - ms) / 6e4);
  if (minutes < 1) return t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.hoursAgo", { count: hours });
  return t("common.daysAgo", { count: Math.floor(hours / 24) });
}
function SessionDetail(props) {
  const { t } = useI18n();
  const { state } = props;
  if (state === void 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionUsageSkeleton, {});
  if (state.data !== null) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionUsageCard, { data: state.data });
  if (state.error !== null) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty dq-empty--error", children: localizeApiError(state.error, t, "error.query") });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionUsageSkeleton, {});
}
function SessionRanking(props) {
  const { t, locale } = useI18n();
  const { sessions, count, totalCost } = props;
  const [details, setDetails] = (0, import_react4.useState)({});
  const startedRef = (0, import_react4.useRef)(/* @__PURE__ */ new Set());
  const loadDetail = (id) => {
    if (startedRef.current.has(id)) return;
    startedRef.current.add(id);
    fetchSessionUsage(id).then((res) => {
      setDetails((prev) => ({
        ...prev,
        [id]: res.ok && res.data !== void 0 ? { error: null, data: res.data } : { error: res.error ?? null, data: null }
      }));
    }, (err) => {
      const message = err?.message ?? String(err);
      setDetails((prev) => ({ ...prev, [id]: { error: message, data: null } }));
    });
  };
  if (sessions.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("sessions.empty") });
  const top = sessions[0].cost;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ol", { className: "dq-sessions", children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { className: "dq-session", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "details",
      {
        className: "dq-session-details",
        onToggle: (e) => {
          if (e.currentTarget.open) loadDetail(s.id);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("summary", { className: "dq-session-summary", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-session-chevron", "aria-hidden": "true", children: "\u25B8" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-session-summary-body", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-session-head", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-session-title", title: `${s.title}
${s.id}`, children: s.title || t("sessions.fallbackTitle", { id: s.id }) }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-session-cost", children: [
                  "\xA5 ",
                  fmt(s.cost)
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-session-track", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-session-fill", style: { width: `${Math.max(s.cost / (top || 1) * 100, 1.5)}%` } }) }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-session-sub", children: [
                t("sessions.detail", {
                  tokens: fmtCompact(s.total, locale),
                  calls: t("common.calls", { count: fmtInt(s.calls) }),
                  ago: agoText(s.lastActive, t)
                }),
                totalCost > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
                  " \xB7 ",
                  t("sessions.share", { percent: (s.cost / totalCost * 100).toFixed(1) })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-session-expand", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionDetail, { state: details[s.id] }) })
        ]
      }
    ) }, s.id)) }),
    count > sessions.length && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dq-session-foot", children: t("sessions.more", { count: fmtInt(count), shown: sessions.length }) })
  ] });
}
function ModelRanking(props) {
  const { t, locale } = useI18n();
  const { models, totalCost } = props;
  if (models.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("models.empty") });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank", children: models.map((m) => {
    const key = modelKeyOf(m);
    const share = totalCost > 0 ? m.cost / totalCost : 0;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-rank-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-rank-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-name", title: key, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch", style: { background: props.colorOf(key) } }),
          modelNameOf(m, t)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-cost", children: [
          "\xA5 ",
          fmt(m.cost),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-rank-share", children: [
            (share * 100).toFixed(1),
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "div",
        {
          className: "dq-rank-track",
          role: "img",
          "aria-label": t("models.shareAria", { name: modelNameOf(m, t), percent: (share * 100).toFixed(1) }),
          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank-fill", style: { width: `${Math.max(share * 100, 1.5)}%`, background: props.colorOf(key) } })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank-sub", children: t("models.detail", {
        tokens: fmtCompact(m.total, locale),
        calls: t("common.calls", { count: fmtInt(m.calls) }),
        input: fmtCompact(m.input, locale),
        output: fmtCompact(m.output, locale),
        cache: fmtCompact(m.cache, locale)
      }) })
    ] }, key);
  }) });
}
function ModelPicker(props) {
  const { t, locale } = useI18n();
  const { models } = props;
  const [open, setOpen] = (0, import_react4.useState)(false);
  const rootRef = (0, import_react4.useRef)(null);
  const triggerRef = (0, import_react4.useRef)(null);
  const menuRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.requestAnimationFrame(() => menuRef.current?.querySelector("input")?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (models.length === 0) return null;
  const toggle = (key) => {
    props.onChange(
      props.selected.includes(key) ? props.selected.filter((k) => k !== key) : [...props.selected, key]
    );
  };
  const label = props.selected.length === 0 ? t("models.all") : t("models.selected", { count: props.selected.length });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-model-picker", ref: rootRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: "dq-model-btn",
        "aria-haspopup": "true",
        "aria-expanded": open,
        "aria-controls": "dq-model-menu",
        title: t("models.filterTitle"),
        onClick: () => setOpen((value) => !value),
        children: label
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { id: "dq-model-menu", ref: menuRef, className: "dq-model-menu", role: "group", "aria-label": t("models.filterLabel"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dq-model-item dq-model-item--all", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "checkbox",
            checked: props.selected.length === 0,
            onChange: () => props.onChange([])
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("models.all") })
      ] }),
      models.map((m) => {
        const key = modelKeyOf(m);
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dq-model-item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { type: "checkbox", checked: props.selected.includes(key), onChange: () => toggle(key) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch", style: { background: props.colorOf(key) } }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: modelNameOf(m, t) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-model-tag", children: fmtCompact(m.total, locale) })
        ] }, key);
      })
    ] })
  ] });
}
var windowName = (days, t = fallbackT) => days === 365 ? t("window.year") : t("window.days", { days });
function UsageWindowPicker(props) {
  const { t } = useI18n();
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-window-switch", role: "group", "aria-label": t("window.groupLabel"), children: USAGE_WINDOW_DAYS.map((days) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "button",
    {
      type: "button",
      className: `dq-window-btn${props.value === days ? " dq-window-btn--on" : ""}`,
      "aria-pressed": props.value === days,
      title: t("window.viewTitle", { window: windowName(days, t) }),
      onClick: () => props.onChange(days),
      children: days === 365 ? t("window.yearButton") : t("window.daysButton", { days })
    },
    days
  )) });
}
var chartMetricLabel = (metric, t = fallbackT) => metric === "tokens" ? t("metric.tokens") : chartMetricName(metric, t);
function ChartMetricPicker(props) {
  const { t } = useI18n();
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-chart-switch", role: "group", "aria-label": t("metric.groupLabel"), children: CHART_METRICS.map((metric) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "button",
    {
      type: "button",
      className: `dq-chart-switch-btn${props.value === metric ? " dq-chart-switch-btn--on" : ""}`,
      "aria-pressed": props.value === metric,
      title: t("metric.compareTitle", { metric: chartMetricLabel(metric, t) }),
      onClick: () => props.onChange(metric),
      children: chartMetricLabel(metric, t)
    },
    metric
  )) });
}
function BalanceDashboard(props) {
  const { t, locale } = useI18n();
  const cachedBalance = getCachedBalance();
  const cachedUsage = getCachedUsage();
  const cachedUsageAt = getCachedUsageAt();
  const [balance, setBalance] = (0, import_react4.useState)(cachedBalance?.data ?? null);
  const [usage, setUsage] = (0, import_react4.useState)(cachedUsage?.data ?? null);
  const [error, setError] = (0, import_react4.useState)(null);
  const [notice, setNotice] = (0, import_react4.useState)(null);
  const [loadingBalance, setLoadingBalance] = (0, import_react4.useState)(cachedBalance === null);
  const [loadingUsage, setLoadingUsage] = (0, import_react4.useState)(cachedUsage === null);
  const [refreshing, setRefreshing] = (0, import_react4.useState)(false);
  const [usageUpdatedAt, setUsageUpdatedAt] = (0, import_react4.useState)(cachedUsageAt);
  const [syncState, setSyncState] = (0, import_react4.useState)(cachedUsageAt === null ? "syncing" : "cached");
  const [freshnessNow, setFreshnessNow] = (0, import_react4.useState)(Date.now());
  const hadDataRef = (0, import_react4.useRef)(cachedBalance !== null || cachedUsage !== null);
  const [widgetOn, setWidgetOn] = (0, import_react4.useState)(widgetVisibleStore.get());
  const [widgetTabIds, setWidgetTabIds] = (0, import_react4.useState)(widgetTabIdsStore.get());
  const [viewTabs, setViewTabs] = (0, import_react4.useState)(() => props.views.list());
  (0, import_react4.useEffect)(() => props.views.subscribe(() => setViewTabs(props.views.list())), [props.views]);
  const [lowBalance, setLowBalance] = (0, import_react4.useState)(lowBalanceStore.get());
  const [monthlyBudget, setMonthlyBudget] = (0, import_react4.useState)(monthlyBudgetStore.get());
  const [barMode, setBarMode] = (0, import_react4.useState)("daily");
  const [selectedModels, setSelectedModels] = (0, import_react4.useState)([]);
  const [windowDays, setWindowDays] = (0, import_react4.useState)(usageWindowStore.get());
  const [chartMetric, setChartMetric] = (0, import_react4.useState)(chartMetricStore.get());
  const [runwayHovering, setRunwayHovering] = (0, import_react4.useState)(false);
  const [runwayManuallyOpened, setRunwayManuallyOpened] = (0, import_react4.useState)(false);
  const [remainingHovering, setRemainingHovering] = (0, import_react4.useState)(false);
  const [remainingManuallyOpened, setRemainingManuallyOpened] = (0, import_react4.useState)(false);
  const budgetInputRef = (0, import_react4.useRef)(null);
  const rootRef = (0, import_react4.useRef)(null);
  const [composerHeight, setComposerHeight] = (0, import_react4.useState)(null);
  const [sessionUsage, setSessionUsage] = (0, import_react4.useState)(null);
  const [loadingSessionUsage, setLoadingSessionUsage] = (0, import_react4.useState)(props.sessionId !== void 0 && props.sessionId !== "");
  const [sessionUsageError, setSessionUsageError] = (0, import_react4.useState)(null);
  const sessionUsageIdRef = (0, import_react4.useRef)(null);
  (0, import_react4.useLayoutEffect)(() => {
    const node = rootRef.current;
    if (node === null) return;
    const measure = () => {
      const frame2 = getShellFrame(node);
      const composer2 = getComposerElement(frame2);
      const rect = composer2?.getBoundingClientRect() ?? null;
      const next = rect !== null && rect.height > 0 ? Math.round(rect.height) : null;
      setComposerHeight((prev) => prev === next ? prev : next);
    };
    measure();
    const frame = getShellFrame(node);
    const composer = getComposerElement(frame);
    let observer = null;
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(measure);
      if (composer !== null) observer.observe(composer);
      if (frame !== null) observer.observe(frame);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  (0, import_react4.useLayoutEffect)(() => {
    quotaViewActiveStore.set(true);
    return () => quotaViewActiveStore.set(false);
  }, []);
  const errText = (err) => err?.message ?? String(err);
  const load = async (force) => {
    const usageAtBefore = getCachedUsageAt();
    setError(null);
    setNotice(null);
    setRefreshing(true);
    setSyncState("syncing");
    const balanceTask = fetchBalance(force).then((res) => {
      if (res.ok && res.data !== void 0) {
        setBalance(res.data);
        hadDataRef.current = true;
        return null;
      }
      return res.error ?? "\u4F59\u989D\u52A0\u8F7D\u5931\u8D25";
    }, (err) => errText(err)).then((result) => {
      setLoadingBalance(false);
      return result;
    });
    const usageTask = fetchUsage(force).then((res) => {
      if (res.ok && res.data !== void 0) {
        setUsage(res.data);
        const updatedAt = getCachedUsageAt();
        setUsageUpdatedAt(updatedAt);
        setFreshnessNow(Date.now());
        setSyncState(updatedAt !== null && updatedAt !== usageAtBefore ? "fresh" : "cached");
        hadDataRef.current = true;
        return null;
      }
      return res.error ?? "\u7528\u91CF\u52A0\u8F7D\u5931\u8D25";
    }, (err) => errText(err)).then((result) => {
      setLoadingUsage(false);
      return result;
    });
    const [balanceError, usageError] = await Promise.all([balanceTask, usageTask]);
    setRefreshing(false);
    if (usageError !== null) {
      const fallbackAt = getCachedUsageAt();
      setUsageUpdatedAt(fallbackAt);
      setFreshnessNow(Date.now());
      setSyncState(fallbackAt === null ? "error" : "fallback");
    }
    if (balanceError !== null && usageError !== null) {
      if (hadDataRef.current) setNotice({ kind: "all", error: balanceError });
      else setError(balanceError);
    } else if (balanceError !== null) {
      setNotice({ kind: "balance", error: balanceError });
    } else if (usageError !== null) {
      setNotice({ kind: "usage", error: usageError });
    }
    if (force && props.sessionId !== void 0 && props.sessionId !== "") {
      void loadSessionUsage(props.sessionId, true);
    }
  };
  const loadSessionUsage = async (id, force) => {
    if (!force) setLoadingSessionUsage(true);
    try {
      const res = await fetchSessionUsage(id, force);
      if (sessionUsageIdRef.current !== id) return;
      if (res.ok && res.data !== void 0) {
        setSessionUsage(res.data);
        setSessionUsageError(null);
      } else {
        setSessionUsageError(res.error ?? null);
      }
    } catch (err) {
      if (sessionUsageIdRef.current === id) setSessionUsageError(errText(err));
    } finally {
      if (sessionUsageIdRef.current === id) setLoadingSessionUsage(false);
    }
  };
  (0, import_react4.useEffect)(() => {
    void load(false);
  }, []);
  (0, import_react4.useEffect)(() => {
    const id = props.sessionId;
    sessionUsageIdRef.current = id ?? null;
    if (id === void 0 || id === "") {
      setSessionUsage(null);
      setSessionUsageError(null);
      setLoadingSessionUsage(false);
      return;
    }
    setSessionUsage(null);
    setSessionUsageError(null);
    setLoadingSessionUsage(true);
    void loadSessionUsage(id, false);
  }, [props.sessionId]);
  (0, import_react4.useEffect)(() => {
    const timer = window.setInterval(() => setFreshnessNow(Date.now()), 3e4);
    return () => window.clearInterval(timer);
  }, []);
  const toggle = () => {
    const next = !widgetOn;
    setWidgetOn(next);
    widgetVisibleStore.set(next);
  };
  const widgetTabs = viewTabs.filter((tab) => tab.id !== "balance");
  const toggleWidgetTab = (id) => {
    const selected = widgetTabIds ?? widgetTabs.map((tab) => tab.id);
    const next = selected.includes(id) ? selected.filter((tabId) => tabId !== id) : [...selected, id];
    setWidgetTabIds(next);
    widgetTabIdsStore.set(next);
  };
  const changeLowBalance = (value) => {
    setLowBalance(value);
    lowBalanceStore.set(value);
  };
  const changeMonthlyBudget = (value) => {
    setMonthlyBudget(value);
    monthlyBudgetStore.set(value);
  };
  const changeWindowDays = (value) => {
    setWindowDays(value);
    usageWindowStore.set(value);
  };
  const changeChartMetric = (value) => {
    setChartMetric(value);
    chartMetricStore.set(value);
  };
  const primary = balance !== null && balance.balances.length > 0 ? balance.balances[0] : null;
  const recentDays = (usage?.daily ?? []).slice(-7);
  const avgDailyCost = recentDays.length > 0 ? recentDays.reduce((sum, d) => sum + d.cost, 0) / recentDays.length : 0;
  const balanceValue = primary !== null ? Number(primary.total) : Number.NaN;
  const balanceLow = lowBalance > 0 && Number.isFinite(balanceValue) && balanceValue < lowBalance;
  const daysLeft = avgDailyCost > 0 && Number.isFinite(balanceValue) ? balanceValue / avgDailyCost : null;
  const daysLeftText = daysLeft === null ? "\u2014" : daysLeft >= 365 ? t("balance.overYear") : t("balance.days", { count: daysLeft < 10 ? daysLeft.toFixed(1) : Math.round(daysLeft) });
  const runwayTitle = daysLeft === null ? t("balance.noRunway", { days: recentDays.length || 7 }) : t("balance.runwayTitle", { days: recentDays.length, cost: fmt(avgDailyCost) });
  const activeWindow = usage?.windows.find((window2) => window2.days === windowDays) ?? null;
  const activeWindowName = windowName(windowDays, t);
  const dailyBars = (activeWindow?.daily ?? []).map((d) => ({
    label: windowDays === 365 ? d.date.slice(5).replace("-", "/") : d.date.slice(8, 10),
    value: chartMetricValue(chartMetric, d),
    title: t("chart.tooltip", {
      head: d.date,
      tokens: fmtInt(d.total),
      cost: fmt(d.cost),
      calls: t("common.calls", { count: d.calls })
    })
  }));
  const hourlyBars = (activeWindow?.hourly ?? []).map((h) => ({
    label: String(h.hour),
    value: chartMetricValue(chartMetric, h),
    title: t("chart.tooltip", {
      head: t("chart.hourPoint", { hour: h.hour }),
      tokens: fmtInt(h.total),
      cost: fmt(h.cost),
      calls: t("common.calls", { count: h.calls })
    })
  }));
  const chartPeak = (barMode === "daily" ? dailyBars : hourlyBars).reduce((peak, bar) => bar.value > peak ? bar.value : peak, 0);
  const chartPeakText = chartMetric === "cost" ? `\xA5${fmt(chartPeak)}` : chartMetric === "calls" ? t("common.callsShort", { count: fmtInt(chartPeak) }) : `${fmtCompact(chartPeak, locale)} tokens`;
  const modelList = [...activeWindow?.models ?? []].sort((a, b) => b.cost - a.cost);
  const canonicalModels = [...usage?.models ?? []].sort((a, b) => b.cost - a.cost);
  const availableModelKeys = new Set(modelList.map(modelKeyOf));
  const effectiveSelection = selectedModels.filter((k) => availableModelKeys.has(k));
  const colorOf = (key) => {
    const index = canonicalModels.findIndex((m) => modelKeyOf(m) === key);
    return MODEL_COLORS[(index < 0 ? 0 : index) % MODEL_COLORS.length];
  };
  const modelCostTotal = modelList.reduce((sum, m) => sum + m.cost, 0);
  const grouped = effectiveSelection.map((key) => {
    const m = modelList.find((x) => modelKeyOf(x) === key);
    const name2 = m === void 0 ? key : modelNameOf(m, t);
    const color = colorOf(key);
    if (barMode === "daily") {
      return {
        key,
        name: name2,
        color,
        bars: (m?.daily ?? []).map((p, i) => ({
          label: windowDays === 365 ? (activeWindow?.daily ?? [])[i]?.date.slice(5).replace("-", "/") ?? "" : (activeWindow?.daily ?? [])[i]?.date.slice(8, 10) ?? "",
          value: chartMetricValue(chartMetric, p),
          title: t("chart.tooltip", {
            head: `${name2} \xB7 ${(activeWindow?.daily ?? [])[i]?.date ?? ""}`,
            tokens: fmtInt(p.total),
            cost: fmt(p.cost),
            calls: t("common.calls", { count: p.calls })
          })
        }))
      };
    }
    return {
      key,
      name: name2,
      color,
      bars: (m?.hourly ?? []).map((p, i) => ({
        label: String(i),
        value: chartMetricValue(chartMetric, p),
        title: t("chart.tooltip", {
          head: `${name2} \xB7 ${t("chart.hourPoint", { hour: i })}`,
          tokens: fmtInt(p.total),
          cost: fmt(p.cost),
          calls: t("common.calls", { count: p.calls })
        })
      }))
    };
  });
  const dailyLabelEvery = windowDays === 7 ? 1 : windowDays === 30 ? 5 : windowDays === 90 ? 15 : 30;
  const dailyMinWidth = windowDays === 365 ? 1825 : void 0;
  const noticeText = notice === null ? null : t(
    notice.kind === "all" ? "error.refreshCached" : notice.kind === "balance" ? "error.balanceRefreshCached" : "error.usageRefreshCached",
    { error: localizeApiError(notice.error, t, "error.query") }
  );
  const errorText = error === null ? null : localizeApiError(error, t, "error.query");
  const composerSafeAreaStyle = {
    "--dq-composer-h": `${composerHeight ?? COMPOSER_FALLBACK_PX}px`
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-balance", ref: rootRef, style: composerSafeAreaStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-status-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-status-messages", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "span",
          {
            className: `dq-sync dq-sync--${syncState}`,
            role: "status",
            "aria-live": "polite",
            title: usageUpdatedAt === null ? t("status.neverSynced") : t("status.usageTime", { time: new Date(usageUpdatedAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai" }) }),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-sync-dot", "aria-hidden": "true" }),
              syncStatusText(syncState, usageUpdatedAt, freshnessNow, t)
            ]
          }
        ),
        noticeText !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-warn", children: noticeText }),
        errorText !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-error", children: errorText })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          className: "dq-refresh-btn",
          title: t("status.forceRefresh"),
          disabled: refreshing,
          "aria-busy": refreshing,
          onClick: () => {
            void load(true);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `dq-refresh-icon${refreshing ? " dq-refresh-icon--spin" : ""}`, children: "\u21BB" }),
            refreshing ? t("status.refreshing") : t("status.refresh")
          ]
        }
      )
    ] }),
    balanceLow && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-alert", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-alert-icon", "aria-hidden": "true", children: "!" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: t("alert.lowTitle", { balance: fmt(balanceValue), currency: primary?.currency, threshold: fmt(lowBalance) }) }),
        daysLeft !== null && t("alert.runway", { days: daysLeftText }),
        t("common.period"),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("a", { className: "dq-alert-link", href: "https://platform.deepseek.com/top_up", target: "_blank", rel: "noreferrer", children: t("alert.topUp") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card dq-card--primary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("balance.title") }),
      primary !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-balance-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("balance.remaining") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "details",
            {
              className: "dq-stat-value dq-remaining",
              open: remainingHovering || remainingManuallyOpened,
              onPointerEnter: () => setRemainingHovering(true),
              onPointerLeave: () => setRemainingHovering(false),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  "summary",
                  {
                    title: t("balance.breakdownTitle"),
                    onClick: (e) => {
                      e.preventDefault();
                      setRemainingManuallyOpened((v) => !v);
                    },
                    children: [
                      fmt(primary.total),
                      " ",
                      primary.currency
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-remaining-breakdown", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("balance.toppedUp", { amount: fmt(primary.toppedUp) }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-remaining-granted", children: t("balance.granted", { amount: fmt(primary.granted) }) })
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-label", children: t("balance.runway") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "details",
            {
              className: `dq-stat-value dq-runway${daysLeft !== null && daysLeft < 3 ? " dq-stat-value--bad" : ""}`,
              open: runwayHovering || runwayManuallyOpened,
              onPointerEnter: () => setRunwayHovering(true),
              onPointerLeave: () => setRunwayHovering(false),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "summary",
                  {
                    title: t("balance.runwayBreakdownTitle"),
                    onClick: (e) => {
                      e.preventDefault();
                      setRunwayManuallyOpened((v) => !v);
                    },
                    children: daysLeftText
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-runway-detail", children: runwayTitle })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("common.status"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: `dq-stat-value${balance?.isAvailable === false ? " dq-stat-value--bad" : " dq-stat-value--ok"}`, children: balance?.isAvailable === false ? t("common.unavailable") : t("common.available") }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("balance.todayConsumed"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "div",
          {
            className: "dq-stat-value",
            title: balance?.todayConsumed == null ? t("balance.todayConsumedEmpty") : t("balance.todayConsumedTitle"),
            children: balance?.todayConsumed == null ? "\u2014" : `${fmt(balance.todayConsumed)} ${primary?.currency ?? ""}`
          }
        ) })
      ] }) : loadingBalance ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BalanceSkeleton, {}) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("balance.empty") })
    ] }),
    props.sessionId !== void 0 && props.sessionId !== "" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card dq-card--primary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("sessionUsage.title") }),
      sessionUsage !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionUsageCard, { data: sessionUsage }) : loadingSessionUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionUsageSkeleton, {}) : sessionUsageError !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty dq-empty--error", children: localizeApiError(sessionUsageError, t, "error.query") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("sessionUsage.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card dq-card--primary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("overview.title") }),
      usage !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-period-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Period, { label: t("overview.today"), period: usage.summary.today, previous: usage.summary.yesterday, compare: t("overview.vsYesterday") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Period, { label: t("overview.month"), period: usage.summary.month, previous: usage.summary.lastMonthToDate, compare: t("overview.vsLastMonth") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Period,
          {
            label: t("overview.total"),
            period: { total: usage.totals.total, cost: usage.totals.cost, calls: usage.totals.calls }
          }
        )
      ] }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-period-grid", children: [0, 1, 2].map((i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-period", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 40, h: 11 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 104, h: 24 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 132, h: 11 })
      ] }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("overview.empty") }),
      usage !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        BudgetMeter,
        {
          spent: usage.summary.month.cost,
          budget: monthlyBudget,
          onConfigure: () => budgetInputRef.current?.focus()
        }
      ),
      usage !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PricingNote, { pricing: usage.pricing })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card dq-card--primary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("usage.trendTitle") }),
        usage !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(UsageWindowPicker, { value: windowDays, onChange: changeWindowDays }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ExportMenu, { usage })
        ] })
      ] }),
      usage !== null && activeWindow !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-usage-totals", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("usage.windowInput", { window: activeWindowName }), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtCompact(activeWindow.totals.input, locale) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("common.output"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtCompact(activeWindow.totals.output, locale) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("common.cacheHit"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtCompact(activeWindow.totals.cache, locale) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Stat, { label: t("usage.modelCalls"), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-stat-value", children: fmtInt(activeWindow.totals.calls) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-chart-block-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-chart-title", children: [
            barMode === "daily" ? t("chart.dailyTitle", { window: activeWindowName, metric: chartMetricName(chartMetric, t) }) : t("chart.hourlyTitle", { window: activeWindowName, metric: chartMetricName(chartMetric, t) }),
            chartPeak > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-chart-peak", children: t("chart.peak", { value: chartPeakText }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-chart-controls", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ModelPicker, { models: modelList, selected: effectiveSelection, colorOf, onChange: setSelectedModels }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ChartMetricPicker, { value: chartMetric, onChange: changeChartMetric }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-chart-switch", role: "tablist", "aria-label": t("chart.dimensionLabel"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": barMode === "daily",
                  className: `dq-chart-switch-btn${barMode === "daily" ? " dq-chart-switch-btn--on" : ""}`,
                  onClick: () => setBarMode("daily"),
                  children: t("chart.daily")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": barMode === "hourly",
                  className: `dq-chart-switch-btn${barMode === "hourly" ? " dq-chart-switch-btn--on" : ""}`,
                  onClick: () => setBarMode("hourly"),
                  children: t("chart.hourly")
                }
              )
            ] })
          ] })
        ] }),
        activeWindow.totals.calls === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("chart.noWindowData", { window: activeWindowName }) }) : grouped.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            GroupedBars,
            {
              series: grouped,
              height: barMode === "daily" ? 120 : 100,
              labelEvery: barMode === "daily" ? dailyLabelEvery : 3,
              minWidth: barMode === "daily" ? dailyMinWidth : void 0
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-legend", children: grouped.map((s) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dq-legend-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-legend-swatch", style: { background: s.color } }),
            s.name
          ] }, s.key)) })
        ] }) : barMode === "daily" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Bars, { data: dailyBars, height: 120, labelEvery: dailyLabelEvery, minWidth: dailyMinWidth }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Bars, { data: hourlyBars, height: 100, labelEvery: 3 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CoverageDiagnostics, { coverage: usage.coverage })
      ] }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(UsageSkeleton, {}) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("chart.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("heatmap.title") }),
      usage !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-chart-title", children: t("chart.heatmapTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Heatmap, { data: usage.heatmap })
      ] }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(HeatmapSkeleton, {}) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("chart.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("peak.title") }),
      usage !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PeakCard, { split: usage.peakSplit, pricing: usage.pricing, currentCost: usage.totals.cost }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-peak-track" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-peak-figures", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 120, h: 11 }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 96, h: 20 })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("peak.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("cache.title") }),
      usage !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CacheCard, { totals: usage.totals }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-cache-figures", children: [60, 96, 72].map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-stat", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w, h: 11 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 72, h: 20 })
      ] }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("cache.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("models.title", { window: activeWindowName }) }),
      activeWindow !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ModelRanking, { models: modelList, totalCost: modelCostTotal, colorOf }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank", children: [0, 1].map((i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-rank-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 148, h: 13 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-rank-track" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 230, h: 11 })
      ] }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("models.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("sessions.title", { window: activeWindowName }) }),
      activeWindow !== null ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SessionRanking, { sessions: activeWindow.sessions, count: activeWindow.sessionCount, totalCost: activeWindow.totals.cost }) : loadingUsage ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-sessions", children: [0, 1, 2].map((i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-session", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 200, h: 13 }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-session-track" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Skel, { w: 250, h: 11 })
      ] }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-empty", children: t("sessions.empty") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-card-title", children: t("settings.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-links-title", children: t("links.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-links", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Link, { href: "https://platform.deepseek.com/usage", children: t("links.usage") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Link, { href: "https://platform.deepseek.com/api_keys", children: t("links.apiKey") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Link, { href: "https://status.deepseek.com", children: t("links.status") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dq-toggle", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { type: "checkbox", checked: widgetOn, onChange: toggle }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("settings.widget") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-toggle-hint", children: t("settings.widgetHint") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting dq-setting--tabs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-setting-label", id: "dq-widget-tabs-label", children: t("settings.widgetTabs") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting-control dq-widget-tabs", role: "group", "aria-labelledby": "dq-widget-tabs-label", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dq-widget-tab-list", children: widgetTabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dq-widget-tab", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "input",
              {
                type: "checkbox",
                checked: widgetTabIds === null || widgetTabIds.includes(tab.id),
                onChange: () => toggleWidgetTab(tab.id)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: tab.label })
          ] }, tab.id)) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-setting-hint", children: widgetTabs.length === 0 ? t("settings.widgetTabsEmpty") : t("settings.widgetTabsHint") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { className: "dq-setting-label", htmlFor: "dq-low-balance", children: t("settings.lowBalance") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting-control", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              id: "dq-low-balance",
              className: "dq-number",
              type: "number",
              min: 0,
              step: 1,
              value: lowBalance,
              onChange: (e) => changeLowBalance(Math.max(0, Number(e.target.value) || 0))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dq-setting-hint", children: lowBalance > 0 ? t("settings.lowBalanceOn", { amount: fmt(lowBalance), currency: primary?.currency ?? "CNY" }) : t("settings.lowBalanceOff") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("label", { className: "dq-setting-label", htmlFor: "dq-monthly-budget", children: t("settings.monthlyBudget") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dq-setting-control", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              ref: budgetInputRef,
              id: "dq-monthly-budget",
              className: "dq-number",
              type: "number",
              min: 0,
              step: 10,
              value: monthlyBudget,
              "aria-describedby": "dq-monthly-budget-hint",
              onChange: (e) => changeMonthlyBudget(Math.max(0, Number(e.target.value) || 0))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { id: "dq-monthly-budget-hint", className: "dq-setting-hint", children: monthlyBudget > 0 ? t("settings.monthlyBudgetOn", { amount: fmt(monthlyBudget) }) : t("settings.monthlyBudgetOff") })
        ] })
      ] })
    ] })
  ] });
}

// src/client/message-cost.tsx
var import_react5 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var fmtTurnCost = (cost) => cost.toLocaleString(void 0, {
  minimumFractionDigits: cost > 0 && cost < 0.01 ? 4 : 2,
  maximumFractionDigits: cost > 0 && cost < 0.01 ? 6 : 4
});
var cachedData = (sessionId) => {
  const response = getCachedSessionUsage(sessionId);
  return response?.ok === true ? response.data ?? null : null;
};
function MessageCost({ sessionId, messageId }) {
  const { t } = useI18n();
  const [data, setData] = (0, import_react5.useState)(() => cachedData(sessionId));
  (0, import_react5.useEffect)(() => {
    setData(cachedData(sessionId));
    const unsubscribe = subscribeSessionUsage(sessionId, () => setData(cachedData(sessionId)));
    const hit = cachedData(sessionId)?.turns.some((turn2) => turn2.messageId === messageId) ?? false;
    if (!hit) void fetchSessionUsage(sessionId);
    return unsubscribe;
  }, [messageId, sessionId]);
  const turn = data?.turns.find((candidate) => candidate.messageId === messageId);
  if (turn === void 0) return null;
  const amount = `\xA5 ${fmtTurnCost(turn.cost)}`;
  const tooltip = t("messageCost.tooltip");
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "span",
    {
      className: "dq-message-cost",
      tabIndex: 0,
      "data-dq-tooltip": tooltip,
      "aria-label": t("messageCost.aria", { amount }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dq-message-cost-separator", "aria-hidden": true, children: "\xB7" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dq-message-cost-amount", children: amount })
      ]
    }
  );
}

// src/client/styles.ts
var css = `
.dsh-quota-root{position:absolute;right:16px;bottom:16px;z-index:2147483000;pointer-events:auto;opacity:1;visibility:visible;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.45;color:var(--dsw-alias-label-primary,#1f2328);transition:left .28s cubic-bezier(.22,1,.36,1),top .28s cubic-bezier(.22,1,.36,1),opacity .16s ease-out,visibility 0s linear}
.dsh-quota-root.dsh-quota-root--hidden{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease-out,visibility 0s linear .14s}
.dsh-quota-root.dsh-quota-dragging{transition:none}
.dsh-quota-card,.dsh-quota-card *{box-sizing:border-box}
.dsh-quota-card{background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:12px 14px;min-width:208px;max-width:270px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.dsh-quota-root.dsh-quota-dragging .dsh-quota-card{cursor:grabbing;box-shadow:0 12px 32px rgba(0,0,0,.28)}
.dsh-quota-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;min-width:0}
.dsh-quota-title{font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary,#1f2328);display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.dsh-quota-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-quota-grip{color:var(--dsw-alias-label-secondary,#59636e);opacity:.7;font-size:11px;letter-spacing:0;cursor:grab;flex:none}
.dsh-quota-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2da44e);flex:none}
.dsh-quota-dot--error{background:var(--dsw-alias-state-error-primary,#cf222e)}
.dsh-quota-dot--warn{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dsh-quota-total--low{color:var(--dsw-alias-state-warning-primary,#9a6700)!important}
.dsh-quota-dot--idle{background:var(--dsw-alias-label-secondary,#59636e);opacity:.6}
.dsh-quota-collapsed-total-row{margin-top:6px}
.dsh-quota-collapsed-total{font-weight:700;font-size:15px;color:var(--dsw-alias-state-business-primary,#0969da);font-variant-numeric:tabular-nums}
.dsh-quota-actions{display:flex;gap:2px;flex:none}
.dsh-quota-btn{border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#59636e);padding:3px 7px;border-radius:6px;font-size:13px;line-height:1}
.dsh-quota-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1f2328)}
.dsh-quota-btn:active:not(:disabled){transform:scale(.92)}
.dsh-quota-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px}
.dsh-quota-btn:disabled{opacity:.5;cursor:default}
.dsh-quota-body{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-remaining-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dsh-quota-total{font-size:24px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.dsh-quota-currency{font-size:14px;font-weight:600;margin-left:3px;color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-row{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:12px}
.dsh-quota-label{color:var(--dsw-alias-label-secondary,#59636e)}
.dsh-quota-value{color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dsh-quota-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-message-cost{position:relative;display:inline-flex;align-items:center;order:10;gap:10px;height:28px;color:var(--dsw-alias-label-tertiary,#59636e);font-size:12px;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:help}
.dq-message-cost-separator{cursor:default}
.dq-message-cost-amount{text-decoration-line:underline;text-decoration-style:dotted;text-decoration-color:currentColor;text-underline-offset:4px}
.dq-message-cost:hover{color:var(--dsw-alias-label-secondary,#3f4852)}
.dq-message-cost:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px;border-radius:4px}
.dq-message-cost::after{content:attr(data-dq-tooltip);position:absolute;left:0;top:calc(100% + 6px);z-index:2147483001;width:max-content;max-width:min(240px,calc(100vw - 24px));padding:6px 9px;border-radius:8px;background:var(--dsw-alias-bg-inverse,#1f2328);color:var(--dsw-alias-label-inverse,#fff);box-shadow:0 6px 18px rgba(0,0,0,.22);font-size:12px;font-weight:400;line-height:1.45;text-align:left;white-space:normal;pointer-events:none;opacity:0;visibility:hidden;transform:translateY(-3px);transition:opacity .12s ease-out,transform .12s cubic-bezier(.22,1,.36,1),visibility 0s linear .12s}
.dq-message-cost:hover::after,.dq-message-cost:focus-visible::after{opacity:1;visibility:visible;transform:translateY(0);transition:opacity .12s ease-out,transform .12s cubic-bezier(.22,1,.36,1),visibility 0s linear}
@media (hover:hover){
  [data-time-hover-root] .dq-message-cost{opacity:0;transition:opacity 80ms ease}
  [data-time-hover-root]:hover .dq-message-cost,[data-time-hover-root]:focus-within .dq-message-cost{opacity:1}
}
/* \u5361\u7247\u95F4\u8DDD\uFF08\u6B64\u5904 gap\uFF09\u523B\u610F\u5927\u4E8E\u5361\u5185\u5C0F\u8282\u95F4\u8DDD\uFF08margin-top:12/14/16px \u90A3\u4E00\u6863\uFF09\uFF0C\u5236\u9020"\u5361\u7247\u5916\u758F\u3001\u5361\u7247\u5185\u5BC6"\u7684
   \u758F\u5BC6\u5BF9\u6BD4\uFF1A24px \u76F8\u5BF9\u5361\u5185\u6700\u5927\u6863 16px \u4ECD\u6709 1.5 \u500D\u7EA7\u5DEE\uFF0C\u76F8\u5BF9\u5E38\u89C1\u6863 12px \u6709 2 \u500D\u7EA7\u5DEE\uFF0C\u4E0D\u4E0E .dq-card \u7684
   padding\uFF0816px/20px\uFF0C\u5361\u7247\u5185\u90E8\u547C\u5438\u611F\uFF0C\u8F6E\u6B21 36 \u5DF2\u5B9A\uFF09\u6DF7\u540C\u3002 */
.dq-balance{display:flex;flex-direction:column;gap:24px;padding:20px 24px 48px;max-width:860px;margin:0 auto;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
@media (max-width:620px){.dq-balance{box-sizing:border-box;max-width:calc(100vw - 56px);padding:16px 16px calc(var(--dq-composer-h,126px) + 16px)}}
.dq-card{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:12px;padding:16px}
.dq-card-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:0 0 12px;letter-spacing:.02em}
.dq-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.dq-card-head .dq-card-title{margin:0}
.dq-card-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}
/* \u4E3B\u5361\u7247\uFF08\u4F59\u989D/\u5F53\u524D\u4F1A\u8BDD\u6D88\u8017/\u6D88\u8017\u6982\u89C8/\u7528\u91CF\u8D8B\u52BF\uFF0C\u8F6E\u6B21 45 \u65B0\u589E\u300C\u5F53\u524D\u4F1A\u8BDD\u6D88\u8017\u300D\uFF09\u89C6\u89C9\u6743\u91CD\u9AD8\u4E8E\u6B21\u7EA7\u5206\u6790
   \u5361\u7247\u4E0E\u5BFC\u822A\u7C7B\u5361\u7247\uFF1A\u53EA\u8C03\u6392\u7248\u5C5E\u6027\u2014\u2014\u5185\u8FB9\u8DDD\u3001\u6807\u9898\u5B57\u53F7\u5B57\u91CD\u4E0E\u53D6\u8272\u3001\u8FB9\u6846\u6DF1\u6D45\u2014\u2014\u4E0D\u5F15\u5165\u65B0\u914D\u8272\u4F53\u7CFB\u3002\u4E24\u6761\u89C4\u5219
   \u4E0E\u4E0A\u9762\u7684\u57FA\u7840\u89C4\u5219\u540C\u4E3A\u5355\u7C7B\u9009\u62E9\u5668\u4E14\u6E90\u7801\u987A\u5E8F\u66F4\u9760\u540E\uFF0C\u5929\u7136\u8986\u76D6\uFF0C\u4E0D\u9700\u8981 !important\u3002\u6B21\u7EA7\u5206\u6790\u5361\u7247\uFF08\u7528\u91CF
   \u70ED\u529B\u56FE/\u9AD8\u5CF0\u95F2\u65F6/\u7F13\u5B58\u547D\u4E2D/\u6A21\u578B\u6392\u884C/\u4F1A\u8BDD\u6392\u884C\uFF09\u4E0E\u5BFC\u822A\u7C7B\u5361\u7247\uFF08\u8BBE\u7F6E\uFF0C\u542B\u8F6E\u6B21 39 \u5E76\u5165\u7684\u5B98\u65B9\u5E73\u53F0\u94FE\u63A5\uFF09\u90FD\u4E0D\u52A0
   \u8FD9\u4E2A\u4FEE\u9970\u7C7B\uFF0C\u7EF4\u6301\u539F\u6709 .dq-card \u57FA\u7EBF\uFF0C\u5F62\u6210\u4E24\u6863\u6743\u91CD\u3002\u300C\u5F53\u524D\u4F1A\u8BDD\u6D88\u8017\u300D\u5347\u7EA7\u4E3A\u4E3B\u5361\u7247\u7684\u7406\u7531\uFF1A\u5B83\u548C\u4F59\u989D\u4E00\u6837\u662F
   \u6253\u5F00\u8FD9\u4E2A\u300C\u989D\u5EA6\u300Dtab \u65F6\u4E0A\u4E0B\u6587\u6700\u76F4\u63A5\u76F8\u5173\u7684\u6570\u5B57\uFF08\u8FD9\u4E2A tab \u6302\u5728\u5177\u4F53\u4F1A\u8BDD\u5185\u90E8\uFF0C\u89C1 DESIGN_NOTES\u300C\u4FE1\u606F\u5C42\u7EA7\u300D\uFF09\uFF0C
   \u4E0D\u5C5E\u4E8E\u539F\u6709\u8D26\u6237\u5168\u5C40\u5C42\u7EA7 1-3 \u7684\u4EFB\u4F55\u4E00\u7EA7\uFF0C\u800C\u662F\u4E0E\u4E4B\u6B63\u4EA4\u7684\u53E6\u4E00\u4E2A\u7EF4\u5EA6\uFF0C\u4F46\u540C\u6837\u662F\u9996\u5C4F\u5FC5\u8BFB\uFF0C\u56E0\u6B64\u540C\u6837\u7ED9
   primary \u6743\u91CD\uFF0C\u4E0D\u65B0\u5F00\u7B2C\u4E09\u6863\u3002 */
.dq-card--primary{padding:20px;border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.12))}
.dq-card--primary .dq-card-title{font-size:13px;font-weight:700;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-window-switch{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.08))}
.dq-window-btn{border:0;border-radius:6px;padding:4px 8px;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;white-space:nowrap;cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
.dq-window-btn:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-window-btn--on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#1f2328);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.dq-window-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
@media (max-width:620px){.dq-card-head{align-items:flex-start;flex-wrap:wrap}.dq-card-actions{width:100%;justify-content:space-between}}
.dq-export{position:relative;flex:none}
.dq-export-btn{min-width:58px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease,background .15s ease}
.dq-export-btn:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-export-btn--done{border-color:rgba(45,164,78,.35);color:var(--dsw-alias-state-success-primary,#1a7f37);background:rgba(45,164,78,.08)}
.dq-export-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:180px;padding:6px;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);display:flex;flex-direction:column;gap:2px}
.dq-export-menu button{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;border:0;border-radius:6px;padding:7px 8px;background:transparent;color:var(--dsw-alias-label-primary,#1f2328);font-size:12px;text-align:left;cursor:pointer}
.dq-export-menu button:hover,.dq-export-menu button:focus-visible{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}
.dq-export-menu button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-1px}
.dq-export-menu small{font-size:10.5px;font-weight:400;color:var(--dsw-alias-label-tertiary,#59636e);white-space:nowrap}
/* Small-text tier system (\u8F6E\u6B21 41 \u6536\u655B): two whole-pixel tiers replace what used to be four values
   (11/11.5/12/12.5px) spaced only 0.5px apart \u2014 a gap browsers subpixel-round away, so it read as one
   size with extra maintenance cost, not an actual visual hierarchy. 11px = "micro" chrome the user
   scans rather than reads (dt-style stat/period labels, delta/status/coverage pills, share %, tags,
   the widget grip) \u2014 kept as-is. 12px = "secondary text" (section titles, hint/footnote/legend/sub
   prose, table cells, tooltip copy, alert/empty-state sentences, and filter/segmented-control button
   labels like .dq-window-btn/.dq-chart-switch-btn, which are the same control family and should share
   one size) \u2014 absorbed the old 11.5px and 12.5px selectors, all by rounding toward the nearer tier
   (11.5\u219212 grows slightly for legibility, safe because none of the affected containers are width-
   capped; 12.5\u219212 shrinks by 0.5px on two full-sentence blocks, imperceptible). Weight/color still do
   the job of separating titles from body text within the 12px tier, same as before this merge. Do not
   reintroduce a fractional-px value in this range; if a selector needs to stand apart from these two,
   it belongs in an already-established different tier (10px icon glyphs, 13px+ hero-adjacent text). */
.dq-balance-grid{display:flex;flex-wrap:wrap;gap:12px 24px}
.dq-stat{min-width:110px}
.dq-stat-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e);margin-bottom:2px}
.dq-stat-value{font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-stat-value--ok{color:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-stat-value--bad{color:var(--dsw-alias-state-error-primary,#cf222e)}
/* \u8F6E\u6B21 43: .dq-runway is a controlled <details> (see dashboard.tsx) \u2014 hover/toggle state
   drives the real open attribute now, so .dq-runway-detail only needs to react to [open];
   an unopened <details>'s non-summary children don't actually render in current Chromium no
   matter what display value author CSS gives them (:hover{display:block} alone is a dead end). */
.dq-runway{position:relative}
.dq-runway>summary{display:inline-block;list-style:none;border-radius:4px;cursor:pointer;text-decoration:underline dotted var(--dsw-alias-border-l2,rgba(0,0,0,.25));text-underline-offset:4px}
.dq-runway>summary::-webkit-details-marker{display:none}
.dq-runway>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:3px}
.dq-runway-detail{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;max-width:240px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:normal;font-size:12px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-runway[open] .dq-runway-detail{display:block}
/* hero number for the balance, matching .dq-period-cost; relies on cascade order (declared after
   .dq-stat-value, same specificity) to win over the .dq-stat-value it's paired with in JSX \u2014 keep it below */
/* \u8F6E\u6B21 47: .dq-remaining is a controlled <details> too now (see dashboard.tsx), same reason as
   .dq-runway above \u2014 an unopened <details>'s non-summary children don't actually render in current
   Chromium regardless of author display value, so the old :hover{display:flex} branch was dead code. */
.dq-remaining{position:relative;font-size:22px;font-weight:680;letter-spacing:-.01em;line-height:1.25}
.dq-remaining>summary{display:inline-block;list-style:none;border-radius:4px;cursor:pointer;text-decoration:underline dotted var(--dsw-alias-border-l2,rgba(0,0,0,.25));text-underline-offset:4px}
.dq-remaining>summary::-webkit-details-marker{display:none}
.dq-remaining>summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:3px}
.dq-remaining-breakdown{display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:20;flex-direction:column;gap:4px;padding:8px 10px;background:var(--dsw-alias-bg-overlay,#ffffff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:nowrap;font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-remaining[open] .dq-remaining-breakdown{display:flex}
.dq-remaining-granted{color:var(--dsw-alias-label-tertiary,#59636e);font-weight:400;font-size:11px}
/* narrow screens: .dq-balance-grid wraps its 3 stats onto separate lines, so the absolutely-positioned
   .dq-remaining-breakdown/.dq-runway-detail popovers can float down over whichever stat now sits in the
   next row (e.g. "\u4F59\u989D\u660E\u7EC6" open covering "\u9884\u8BA1\u53EF\u7528"'s clickable summary) \u2014 force each stat onto its own
   full-width row and switch both popovers to normal in-flow layout so an open one pushes its own row
   taller instead of overlaying a sibling; desktop keeps the original hover-overlay behavior unchanged */
@media (max-width:620px){
  .dq-balance-grid .dq-stat{flex:1 1 100%}
  .dq-remaining-breakdown,.dq-runway-detail{position:static;margin-top:6px;box-shadow:none;max-width:none;white-space:normal}
}
.dq-period-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0}
.dq-period{min-width:0;padding:4px 16px}
.dq-period:first-child{padding-left:0}
.dq-period:last-child{padding-right:0}
.dq-period+.dq-period{border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
@media (max-width:620px){.dq-period-grid{grid-template-columns:1fr}.dq-period,.dq-period:first-child,.dq-period:last-child{padding:12px 0}.dq-period:first-child{padding-top:2px}.dq-period+.dq-period{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-left:0}}
.dq-period-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
.dq-period-label{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e)}
.dq-period-cost{font-size:22px;font-weight:680;letter-spacing:-.01em;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;line-height:1.25}
.dq-period-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);margin-top:2px;font-variant-numeric:tabular-nums;line-height:1.45}
.dq-budget{margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-budget--unset{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-budget-action{border:0;background:transparent;padding:3px 4px;border-radius:5px;color:var(--dsw-alias-state-business-primary,#0969da);font:inherit;font-weight:600;white-space:nowrap;cursor:pointer}
.dq-budget-action:hover{text-decoration:underline;text-underline-offset:3px}
.dq-budget-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px}
.dq-budget-head,.dq-budget-meta{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dq-budget-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-budget-amount{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-budget-track{height:8px;margin-top:8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-budget-fill{width:100%;height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);transform-origin:left center;transition:transform .35s cubic-bezier(.22,1,.36,1)}
.dq-budget--risk .dq-budget-fill{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-budget--over .dq-budget-fill{background:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-budget-meta{margin-top:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-budget--risk .dq-budget-meta span:last-child{color:var(--dsw-alias-state-warning-primary,#9a6700);font-weight:600}
.dq-budget--over .dq-budget-meta{color:var(--dsw-alias-state-error-primary,#cf222e);font-weight:600}
@media (max-width:620px){.dq-budget-head,.dq-budget-meta,.dq-budget--unset{align-items:flex-start;flex-direction:column;gap:4px}}
.dq-delta{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:1px 6px;border-radius:999px;white-space:nowrap;cursor:help;font-variant-numeric:tabular-nums}
.dq-delta--up{color:var(--dsw-alias-state-warning-primary,#9a6700);background:rgba(191,135,0,.14)}
.dq-delta--down{color:var(--dsw-alias-state-success-primary,#1a7f37);background:rgba(45,164,78,.14)}
.dq-delta--flat,.dq-delta--new{color:var(--dsw-alias-label-tertiary,#59636e);background:rgba(120,130,150,.14);font-weight:500}
.dq-delta-label{font-weight:400;opacity:.8}
.dq-pricing{margin-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));padding-top:10px}
.dq-pricing-summary{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);cursor:pointer;list-style:none;width:fit-content;border-radius:6px;padding:2px 4px;margin-left:-4px}
.dq-pricing-summary::-webkit-details-marker{display:none}
.dq-pricing-summary::before{content:"\u25B8";display:inline-block;font-size:10px;opacity:.7;transition:transform .15s ease}
.dq-pricing[open] .dq-pricing-summary::before{transform:rotate(90deg)}
.dq-pricing-summary:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-pricing-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-pricing-now{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;color:var(--dsw-alias-label-tertiary,#59636e);background:rgba(120,130,150,.14)}
.dq-pricing-now--peak{color:var(--dsw-alias-state-warning-primary,#9a6700);background:rgba(191,135,0,.14)}
.dq-pricing-body{margin-top:10px;overflow-x:auto}
.dq-pricing-table{border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;min-width:100%}
.dq-pricing-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);padding:4px 12px 4px 0;white-space:nowrap;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-pricing-table td{padding:4px 12px 4px 0;color:var(--dsw-alias-label-primary,#1f2328);white-space:nowrap;vertical-align:top}
.dq-pricing-table tbody tr+tr td{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}
.dq-pricing-foot{margin:8px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage{margin-top:16px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-coverage-summary{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;cursor:pointer;list-style:none;width:fit-content;max-width:100%;margin-left:-4px;padding:3px 4px;border-radius:6px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage-summary::-webkit-details-marker{display:none}
.dq-coverage-summary::before{content:"\u25B8";display:inline-block;font-size:10px;opacity:.7;transition:transform .15s ease}
.dq-coverage[open] .dq-coverage-summary::before{transform:rotate(90deg)}
.dq-coverage-summary:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-coverage-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-coverage-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-coverage-status{padding:1px 7px;border-radius:999px;background:rgba(45,164,78,.14);color:var(--dsw-alias-state-success-primary,#1a7f37);font-size:11px;font-weight:600}
.dq-coverage--warn .dq-coverage-status{background:rgba(191,135,0,.14);color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-coverage-brief{font-size:12px;font-variant-numeric:tabular-nums}
.dq-coverage-body{margin-top:10px;padding:11px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.06))}
.dq-coverage-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 20px;margin:0}
.dq-coverage-metrics div{min-width:0}
.dq-coverage-metrics dt{font-size:11px;color:var(--dsw-alias-label-tertiary,#59636e)}
.dq-coverage-metrics dd{margin:3px 0 0;font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-coverage-range,.dq-coverage-note,.dq-coverage-warning{margin:9px 0 0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-coverage-range{font-variant-numeric:tabular-nums}
.dq-coverage-warning{padding:8px 10px;border-radius:8px;background:rgba(191,135,0,.10);color:var(--dsw-alias-state-warning-primary,#7a5200)}
@media (max-width:620px){.dq-coverage-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.dq-coverage-brief{flex-basis:100%;margin-left:19px}}
.dq-peak-track{height:8px;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);opacity:.85;overflow:hidden}
.dq-peak-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-warning-primary,#bf8700);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-peak-legend{display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-peak-legend span{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch--peak{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-legend-swatch--offpeak{background:var(--dsw-alias-state-success-primary,#2da44e);opacity:.85}
.dq-peak-figures{display:flex;flex-wrap:wrap;gap:12px 32px;margin-top:14px}
.dq-peak-delta{font-size:11px;font-weight:500;margin-left:8px;color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-peak-delta--save{color:var(--dsw-alias-state-success-primary,#1a7f37)}
.dq-peak-foot{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-cache-figures{display:flex;flex-wrap:wrap;gap:12px 32px;margin-bottom:12px}
.dq-muted-value{color:var(--dsw-alias-label-secondary,#59636e)!important;font-weight:550}
.dq-stat-value--warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-cache-track{height:8px;border-radius:999px;background:var(--dsw-alias-state-warning-primary,#bf8700);overflow:hidden}
.dq-cache-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-success-primary,#2da44e);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-cache-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-cache-legend span{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch--hit{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-legend-swatch--miss{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-cache-foot{margin:10px 0 0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-sessions{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.dq-session{display:flex;flex-direction:column;gap:5px;min-width:0}
.dq-session-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dq-session-title{font-size:13px;font-weight:550;color:var(--dsw-alias-label-primary,#1f2328);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-session-cost{font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;flex:none}
.dq-session-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-session-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-business-primary,#4176e6);transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-session-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums;line-height:1.5}
/* The \u300C\u5F53\u524D\u4F1A\u8BDD\u6D88\u8017\u300Dcard uses this class on a bare <p> (no flex-gap parent
   to lean on, unlike the .dq-session usage above), so it needs its own
   explicit spacing rather than falling back to the browser's implicit <p>
   margin \u2014 this project always declares spacing explicitly. */
p.dq-session-sub{margin:8px 0}
.dq-session-foot{margin:12px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary,#59636e)}
/* \u8F6E\u6B21 46: each ranking row is now a <details> whose <summary> wraps the existing
   head/track/sub trio unchanged (in a flex-column body div) plus a leading chevron \u2014
   same disclosure grammar as .dq-pricing/.dq-coverage above (hidden native marker,
   rotating glyph, :focus-visible ring), just applied to a multi-line summary instead
   of a single line. .dq-session-details needs its own min-width:0 because it is now
   the flex item inside .dq-session that the ellipsis chain must shrink through. */
.dq-session-details{min-width:0}
.dq-session-details>summary{list-style:none;cursor:pointer}
.dq-session-details>summary::-webkit-details-marker{display:none}
.dq-session-summary{display:flex;align-items:flex-start;gap:8px;border-radius:8px;padding:4px;margin:-4px}
.dq-session-summary:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}
.dq-session-summary:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-session-chevron{flex:none;width:12px;margin-top:4px;font-size:10px;line-height:1;color:var(--dsw-alias-label-tertiary,#59636e);transition:transform .15s ease}
.dq-session-details[open] .dq-session-chevron{transform:rotate(90deg)}
.dq-session-summary-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
/* Expanded body reuses the same shaded-inset language as .dq-coverage-body (10px
   gap from the summary, 11px/12px padding, 10px radius, bg-layer-2) rather than
   inventing a new "nested panel" look. SessionUsageCard renders inside unchanged. */
.dq-session-expand{margin-top:10px;padding:11px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.06))}
.dq-rank{display:flex;flex-direction:column;gap:14px}
.dq-rank-row{display:flex;flex-direction:column;gap:5px;min-width:0}
.dq-rank-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dq-rank-name{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:550;color:var(--dsw-alias-label-primary,#1f2328);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-rank-cost{display:inline-flex;align-items:baseline;gap:8px;font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums;flex:none}
.dq-rank-share{font-size:11px;font-weight:500;color:var(--dsw-alias-label-tertiary,#59636e);min-width:30px;text-align:right}
.dq-rank-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.12));overflow:hidden}
.dq-rank-fill{height:100%;border-radius:999px;transition:width .35s cubic-bezier(.22,1,.36,1)}
.dq-rank-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums;line-height:1.5}
.dq-alert{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:10px;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-warning-primary,#7a5200);background:rgba(191,135,0,.12);border:1px solid rgba(191,135,0,.35)}
.dq-alert-icon{flex:none;width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-state-warning-primary,#bf8700);color:#fff;font-weight:700;font-size:12px;line-height:18px;text-align:center}
.dq-alert strong{font-weight:650}
.dq-alert-link{margin-left:8px;color:inherit;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
.dq-setting{display:flex;align-items:flex-start;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-setting-label{font-size:13px;color:var(--dsw-alias-label-primary,#1f2328);padding-top:6px;flex:none}
.dq-setting-control{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
.dq-setting-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);line-height:1.5}
.dq-number{width:82px;padding:5px 8px;font-size:13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}
.dq-number:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;border-color:transparent}
.dq-links-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2328);margin:0 0 8px}
.dq-links{display:flex;flex-wrap:wrap;gap:8px}
.dq-link{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-state-business-primary,#0969da);text-decoration:none;font-size:13px;font-weight:500;cursor:pointer}
.dq-link:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
/* .dq-toggle is the first settings control after the links row (\u8F6E\u6B21 39 merge) \u2014 its own
   border-top separates the "\u5FEB\u6377\u5165\u53E3" links (originally the standalone \u5B98\u65B9\u5E73\u53F0 card, renamed
   in \u8F6E\u6B21 39 fix-round-1 to read as part of \u8BBE\u7F6E's own navigation area) from \u8BBE\u7F6E controls
   inside the merged card, same 14px/14px/border-l1 recipe as .dq-setting so the two
   sub-sections read at equal weight. */
.dq-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;margin-top:14px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.dq-toggle input{width:16px;height:16px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer}
.dq-toggle-hint{margin:5px 0 0 26px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-widget-tabs{align-items:flex-start;flex-direction:column;gap:7px}
.dq-widget-tab-list{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px}
.dq-widget-tab{display:inline-flex;align-items:center;gap:7px;min-height:28px;color:var(--dsw-alias-label-primary,#1f2328);font-size:12px;cursor:pointer}
.dq-widget-tab input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer;flex:none}
.dq-toggle input:focus-visible,.dq-model-item input:focus-visible,.dq-widget-tab input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-link:focus-visible,.dq-model-btn:focus-visible,.dq-chart-switch-btn:focus-visible,.dq-export-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-usage-totals{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:16px}
/* value itself (number+unit, e.g. "9999.9\u4E07") must never break across lines inside its own column \u2014
   nowrap+ellipsis is a defensive floor for all widths; the actual fix for the realistic 320px 2-col
   case is the font-size drop below, which keeps every measured stress value comfortably under the
   83px column width without ever hitting the ellipsis fallback (see round 38 PROGRESS entry) */
.dq-usage-totals .dq-stat-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:620px){.dq-usage-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}.dq-usage-totals .dq-stat{min-width:0}.dq-usage-totals .dq-stat-value{font-size:13px}}
.dq-chart-peak{margin-left:10px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary,#59636e);font-variant-numeric:tabular-nums}
.dq-chart-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#59636e);margin:16px 0 8px}
.dq-chart-title:first-of-type{margin-top:0}
.dq-chart-block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0 8px}
.dq-chart-block-head .dq-chart-title{margin:0}
.dq-chart-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;flex-wrap:wrap}
@media (max-width:620px){.dq-chart-block-head{align-items:flex-start;flex-direction:column}.dq-chart-controls{width:100%}}
.dq-model-picker{position:relative}
.dq-model-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.dq-model-btn:hover{border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-model-btn::after{content:"\u25BE";font-size:10px;opacity:.7}
.dq-model-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:190px;max-height:280px;overflow-y:auto;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:6px;display:flex;flex-direction:column;gap:2px}
.dq-model-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary,#1f2328)}
.dq-model-item:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}
.dq-model-item input{width:14px;height:14px;accent-color:var(--dsw-alias-state-business-primary,#0969da);cursor:pointer;flex:none}
.dq-model-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dq-model-item--all{border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));padding-bottom:8px;margin-bottom:2px;border-radius:6px}
.dq-model-tag{color:var(--dsw-alias-label-tertiary,#59636e);font-size:11px;flex:none}
.dq-bar-group{display:flex;flex-direction:column-reverse;width:100%}
.dq-bar-group .dq-bar{flex:0 0 auto;width:100%;border-radius:0}
.dq-bar-group .dq-bar:first-child{border-radius:0 0 2px 2px}
.dq-bar-group .dq-bar:last-child{border-radius:2px 2px 0 0}
.dq-bar-group .dq-bar:not(:last-child){box-shadow:inset 0 1px 0 rgba(0,0,0,.18)}
.dq-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e)}
.dq-legend-item{display:inline-flex;align-items:center;gap:6px}
.dq-legend-swatch{width:10px;height:10px;border-radius:3px;flex:none}
.dq-chart-switch{display:inline-flex;align-items:center;gap:2px;padding:2px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));border-radius:999px;flex:none}
.dq-chart-switch-btn{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1;padding:5px 12px;border-radius:999px;cursor:pointer;transition:background .15s ease,color .15s ease}
.dq-chart-switch-btn:hover{color:var(--dsw-alias-label-primary,#1f2328)}
.dq-chart-switch-btn--on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#1f2328);box-shadow:0 1px 3px rgba(0,0,0,.14)}
.dq-chart-wrap{position:relative}
.dq-bars-scroll{overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
.dq-tip{position:absolute;transform:translate(-50%,14px);z-index:40;pointer-events:none;background:var(--dsw-alias-bg-inverse,#1f2328);color:var(--dsw-alias-label-inverse,#fff);border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.55;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.28);font-variant-numeric:tabular-nums}
.dq-tip--above{transform:translate(-50%,calc(-100% - 8px))}
.dq-tip-head{font-weight:650;margin-bottom:2px}
.dq-tip-row{opacity:.85}
.dq-bars{display:flex;align-items:flex-end;gap:2px;width:100%}
.dq-bar-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch}
.dq-bar{background:var(--dsw-alias-state-business-primary,#4176e6);border-radius:2px 2px 0 0;min-height:1px;transition:filter .12s ease}
.dq-bar-col{cursor:default}
.dq-bar-col,.dq-bar,.dq-heat-cell{scroll-margin-block-start:24px;scroll-margin-block-end:160px}
.dq-bar-col:hover .dq-bar{filter:brightness(1.18) saturate(1.1)}
.dq-bar-col:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-2px;border-radius:3px}
.dq-bar:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;filter:brightness(1.18) saturate(1.1);position:relative;z-index:2}
.dq-bar-col--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:-2px;border-radius:3px}
.dq-bar-col--pinned .dq-bar{filter:brightness(1.18) saturate(1.1)}
.dq-bar--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;filter:brightness(1.18) saturate(1.1);position:relative;z-index:2}
.dq-heat-cell:not(.dq-heat-cell--pad):hover{outline:1.5px solid var(--dsw-alias-label-primary,#1f2328);outline-offset:1px}
.dq-heat-cell:not(.dq-heat-cell--pad):focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;position:relative;z-index:2}
.dq-heat-cell--pinned{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:1px;position:relative;z-index:2}
.dq-bar-label{font-size:9px;color:var(--dsw-alias-label-tertiary,#59636e);text-align:center;margin-top:3px;overflow:visible;white-space:nowrap}
.dq-heat{display:flex;flex-direction:column;gap:8px;max-width:100%}
.dq-heat-scroll{overflow-x:auto;padding-bottom:2px}
.dq-heatmap{display:flex;gap:3px}
.dq-heat-week{display:flex;flex:1 1 0;min-width:6px;flex-direction:column;gap:3px}
.dq-heat-cell{width:100%;aspect-ratio:1/1;border-radius:3px;flex:none}
.dq-heat-cell--pad{background:transparent}
.dq-heat-months{display:flex;gap:3px;margin-top:4px}
.dq-heat-month{flex:1 1 0;min-width:6px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary,#59636e);white-space:nowrap;overflow:visible}
.dq-heat-key{width:12px;height:12px;border-radius:2px;flex:none}
.dq-heat-scale{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,#59636e);align-self:flex-end}
.dq-heat-scale>span:first-child{margin-right:2px}
.dq-heat-scale>span:last-child{margin-left:2px}
.dq-muted{color:var(--dsw-alias-label-secondary,#59636e)}
.dq-error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-crash{margin:10px 0 14px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,rgba(120,130,150,.10));border-radius:8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary,#cf222e);white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.dq-empty{color:var(--dsw-alias-label-secondary,#59636e);font-size:12px;line-height:1.6;padding:6px 0}
/* Error-state modifier for a card body that has nothing else to show (mirrors the .dq-stat-value--ok/
   --bad/--warn pattern: same layout as .dq-empty, declared after it so this color wins at equal
   specificity). Used by the current-session card when its own fetch failed and there is no prior
   data to fall back to \u2014 the status-row .dq-error/.dq-warn spans are for the account-wide balance/
   usage fetch, this is the per-card equivalent. */
.dq-empty--error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-skel{background:linear-gradient(90deg,rgba(125,135,155,.10) 25%,rgba(125,135,155,.20) 37%,rgba(125,135,155,.10) 63%);background-size:400% 100%;border-radius:5px;animation:dq-shimmer 1.5s ease-in-out infinite}
.dq-stat .dq-skel+.dq-skel{margin-top:6px}
.dq-skel-bars{display:flex;align-items:flex-end;gap:2px;width:100%;height:120px;margin-top:10px}
.dq-skel-bar{flex:1 1 0;min-width:0;border-radius:2px 2px 0 0}
@keyframes dq-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
.dq-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:20px}
.dq-status-messages{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.dq-status-row .dq-warn,.dq-status-row .dq-error{font-size:12px;line-height:1.45}
.dq-sync{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#59636e);font-variant-numeric:tabular-nums}
.dq-sync-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary,#8c959f)}
.dq-sync--fresh .dq-sync-dot{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dq-sync--syncing .dq-sync-dot{background:var(--dsw-alias-state-business-primary,#4176e6);animation:dq-sync-pulse 1.2s ease-in-out infinite}
.dq-sync--fallback{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.dq-sync--fallback .dq-sync-dot{background:var(--dsw-alias-state-warning-primary,#bf8700)}
.dq-sync--error{color:var(--dsw-alias-state-error-primary,#cf222e)}
.dq-sync--error .dq-sync-dot{background:var(--dsw-alias-state-error-primary,#cf222e)}
@keyframes dq-sync-pulse{50%{opacity:.35;transform:scale(.8)}}
.dq-refresh-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#59636e);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;transition:border-color .15s ease,color .15s ease}
.dq-refresh-btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary,#0969da);color:var(--dsw-alias-state-business-primary,#0969da)}
.dq-refresh-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#0969da);outline-offset:2px}
.dq-refresh-btn:disabled{cursor:default;opacity:.6}
.dq-refresh-icon{display:inline-block;line-height:1}
.dq-refresh-icon--spin{animation:dq-spin .9s linear infinite}
@keyframes dq-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .dsh-quota-root,.dsh-quota-root *,
  .dsh-quota-root *::before,.dsh-quota-root *::after,
  .dq-message-cost,.dq-message-cost::after,
  .dq-balance,.dq-balance *,
  .dq-balance *::before,.dq-balance *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
`;

// src/client/widget.tsx
var import_react6 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
var MARGIN = 16;
var CORNER_KEY = "widget.corner";
var COLLAPSED_KEY = "widget.collapsed";
var isCorner = (value) => value === "tl" || value === "tr" || value === "bl" || value === "br";
var MIN_REGION_HEIGHT = 140;
function getBounds(node) {
  const fallback = { left: 0, top: 0, right: 1e5, bottom: 1e5 };
  if (node === null) return fallback;
  const frame = getShellFrame(node);
  if (frame === null) return fallback;
  const frameRect = frame.getBoundingClientRect();
  let left = frameRect.left;
  let right = frameRect.right;
  let top = frameRect.top;
  const mainRect = getMainColumn(frame)?.getBoundingClientRect() ?? null;
  if (mainRect !== null && mainRect.width > 0) {
    left = mainRect.left;
    right = mainRect.right;
    top = mainRect.top;
  } else {
    const sidebarRect = frame.children[0]?.getBoundingClientRect() ?? null;
    if (sidebarRect !== null) left = sidebarRect.right;
  }
  let bottom = frameRect.bottom;
  const headerRect = slotBox(frame, "conversation.session.header", "child");
  if (headerRect !== null && headerRect.bottom > top && headerRect.bottom < bottom - MIN_REGION_HEIGHT) {
    top = headerRect.bottom;
  }
  const composerRect = slotBox(frame, "conversation.composer.dock", "ancestor");
  if (composerRect !== null && composerRect.top < bottom && composerRect.top > top + MIN_REGION_HEIGHT) {
    bottom = composerRect.top;
  }
  return { left, top, right, bottom };
}
function cornerPos(corner, node, bounds) {
  const rect = node?.getBoundingClientRect();
  const w = rect?.width ?? 0;
  const h = rect?.height ?? 0;
  const xLeft = bounds.left + MARGIN;
  const yTop = bounds.top + MARGIN;
  const xRight = bounds.right - w - MARGIN;
  const yBottom = bounds.bottom - h - MARGIN;
  if (corner === "tl") return { x: xLeft, y: yTop };
  if (corner === "tr") return { x: xRight, y: yTop };
  if (corner === "bl") return { x: xLeft, y: yBottom };
  return { x: xRight, y: yBottom };
}
function QuotaWidget(props) {
  const { t } = useI18n();
  const sessionId = props.useSessions((state) => state.current);
  const [visible, setVisible] = (0, import_react6.useState)(widgetVisibleStore.get());
  (0, import_react6.useEffect)(() => widgetVisibleStore.subscribe(() => setVisible(widgetVisibleStore.get())), []);
  const [quotaViewActive2, setQuotaViewActive] = (0, import_react6.useState)(quotaViewActiveStore.get());
  (0, import_react6.useEffect)(() => quotaViewActiveStore.subscribe(() => setQuotaViewActive(quotaViewActiveStore.get())), []);
  const [lowBalance, setLowBalance] = (0, import_react6.useState)(lowBalanceStore.get());
  (0, import_react6.useEffect)(() => lowBalanceStore.subscribe(() => setLowBalance(lowBalanceStore.get())), []);
  const [selectedTabIds, setSelectedTabIds] = (0, import_react6.useState)(widgetTabIdsStore.get());
  (0, import_react6.useEffect)(() => widgetTabIdsStore.subscribe(() => setSelectedTabIds(widgetTabIdsStore.get())), []);
  const [viewTabs, setViewTabs] = (0, import_react6.useState)(() => props.views.list());
  (0, import_react6.useEffect)(() => props.views.subscribe(() => setViewTabs(props.views.list())), [props.views]);
  const [activeViewId, setActiveViewId] = (0, import_react6.useState)(null);
  const cachedBalance = getCachedBalance();
  const [data, setData] = (0, import_react6.useState)(cachedBalance?.data ?? null);
  const [error, setError] = (0, import_react6.useState)(null);
  const [loading, setLoading] = (0, import_react6.useState)(cachedBalance === null);
  const [collapsed, setCollapsed] = (0, import_react6.useState)(() => loadPref(COLLAPSED_KEY, isBoolean, false));
  const [pos, setPos] = (0, import_react6.useState)(null);
  const [corner, setCorner] = (0, import_react6.useState)(() => loadPref(CORNER_KEY, isCorner, "br"));
  const [dragging, setDragging] = (0, import_react6.useState)(false);
  const rootRef = (0, import_react6.useRef)(null);
  const dragRef = (0, import_react6.useRef)(null);
  const readUsage = () => {
    const cached = getCachedUsage();
    return { data: cached?.ok === true ? cached.data ?? null : null, at: getCachedUsageAt() };
  };
  const [usage, setUsage] = (0, import_react6.useState)(readUsage);
  (0, import_react6.useEffect)(() => subscribeUsage(() => setUsage(readUsage())), []);
  const readSessionUsage = (id) => {
    if (id === void 0) return null;
    const response = getCachedSessionUsage(id);
    return response?.ok === true ? response.data ?? null : null;
  };
  const [sessionUsage, setSessionUsage] = (0, import_react6.useState)(() => readSessionUsage(sessionId));
  (0, import_react6.useEffect)(() => {
    setSessionUsage(readSessionUsage(sessionId));
    if (sessionId === void 0) return;
    const unsubscribe = subscribeSessionUsage(sessionId, () => setSessionUsage(readSessionUsage(sessionId)));
    void fetchSessionUsage(sessionId);
    return unsubscribe;
  }, [sessionId]);
  (0, import_react6.useLayoutEffect)(() => {
    const viewIds = viewTabs.map((tab) => tab.id);
    const read = () => {
      const next = getActiveConversationViewId(getShellFrame(rootRef.current), viewIds);
      setActiveViewId((previous) => previous === next ? previous : next);
    };
    read();
    const frame = getShellFrame(rootRef.current);
    let observer = null;
    if (frame !== null && typeof MutationObserver === "function") {
      observer = new MutationObserver(read);
      observer.observe(frame, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected"] });
    }
    const poll = setInterval(read, 1e3);
    return () => {
      observer?.disconnect();
      clearInterval(poll);
    };
  }, [sessionId, viewTabs]);
  const load = async (showLoading, force = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetchBalance(force);
      if (res.ok && res.data !== void 0) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error ?? "");
      }
    } catch (err) {
      setData(null);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };
  (0, import_react6.useEffect)(() => {
    void load(true);
    const id = setInterval(() => {
      void load(false);
    }, 6e4);
    return () => clearInterval(id);
  }, []);
  (0, import_react6.useLayoutEffect)(() => {
    if (!visible || quotaViewActive2) return;
    const node = rootRef.current;
    if (node === null) return;
    const place = () => {
      if (dragRef.current !== null) return;
      const next = cornerPos(corner, node, getBounds(node));
      setPos((prev) => prev !== null && prev.x === next.x && prev.y === next.y ? prev : next);
    };
    place();
    const frame = getShellFrame(node);
    let observer = null;
    if (frame !== null && typeof ResizeObserver === "function") {
      observer = new ResizeObserver(place);
      observer.observe(frame);
      const main = getMainColumn(frame);
      if (main !== null) observer.observe(main);
    }
    window.addEventListener("resize", place);
    const poll = setInterval(place, 1e3);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      clearInterval(poll);
    };
  }, [visible, quotaViewActive2, corner, collapsed]);
  const snapToNearest = (session) => {
    const node = rootRef.current;
    if (node === null) return;
    const { width: w, height: h, bounds: b } = session;
    const corners = [
      { c: "tl", x: b.left + MARGIN, y: b.top + MARGIN },
      { c: "tr", x: b.right - w - MARGIN, y: b.top + MARGIN },
      { c: "bl", x: b.left + MARGIN, y: b.bottom - h - MARGIN },
      { c: "br", x: b.right - w - MARGIN, y: b.bottom - h - MARGIN }
    ];
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let best = corners[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of corners) {
      const ccx = candidate.x + w / 2;
      const ccy = candidate.y + h / 2;
      const distance = (ccx - cx) ** 2 + (ccy - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
    setCorner(best.c);
    savePref(CORNER_KEY, best.c);
    setPos({ x: best.x, y: best.y });
  };
  const endDrag = (snap) => {
    const session = dragRef.current;
    if (session === null) return;
    dragRef.current = null;
    setDragging(false);
    const node = rootRef.current;
    if (node !== null && typeof node.releasePointerCapture === "function") {
      try {
        node.releasePointerCapture(session.pointerId);
      } catch {
      }
    }
    if (snap) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => snapToNearest(session));
      } else {
        snapToNearest(session);
      }
    }
  };
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (target !== null && typeof target.closest === "function" && target.closest("button") !== null) return;
    const node = rootRef.current;
    if (node === null) return;
    const bounds = getBounds(node);
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      bounds
    };
    node.setPointerCapture(e.pointerId);
    setDragging(true);
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    const session = dragRef.current;
    if (session === null || session.pointerId !== e.pointerId) return;
    if ((e.buttons & 1) === 0) {
      endDrag(true);
      return;
    }
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const maxX = session.bounds.right - session.width - MARGIN;
    const maxY = session.bounds.bottom - session.height - MARGIN;
    const minX = session.bounds.left + MARGIN;
    const minY = session.bounds.top + MARGIN;
    setPos({
      x: Math.max(minX, Math.min(session.originX + dx, maxX)),
      y: Math.max(minY, Math.min(session.originY + dy, maxY))
    });
  };
  const onPointerUp = (e) => {
    const session = dragRef.current;
    if (session === null || session.pointerId !== e.pointerId) return;
    endDrag(true);
  };
  if (!visible) return null;
  const allowedOnActiveView = activeViewId === null ? sessionId === void 0 : activeViewId !== "balance" && (selectedTabIds === null || selectedTabIds.includes(activeViewId));
  const hidden = quotaViewActive2 || !allowedOnActiveView;
  const primary = data !== null && data.balances.length > 0 ? data.balances[0] : null;
  const balanceValue = primary !== null ? Number(primary.total) : Number.NaN;
  const low = lowBalance > 0 && Number.isFinite(balanceValue) && balanceValue < lowBalance;
  const dotClass = primary === null ? "dsh-quota-dot dsh-quota-dot--idle" : data?.isAvailable === false ? "dsh-quota-dot dsh-quota-dot--error" : low ? "dsh-quota-dot dsh-quota-dot--warn" : "dsh-quota-dot";
  const ageMinutes = usage.at === null ? null : Math.floor((Date.now() - usage.at) / 6e4);
  const usageAgeText = ageMinutes === null || ageMinutes < 1 ? t("widget.updatedNow") : t("widget.stale", { minutes: ageMinutes });
  const sessionCostRow = sessionUsage === null ? null : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-row", title: t("widget.sessionCostTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-label", children: t("widget.sessionCost") }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsh-quota-value", children: [
      "\xA5 ",
      fmtTurnCost(sessionUsage.cost)
    ] })
  ] });
  let body = null;
  if (!collapsed) {
    if (loading && data === null && error === null) {
      body = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: t("widget.loading") }),
        sessionCostRow
      ] });
    } else if (error !== null && data === null) {
      body = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsh-quota-error", children: localizeApiError(error, t, "error.query") }),
        sessionCostRow
      ] });
    } else if (primary !== null) {
      body = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsh-quota-remaining-label", children: t("balance.remaining") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { title: low ? t("widget.lowTitle", { amount: fmt(lowBalance) }) : void 0, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `dsh-quota-total${low ? " dsh-quota-total--low" : ""}`, children: fmt(primary.total) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-currency", children: primary.currency })
        ] }),
        usage.data !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-row", title: t("widget.todayCostTitle", { age: usageAgeText }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-label", children: t("widget.todayCost") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsh-quota-value", children: [
            "\xA5 ",
            fmt(usage.data.summary.today.cost)
          ] })
        ] }),
        sessionCostRow,
        data?.isAvailable === false && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-label", children: t("common.status") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-value dsh-quota-error", children: t("common.unavailable") })
        ] })
      ] });
    } else {
      body = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsh-quota-error", children: t("widget.noBalance") }),
        sessionCostRow
      ] });
    }
  }
  const style = pos !== null ? { left: `${pos.x}px`, top: `${pos.y}px`, right: "auto", bottom: "auto" } : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    "div",
    {
      className: `dsh-quota-root${dragging ? " dsh-quota-dragging" : ""}${hidden ? " dsh-quota-root--hidden" : ""}`,
      style,
      "aria-hidden": hidden,
      children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "div",
        {
          ref: rootRef,
          className: "dsh-quota-card",
          title: t("widget.dragCard"),
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: () => endDrag(false),
          onLostPointerCapture: () => endDrag(false),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-title", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-grip", title: t("widget.dragGrip"), children: "\u2807" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: dotClass }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsh-quota-name", children: t("widget.title") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsh-quota-actions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    className: "dsh-quota-btn",
                    type: "button",
                    title: t("widget.refresh"),
                    "aria-label": t("widget.refresh"),
                    disabled: loading,
                    onClick: () => {
                      void load(true, true);
                      void fetchUsage(true);
                      if (sessionId !== void 0) void fetchSessionUsage(sessionId, true);
                    },
                    children: "\u21BB"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "button",
                  {
                    className: "dsh-quota-btn",
                    type: "button",
                    title: collapsed ? t("widget.expand") : t("widget.collapse"),
                    "aria-label": collapsed ? t("widget.expandAria") : t("widget.collapseAria"),
                    "aria-expanded": !collapsed,
                    onClick: () => {
                      const next = !collapsed;
                      setCollapsed(next);
                      savePref(COLLAPSED_KEY, next);
                    },
                    children: collapsed ? "+" : "\u2212"
                  }
                )
              ] })
            ] }),
            collapsed && primary !== null && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsh-quota-collapsed-total-row", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: `dsh-quota-collapsed-total${low ? " dsh-quota-total--low" : ""}`, children: [
              fmt(primary.total),
              " ",
              primary.currency
            ] }) }),
            body
          ]
        }
      )
    }
  );
}

// src/client/views.ts
var labelOf = (entry) => {
  const { id = "", label } = entry.options;
  try {
    const resolved = typeof label === "function" ? label() : label;
    return typeof resolved === "string" && resolved !== "" ? resolved : id;
  } catch {
    return id;
  }
};
function conversationViewsSource(slots) {
  return {
    list: () => slots.entries("conversation.view").flatMap((entry) => entry.options.id === void 0 ? [] : [{ id: entry.options.id, label: labelOf(entry) }]),
    subscribe: (fn) => slots.subscribe("conversation.view", fn)
  };
}

// src/client/index.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var name = "dsh-usage-dashboard";
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-usage-dashboard: browser dictionaries");
  const t = ctx.locale.bind(NS);
  const views = conversationViewsSource(ctx.slots);
  if (typeof document !== "undefined") {
    const tag = document.createElement("style");
    tag.dataset.plugin = "dsh-usage-dashboard";
    tag.textContent = css;
    document.head.appendChild(tag);
  }
  void fetchBalance().catch(() => {
  });
  void fetchUsage().catch(() => {
  });
  ctx.slots.inject("shell.overlay", () => ctx.slots.register(
    { name: "shell.overlay", id: "deepseek-quota", order: 1e3, locale: NS, label: () => t("widget.title") },
    ({ t: slotT, useSessions }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LocaleProvider, { t: slotT, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ErrorBoundary, { t: slotT, silent: true, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(QuotaWidget, { useSessions, views }) }) })
  ));
  ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register(
    {
      name: "conversation.chat.assistant-actions",
      id: "dsh-usage-turn-cost",
      order: 5,
      locale: NS,
      label: () => t("messageCost.label")
    },
    ({ t: slotT, sessionId, messageId }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LocaleProvider, { t: slotT, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ErrorBoundary, { t: slotT, silent: true, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(MessageCost, { sessionId, messageId }) }) })
  ));
  ctx.slots.inject("conversation.view", () => ctx.slots.register(
    { name: "conversation.view", id: "balance", order: 20, locale: NS, label: () => t("nav.quota") },
    // `conversation.view` is a session-scoped slot, so the host injects its
    // standard session props (including `sessionId`) alongside `t` — this
    // plugin only destructures the two fields it needs, per the existing
    // "hand-write the minimal structural type" convention (see context.ts).
    // `sessionId` is typed optional defensively even though the host is
    // expected to always supply it: BalanceDashboard renders the current-
    // session card only when it actually has one, never throws either way.
    ({ t: slotT, sessionId }) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LocaleProvider, { t: slotT, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ErrorBoundary, { t: slotT, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(BalanceDashboard, { sessionId, views }) }) })
  ));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
