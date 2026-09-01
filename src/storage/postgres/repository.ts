import { CanonizationRecord } from "../../schema/types";
export interface SyncReceipt { synchronizationKey: string; recordId: string; version: number; contentHash: string; synchronizedAt: string; }
export interface CanonizationRepository { read(recordId: string): Promise<CanonizationRecord | null>; appendVersion(record: CanonizationRecord, expectedHash: string, synchronizationKey: string): Promise<SyncReceipt>; }
