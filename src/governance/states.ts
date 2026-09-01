import { WorkflowState } from "../schema/types";
export const NON_ADMITTED_STATES: WorkflowState[] = ["Candidate", "Frozen", "Reviewed", "Voted", "Rejected", "Superseded"];
export function isAdmitted(state: WorkflowState, eventReference: string | null): boolean { return state === "Admitted" && Boolean(eventReference); }
