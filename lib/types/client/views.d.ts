/** Live projection of the host's `conversation.view` slot ledger. */
export interface ConversationViewTab {
    id: string;
    label: string;
}
export interface ConversationViewsSource {
    list(): ConversationViewTab[];
    subscribe(fn: () => void): () => void;
}
export interface ConversationViewSlotEntry {
    options: {
        id?: string;
        label?: string | (() => string);
    };
}
export interface ConversationViewSlots {
    entries(name: string): ConversationViewSlotEntry[];
    subscribe(name: string, fn: () => void): () => void;
}
/** Build a source once at plugin apply-time. The ledger owns ordering, so the
 * same index also maps to the host's rendered tab buttons without relying on
 * hashed class names or translated labels. */
export declare function conversationViewsSource(slots: ConversationViewSlots): ConversationViewsSource;
