/**
 * Error boundary for the plugin's two slot entries.
 *
 * A slot component that throws while rendering takes its whole subtree down —
 * for the 「额度」 view that meant a blank tab, and the only thing that fixed it
 * was a browser profile with no localStorage. A crash should degrade to
 * something the user can act on, and it should never be the tab's silent
 * default state.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { Translate } from './i18n.tsx';
interface Props {
    /** Shown instead of the fallback UI when the surface has no room for it. */
    silent?: boolean;
    t: Translate;
    children: ReactNode;
}
interface State {
    message: string | null;
}
export declare class ErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(error: unknown): State;
    componentDidCatch(error: unknown, info: ErrorInfo): void;
    private readonly reset;
    render(): ReactNode;
}
export {};
