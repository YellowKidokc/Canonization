import { App, Modal, Setting, TFile } from "obsidian";
import { AssemblyLedger, CoverageStatus } from "../assembly/coverage-resolver";

export class AssemblyScopeModal extends Modal {
  constructor(app: App, private readonly current: TFile, private readonly onSelect: (files: TFile[]) => void) { super(app); }
  onOpen(): void {
    this.contentEl.addClass("canonization-assembly-modal"); this.titleEl.setText("Choose candidate coverage scope");
    const folderFiles = this.app.vault.getMarkdownFiles().filter((file) => file.parent?.path === this.current.parent?.path).sort((a, b) => a.path.localeCompare(b.path));
    const selected = new Set<string>([this.current.path]);
    new Setting(this.contentEl).setName("Current note").setDesc(this.current.path).addButton((button) => button.setButtonText("Analyze current note").setCta().onClick(() => { this.close(); this.onSelect([this.current]); }));
    const heading = this.contentEl.createEl("h3", { text: "Selected notes" }); heading.addClass("canonization-assembly-heading");
    for (const file of folderFiles) new Setting(this.contentEl).setName(file.basename).setDesc(file.path).addToggle((toggle) => toggle.setValue(selected.has(file.path)).onChange((value) => { if (value) selected.add(file.path); else selected.delete(file.path); }));
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Analyze selected notes").onClick(() => { const files = folderFiles.filter((file) => selected.has(file.path)); if (files.length) { this.close(); this.onSelect(files); } }));
    new Setting(this.contentEl).setName("Folder scope").setDesc("Creates one result per Markdown source note; notes are never merged into one atom.").addButton((button) => button.setButtonText("Analyze folder").onClick(() => { this.close(); this.onSelect(folderFiles); }));
  }
  onClose(): void { this.contentEl.empty(); }
}

export class AssemblyReviewModal extends Modal {
  constructor(app: App, private readonly ledgers: AssemblyLedger[], private readonly onExport: () => Promise<void>, private readonly onVerify: () => Promise<AssemblyLedger[]>) { super(app); }
  onOpen(): void { this.render(this.ledgers); }
  private render(ledgers: AssemblyLedger[]): void {
    this.contentEl.empty(); this.contentEl.addClass("canonization-assembly-modal"); this.titleEl.setText("Coverage and assembly resolver");
    this.contentEl.createEl("p", { text: "CANDIDATE_DRAFT  NOT ADMITTED. Human-authored material stays YOURS. AI assistance fills only empty sections and remains PROPOSED until review." });
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Review assembly sources").onClick(async () => this.render(await this.onVerify()))).addButton((button) => button.setButtonText("Export assembly JSON").setCta().onClick(async () => this.onExport()));
    for (const ledger of ledgers) {
      this.contentEl.createEl("h3", { text: ledger.source_note }); const summary = this.contentEl.createDiv({ cls: "canonization-assembly-summary" });
      for (const status of ["PRESENT", "RECOVERABLE", "CONFLICT", "PROPOSED", "NOT_APPLICABLE", "OPEN", "MISSING"] as CoverageStatus[]) if (ledger.summary[status]) summary.createSpan({ text: `${ledger.summary[status]} ${status}` });
      for (const field of ledger.fields) {
        const details = this.contentEl.createEl("details", { cls: "canonization-assembly-field" }); details.createEl("summary", { text: `${field.label} — ${field.status}` });
        if (field.yours) { details.createEl("strong", { text: "YOURS" }); this.renderSource(details, field.yours); }
        for (const item of field.candidates) { details.createEl("strong", { text: item.source_type === "ai_proposal" ? "AI PROPOSAL" : "PRESERVED SOURCE" }); this.renderSource(details, item); }
        if (field.recommendation) details.createEl("p", { text: field.recommendation });
      }
    }
  }
  private renderSource(container: HTMLElement, item: AssemblyLedger["fields"][number]["candidates"][number]): void {
    container.createEl("p", { text: item.value }); const provenance = container.createEl("pre"); provenance.setText(JSON.stringify({ source_type: item.source_type, source_path: item.source_path, source_hash: item.source_hash, source_span: item.source_span, operation: item.operation, confidence: item.confidence, conflicts: item.conflicts, provenance_failure: item.provenance_failure ?? null, human_ruling_required: item.human_ruling_required }, null, 2));
  }
  onClose(): void { this.contentEl.empty(); }
}
