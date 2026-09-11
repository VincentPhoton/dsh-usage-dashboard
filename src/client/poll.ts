/**
 * Polling that gets out of the way.
 *
 * Two widget effects re-read host layout (and the dashboard's active view) on a
 * timer, because no observer reports every change: the session header can mount
 * *after* the overlay, and the composer can be resized without a window resize.
 * A one-second cadence for that is wasteful in a GUI the user leaves open all
 * day, all the more so while the tab is in the background: the reads force
 * style/layout work for a surface nobody is looking at.
 *
 * {@link useVisibleInterval} keeps the fallback poll but pauses it while the
 * document is hidden and fires once on the way back, so a returning tab is
 * correct immediately instead of after a full interval.
 */
import { useEffect, useRef } from 'react'

/** True while the page is hidden. False when there is no document at all, so
 *  an import in a non-DOM context degrades to "visible" rather than throwing. */
export function isPageHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

/**
 * Run `callback` every `intervalMs` while the page is visible, once whenever
 * the page becomes visible again, and never while it is hidden.
 */
export function useVisibleInterval(callback: () => void, intervalMs: number): void {
  const latest = useRef(callback)
  useEffect(() => { latest.current = callback })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const tick = (): void => {
      if (!isPageHidden()) latest.current()
    }
    const timer = window.setInterval(tick, intervalMs)
    const onVisibilityChange = (): void => {
      if (!isPageHidden()) latest.current()
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs])
}
