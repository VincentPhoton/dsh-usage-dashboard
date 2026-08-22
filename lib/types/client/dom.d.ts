/** Shared lookups into the DSH host shell DOM. Both the floating widget
 *  (keeping its drag bounds clear of the header/composer) and the dashboard
 *  (keeping its scroll content clear of the fixed composer on narrow
 *  viewports) need to find the same host elements — sharing the lookup here
 *  keeps the two readings of "where is the composer" from drifting apart.
 */
/** The shell's main column: the region between the sidebar and the details
 *  panel. Found through the stable `conversation` slot anchor rather than the
 *  hashed layout class names. */
export declare function getMainColumn(frame: HTMLElement): HTMLElement | null;
/** The laid-out box behind a slot (see `slotElement`), or null if the slot is
 *  not currently present or not yet laid out. */
export declare function slotBox(frame: HTMLElement, slot: string, side: 'child' | 'ancestor'): DOMRect | null;
/** The DSH shell frame — the element that hosts the sidebar, conversation
 *  column and fixed composer — found by walking up from any node inside our
 *  own plugin root via the stable `[data-shell-overlay]` anchor. */
export declare function getShellFrame(node: HTMLElement | null): HTMLElement | null;
/** The composer's laid-out element (the seat that reserves its space, not the
 *  0×0 slot wrapper), or null if the slot is not present in the current DOM
 *  (host markup changed, or mid-navigation). Callers that only need the box
 *  can call `.getBoundingClientRect()`; callers that want to observe size
 *  changes (e.g. `ResizeObserver`) need the element itself. */
export declare function getComposerElement(frame: HTMLElement | null): HTMLElement | null;
/** Resolve the active `conversation.view` id from the host's semantic tablist.
 * The DOM intentionally carries no view id, but it renders buttons in the
 * exact order of the slot ledger. Indexing into that same live ledger avoids
 * translated-label matching and remains compatible with third-party tabs. */
export declare function getActiveConversationViewId(frame: HTMLElement | null, viewIds: string[]): string | null;
