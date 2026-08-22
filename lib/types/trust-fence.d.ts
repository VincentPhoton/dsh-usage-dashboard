/**
 * Browser-trust fence for the plugin's own /api route — the same fences the
 * harness's /api gateway applies: the Host header must name a loopback
 * authority, a browser-marked cross-site request is refused, and an attached
 * Origin must be exactly this authority.
 */
import type { IncomingMessage } from 'node:http';
export declare function isTrustedApiRequest(req: IncomingMessage): boolean;
