import { BRIDGE_QUESTIONS, EPISTEMIC_AXES, EPISTEMIC_TYPE_PROMPTS } from "../epistemic/prompts";

export const REVIEW_REGISTRY_VERSION = "1.0.0" as const;

/**
 * Authoritative review vocabulary shared by the Obsidian bundle and the
 * generated browser registry. It supplies questions, not truth or admission.
 */
export const GOVERNED_REVIEW_REGISTRY = {
  registryVersion: REVIEW_REGISTRY_VERSION,
  authority: "REVIEW_QUESTIONS_NOT_ADMISSION",
  objectTypePrompts: EPISTEMIC_TYPE_PROMPTS,
  classificationAxes: EPISTEMIC_AXES,
  bridgeQuestions: BRIDGE_QUESTIONS,
  propagationDispositions: [
    "DO_NOT_PROPAGATE",
    "LOCAL_ONLY",
    "CANDIDATE_REUSABLE",
    "PROPOSE_GOVERNED_PROPAGATION"
  ]
} as const;

