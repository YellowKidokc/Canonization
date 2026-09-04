import { createHash } from "crypto";
import { CanonizationRecord, SCHEMA_VERSION } from "../schema/types";
import { validateCanonizationRecord } from "../schema/validator";
import { projectMarkdown } from "../projections/markdown/project";

export const PACKAGE_FORMAT_VERSION = "1.0.0" as const;
export type PackageFiles = Record<string, string>;
export interface PackageReceipt { receiptId: string; type: "export" | "validation" | "import" | "conflict" | "regeneration" | "web-backup"; at: string; recordIds: string[]; outcome: "accepted" | "refused"; details: Record<string, unknown>; }
export interface PackageManifest { packageFormatVersion: typeof PACKAGE_FORMAT_VERSION; createdAt: string; createdBy: string; projectId: string; recordIds: string[]; recordVersions: Record<string, number>; schemaVersions: { record: typeof SCHEMA_VERSION }; authority: "PORTABLE_CANDIDATE_DATA_NOT_ADMISSION"; files: string[]; }
export interface PortablePackage { manifest: PackageManifest; files: PackageFiles; }
export interface ExportOptions { projectId: string; actor: string; at?: string; recordVersions?: Record<string, number>; sources?: PackageFiles; relationships?: PackageFiles; externalReceipts?: PackageFiles; receipts?: PackageReceipt[]; webBackup?: unknown; }
export interface ImportState { records: Map<string, CanonizationRecord>; versions: Map<string, number>; }
export interface PackageValidation { valid: boolean; errors: string[]; warnings: string[]; receipt: PackageReceipt; records: CanonizationRecord[]; }

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};
export const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
const receipt = (type: PackageReceipt["type"], at: string, ids: string[], outcome: PackageReceipt["outcome"], details: Record<string, unknown>): PackageReceipt => ({ receiptId: `receipt:${sha256(stable({ type, at, ids, outcome, details }))}`, type, at, recordIds: [...ids].sort(), outcome, details });
const safeName = (id: string): string => id.replace(/[^A-Za-z0-9_.-]/g, "_");
const addFiles = (target: PackageFiles, prefix: string, values: PackageFiles | undefined): void => { for (const [name, contents] of Object.entries(values ?? {})) target[`${prefix}/${name}`] = contents; };
const hashCsv = (files: PackageFiles): string => ["sha256,path", ...Object.keys(files).sort().map((name) => `${sha256(files[name])},${name}`)].join("\n") + "\n";

export function exportPackage(records: CanonizationRecord[], options: ExportOptions): PortablePackage {
  const at = options.at ?? new Date().toISOString();
  const ids = records.map((record) => record.recordId);
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_STABLE_ID: export selection contains duplicate record IDs");
  const files: PackageFiles = {};
  for (const record of [...records].sort((a, b) => a.recordId.localeCompare(b.recordId))) {
    const check = validateCanonizationRecord(record); if (!check.valid) throw new Error(`INVALID_RECORD: ${record.recordId}`);
    const name = safeName(record.recordId); files[`records/${name}.json`] = stable(record) + "\n";
    files[`projections/${name}.md`] = projectMarkdown(record, `../records/${name}.json`, "../web-backup/workbench.html");
  }
  addFiles(files, "sources", options.sources); addFiles(files, "relationships", options.relationships);
  addFiles(files, "receipts", options.externalReceipts);
  if (!Object.keys(files).some((name) => name.startsWith("sources/"))) files["sources/.keep"] = "";
  if (!Object.keys(files).some((name) => name.startsWith("relationships/"))) files["relationships/.keep"] = "";
  files["schemas/canonization-record.schema.json"] = JSON.stringify({ $id: "canonization-record", version: SCHEMA_VERSION, bundledFrom: "schemas/canonization-record.schema.json" }, null, 2) + "\n";
  if (options.webBackup !== undefined) files["web-backup/browser-state.json"] = stable(options.webBackup) + "\n";
  for (const item of options.receipts ?? []) files[`receipts/${safeName(item.receiptId)}.json`] = stable(item) + "\n";
  const exportReceipt = receipt("export", at, ids, "accepted", { projectId: options.projectId, fileCount: Object.keys(files).length });
  files[`receipts/${safeName(exportReceipt.receiptId)}.json`] = stable(exportReceipt) + "\n";
  const manifest: PackageManifest = { packageFormatVersion: PACKAGE_FORMAT_VERSION, createdAt: at, createdBy: options.actor, projectId: options.projectId, recordIds: [...ids].sort(), recordVersions: Object.fromEntries(ids.map((id) => [id, options.recordVersions?.[id] ?? 1])), schemaVersions: { record: SCHEMA_VERSION }, authority: "PORTABLE_CANDIDATE_DATA_NOT_ADMISSION", files: [] };
  manifest.files = Object.keys(files).sort(); files["manifest.json"] = stable(manifest) + "\n"; files["PACKAGE_SHA256.csv"] = hashCsv(files);
  return { manifest, files };
}

export function validatePackage(pkg: PortablePackage, at = new Date().toISOString()): PackageValidation {
  const errors: string[] = [], warnings: string[] = [], records: CanonizationRecord[] = [], seen = new Set<string>();
  if (pkg.manifest.packageFormatVersion !== PACKAGE_FORMAT_VERSION) errors.push(`PACKAGE_SCHEMA_VERSION_MISMATCH: expected ${PACKAGE_FORMAT_VERSION}`);
  if (pkg.manifest.schemaVersions.record !== SCHEMA_VERSION) errors.push(`RECORD_SCHEMA_VERSION_MISMATCH: expected ${SCHEMA_VERSION}`);
  if (pkg.manifest.authority !== "PORTABLE_CANDIDATE_DATA_NOT_ADMISSION") errors.push("INVALID_AUTHORITY: packages cannot grant admission");
  const csv = pkg.files["PACKAGE_SHA256.csv"] ?? "";
  try { if (stable(JSON.parse(pkg.files["manifest.json"] ?? "null")) !== stable(pkg.manifest)) errors.push("MANIFEST_OBJECT_MISMATCH"); } catch { errors.push("INVALID_JSON: manifest.json"); }
  const expected = new Map(csv.trim().split("\n").slice(1).map((line) => { const split = line.indexOf(","); return [line.slice(split + 1), line.slice(0, split)]; }));
  for (const name of [...pkg.manifest.files, "manifest.json"]) { if (!(name in pkg.files)) errors.push(`MISSING_FILE: ${name}`); else if (expected.get(name) !== sha256(pkg.files[name])) errors.push(`HASH_MISMATCH: ${name}`); }
  for (const [name, text] of Object.entries(pkg.files).filter(([name]) => name.startsWith("records/") && name.endsWith(".json"))) {
    try { const value: unknown = JSON.parse(text); const check = validateCanonizationRecord(value); if (!check.valid) { errors.push(`INVALID_RECORD: ${name}`); continue; } const record = value as CanonizationRecord;
      if (seen.has(record.recordId)) errors.push(`DUPLICATE_STABLE_ID: ${record.recordId}`); seen.add(record.recordId); records.push(record);
      if (!pkg.manifest.recordIds.includes(record.recordId)) errors.push(`UNDECLARED_RECORD: ${record.recordId}`);
      if (record.workflowState === "Admitted") errors.push(`ADMISSION_IMPORT_REFUSED: ${record.recordId}; separately authorized admission receipt required`);
      const sourceFile = Object.entries(pkg.files).find(([path]) => path.startsWith("sources/") && path.includes(safeName(record.source.sourceId)));
      if (sourceFile && `sha256:${sha256(sourceFile[1])}` !== record.source.contentHash) errors.push(`SOURCE_HASH_CONFLICT: ${record.recordId}`);
      for (const atom of [...(record.claims ?? []), ...(record.bridges ?? [])]) for (const dependency of (atom.dependencies as string[] | undefined) ?? []) if (!pkg.manifest.recordIds.includes(dependency) && !seen.has(dependency)) warnings.push(`MISSING_DEPENDENCY: ${atom.id} -> ${dependency}`);
    } catch { errors.push(`INVALID_JSON: ${name}`); }
  }
  for (const id of pkg.manifest.recordIds) if (!seen.has(id)) errors.push(`MISSING_RECORD: ${id}`);
  return { valid: errors.length === 0, errors, warnings, records, receipt: receipt("validation", at, pkg.manifest.recordIds, errors.length ? "refused" : "accepted", { errors, warnings }) };
}

export function importPackage(pkg: PortablePackage, state: ImportState, at = new Date().toISOString()): { state: ImportState; receipts: PackageReceipt[]; markdown: PackageFiles } {
  const check = validatePackage(pkg, at); if (!check.valid) throw new Error(check.errors.join("; "));
  const next: ImportState = { records: new Map(state.records), versions: new Map(state.versions) }, markdown: PackageFiles = {}, conflicts: string[] = [];
  for (const record of check.records) { const incoming = pkg.manifest.recordVersions[record.recordId], current = next.versions.get(record.recordId), existing = next.records.get(record.recordId);
    if (current !== undefined && incoming <= current) { if (existing && stable(existing) !== stable(record)) conflicts.push(`CONCURRENT_VERSION_CONFLICT: ${record.recordId}`); else conflicts.push(`STALE_VERSION: ${record.recordId}`); continue; }
    if (existing && existing.source.contentHash !== record.source.contentHash) { conflicts.push(`SOURCE_CONFLICT: ${record.recordId}`); continue; }
    next.records.set(record.recordId, structuredClone(record)); next.versions.set(record.recordId, incoming); markdown[`projections/${safeName(record.recordId)}.md`] = projectMarkdown(record, `../records/${safeName(record.recordId)}.json`, "../web-backup/workbench.html");
  }
  if (conflicts.length) throw new Error(conflicts.join("; "));
  return { state: next, markdown, receipts: [check.receipt, receipt("import", at, check.records.map((r) => r.recordId), "accepted", { destination: "disposable-vault", admissionGranted: false }), receipt("regeneration", at, check.records.map((r) => r.recordId), "accepted", { files: Object.keys(markdown).sort() })] };
}

export function restoreWebBackup(pkg: PortablePackage): unknown { const check = validatePackage(pkg); if (!check.valid) throw new Error(check.errors.join("; ")); const text = pkg.files["web-backup/browser-state.json"]; if (!text) throw new Error("MISSING_WEB_BACKUP"); return JSON.parse(text); }
