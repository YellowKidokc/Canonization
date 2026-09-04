import { App, TFile } from "obsidian";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { CanonizationRecord } from "../schema/types";
import { exportPackage, validatePackage } from "../package/portable-package";

type DesktopAdapter = { getBasePath?: () => string };

const safeName = (value: string): string => value.replace(/[^A-Za-z0-9_.-]/g, "_");
const stamp = (): string => new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");

export interface CrossVaultResult {
  destinationVault: string;
  packageFolder: string;
  reviewPath: string;
  recordId: string;
}

export class CrossVaultClient {
  constructor(private readonly app: App) {}

  private roots(): { source: string; destination: string } {
    const adapter = this.app.vault.adapter as DesktopAdapter;
    const source = adapter.getBasePath?.();
    if (!source) throw new Error("Cross-vault transfer requires Obsidian Desktop.");
    const destination = resolve(dirname(source), "02_CANONIZATION", "Canonization");
    return { source, destination };
  }

  async send(file: TFile, record: CanonizationRecord, externalReceipts?: Record<string, string>): Promise<CrossVaultResult> {
    if (record.workflowState === "Admitted" || record.admissionEventReference) {
      throw new Error("Cross-vault transfer refused an admitted record.");
    }
    const content = await this.app.vault.cachedRead(file);
    const sourceName = `${safeName(record.source.sourceId)}.md`;
    const pkg = exportPackage([record], {
      projectId: "faiththruphysics.com",
      actor: "David",
      sources: { [sourceName]: content },
      externalReceipts,
    });
    const check = validatePackage(pkg);
    if (!check.valid) throw new Error(`Package validation failed: ${check.errors.join("; ")}`);

    const { destination } = this.roots();
    const packageFolder = join(destination, "Canonization", "packages", "inbox", `${stamp()}_${safeName(record.recordId)}`);
    for (const [relative, bytes] of Object.entries(pkg.files)) {
      const target = join(packageFolder, ...relative.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes, "utf8");
    }

    const recordName = `${safeName(record.recordId)}.json`;
    const projectionName = `${safeName(record.recordId)}.md`;
    const recordText = pkg.files[`records/${recordName}`];
    const projectionText = pkg.files[`projections/${projectionName}`];
    if (!recordText || !projectionText) throw new Error("Validated package omitted its record projection.");
    const recordFolder = join(destination, "Canonization", "records");
    const candidateFolder = join(destination, "Canonization", "candidates");
    await mkdir(recordFolder, { recursive: true });
    await mkdir(candidateFolder, { recursive: true });
    await writeFile(join(recordFolder, recordName), recordText, "utf8");
    await writeFile(join(candidateFolder, projectionName), projectionText, "utf8");

    const reviewPath = `Canonization/candidates/${projectionName}`;
    const uri = `obsidian://open?vault=Canonization&file=${encodeURIComponent(reviewPath)}`;
    const marker = `<!-- canonization-cross-vault:${record.recordId} -->`;
    await this.app.vault.process(file, (current) => current.includes(marker) ? current : `${current.trimEnd()}\n\n> [!info] Canonization review\n> [Open this candidate in the Canonization vault](${uri})\n> Candidate data remains **CANDIDATE_DRAFT - NOT ADMITTED**.\n${marker}\n`);

    return { destinationVault: destination, packageFolder, reviewPath, recordId: record.recordId };
  }
}
