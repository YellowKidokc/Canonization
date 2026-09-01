import fs from "node:fs";
import path from "node:path";

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const root = path.join("dist", `standalone-runtime-${stamp}`);
const assets = ["manifest.json", "main.js", "styles.css"];
const install = (vault: string) => {
  const target = path.join(root, vault, ".obsidian", "plugins", "canonization");
  fs.mkdirSync(target, { recursive: true });
  for (const asset of assets) fs.copyFileSync(asset, path.join(target, asset));
  fs.cpSync("web", path.join(target, "web"), { recursive: true });
  fs.writeFileSync(path.join(root, vault, ".obsidian", "community-plugins.json"), JSON.stringify(["canonization"], null, 2) + "\n");
};
install("vault-canonization");
install("vault-coexistence");
install("vault-roundtrip");
const coexist = path.join(root, "vault-coexistence", ".obsidian");
const semanticDir = path.join(coexist, "plugins", "semantic-ai");
fs.mkdirSync(semanticDir, { recursive: true });
fs.writeFileSync(path.join(semanticDir, "manifest.json"), JSON.stringify({ id: "semantic-ai", name: "Semantic AI", version: "fixture-only" }, null, 2) + "\n");
fs.writeFileSync(path.join(semanticDir, "data.json"), JSON.stringify({ fixtureSentinel: "MUST_NOT_BE_READ", apiKey: "NOT_A_REAL_CREDENTIAL" }, null, 2) + "\n");
fs.writeFileSync(path.join(coexist, "community-plugins.json"), JSON.stringify(["semantic-ai", "canonization"], null, 2) + "\n");
const fixture = fs.readFileSync("tests/fixtures/reviewed-candidate.json", "utf8");
for (const vault of ["vault-canonization", "vault-roundtrip"]) {
  const dir = path.join(root, vault, "Canonization", "records");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "reviewed-candidate.json"), fixture);
}
fs.writeFileSync(path.join(root, "RUNTIME_SCOPE.txt"), "Static disposable fixture inspection only. Obsidian desktop was not launched. Browser file-picker and plugin enable/disable actions remain manual.\n");
console.log(root);
