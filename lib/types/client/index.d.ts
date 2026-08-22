import type { ClientContext } from './context.ts';
/** Plugin identity for the client bundle. */
export declare const name = "dsh-usage-dashboard";
/** Services required before load. */
export declare const inject: string[];
/**
 * Mount the two surfaces.
 * @param ctx - client Cordis context.
 */
export declare function apply(ctx: ClientContext): void;
