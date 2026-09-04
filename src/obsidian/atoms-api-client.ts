import { App, TFile } from "obsidian";
import { execFile } from "child_process";
import { mkdir, readFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";
import { AtomsReceipt } from "../integration/atoms-receipt";

const execute = promisify(execFile);
type DesktopAdapter = { getBasePath?: () => string };
const ATOMS = "D:\\GitHub\\Faith-through-physics-atoms";

export class AtomsApiClient {
  constructor(private readonly app: App) {}
  async discover(file: TFile, model = "deepseek-chat", apiKey = ""): Promise<{ receipt: AtomsReceipt; raw: string; receiptPath: string }> {
    const base = (this.app.vault.adapter as DesktopAdapter).getBasePath?.();
    if (!base) throw new Error("Atoms API integration requires Obsidian Desktop.");
    const output = join(base, "Canonization", "atoms-receipts", file.basename);
    await mkdir(output, { recursive: true });
    const launcher = join(ATOMS, "_final_api_calls", "run_embedded_markdown.py");
    const spec = join(ATOMS, "_final_api_calls", "01_NONDISCRIMINATORY_DISCOVERY.md");
    const source = join(base, ...file.path.split("/"));
    const env = { ...process.env, ...(apiKey ? { DEEPSEEK_API_KEY: apiKey } : {}) };
    const { stdout } = await execute("python", [launcher, spec, "--source", source, "--provider", "deepseek", "--model", model, "--output-dir", output, "--projection-dir", output], { cwd: ATOMS, env, maxBuffer: 8 * 1024 * 1024 });
    const result = JSON.parse(stdout) as { receipt?: string };
    if (!result.receipt) throw new Error("Atoms API did not return a receipt path.");
    const raw = await readFile(result.receipt, "utf8");
    return { receipt: JSON.parse(raw) as AtomsReceipt, raw, receiptPath: result.receipt };
  }
}
