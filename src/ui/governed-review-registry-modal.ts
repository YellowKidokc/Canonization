import { App, Modal } from "obsidian";
import { GOVERNED_REVIEW_REGISTRY } from "../governance/review-registry";

export class GovernedReviewRegistryModal extends Modal {
  constructor(app: App) { super(app); }

  onOpen(): void {
    this.titleEl.setText(`Governed review registry v${GOVERNED_REVIEW_REGISTRY.registryVersion}`);
    this.contentEl.createEl("p", { text: "Review questions only. This registry cannot grant admission or canonical propagation." });
    this.contentEl.createEl("h3", { text: "Object classifications and prompts" });
    for (const [type, prompt] of Object.entries(GOVERNED_REVIEW_REGISTRY.objectTypePrompts)) {
      const section = this.contentEl.createEl("details");
      section.createEl("summary", { text: type });
      section.createEl("p", { text: prompt });
    }
    this.contentEl.createEl("h3", { text: "Independent classification axes" });
    const axes = this.contentEl.createEl("ul");
    for (const axis of GOVERNED_REVIEW_REGISTRY.classificationAxes) axes.createEl("li", { text: axis });
    this.contentEl.createEl("h3", { text: "Bridge questions" });
    const questions = this.contentEl.createEl("ol");
    for (const question of GOVERNED_REVIEW_REGISTRY.bridgeQuestions) questions.createEl("li", { text: question });
  }

  onClose(): void { this.contentEl.empty(); }
}
