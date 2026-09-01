import { CanonizationRecord } from "../schema/types";
export function compareClassifications(record: CanonizationRecord): Record<string, unknown> { const blind=record.blindClassification ?? []; const inherited=record.inheritedClassification ?? []; return { blind, inherited, agrees: JSON.stringify(blind) === JSON.stringify(inherited), authority: "comparison-only", proofPropagated: false }; }
