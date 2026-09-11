import assert from 'node:assert/strict'
import test from 'node:test'
import { isPageHidden } from '../src/client/poll.ts'

test('isPageHidden treats a missing document as visible instead of throwing', () => {
  // The client bundle can be imported where no document exists (tests, a host
  // that renders it server-side). The guard must answer rather than crash, and
  // "visible" is the safe default: the poll simply keeps running.
  assert.equal(typeof document, 'undefined')
  assert.equal(isPageHidden(), false)
})
