import assert from 'node:assert/strict'
import test from 'node:test'
import { createRevisionCache } from '../src/session-cache.ts'

test('a cache serves a value only for the exact revision it was stored under', () => {
  const cache = createRevisionCache<string>(1_000)
  cache.set('session-a', 'rev-1', 'first', 1)
  assert.equal(cache.get('session-a', 'rev-1'), 'first')
  // A different revision is a miss, never a stale hit: the log may have changed.
  assert.equal(cache.get('session-a', 'rev-2'), undefined)
  // A revision is only meaningful for the session it was observed on.
  assert.equal(cache.get('session-b', 'rev-1'), undefined)
})

test('a value stored without a revision is never served', () => {
  const cache = createRevisionCache<string>(1_000)
  // Callers that cannot prove freshness must keep re-reading, so storing is a
  // no-op and the weight stays at zero instead of leaking unverifiable entries.
  cache.set('session-a', undefined, 'unverifiable', 5)
  cache.set('session-b', '', 'unverifiable', 5)
  assert.equal(cache.get('session-a', undefined), undefined)
  assert.equal(cache.get('session-b', ''), undefined)
  assert.equal(cache.size(), 0)
  assert.equal(cache.weight(), 0)
})

test('the cache evicts least-recently-used entries once over its weight budget', () => {
  const cache = createRevisionCache<string>(3)
  cache.set('a', 'r1', 'A', 1)
  cache.set('b', 'r1', 'B', 1)
  cache.set('c', 'r1', 'C', 1)
  assert.equal(cache.weight(), 3)

  // Touch 'a' so 'b' becomes the least recently used, then overflow the budget.
  assert.equal(cache.get('a', 'r1'), 'A')
  cache.set('d', 'r1', 'D', 1)

  assert.equal(cache.size(), 3)
  assert.equal(cache.weight(), 3)
  assert.equal(cache.get('b', 'r1'), undefined, 'the least recently used entry is dropped first')
  assert.equal(cache.get('a', 'r1'), 'A')
  assert.equal(cache.get('c', 'r1'), 'C')
  assert.equal(cache.get('d', 'r1'), 'D')
})

test('an entry heavier than the whole budget is still stored', () => {
  const cache = createRevisionCache<string>(2)
  // Re-reading this on every request would be worse than holding it, and the
  // budget is a target rather than a hard cap for a single oversized session.
  cache.set('big', 'r1', 'BIG', 10)
  assert.equal(cache.get('big', 'r1'), 'BIG')
  assert.equal(cache.size(), 1)
})

test('retainOnly drops sessions that no longer exist', () => {
  const cache = createRevisionCache<string>(1_000)
  cache.set('keep-1', 'r1', 'one', 1)
  cache.set('keep-2', 'r1', 'two', 1)
  cache.set('gone', 'r1', 'three', 1)

  cache.retainOnly(['keep-1', 'keep-2'])
  assert.equal(cache.size(), 2)
  assert.equal(cache.weight(), 2)
  assert.equal(cache.get('gone', 'r1'), undefined)
  assert.equal(cache.get('keep-1', 'r1'), 'one')

  // A Set is accepted too, which is what the replay passes.
  cache.retainOnly(new Set(['keep-2']))
  assert.equal(cache.size(), 1)
  assert.equal(cache.get('keep-1', 'r1'), undefined)
})

test('re-storing the same session replaces its revision and does not double-count weight', () => {
  const cache = createRevisionCache<string>(1_000)
  cache.set('a', 'r1', 'old', 4)
  cache.set('a', 'r2', 'new', 6)
  assert.equal(cache.get('a', 'r1'), undefined)
  assert.equal(cache.get('a', 'r2'), 'new')
  assert.equal(cache.weight(), 6)
  assert.equal(cache.size(), 1)
})
