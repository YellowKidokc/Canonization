import { Notice, Vault, normalizePath, TFile } from 'obsidian';
import { generateUUID } from '../tagging/uuid-generator';
import { SemanticTag } from '../types';
import {
  ArtifactRecord, ChangeEvent, EpistemicObject, ObjectOccurrence, SourceSpan,
  SupraInfraqueGraphData
} from './types';

const GRAPH_FILENAME = 'supra-infraque-graph.json';
const SCHEMA_VERSION = '1.0.0';

function emptyGraph(): SupraInfraqueGraphData {
  return {
    schemaVersion: SCHEMA_VERSION,
    graphId: generateUUID(),
    lastUpdated: new Date().toISOString(),
    artifacts: {}, sourceSpans: {}, objects: {}, occurrences: {}, relations: {},
    classifications: {}, changeEvents: []
  };
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Append-only graph registry. It never edits a source note. */
export class SupraInfraqueGraphRegistry {
  private readonly vault: Vault;
  private readonly path: string;
  private data: SupraInfraqueGraphData = emptyGraph();
  private dirty = false;

  constructor(vault: Vault, pluginDir?: string) {
    this.vault = vault;
    this.path = normalizePath(`${pluginDir || `${vault.configDir}/plugins/semantic-ai`}/${GRAPH_FILENAME}`);
  }

  async load(): Promise<void> {
    try {
      if (await this.vault.adapter.exists(this.path)) {
        const parsed = JSON.parse(await this.vault.adapter.read(this.path)) as Partial<SupraInfraqueGraphData>;
        this.data = { ...emptyGraph(), ...parsed, schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
          artifacts: parsed.artifacts || {}, sourceSpans: parsed.sourceSpans || {}, objects: parsed.objects || {},
          occurrences: parsed.occurrences || {}, relations: parsed.relations || {}, classifications: parsed.classifications || {},
          changeEvents: parsed.changeEvents || [] };
      } else {
        this.dirty = true;
      }
    } catch {
      new Notice('Supra Infraque graph could not be read; the previous file was left untouched.');
      this.data = emptyGraph();
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;
    const dir = this.path.slice(0, this.path.lastIndexOf('/'));
    if (dir && !(await this.vault.adapter.exists(dir))) await this.vault.adapter.mkdir(dir);
    this.data.lastUpdated = new Date().toISOString();
    await this.vault.adapter.write(this.path, JSON.stringify(this.data, null, 2));
    this.dirty = false;
  }

  getData(): SupraInfraqueGraphData { return this.data; }
  getPath(): string { return this.path; }

  async registerNote(file: TFile, actor = 'obsidian-user'): Promise<EpistemicObject> {
    return this.registerNoteWithTags(file, [], actor);
  }

  async registerNoteWithTags(file: TFile, tags: SemanticTag[], actor = 'obsidian-indexer'): Promise<EpistemicObject> {
    const content = await this.vault.read(file);
    const sourceSha256 = await sha256(content);
    const artifactId = `artifact:${sourceSha256}`;
    const existing = Object.values(this.data.artifacts).find((a) => a.sourcePath === file.path && a.sourceSha256 === sourceSha256);
    if (existing) {
      const occurrence = Object.values(this.data.occurrences).find((o) => this.data.sourceSpans[o.spanId]?.artifactId === existing.artifactId);
      if (occurrence && this.data.objects[occurrence.objectId]) {
        this.addTagClassifications(occurrence.objectId, tags, occurrence.spanId, actor);
        if (tags.length) await this.save();
        return this.data.objects[occurrence.objectId];
      }
    }

    const now = new Date().toISOString();
    const artifact: ArtifactRecord = {
      artifactId, sourcePath: file.path, sourceName: file.name, sourceExtension: `.${file.extension}`,
      sourceBytes: new TextEncoder().encode(content).byteLength, sourceModified: new Date(file.stat.mtime).toISOString(),
      sourceSha256, registeredAt: now
    };
    this.data.artifacts[artifactId] = artifact;
    const spanId = generateUUID();
    const lines = content.split(/\r?\n/);
    const span: SourceSpan = { spanId, artifactId, locator: { kind: 'line', start: 1, end: lines.length }, exactText: content };
    this.data.sourceSpans[spanId] = span;

    const objectId = generateUUID();
    const objectType = this.objectTypeFromTags(tags);
    const prefix = objectType === 'CLAIM' ? 'CLM' : objectType === 'EVIDENCE_UNIT' ? 'EVD' : objectType === 'PROOF' ? 'PRF' : objectType === 'QUESTION' ? 'Q' : 'OBJ';
    const humanCode = `${prefix}-${String(Object.keys(this.data.objects).length + 1).padStart(3, '0')}`;
    const object: EpistemicObject = {
      objectId, humanCode, objectType, canonicalText: this.candidateText(content), scope: `Note: ${file.path}`,
      modality: 'unclassified', polarity: 'unclassified', ownerFramework: 'unclassified', status: 'proposed',
      createdBy: actor, createdAt: now, version: '0.1.0'
    };
    this.data.objects[objectId] = object;
    const occurrence: ObjectOccurrence = { occurrenceId: generateUUID(), objectId, objectVersion: object.version, spanId };
    this.data.occurrences[occurrence.occurrenceId] = occurrence;
    this.addTagClassifications(objectId, tags, spanId, actor);
    this.recordEvent('created', objectId, 'Candidate object registered from immutable note provenance.', actor);
    this.dirty = true;
    await this.save();
    return object;
  }

  async registerFolder(files: TFile[], readTags: (file: TFile) => Promise<SemanticTag[]>): Promise<number> {
    for (const file of files) {
      await this.registerNoteWithTags(file, await readTags(file));
    }
    await this.save();
    return files.length;
  }

  private addTagClassifications(objectId: string, tags: SemanticTag[], spanId: string, actor: string): void {
    for (const tag of tags) {
      const terms = [
        { axis: 'logical_role', term: tag.type },
        { axis: 'concept', term: tag.label },
        ...(tag.topics || []).map((topic) => ({ axis: 'topic', term: topic }))
      ];
      for (const item of terms) {
        const duplicate = Object.values(this.data.classifications).some((assignment) =>
          assignment.objectId === objectId && assignment.axis === item.axis && assignment.term === item.term && assignment.status !== 'superseded'
        );
        if (duplicate) continue;
        this.data.classifications[generateUUID()] = {
          assignmentId: generateUUID(), objectId, axis: item.axis, term: item.term,
          classifier: `semantic-ai:${actor}`, confidence: null,
          rationale: 'Imported from an existing Semantic AI tag; requires epistemic review.',
          sourceSpanIds: [spanId], createdAt: new Date().toISOString(), status: 'proposed'
        };
        this.dirty = true;
      }
    }
  }

  private candidateText(content: string): string {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('---'));
    return (lines[0] || content.trim()).slice(0, 2000);
  }

  private objectTypeFromTags(tags: SemanticTag[]): EpistemicObject['objectType'] {
    const normalized = tags.map((tag) => `${tag.type} ${tag.label}`.toLowerCase());
    if (normalized.some((value) => /evidence|observation|result|fact|quote|source/.test(value))) return 'EVIDENCE_UNIT';
    if (normalized.some((value) => /proof|theorem|lemma|derivation|formal/.test(value))) return 'PROOF';
    if (normalized.some((value) => /axiom/.test(value))) return 'AXIOM';
    if (normalized.some((value) => /question/.test(value))) return 'QUESTION';
    if (normalized.some((value) => /bridge|translation|correspondence/.test(value))) return 'BRIDGE';
    if (normalized.some((value) => /claim|idea|thesis|statement|premise|assertion/.test(value))) return 'CLAIM';
    return 'CLAIM';
  }

  private recordEvent(action: ChangeEvent['action'], targetId: string, reason: string, actor: string): void {
    this.data.changeEvents.push({ eventId: generateUUID(), action, targetId, reason, actor, createdAt: new Date().toISOString() });
  }

  exportFolder(folderPath: string): object {
    const artifacts = Object.values(this.data.artifacts).filter((a) => a.sourcePath === folderPath || a.sourcePath.startsWith(`${folderPath}/`));
    const artifactIds = new Set(artifacts.map((a) => a.artifactId));
    const spans = Object.values(this.data.sourceSpans).filter((s) => artifactIds.has(s.artifactId));
    const spanIds = new Set(spans.map((s) => s.spanId));
    const occurrences = Object.values(this.data.occurrences).filter((o) => spanIds.has(o.spanId));
    const objectIds = new Set(occurrences.map((o) => o.objectId));
    return {
      schemaVersion: this.data.schemaVersion, graphId: this.data.graphId, lastUpdated: this.data.lastUpdated,
      artifacts, sourceSpans: spans, objects: Object.values(this.data.objects).filter((o) => objectIds.has(o.objectId)),
      occurrences, relations: Object.values(this.data.relations).filter((r) => objectIds.has(r.sourceObjectId) || objectIds.has(r.targetObjectId)),
      classifications: Object.values(this.data.classifications).filter((c) => objectIds.has(c.objectId)),
      changeEvents: this.data.changeEvents.filter((e) => objectIds.has(e.targetId))
    };
  }
}
