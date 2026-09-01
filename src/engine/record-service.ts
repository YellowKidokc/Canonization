import { CANDIDATE_STATUS, CanonizationRecord, SCHEMA_VERSION } from "../schema/types";
import { assertCanonizationRecord } from "../schema/validator";

export interface NewRecordInput { sourceId: string; sourceHash: string; coordinates?: Record<string, unknown>; actor: string; blindResult: unknown; now?: string; }
export function createCandidateRecord(input: NewRecordInput): CanonizationRecord {
  const now = input.now ?? new Date().toISOString();
  const record: CanonizationRecord = {
    schemaVersion: SCHEMA_VERSION, recordId: crypto.randomUUID(), statusLabel: CANDIDATE_STATUS, workflowState: "Candidate",
    source: { sourceId: input.sourceId, contentHash: input.sourceHash, coordinates: input.coordinates ?? {} },
    created: { at: now, by: input.actor }, updated: { at: now, by: input.actor },
    protectedBlindDiscovery: { immutable: true, recordedAt: now, inputPolicy: "SOURCE_CONTENT_ONLY_NO_INHERITED_METADATA", result: structuredClone(input.blindResult) },
    recoveredObjects: [], claims: [], definitions: [], evidence: [], proofs: [], bridges: [], assumptions: [], countermodels: [], strongestDefeaters: [], openGaps: [], lostStructure: [],
    reviewHistory: [], votes: [], minorityReports: [], admissionEventReference: null, provenance: [], hashes: {}
  };
  assertCanonizationRecord(record); return record;
}
export function mergeCandidateEdits(original: CanonizationRecord, edits: Record<string, unknown>, actor: string, now = new Date().toISOString()): CanonizationRecord {
  const merged = structuredClone({ ...original, ...edits, recordId: original.recordId, schemaVersion: original.schemaVersion, statusLabel: CANDIDATE_STATUS, admissionEventReference: original.workflowState === "Admitted" ? original.admissionEventReference : null, updated: { at: now, by: actor }, protectedBlindDiscovery: original.protectedBlindDiscovery });
  assertCanonizationRecord(merged); return merged;
}
export function assertNoUnauthorizedAdmission(record: CanonizationRecord): void { if (record.workflowState === "Admitted" && !record.admissionEventReference) throw new Error("Admission requires a separately governed admission event reference"); }
