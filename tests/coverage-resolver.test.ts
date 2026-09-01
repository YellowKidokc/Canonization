import test from "node:test";
import assert from "node:assert/strict";
import { AssemblySource, mergeAssemblyLedger, neutralizeForDiscovery, resolveCoverage, verifyAssemblySources } from "../src/assembly/coverage-resolver";

const hash = (char: string): string => `sha256:${char.repeat(64)}`;
const source = (path: string, content: string, sourceType: AssemblySource["sourceType"], extra: Partial<AssemblySource> = {}): AssemblySource => ({ path, content, sourceType, hash: hash(path === "paper.md" ? "a" : "b"), ...extra });

test("empty field is recovered from an exact sibling quotation with hash and span", async () => {
  const sibling = source("support.md", "# Formal Mathematics\nE = mc^2\n", "sibling");
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [sibling], undefined, "2026-09-01T00:00:00.000Z");
  const field = ledger.fields.find((item) => item.field === "formal_mathematics")!;
  assert.equal(field.status, "RECOVERABLE"); assert.equal(field.candidates[0].source_span.exact_quotation, "E = mc^2");
  assert.equal(field.candidates[0].source_span.line_start, 2); assert.equal(field.candidates[0].source_hash, sibling.hash);
});

test("JSON and YAML sidecars recover keyed fields with exact quotations", async () => {
  const json = source("paper.json", "{\n  \"formal_mathematics\": \"x + y = z\",\n  \"unknown\": true\n}\n", "sidecar");
  const yaml = source("paper.yaml", "scripture_anchors: John 1:1\nunknown: preserved\n", "sidecar");
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [json, yaml]);
  const math = ledger.fields.find((item) => item.field === "formal_mathematics")!.candidates[0]; const scripture = ledger.fields.find((item) => item.field === "scripture_anchors")!.candidates[0];
  assert.equal(math.value, "x + y = z"); assert.equal(math.operation, "normalized"); assert.equal(math.source_span.exact_quotation, "  \"formal_mathematics\": \"x + y = z\",");
  assert.equal(scripture.value, "John 1:1"); assert.equal(scripture.source_span.exact_quotation, "scripture_anchors: John 1:1");
});

test("existing human field remains YOURS and unchanged", async () => {
  const current = source("paper.md", "# Canonical Definition\nHuman wording.\n", "current_note");
  const ledger = await resolveCoverage(current, [source("other.md", "# Canonical Definition\nOther wording.\n", "sibling")], async () => "AI wording");
  const field = ledger.fields[0]; assert.equal(field.status, "PRESENT"); assert.equal(field.yours?.value, "Human wording."); assert.equal(field.candidates.length, 0);
});

test("two conflicting preserved sources remain visible", async () => {
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [source("a.md", "# Physics Interpretation\nA\n", "sibling"), source("b.md", "# Physics Interpretation\nB\n", "sidecar")]);
  const field = ledger.fields.find((item) => item.field === "physics_interpretation")!; assert.equal(field.status, "CONFLICT"); assert.deepEqual(field.candidates.map((item) => item.value).sort(), ["A", "B"]); assert.match(field.recommendation!, /Human ruling/);
});

test("AI proposal appears only when no preserved source exists", async () => {
  let calls = 0; const proposal = async () => { calls++; return "Clearly proposed text."; };
  const empty = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [], proposal);
  assert.equal(empty.fields[0].status, "PROPOSED"); assert.equal(empty.fields[0].candidates[0].source_type, "ai_proposal");
  const preserved = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [source("x.md", "# Canonical Definition\nPreserved\n", "sibling")], proposal);
  assert.equal(preserved.fields[0].status, "RECOVERABLE"); assert.equal(preserved.fields[0].candidates[0].value, "Preserved"); assert.ok(calls > 0);
});

test("folder proximity alone does not create a dependency", async () => {
  const near = source("folder/near.md", "# Axioms and Dependencies\nNearby only\n", "dependency", { declaredByCurrentNote: false });
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [near]);
  assert.equal(ledger.fields.find((item) => item.field === "axioms_and_dependencies")?.status, "MISSING");
});

test("Stage 1 neutralization remains label-blind", () => {
  const neutral = neutralizeForDiscovery("---\nproof_label: theorem\ndomain: physics\n---\n# Canonical Definition\nCreated order.\n<!-- admission_status: admitted -->");
  assert.equal(neutral, "SECTION_001\nCreated order."); assert.doesNotMatch(neutral, /theorem|physics|Canonical|admitted/);
});

test("unknown JSON fields survive assembly round trips", async () => {
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), []); const original = { workflowState: "Candidate", admissionEventReference: null, unknownExtension: { preserve: true } };
  const parsed = JSON.parse(JSON.stringify(mergeAssemblyLedger(original, ledger))); assert.deepEqual(parsed.unknownExtension, { preserve: true }); assert.equal(parsed.assemblyLedger.source_note, "paper.md");
});

test("candidate assembly cannot create admission", async () => {
  const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), []);
  assert.throws(() => mergeAssemblyLedger({ workflowState: "Admitted", admissionEventReference: "event" }, ledger), /CANNOT_CREATE_ADMISSION/);
  assert.equal(ledger.canonical_admission_performed, false); assert.equal(ledger.admission_event_reference, null);
});

test("one folder containing multiple papers produces separate candidates", async () => {
  const papers = [source("folder/a.md", "# Canonical Definition\nA\n", "current_note"), source("folder/b.md", "# Canonical Definition\nB\n", "current_note")];
  const ledgers = await Promise.all(papers.map((paper) => resolveCoverage(paper, papers.filter((other) => other !== paper).map((other) => ({ ...other, sourceType: "sibling" as const })))));
  assert.deepEqual(ledgers.map((item) => item.source_note), ["folder/a.md", "folder/b.md"]); assert.equal(ledgers.length, 2);
});

test("missing or moved source causes visible provenance failure", async () => {
  const sibling = source("support.md", "# Formal Mathematics\nE = mc^2\n", "sibling"); const ledger = await resolveCoverage(source("paper.md", "# Paper\nText\n", "current_note"), [sibling]);
  const checked = verifyAssemblySources(ledger, new Map([["paper.md", { content: "# Paper\nText\n", hash: hash("a") }]]));
  assert.equal(checked.fields.find((item) => item.field === "formal_mathematics")?.candidates[0].provenance_failure, "SOURCE_MISSING_OR_MOVED");
});

test("web export and re-import preserve the assembly ledger", async () => {
  const ledger = await resolveCoverage(source("paper.md", "# Open Research Questions\nWhat remains?\n", "current_note"), []); (ledger as Record<string, unknown>).unknownLedgerField = { preserve: true };
  const webExport = JSON.stringify({ authority: "PORTABLE_CANDIDATE_DATA_NOT_ADMISSION", assemblyLedger: ledger }); const imported = JSON.parse(webExport);
  assert.deepEqual(imported.assemblyLedger, ledger); assert.equal(imported.assemblyLedger.unknownLedgerField.preserve, true); assert.equal(imported.assemblyLedger.canonical_admission_performed, false);
});
