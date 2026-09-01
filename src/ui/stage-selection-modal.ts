import { App, Modal, Setting } from "obsidian";
import { COMPLETE_STAGE_RUN, GOVERNED_STAGES, StageId, stageWarnings } from "../engine/stages";

export class StageSelectionModal extends Modal {
  private readonly selected = new Set<StageId>();
  private warningEl: HTMLElement;

  constructor(app: App, private readonly onRun: (stages: StageId[]) => Promise<void>) { super(app); }

  onOpen(): void {
    this.titleEl.setText("Select governed candidate stages");
    this.contentEl.createEl("p", { text: "Preview only. No stage runs until Run selected stages is pressed; no hidden reruns are permitted." });
    for (const stage of GOVERNED_STAGES) {
      new Setting(this.contentEl).setName(stage.label).setDesc(stage.dependencies.length ? `Depends on: ${stage.dependencies.join(", ")}` : "Protected first-stage capture").addToggle((toggle) => toggle.onChange((enabled) => {
        enabled ? this.selected.add(stage.id) : this.selected.delete(stage.id); this.renderWarnings();
      }));
    }
    this.warningEl = this.contentEl.createEl("pre");
    this.renderWarnings();
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Select complete run").onClick(() => { this.close(); void this.onRun([...COMPLETE_STAGE_RUN]); }))
      .addButton((button) => button.setCta().setButtonText("Run selected stages").onClick(() => { const stages=[...this.selected]; if(!stages.length)return; this.close(); void this.onRun(stages); }));
  }

  private renderWarnings(): void {
    if (!this.warningEl) return;
    const stages=[...this.selected];
    const warnings=stageWarnings(stages);
    this.warningEl.setText(`Preview: ${stages.length ? stages.join(" -> ") : "no stages selected"}${warnings.length ? `\nWarnings:\n- ${warnings.join("\n- ")}` : ""}`);
  }

  onClose(): void { this.contentEl.empty(); }
}
