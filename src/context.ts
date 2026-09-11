/**
 * Structural service faces this plugin reads from the host Cordis context.
 * They are deliberately minimal: the plugin only touches the methods it
 * needs, so no extra `@deepseek-ai/dsh-*` type packages are required to
 * build it.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** One HTTP route served by the host web server. */
export interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

/** Structural face of the host `webServer` service. */
export interface WebServerFace {
  register(route: WebRoute): () => void
}

/** Structural face of the `credentials` service. */
export interface CredentialsFace {
  resolve(ref: string): Promise<{ value: string; source: string } | undefined>
}

/** Structural face of the `sessionPersistence` service.
 *
 *  Field set is a superset of both generations of `list()` entries: legacy
 *  hosts returned the header fields at the entry top, the snapshot-era host
 *  returns `{ header, revision, sizeBytes }`. Only the fields this plugin
 *  reads are declared. */
export interface SessionHeaderFace {
  id?: string
  sessionId?: string
  /** Handle-era `list()` returns snapshots; the header (and its id) rides
   *  one level deeper at `snapshot.header.id` instead of at the entry top. */
  header?: SessionHeaderFace
  /** Unix epoch milliseconds the session was created, when the host exposes it. */
  createdAt?: number
  /** Delegation depth: absent/0 for a top-level session, parent depth + 1 for a
   *  subagent child. Reads as an *inheritance* axis: a child session is seeded
   *  with its ancestor's event prefix, so for one event id the lowest-depth
   *  copy is the originating session and every deeper copy is a replay. */
  delegationDepth?: number
  /** Whether this session carries a fork-inherited event prefix. */
  isSeeded?: boolean
  /** Snapshot-era opaque change token (see {@link SessionSnapshotFace}). */
  revision?: string
  /** Snapshot-era physical artifact size in bytes. */
  sizeBytes?: number
}

/**
 * One `list()`/`stat()` observation. `revision` is an opaque change token that
 * may be compared for equality against the same session id from the same
 * service instance: equal revisions promise an unchanged log, so a cached fold
 * can be reused without reading the file again. Anything else must be re-read.
 */
export interface SessionSnapshotFace {
  revision?: string
  sizeBytes?: number
}

export interface TokenUsageFace {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  reasoningTokens?: number
}

/** Structural face of an `image` content block's attachment ref — only the
 *  fields the image-cost fold reads. Width/height drive the official token
 *  estimate; bytes is reported raw. */
export interface ImageAttachmentFace {
  width?: number
  height?: number
  bytes?: number
  name?: string
  mediaType?: string
}

/** Structural face of one content block, recursive to cover image blocks
 *  nested inside tool-result blocks (tool screenshots). */
export interface ContentBlockFace {
  type?: string
  text?: string
  attachment?: ImageAttachmentFace
  toolCallId?: string
  content?: ContentBlockFace[]
}

export interface SessionEventFace {
  type?: string
  time?: number
  data?: {
    usage?: TokenUsageFace
    header?: { config?: { provider?: string; model?: string } }
    /** Stable turn/step identity and the finalized message id carried by
     * modern `assistant/message` events. Optional for legacy logs. */
    turn?: number
    step?: number
    message?: { id?: string; content?: ContentBlockFace[] }
    /** Payload of a `session/title` event. */
    title?: string
    /** Payload of a `user/message` event: the user message record itself,
     *  whose content blocks may carry `image` blocks. */
    content?: ContentBlockFace[]
  }
}

/** One open read channel onto a session log (`SessionPersistence.open`). */
export interface SessionHandleFace {
  read(offset?: number, length?: number): Promise<{ events?: readonly SessionEventFace[] }>
  close(): Promise<void>
}

export interface SessionPersistenceFace {
  list(): Promise<SessionHeaderFace[]>
  /** Legacy hosts: whole-log read from a seq. Removed in handle-era DSH. */
  readFrom?(id: string, fromSeq: number): Promise<{ events?: SessionEventFace[] }>
  /** Handle-era hosts: per-session read handle, preferred when present. */
  open?(id: string, access: 'read'): Promise<SessionHandleFace>
  /** Metadata-only observation of one session, used to decide whether a cached
   *  fold is still valid. Optional: without it the plugin simply re-reads. */
  stat?(id: string): Promise<SessionSnapshotFace | undefined>
}

/** The host context this plugin's apply() receives. */
export interface HostContext extends Context {
  webServer: WebServerFace
  credentials: CredentialsFace
  sessionPersistence: SessionPersistenceFace
}
