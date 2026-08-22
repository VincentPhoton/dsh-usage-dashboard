import type { ServerResponse } from 'node:http';
export declare function writeJson(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>): void;
