/**
 * localStorage-backed user preferences for the plugin.
 *
 * Everything the user deliberately sets (widget visibility, the corner it was
 * dragged to, whether it is collapsed) belongs here so a page refresh does not
 * throw the choice away. Keys share one prefix and carry a version suffix so
 * the shape can evolve without reading back stale values.
 *
 * Every read is validated by the caller's guard: a corrupted or hand-edited
 * entry falls back instead of poisoning the UI.
 */
export declare function loadPref<T>(key: string, isValid: (value: unknown) => boolean, fallback: T): T;
export declare function savePref(key: string, value: unknown): void;
export declare const isBoolean: (value: unknown) => boolean;
