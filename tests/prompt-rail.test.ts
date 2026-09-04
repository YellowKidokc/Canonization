/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import * as fs from "node:fs";

(globalThis as any).crypto = webcrypto;
const Registry = require("../workbench/field-registry.js");
const Rail = require("../workbench/prompt-rail.js");

class MemoryStorage {
  value = "";
  getItem() { return this.value || null; }
  setItem(_key: string, value: string) { this.value = value; }
}
const fields = ["statement", "cclass", "depends", "src_span", "fam"].map((key) => ({ ...Registry.fieldDefinition(key), enabled: true }));
const config = {
  globalPrompt: "GLOBAL", builderPrompt: "BUILDER", sourceText: "preserved", sourceCoordinates: "line 4",
  acceptedContext: { statement: "human accepted" }, fields,
  sections: Object.fromEntries(Object.entries(Registry.SECTION_PROMPTS).map(([key, value]: any) => [key, { prompt: value.prompt, enabled: true }])),
  promptVersions: { global: "g1", builder: "b1", sections: {}, fields: {} }
};

test("prompt composition preserves the required versioned hierarchy", async () => {
  const prompt = await Rail.composePrompt({ ...config, sectionPrompt: "CLAIMS", fieldPrompt: "FIELD", responseSchema: Rail.RESPONSE_SCHEMA });
  const layers = ["[GLOBAL GOVERNANCE]", "[ATOM BUILDER SYSTEM]", "[SECTION]", "[FIELD]", "[PRESERVED SOURCE]", "[VERIFIED COORDINATES]", "[HUMAN-ACCEPTED CONTEXT]", "[EXACT RESPONSE SCHEMA]"];
  let cursor = -1; for (const layer of layers) { const next = prompt.indexOf(layer); assert.ok(next > cursor); cursor = next; }
});

test("two-pass contract validates, assigns application UUIDs, and preserves discoveries", async () => {
  const storage = new MemoryStorage(); const store = new Rail.AppendOnlyStore(storage);
  const provider = async (pass: string, request: any) => {
    const packet = { builder_run_uuid: "model-invented", prompt_versions: {}, field_results: fields.map((f) => ({ field_key: f.key, enabled: true, suggested_value: f.key === "cclass" ? "PHILOSOPHICAL" : "proposal", allowed_values: f.allowedValues, rationale: "source grounded", source_anchors: ["line 4"], confidence: .82, warnings: [], answer_status: "PROPOSED" })), open_discoveries: [{ discovery_uuid: "model-invented", question_or_finding: "Novel tension", reason_no_current_field: "NO CURRENT FIELD", source_anchors: [] }], candidate_packet_status: Rail.CANDIDATE };
    return pass === "builder" ? packet : { corrections: [], warnings: [], suggested_rulings: [], repaired_candidate_packet: packet, request };
  };
  const result = await Rail.runTwoPass(config, provider, store);
  assert.notEqual(result.packet.builder_run_uuid, "model-invented");
  assert.notEqual(result.packet.open_discoveries[0].discovery_uuid, "model-invented");
  assert.equal(result.packet.open_discoveries[0].candidate_status, Rail.CANDIDATE);
  assert.equal(store.history("MODEL_RUN").length, 1);
});

test("malformed calls record failure and never create empty success packets", async () => {
  const store = new Rail.AppendOnlyStore(new MemoryStorage());
  await assert.rejects(() => Rail.runTwoPass(config, async () => ({}), store), /invalid/);
  assert.equal(store.history("MODEL_FAILURE").length, 1); assert.equal(store.state.packet, null);
});

test("history is append-only and accepted values remain candidate-only", () => {
  const store = new Rail.AppendOnlyStore(new MemoryStorage());
  Rail.decideField(store, "statement", "ACCEPTED", "candidate"); Rail.decideField(store, "statement", "REVISED", "revision");
  assert.equal(store.history("HUMAN_FIELD_DECISION", "statement").length, 2);
  assert.ok(store.state.events.every((e: any) => e.payload.authority === Rail.CANDIDATE));
});

test("bulk decisions require selection and confirmation and write one audit record each", () => {
  const store = new Rail.AppendOnlyStore(new MemoryStorage());
  assert.throws(() => Rail.bulkDecide(store, [{ field_key: "a", value: 1 }], "ACCEPTED", false), /confirmation/);
  Rail.bulkDecide(store, [{ field_key: "a", value: 1 }, { field_key: "b", value: 2 }], "ACCEPTED", true);
  const decisions = store.history("HUMAN_FIELD_DECISION"); assert.equal(decisions.length, 2); assert.equal(decisions[0].payload.batch_uuid, decisions[1].payload.batch_uuid);
});

test("working copy is integrated without modifying preserved source", () => {
  const page = fs.readFileSync("workbench/atom-builder.html", "utf8"); const preserved = fs.readFileSync("web/nerve-source/atom-builder.html", "utf8");
  assert.match(page, /Claim Atom Builder/); assert.match(page, /prompt-rail\.js/); assert.doesNotMatch(preserved, /prompt-rail\.js/);
  for (const code of ["ID001", "C001", "C002", "E001", "PR001"]) assert.match(fs.readFileSync("workbench/field-registry.js", "utf8"), new RegExp(code));
});

test("accepted proposals populate their actual builder control", () => {
  const fired: string[] = [];
  const control = {
    value: "",
    dispatchEvent(event: Event) { fired.push(event.type); return true; }
  };
  Rail.applyAcceptedValue(control, "PHILOSOPHICAL");
  assert.equal(control.value, "PHILOSOPHICAL");
  assert.deepEqual(fired, ["input", "change"]);
});
