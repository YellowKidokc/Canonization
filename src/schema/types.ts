export const SCHEMA_VERSION = "1.0.0" as const;
export const CANDIDATE_STATUS = "CANDIDATE_DRAFT  NOT ADMITTED" as const;
export type WorkflowState = "Candidate" | "Frozen" | "Reviewed" | "Voted" | "Admitted" | "Rejected" | "Superseded";
export interface Atom { id: string; kind: string; statement: string; supportStatus?: string; sourceCoordinates?: Record<string, unknown>; [key: string]: unknown; }
export interface Bridge extends Atom { sourceDomain: string; targetDomain: string; preservedStructure: string[]; lostStructure: string[]; proofPropagation: false; }
export interface CanonizationRecord {
  schemaVersion: typeof SCHEMA_VERSION; recordId: string; statusLabel: typeof CANDIDATE_STATUS; workflowState: WorkflowState;
  source: { sourceId: string; contentHash: string; coordinates: Record<string, unknown>; title?: string; uri?: string; [key: string]: unknown };
  created: { at: string; by: string }; updated: { at: string; by: string };
  protectedBlindDiscovery: { immutable: true; recordedAt: string; inputPolicy: "SOURCE_CONTENT_ONLY_NO_INHERITED_METADATA"; result: unknown; [key: string]: unknown };
  recoveredObjects?: Atom[]; claims?: Atom[]; definitions?: Atom[]; evidence?: Atom[]; proofs?: Atom[]; bridges?: Bridge[];
  assumptions?: Atom[]; countermodels?: Atom[]; strongestDefeaters?: Atom[]; openGaps?: Atom[]; lostStructure?: string[];
  reviewHistory?: Record<string, unknown>[]; votes?: Record<string, unknown>[]; minorityReports?: Record<string, unknown>[];
  admissionEventReference: string | null; provenance: Record<string, unknown>[]; hashes: Record<string, string>;
  [key: string]: unknown;
}
