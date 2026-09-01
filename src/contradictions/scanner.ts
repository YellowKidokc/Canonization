import { Atom, CanonizationRecord } from "../schema/types";
export const CONTRADICTION_STATUSES = ["confirmed-logical-contradiction", "definition-mismatch", "scope-mismatch", "temporal-or-state-difference", "rival-interpretation", "premise-disagreement", "formal-countermodel", "apparent-tension", "superseded-claim", "unresolved-contradiction-candidate"] as const;
export type ContradictionStatus = typeof CONTRADICTION_STATUSES[number];
export interface ContradictionCandidate { leftId: string; rightId: string; proposedStatus: ContradictionStatus; finalStatus: ContradictionStatus | null; authority: "DETERMINISTIC_PROPOSAL_REQUIRES_HUMAN_REVIEW"; reasons: string[]; }
const thirdPerson = (verb: string): string => {
  if (verb === "have") return "has";
  if (verb === "be") return "is";
  if (/(?:s|x|z|ch|sh|o)$/.test(verb)) return `${verb}es`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
};
const normalize = (text: string): string => text
  .toLowerCase()
  .replace(/\bdoes\s+not\s+([a-z]+)\b/g, (_match, verb: string) => thirdPerson(verb))
  .replace(/\b(?:do|did)\s+not\b/g, "")
  .replace(/\b(?:is|are|was|were|has|have|had|can|could|will|would|shall|should|may|might|must)\s+not\b/g, (match) => match.replace(/\s+not\b/, ""))
  .replace(/\b(?:not|never|no)\b/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const negated = (text: string): boolean => /\b(not|never|no)\b/i.test(text);
const claims = (record: CanonizationRecord): Atom[] => [...(record.claims ?? []), ...(record.bridges ?? [])];
export function scanContradictionCandidates(records: CanonizationRecord[]): ContradictionCandidate[] { const atoms = records.reduce<Atom[]>((all, record) => all.concat(claims(record)), []), found: ContradictionCandidate[] = [];
  for (let left = 0; left < atoms.length; left += 1) for (let right = left + 1; right < atoms.length; right += 1) { const a = atoms[left], b = atoms[right]; if (normalize(a.statement) !== normalize(b.statement) || negated(a.statement) === negated(b.statement)) continue;
    const reasons = ["normalized propositions match while explicit polarity differs"];
    const scopeA = a.scope as string | undefined, scopeB = b.scope as string | undefined, timeA = a.validAt as string | undefined, timeB = b.validAt as string | undefined;
    let proposedStatus: ContradictionStatus = "unresolved-contradiction-candidate";
    if (scopeA && scopeB && scopeA !== scopeB) { proposedStatus = "scope-mismatch"; reasons.push("declared scopes differ"); }
    else if (timeA && timeB && timeA !== timeB) { proposedStatus = "temporal-or-state-difference"; reasons.push("declared times or states differ"); }
    found.push({ leftId: a.id, rightId: b.id, proposedStatus, finalStatus: null, authority: "DETERMINISTIC_PROPOSAL_REQUIRES_HUMAN_REVIEW", reasons });
  } return found; }
export function adjudicateContradiction(candidate: ContradictionCandidate, status: ContradictionStatus, reviewer: string): ContradictionCandidate & { reviewedBy: string } { if (!reviewer.trim()) throw new Error("Human reviewer is required"); return { ...candidate, finalStatus: status, reviewedBy: reviewer }; }
