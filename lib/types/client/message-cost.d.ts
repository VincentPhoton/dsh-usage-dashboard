/** Estimated spend contributed beside each completed chat turn. */
import { type ReactElement } from 'react';
export interface MessageCostProps {
    sessionId: string;
    messageId: string;
}
/** Small costs need more than the dashboard's two-decimal money formatter or
 * almost every individual turn would misleadingly read as ¥0.00. */
export declare const fmtTurnCost: (cost: number) => string;
export declare function MessageCost({ sessionId, messageId }: MessageCostProps): ReactElement | null;
