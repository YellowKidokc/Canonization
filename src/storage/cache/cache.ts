import { CanonizationRecord } from "../../schema/types";
export interface CachedDraft { recordId: string; baseHash: string; version: number; savedAt: string; governedExport: false; record: CanonizationRecord; }
export interface CacheStore { load(id: string): Promise<CachedDraft | null>; save(draft: CachedDraft, expectedVersion?: number): Promise<CachedDraft>; remove(id: string): Promise<void>; export(id: string): Promise<string>; }
export class MemoryCache implements CacheStore {
  private readonly drafts = new Map<string, CachedDraft>();
  async load(id: string): Promise<CachedDraft | null> { return structuredClone(this.drafts.get(id) ?? null); }
  async save(draft: CachedDraft, expectedVersion?: number): Promise<CachedDraft> { const current=this.drafts.get(draft.recordId); if (expectedVersion !== undefined && (current?.version ?? 0) !== expectedVersion) throw new Error("VERSION_CONFLICT"); if (draft.record.workflowState === "Admitted") throw new Error("Cache cannot mark a record admitted"); const saved={...structuredClone(draft),version:(current?.version ?? 0)+1,savedAt:new Date().toISOString(),governedExport:false as const}; this.drafts.set(saved.recordId,saved); return structuredClone(saved); }
  async remove(id: string): Promise<void> { this.drafts.delete(id); }
  async export(id: string): Promise<string> { const draft=await this.load(id); if(!draft) throw new Error("Draft not found"); return JSON.stringify(draft,null,2); }
}
