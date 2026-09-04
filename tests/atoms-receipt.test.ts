import test from "node:test";
import assert from "node:assert/strict";
import { createCandidateRecord } from "../src/engine/record-service";
import { applyAtomsReceipt, AtomsReceipt } from "../src/integration/atoms-receipt";

test("Atoms blind discovery imports losslessly without classification or admission", () => {
  const sourceHash = "sha256:" + "a".repeat(64);
  const base = createCandidateRecord({ sourceId: "paper.md", sourceHash, actor: "test", blindResult: {}, now: "2026-09-01T00:00:00Z" });
  const receipt: AtomsReceipt = {
    receipt_version: "final-api-call/1.0.0", provider: "deepseek", model: "deepseek-chat",
    frozen_discovery: { discovered_objects: [{ discovery_id: "DISC-0001", exact_quotation: "A sentence.", neutral_paraphrase: "A neutral sentence.", countermodels: ["Not A."], open_questions: ["Why A?"] }], global_open_questions: ["What is A?"] },
    emergent_organization: { organization_name: "Own categories", organizing_principle: "Group by function." },
    post_discovery_source_binding: { path: "paper.md", source_hash: sourceHash }, canonical_admission_performed: false, human_ruling_required: true,
  };
  const mapped = applyAtomsReceipt(base, receipt, JSON.stringify(receipt), "2026-09-01T01:00:00Z");
  assert.equal(mapped.recoveredObjects?.length, 1);
  assert.equal(mapped.recoveredObjects?.[0].kind, "unclassified-discovered-object");
  assert.equal(mapped.classificationPending, true);
  assert.equal(mapped.workflowState, "Candidate");
  assert.equal(mapped.admissionEventReference, null);
  assert.deepEqual(mapped.emergentOrganization, receipt.emergent_organization);
});

test("Atoms import refuses a mismatched source hash", () => {
  const base = createCandidateRecord({ sourceId: "paper.md", sourceHash: "sha256:" + "a".repeat(64), actor: "test", blindResult: {} });
  const receipt = { receipt_version: "final-api-call/1.0.0", provider: "deepseek", model: "deepseek-chat", frozen_discovery: { discovered_objects: [] }, post_discovery_source_binding: { path: "paper.md", source_hash: "sha256:" + "b".repeat(64) }, canonical_admission_performed: false, human_ruling_required: true } as AtomsReceipt;
  assert.throws(() => applyAtomsReceipt(base, receipt, JSON.stringify(receipt)), /source hash does not match/);
});
