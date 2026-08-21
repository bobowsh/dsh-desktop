import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
/**
 * Storage-domain exposes atomic single-key updates but no multi-table
 * transaction. This bounded unit-of-work snapshots only participating tables
 * and compensates in reverse order on failure.
 */
export declare class StorageUnitOfWork {
    private readonly snapshots;
    capture<K extends string, V>(table: KvTable<K, V>): void;
    run<T>(operation: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=storage-transaction.d.ts.map