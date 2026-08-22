import { type ReactElement, type ReactNode } from 'react';
import { type LocaleKey } from './locales.ts';
export type LocaleId = 'zh' | 'en';
export type Translate = (key: LocaleKey, params?: Record<string, unknown>) => string;
export declare const fallbackT: Translate;
export declare function LocaleProvider(props: {
    t: Translate;
    children: ReactNode;
}): ReactElement;
export declare function useI18n(): {
    t: Translate;
    locale: LocaleId;
};
/** Translate host error copy that predates stable machine-readable error codes. */
export declare function localizeApiError(message: string | undefined, t: Translate, fallback: LocaleKey): string;
