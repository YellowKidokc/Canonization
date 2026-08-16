/** Supra Infraque: ontology-first, provenance-preserving graph records. */

export type EpistemicObjectType =
  | 'AXIOM' | 'CONSTITUTIVE_DISCLOSURE' | 'PRIMITIVE' | 'DEFINITION' | 'DISTINCTION'
  | 'QUESTION' | 'QUESTION_FAMILY' | 'RESPONSE' | 'OBSERVATION'
  | 'CLAIM' | 'PREMISE' | 'LEMMA' | 'THEOREM' | 'PROOF' | 'COROLLARY' | 'DERIVATION' | 'INFERENCE_RULE'
  | 'MODEL' | 'FORMAL_EXPRESSION' | 'ANALOGY' | 'METAPHOR' | 'INTERPRETATION'
  | 'BRIDGE' | 'TRANSLATION' | 'CORRESPONDENCE' | 'IDENTITY_CLAIM'
  | 'EVIDENCE_UNIT' | 'PREDICTION' | 'PROTOCOL' | 'TEST' | 'RESULT' | 'FALSIFIER' | 'DEFEATER'
  | 'OBJECTION' | 'COUNTEREXAMPLE' | 'COUNTERMODEL' | 'ALTERNATIVE_EXPLANATION' | 'LIMITATION'
  | 'LAW' | 'PRINCIPLE' | 'SYNTHESIS' | 'APPLICATION';

export type ObjectStatus = 'draft' | 'proposed' | 'active' | 'contested' | 'supported' | 'defeated' | 'superseded' | 'retired';
export type RelationType =
  | 'CONSTITUTIVE_OF' | 'DISCLOSES' | 'DEFINES' | 'HAS_PART' | 'INSTANTIATES'
  | 'DEPENDS_ON' | 'DERIVED_FROM' | 'ENTAILS' | 'IMPLIES' | 'COROLLARY_OF' | 'USES_RULE'
  | 'SUPPORTS' | 'WEAKENS' | 'CONTRADICTS' | 'UNDERDETERMINES' | 'EXPLAINS' | 'PREDICTS'
  | 'TESTS' | 'FALSIFIES_IF' | 'CONFIRMS_IF' | 'IMPLEMENTS_PROTOCOL' | 'PRODUCES_RESULT'
  | 'MAPS_FROM' | 'MAPS_TO' | 'PRESERVES' | 'LOSES' | 'TRANSLATES' | 'CORRESPONDS_TO'
  | 'OBJECTS_TO' | 'COUNTEREXAMPLE_TO' | 'COUNTERMODEL_TO' | 'DEFEATS' | 'LIMITS'
  | 'DUPLICATES' | 'REFINES' | 'SUPERSEDES' | 'RETRACTS' | 'CONFLICTS_WITH';

export interface EpistemicObject {
  objectId: string;
  humanCode: string;
  objectType: EpistemicObjectType;
  canonicalText: string;
  scope: string;
  modality: string;
  polarity: string;
  ownerFramework: string;
  status: ObjectStatus;
  createdBy: string;
  createdAt: string;
  version: string;
}

export interface ArtifactRecord {
  artifactId: string;
  sourcePath: string;
  sourceName: string;
  sourceExtension: string;
  sourceBytes: number;
  sourceModified: string;
  sourceSha256: string;
  registeredAt: string;
}

export interface SourceSpan {
  spanId: string;
  artifactId: string;
  locator: { kind: 'line'; start: number; end: number };
  exactText: string;
}

export interface ObjectOccurrence {
  occurrenceId: string;
  objectId: string;
  objectVersion: string;
  spanId: string;
}

export interface EpistemicRelation {
  relationId: string;
  sourceObjectId: string;
  sourceVersion: string;
  targetObjectId: string;
  targetVersion: string;
  relationType: RelationType;
  warrant: string;
  assumptions: string[];
  sourceSpanIds: string[];
  confidence: number | null;
  status: 'proposed' | 'active' | 'contested' | 'rejected';
  createdAt: string;
}

export interface ClassificationAssignment {
  assignmentId: string;
  objectId: string;
  axis: string;
  term: string;
  classifier: string;
  confidence: number | null;
  rationale: string;
  sourceSpanIds: string[];
  createdAt: string;
  status: 'proposed' | 'active' | 'contested' | 'superseded';
}

export interface ChangeEvent {
  eventId: string;
  action: 'created' | 'assessed' | 'superseded' | 'retracted' | 'linked';
  targetId: string;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface SupraInfraqueGraphData {
  schemaVersion: string;
  graphId: string;
  lastUpdated: string;
  artifacts: Record<string, ArtifactRecord>;
  sourceSpans: Record<string, SourceSpan>;
  objects: Record<string, EpistemicObject>;
  occurrences: Record<string, ObjectOccurrence>;
  relations: Record<string, EpistemicRelation>;
  classifications: Record<string, ClassificationAssignment>;
  changeEvents: ChangeEvent[];
}
