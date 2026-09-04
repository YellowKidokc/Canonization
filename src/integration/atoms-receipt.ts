import { CanonizationRecord } from "../schema/types";
import { assertCanonizationRecord } from "../schema/validator";
import { sha256 } from "../package/portable-package";

type DiscoveryObject = { discovery_id: string; exact_quotation: string; neutral_paraphrase?: string; countermodels?: string[]; collapse_conditions?: string[]; open_questions?: string[]; [key: string]: unknown };
export type AtomsReceipt = { receipt_version: string; provider: string; model: string; frozen_discovery: { discovered_objects: DiscoveryObject[]; global_open_questions?: string[]; [key: string]: unknown }; emergent_organization?: Record<string, unknown>; post_discovery_source_binding: { path: string; source_hash: string }; canonical_admission_performed: false; human_ruling_required: true; [key: string]: unknown };

const atom = (item: DiscoveryObject) => ({ ...structuredClone(item), id: crypto.randomUUID(), discoveryId: item.discovery_id, kind: "unclassified-discovered-object", statement: item.exact_quotation, origin: "ATOMS_BLIND_DISCOVERY", authority: "candidate-only" });

export function applyAtomsReceipt(record: CanonizationRecord, receipt: AtomsReceipt, raw: string, at = new Date().toISOString()): CanonizationRecord {
  if (receipt.canonical_admission_performed !== false || receipt.human_ruling_required !== true) throw new Error("Atoms receipt crossed the candidate authority boundary.");
  if (receipt.post_discovery_source_binding.source_hash.toLowerCase() !== record.source.contentHash.toLowerCase()) throw new Error("Atoms receipt source hash does not match the open paper.");
  const objects = receipt.frozen_discovery.discovered_objects ?? [];
  const mapped = structuredClone(record);
  mapped.protectedBlindDiscovery = { immutable: true, recordedAt: at, inputPolicy: "SOURCE_CONTENT_ONLY_NO_INHERITED_METADATA", result: structuredClone(receipt.frozen_discovery), atomsReceiptVersion: receipt.receipt_version };
  mapped.recoveredObjects = objects.map(atom);
  mapped.countermodels = objects.flatMap((item) => (item.countermodels ?? []).map((statement) => ({ id: crypto.randomUUID(), kind: "countermodel", statement, sourceCoordinates: { discoveryId: item.discovery_id }, origin: "ATOMS_BLIND_DISCOVERY", authority: "candidate-only" })));
  mapped.openGaps = [...(receipt.frozen_discovery.global_open_questions ?? []), ...objects.flatMap((item) => item.open_questions ?? [])].filter((value, index, all) => all.indexOf(value) === index).map((statement) => ({ id: crypto.randomUUID(), kind: "open-gap", statement, origin: "ATOMS_BLIND_DISCOVERY", authority: "candidate-only" }));
  mapped.summary = receipt.emergent_organization?.organizing_principle ?? "Blind discovery imported from the Atoms API.";
  mapped.emergentOrganization = structuredClone(receipt.emergent_organization ?? {});
  mapped.classificationPending = true;
  mapped.hashes.atomsReceipt = `sha256:${sha256(raw)}`;
  mapped.updated = { at, by: "atoms-import-adapter" };
  mapped.provenance.push({ event: "atoms-blind-discovery-imported", at, provider: receipt.provider, model: receipt.model, receiptHash: mapped.hashes.atomsReceipt, discoveredObjectCount: objects.length, inheritedClassificationApplied: false, sourceModified: false, admissionPerformed: false });
  assertCanonizationRecord(mapped);
  return mapped;
}
