/**
 * Process-local FIFO critical section for multi-table compensated writes.
 * Storage-domain tables only promise atomic single-key updates; serializing
 * definition transactions prevents one rollback from erasing a later write.
 */
export declare class WriteCoordinator {
    private tail;
    private revision;
    get currentRevision(): number;
    private acquire;
    run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    /**
     * A read snapshot participates in the same FIFO. It waits for an in-flight
     * compensated write and prevents a later write from interleaving between
     * the individual table reads that form one logical definition graph.
     */
    read<T>(operation: () => T | Promise<T>, signal?: AbortSignal): Promise<T>;
    readVersioned<T>(operation: () => T | Promise<T>, signal?: AbortSignal): Promise<{
        value: T;
        revision: number;
    }>;
}
export declare function throwIfAborted(signal?: AbortSignal): void;
/** Check cancellation both sides of an await so uncertain commits roll back. */
export declare function abortableStep<T>(signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T>;
//# sourceMappingURL=write-coordinator.d.ts.map