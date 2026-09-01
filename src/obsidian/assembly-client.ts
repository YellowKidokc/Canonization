import { App, normalizePath, TAbstractFile, TFile } from "obsidian";
import { AIClassifier } from "../ai/classifier";
import { AssemblyLedger, AssemblySource, CandidateField, CANDIDATE_FIELDS, resolveCoverage, verifyAssemblySources } from "../assembly/coverage-resolver";

const OUTPUT_ROOT = "Canonization/assemblies";
const sha256 = async (value: string): Promise<string> => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return `sha256:${Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("")}`; };
const extension = (file: TFile): string => file.extension.toLowerCase();
const stableId = (content: string): string | undefined => /^(?:object_id|objectId|recordId|stable_object_id):\s*["']?([^\s"']+)/m.exec(content)?.[1];
const links = (content: string): Set<string> => new Set([...content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim()));

async function ensureFolder(app: App, target: string): Promise<void> { let path = ""; for (const part of normalizePath(target).split("/")) { path = path ? `${path}/${part}` : part; if (!app.vault.getAbstractFileByPath(path)) await app.vault.createFolder(path); } }

export class AssemblyClient {
  private lastLedgers: AssemblyLedger[] = [];
  constructor(private readonly app: App, private readonly classifier: AIClassifier) {}
  getLastLedgers(): AssemblyLedger[] { return structuredClone(this.lastLedgers); }

  async analyze(files: TFile[], includeAi = false): Promise<AssemblyLedger[]> {
    const results: AssemblyLedger[] = [];
    for (const file of files) results.push(await this.analyzeOne(file, includeAi));
    this.lastLedgers = results; return structuredClone(results);
  }

  private async analyzeOne(file: TFile, includeAi: boolean): Promise<AssemblyLedger> {
    const content = await this.app.vault.cachedRead(file); const current = await this.makeSource(file, content, "current_note");
    const sources = await this.collectSources(file, content, current.stableObjectId);
    const preserved = await resolveCoverage(current, sources);
    if (!includeAi) return preserved;
    const missing = preserved.fields.filter((item) => item.status === "MISSING" || item.status === "OPEN").map((item) => ({ field: item.field, label: item.label }));
    if (!missing.length) return preserved;
    const prompt = `You are filling empty fields in a candidate-only Canonization card. Do not claim canon status, admission, proof propagation, or certainty. Human-authored fields are unavailable and must not be replaced. Return one JSON object mapping only these field ids to concise proposed text, or null when responsible proposal is impossible: ${JSON.stringify(missing)}\n\nSOURCE CONTENT:\n${content}`;
    const raw = await this.classifier.complete(prompt, 4096); const match = /\{[\s\S]*\}/.exec(raw); if (!match) throw new Error("AI proposal response did not contain a JSON object");
    const proposals = JSON.parse(match[0]) as Partial<Record<CandidateField, unknown>>;
    return resolveCoverage(current, sources, async (field) => typeof proposals[field] === "string" ? proposals[field] as string : null);
  }

  async verify(ledgers = this.lastLedgers): Promise<AssemblyLedger[]> {
    const paths = new Set<string>(); for (const ledger of ledgers) for (const field of ledger.fields) for (const item of [...(field.yours ? [field.yours] : []), ...field.candidates]) if (item.source_type !== "ai_proposal") paths.add(item.source_path);
    const available = new Map<string, { content: string; hash: string }>();
    for (const path of paths) { const found = this.app.vault.getAbstractFileByPath(path); if (found instanceof TFile) { const content = await this.app.vault.cachedRead(found); available.set(path, { content, hash: await sha256(content) }); } }
    this.lastLedgers = ledgers.map((ledger) => verifyAssemblySources(ledger, available)); return this.getLastLedgers();
  }

  async export(ledgers = this.lastLedgers): Promise<string[]> {
    await ensureFolder(this.app, OUTPUT_ROOT); const outputs: string[] = [];
    for (const ledger of ledgers) {
      if (ledger.canonical_admission_performed || ledger.admission_event_reference) throw new Error("Assembly export cannot carry admission");
      const safe = ledger.source_note.replace(/[^A-Za-z0-9_.-]/g, "_"); const path = normalizePath(`${OUTPUT_ROOT}/${safe}.assembly.json`); const json = JSON.stringify(ledger, null, 2) + "\n";
      const existing = this.app.vault.getAbstractFileByPath(path); if (existing instanceof TFile) await this.app.vault.process(existing, () => json); else await this.app.vault.create(path, json); outputs.push(path);
    }
    return outputs;
  }

  private async makeSource(file: TFile, content: string, sourceType: AssemblySource["sourceType"], extra: Partial<AssemblySource> = {}): Promise<AssemblySource> { return { path: file.path, content, hash: await sha256(content), sourceType, stableObjectId: stableId(content), ...extra }; }
  private resolveLinkedFile(link: string, sourcePath: string): TFile | null { const found = this.app.metadataCache.getFirstLinkpathDest(link, sourcePath); return found instanceof TFile ? found : null; }

  private async collectSources(file: TFile, content: string, objectId?: string): Promise<AssemblySource[]> {
    const sources: AssemblySource[] = []; const seen = new Set([file.path]); const add = async (candidate: TAbstractFile | null, type: AssemblySource["sourceType"], extra: Partial<AssemblySource> = {}) => {
      if (!(candidate instanceof TFile) || seen.has(candidate.path)) return; if (!["md", "json", "yaml", "yml"].includes(extension(candidate))) return;
      seen.add(candidate.path); sources.push(await this.makeSource(candidate, await this.app.vault.cachedRead(candidate), type, extra));
    };
    const parent = file.parent; if (parent) {
      for (const child of parent.children) {
        if (!(child instanceof TFile)) continue;
        if (child.basename === file.basename && ["json", "yaml", "yml"].includes(extension(child))) await add(child, "sidecar");
        else if (extension(child) === "md") await add(child, /^(index|overview|readme)$/i.test(child.basename) ? "parent_index" : "sibling");
      }
      const parentParent = parent.parent; if (parentParent) for (const child of parentParent.children) if (child instanceof TFile && extension(child) === "md" && /^(index|overview|readme)$/i.test(child.basename)) await add(child, "parent_index");
    }
    if (objectId) for (const record of this.app.vault.getFiles().filter((item) => item.path.startsWith("Canonization/records/") && item.extension === "json")) { const recordContent = await this.app.vault.cachedRead(record); if (recordContent.includes(objectId)) await add(record, "registry", { stableObjectId: objectId }); }
    for (const link of links(content)) await add(this.resolveLinkedFile(link, file.path), "dependency", { declaredByCurrentNote: true });
    for (const receipt of this.app.vault.getFiles().filter((item) => /receipt/i.test(item.path) && ["json", "md"].includes(extension(item)))) { const receiptContent = await this.app.vault.cachedRead(receipt); if (receiptContent.includes(file.path) || (objectId && receiptContent.includes(objectId))) await add(receipt, "receipt", { immutable: true }); }
    return sources;
  }
}

export function candidateFieldLabels(): string[] { return CANDIDATE_FIELDS.map(([, label]) => label); }
