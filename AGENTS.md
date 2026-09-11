# AGENTS.md — dsh-usage-dashboard 本地 fork

> 任何 agent / 新会话进入本目录，先读这一页。细节按需展开：
> **《项目全记录.md》**（从头到尾的全过程）、**《修正记录.md》**（修正与对账的第一手细节）、
> **《记忆.md》**（速查卡 + 环境硬规则）。

## 这是什么

- DSH Web 插件 `@cassius0924/dsh-usage-dashboard` 的**本地 fork**（上游 [Cassius0924/dsh-usage-dashboard](https://github.com/Cassius0924/dsh-usage-dashboard)，MIT，base `v0.6.0` = `edf7c0a`）。
- 功能：宿主端读本机会话日志 + `GET /user/balance`，客户端在会话的「额度」tab 展示余额、今日/本月/累计消耗、
  模型与会话排行、缓存节省、峰谷分布、图片用量等。**费用是估算**，权威是官方账单与余额。
- **本目录同时是工作区和 git 仓库**：源码 + `lib/` 构建产物 + 完整历史；web profile 通过
  `file:~/Documents/dsh-usage-dashboard` 依赖它，所以任何 pnpm 操作都不会还原本地修复。

## 当前状态（2026-09-11）

| 项 | 值 |
|---|---|
| 版本 / 提交 | `0.6.0` / `7e49590`（合并上游 0.6.0 → 官方价格表对齐 → 文档） |
| 测试 | `node test/run.mjs` → **71/71** |
| 宿主 | DSH `0.1.5-rc.1`（`sessionPersistence` 已 handle 化，插件按代兼容新旧接口） |
| 部署位置 | `~/.dsh/profiles/web/node_modules/@cassius0924/dsh-usage-dashboard/` |
| 还原点 | tag `fork-before-0.6.0-20260911-182327`；备份 `dsh-auto-20260911-182629`、`dsh-auto-20260911-184217` |
| 待办 | host 端改动需**重启 `dsh web`** 才生效（纯客户端改动硬刷新即可） |

## 硬规则（违反会出事）

1. 改完跑 `pnpm run build`（或只改 JS 时 `node build-local.mjs`）+ `node test/run.mjs`。
2. 部署 = **复制**（构建产生新 inode，pnpm 的硬链接失效，`pnpm install` **不会**刷新）：
   ```bash
   SRC=~/Documents/dsh-usage-dashboard
   DST=~/.dsh/profiles/web/node_modules/@cassius0924/dsh-usage-dashboard
   rm -rf "$DST/lib" && cp -R "$SRC/lib" "$DST/lib"
   cp "$SRC/package.json" "$SRC/README.md" "$SRC/LICENSE" "$SRC/cordis.patch.yml" "$DST/"
   ```
3. 部署/插件操作前先留还原点：`bash ~/Documents/DSH备份/backup-dsh.sh "自动:..."`（preinstall 钩子不一定触发，要人工确认）。
4. 重启一律用**全局** `dsh web`；`pnpm dsh web` 会让 fail-soft 内核补丁失效，禁止使用。
5. 上游文件（`PROGRESS.md` / `LEARNINGS.md` / `TODO.md` / `DESIGN_NOTES.md`）保持上游原样；
   fork 的叙述写中文文档（《修正记录.md》/《项目全记录.md》/《记忆.md》）。

## fork 与上游的口径差异（改 `src/pricing.ts` 前必看）

1. **闲时减半规则**由 `PriceEra.halveCacheHit` 控制：**09-10 及以后 = `true`**（官方："空闲时段价格为高峰时段价格的一半"，
   三项全减半，含缓存命中价）；**08-17 – 09-10 档 = `false`**（当年按实际账单核对出的"缓存命中价不减半"，用它会低估约 27%）。
2. **周末 + 法定节假日全天闲时**：官方原文字面只写"周一至周五"；节假日这一条是本 fork 的额外口径，**尚无账单验证**。
3. **fork 独有**：跨会话 `messageId` 去重（子代理回放会让调用数虚高约 3 倍）、余额差值法「今日消耗（平台核算）」、
   跨天自动重置、凭证解析 10s 有界超时、额度页白屏轻推。
4. 官方价格页 <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>：本机 **`curl` 能抓**，
   而 `web_fetch` 会被"非公网 IP"拦掉——要核对价格就用 curl。

## 环境与口径事实

- 节假日表 `CN_HOLIDAYS` 目前覆盖 2024–2026，国务院公布新年度后补 `'MM-DD'` 行。
- 平台**没有**用量统计 API；金额只能靠余额差值核算，请求/tokens 只能靠本机会话日志（残余 2–5% 差异 = 非本机调用）。
- 本地/第三方模型会按 DeepSeek 官方价估算但实际不扣款（README 顶部有醒目警示，勿删）。
- 本机 npm CLI 不可用（`~/.npm` 缓存有 root 属主文件），registry 查询用 `pnpm view`。

## 常用命令

```bash
node test/run.mjs            # 71/71
pnpm run build               # esbuild + tsc 声明（注入版本 footer）
node build-local.mjs         # 只构建 JS，跳过 tsc
git log --oneline -20
```

## 升级上游

```bash
git fetch upstream --tags && git merge <tag>
# 合并后：重跑测试 → 逐条核对上面「口径差异」有没有被上游改写 → 重建 → 部署 → 重启 dsh web
```
