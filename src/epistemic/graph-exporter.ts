import { Vault } from 'obsidian';
import { SupraInfraqueGraphRegistry } from './graph-registry';
import { promptCatalogMarkdown } from './prompts';

const START = '<!-- SUPRA_INFRAQUE:GENERATED:START -->';
const END = '<!-- SUPRA_INFRAQUE:GENERATED:END -->';

export function graphToJSON(registry: SupraInfraqueGraphRegistry, folderPath: string): string {
  return JSON.stringify(registry.exportFolder(folderPath), null, 2);
}

function markdown(registry: SupraInfraqueGraphRegistry, folderPath: string): string {
  const graph = registry.exportFolder(folderPath) as any;
  const sourceFor = (objectId: string): string => {
    const occurrence = graph.occurrences.find((o: any) => o.objectId === objectId);
    const span = occurrence && graph.sourceSpans.find((s: any) => s.spanId === occurrence.spanId);
    const artifact = span && graph.artifacts.find((a: any) => a.artifactId === span.artifactId);
    return artifact?.sourcePath || 'UNRESOLVED_SOURCE';
  };
  const objects = graph.objects as any[];
  const artifacts = graph.artifacts as any[];
  const rows = objects.length ? objects.map((o) => `| ${o.humanCode} | ${o.objectType} | ${o.status} | ${String(o.canonicalText).replace(/\|/g, '\\|')} |`).join('\n') : '| _No objects registered._ | | | |';
  const unresolved = objects.filter((o) => o.objectType === 'CLAIM' && !graph.relations.some((r: any) =>
    r.sourceObjectId === o.objectId && ['SUPPORTS', 'CONTRADICTS', 'UNDERDETERMINES'].includes(r.relationType) && r.status !== 'rejected'
  ));
  const unresolvedRows = unresolved.length
    ? unresolved.map((o) => `- **${o.humanCode}**: ${String(o.canonicalText).replace(/\n/g, ' ')}`).join('\n')
    : '- No unresolved claims recorded.';
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_ -]/g, '').replace(/ /g, '_').slice(0, 48) || 'object';
  const mindMap = objects.length
    ? ['```mermaid', 'mindmap', '  root((Supra Infraque))', ...objects.slice(0, 100).map((o) => `    ${safe(o.humanCode)}[${safe(o.objectType)}: ${safe(String(o.canonicalText))}]`), '```'].join('\n')
    : '```mermaid\nmindmap\n  root((Supra Infraque))\n```';
  return `${START}
## Supra Infraque Graph

This is a generated, proposal-level graph export. Source notes remain authoritative provenance containers; this file is not a truth verdict.

| Field | Value |
|---|---:|
| Schema | ${graph.schemaVersion} |
| Artifacts | ${artifacts.length} |
| Objects | ${objects.length} |
| Relations | ${graph.relations.length} |
| Classifications | ${graph.classifications.length} |

## Unresolved Claims

These claims have no recorded evidential or defeating relation yet. They are review targets, not failed claims.

${unresolvedRows}

## Objects

| Code | Type | Status | Candidate text |
|---|---|---|---|
${rows}

## Mind Map

${mindMap}

## Governance

Changes are append-only in the JSON graph. Candidate objects require later semantic review; registration does not adjudicate their truth.
${END}`;
}

export async function writeGraphExports(vault: Vault, registry: SupraInfraqueGraphRegistry, folderPath: string): Promise<{ markdownPath: string; jsonPath: string }> {
  const markdownPath = folderPath ? `${folderPath}/SUPRA_INFRAQUE_GRAPH.md` : 'SUPRA_INFRAQUE_GRAPH.md';
  const jsonPath = folderPath ? `${folderPath}/SUPRA_INFRAQUE_GRAPH.json` : 'SUPRA_INFRAQUE_GRAPH.json';
  const block = markdown(registry, folderPath);
  const existing = vault.getAbstractFileByPath(markdownPath);
  if (existing && 'path' in existing) {
    await vault.process(existing as any, (content: string) => {
      const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
      return pattern.test(content) ? content.replace(pattern, block) : `${content.trimEnd()}\n\n${block}\n`;
    });
  } else {
    await vault.create(markdownPath, `# Supra Infraque Graph\n\n${block}\n`);
  }
  const jsonExisting = vault.getAbstractFileByPath(jsonPath);
  const json = graphToJSON(registry, folderPath);
  if (jsonExisting && 'path' in jsonExisting) await vault.modify(jsonExisting as any, json);
  else await vault.create(jsonPath, json);
  const promptsPath = folderPath ? `${folderPath}/SUPRA_INFRAQUE_PROMPTS.md` : 'SUPRA_INFRAQUE_PROMPTS.md';
  const promptsExisting = vault.getAbstractFileByPath(promptsPath);
  if (promptsExisting && 'path' in promptsExisting) await vault.modify(promptsExisting as any, promptCatalogMarkdown());
  else await vault.create(promptsPath, promptCatalogMarkdown());
  await writeRoutingIndexes(vault, registry, folderPath);
  return { markdownPath, jsonPath };
}

async function writeRoutingIndexes(vault: Vault, registry: SupraInfraqueGraphRegistry, folderPath: string): Promise<void> {
  const root = folderPath ? `${folderPath}/SUPRA_INFRAQUE` : 'SUPRA_INFRAQUE';
  const graph = registry.exportFolder(folderPath) as any;
  const sourceFor = (objectId: string): string => {
    const occurrence = graph.occurrences.find((o: any) => o.objectId === objectId);
    const span = occurrence && graph.sourceSpans.find((s: any) => s.spanId === occurrence.spanId);
    const artifact = span && graph.artifacts.find((a: any) => a.artifactId === span.artifactId);
    return artifact?.sourcePath || 'UNRESOLVED_SOURCE';
  };
  const buckets: Record<string, any[]> = { Claims: [], Evidence: [], Proof: [], 'Unresolved Claims': [] };
  const proofTypes = new Set(['PROOF', 'THEOREM', 'LEMMA', 'DERIVATION', 'FORMAL_EXPRESSION']);
  const evidenceTypes = new Set(['EVIDENCE_UNIT', 'OBSERVATION', 'RESULT']);
  const relationByObject = new Set(graph.relations.filter((r: any) => r.status !== 'rejected' && ['SUPPORTS', 'CONTRADICTS', 'UNDERDETERMINES'].includes(r.relationType)).map((r: any) => r.sourceObjectId));
  for (const object of graph.objects) {
    if (object.objectType === 'CLAIM') buckets.Claims.push(object);
    if (evidenceTypes.has(object.objectType)) buckets.Evidence.push(object);
    if (proofTypes.has(object.objectType)) buckets.Proof.push(object);
    if (object.objectType === 'CLAIM' && !relationByObject.has(object.objectId)) buckets['Unresolved Claims'].push(object);
  }
  try { await vault.createFolder(root); } catch { /* generated folder already exists */ }
  for (const [name, objects] of Object.entries(buckets)) {
    const path = `${root}/${name.replace(/ /g, '_')}.md`;
    const body = objects.length
      ? objects.map((o: any) => `- **${o.humanCode}** (${o.status}) — ${String(o.canonicalText).replace(/\n/g, ' ')} — source: [[${sourceFor(o.objectId).replace(/\.md$/i, '')}]]`).join('\n')
      : '- None recorded.';
    const content = `# ${name}\n\nGenerated graph view. Source notes remain in their original series folders.\n\n${body}\n`;
    const existing = vault.getAbstractFileByPath(path);
    if (existing && 'path' in existing) await vault.modify(existing as any, content);
    else await vault.create(path, content);
  }
}
