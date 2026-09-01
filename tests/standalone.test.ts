import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(name, "utf8");

test("manifest and installer use standalone Canonization identity", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.id, "canonization");
  assert.equal(manifest.name, "Canonization");
  assert.match(read("install.bat"), /plugins\\canonization/);
});

test("commands, views, resources, and runtime storage are independently namespaced", () => {
  const main = read("src/main.ts");
  const sources = fs.readdirSync("src/ui").filter((x) => x.endsWith(".ts")).map((x) => read(`src/ui/${x}`)).join("\n") + read("src/tagging/concept-registry.ts") + main;
  const staticIds = [...main.matchAll(/\bid:\s*'([^']+)'/g)].map((x) => x[1]);
  assert.ok(staticIds.length >= 20);
  assert.ok(staticIds.every((id) => id.startsWith("canonization-")));
  assert.doesNotMatch(sources, /plugins\/semantic-ai|semantic-ai-(?:mermaid-view|concept-tracker)/);
  assert.match(sources, /canonization-mermaid-view/);
  assert.match(sources, /canonization-concept-tracker/);
  assert.match(sources, /canonization-concept-journey-view/);
  assert.match(main, /manifest\.dir}\/web\/workbench\.html/);
});

test("Canonization contains no automatic Semantic AI data or credential migration", () => {
  const source = fs.readdirSync("src", { recursive: true }).filter((x) => String(x).endsWith(".ts")).map((x) => read(`src/${x}`)).join("\n");
  assert.doesNotMatch(source, /semantic-ai|Semantic AI/);
  assert.doesNotMatch(source, /copy.*(?:api.?key|credential)|migrat(?:e|ion)[^\n]{0,80}(?:semantic-ai|Semantic AI)/i);
});

test("coexistence contract uses distinct plugin, command, view, and storage identities", () => {
  const canon = JSON.parse(read("manifest.json"));
  const semantic = { id: "semantic-ai", name: "Semantic AI" };
  assert.notEqual(canon.id, semantic.id);
  assert.notEqual(canon.name, semantic.name);
  assert.notEqual(`.obsidian/plugins/${canon.id}/data.json`, `.obsidian/plugins/${semantic.id}/data.json`);
});
