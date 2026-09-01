import { CanonizationRecord } from "../schema/types";

export interface FakeProviderResponse {
  provider: "fixture";
  model: string;
  requestId: string;
  claims?: string[];
  objections?: string[];
  openGaps?: string[];
  summary?: string;
  raw: unknown;
}

const atom = (recordId: string, kind: string, statement: string, index: number) => ({
  id: crypto.randomUUID(), kind, statement, sourceCoordinates: { recordId, providerItem: index },
  origin: "AI_PROPOSAL", authority: "candidate-only"
});

export function mapFakeProviderResponse(record: CanonizationRecord, response: FakeProviderResponse, now: string): CanonizationRecord {
  const mapped = structuredClone(record);
  mapped.claims = (response.claims ?? []).map((value, index) => atom(record.recordId, "claim", value, index));
  mapped.strongestDefeaters = (response.objections ?? []).map((value, index) => atom(record.recordId, "objection", value, index));
  mapped.openGaps = (response.openGaps ?? []).map((value, index) => atom(record.recordId, "open-gap", value, index));
  if (response.summary !== undefined) mapped.summary = response.summary;
  mapped.provenance.push({
    event: "provider-response-mapped", at: now, provider: response.provider, model: response.model,
    requestId: response.requestId, rawResponse: structuredClone(response.raw), mappingAuthority: "AI_PROPOSAL",
    deterministicFields: ["source.contentHash", "recordId"], inheritedMetadata: [], humanRuling: null,
    admissionPerformed: false
  });
  return mapped;
}
