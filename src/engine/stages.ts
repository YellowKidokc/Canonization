export const GOVERNED_STAGES = [
  { id: "discovery", label: "Blind discovery", dependencies: [], protected: true },
  { id: "classification", label: "Candidate classification", dependencies: ["discovery"], protected: false },
  { id: "reconciliation", label: "Reconciliation", dependencies: ["discovery", "classification"], protected: false },
  { id: "claims", label: "Claims", dependencies: ["discovery"], protected: false },
  { id: "definitions", label: "Definitions", dependencies: ["discovery"], protected: false },
  { id: "mathematics", label: "Mathematics", dependencies: ["discovery"], protected: false },
  { id: "theology", label: "Theological declarations", dependencies: ["discovery"], protected: false },
  { id: "bridges", label: "Bridge proposals", dependencies: ["claims"], protected: false },
  { id: "defeaters", label: "Defeaters and open gaps", dependencies: ["claims"], protected: false },
  { id: "review", label: "Review packet", dependencies: ["reconciliation", "defeaters"], protected: false }
] as const;

export type StageId = typeof GOVERNED_STAGES[number]["id"];
export const COMPLETE_STAGE_RUN: StageId[] = GOVERNED_STAGES.map((stage) => stage.id);

export function stageWarnings(selected: readonly StageId[]): string[] {
  const chosen = new Set(selected);
  const warnings: string[] = [];
  if (selected.length && !chosen.has("discovery")) warnings.push("Blind discovery is not selected; later stages may only use a previously captured immutable result.");
  for (const stage of GOVERNED_STAGES) {
    if (!chosen.has(stage.id)) continue;
    const missing = stage.dependencies.filter((dependency) => !chosen.has(dependency));
    if (missing.length) warnings.push(`${stage.label} depends on ${missing.join(", ")}.`);
  }
  return warnings;
}

export function orderStages(selected: readonly StageId[]): StageId[] {
  const chosen = new Set(selected);
  return GOVERNED_STAGES.filter((stage) => chosen.has(stage.id)).map((stage) => stage.id);
}
