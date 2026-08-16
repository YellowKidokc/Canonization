import { Vault } from 'obsidian';
import { VaultIndex } from './vault-indexer';

const START = '<!-- SEMANTIC_AI:GENERATED_INDEX:START -->';
const END = '<!-- SEMANTIC_AI:GENERATED_INDEX:END -->';

export function indexToJSON(index: VaultIndex): string {
  return JSON.stringify({
    metadata: index.metadata,
    concepts: Object.fromEntries(index.concepts),
    relations: index.relations,
    fileIndex: Object.fromEntries(index.fileIndex)
  }, null, 2);
}

function wikiLink(path: string): string {
  return `[[${path.replace(/\.md$/i, '')}]]`;
}

function generatedBlock(index: VaultIndex): string {
  const { metadata, concepts, relations } = index;
  const topConcepts = Array.from(concepts.values())
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 200);

  const conceptRows = topConcepts.length
    ? topConcepts.map((concept) => {
        const files = Array.from(new Set(concept.occurrences.map((o) => o.filePath)))
          .slice(0, 8)
          .map(wikiLink)
          .join(', ');
        return `| ${concept.label.replace(/\|/g, '\\|')} | ${concept.totalCount} | ${concept.fileCount} | ${concept.tagTypes.join(', ')} | ${files} |`;
      }).join('\n')
    : '| _No concepts indexed._ |  |  |  |  |';

  const relationRows = relations.length
    ? relations.slice(0, 500).map((relation) =>
        `| ${wikiLink(relation.sourceFile)} | ${wikiLink(relation.targetFile)} | ${relation.sharedConcepts.join(', ').replace(/\|/g, '\\|')} | ${relation.relationshipStrength.toFixed(3)} |`
      ).join('\n')
    : '| _No cross-file relations indexed._ |  |  |  |';

  const warnings = metadata.warnings?.length
    ? `\n> **Index warnings**\n> ${metadata.warnings.join('\n> ')}\n`
    : '';

  return `${START}
## Overview

| Field | Value |
|---|---:|
| Scope | ${metadata.scope} |
| Scope path | \`${metadata.scopePath}\` |
| Last updated | ${metadata.lastUpdated} |
| Files | ${metadata.totalFiles} |
| Tags | ${metadata.totalTags} |
| Concepts | ${metadata.totalConcepts} |
| Relations | ${relations.length} |
| Processing time | ${metadata.processingTimeMs ?? 0} ms |
${warnings}
## Concepts

The table is sorted by occurrence count. Use Obsidian search for the full indexed concept set.

| Concept | Occurrences | Files | Categories | Notes |
|---|---:|---:|---|---|
${conceptRows}

## Relations

| Source note | Related note | Shared concepts | Strength |
|---|---|---|---:|
${relationRows}

## Search

This file is a durable snapshot of the Semantic AI index. Rebuild it after classification or source changes. The original notes and their UUID tags remain the source material.
${END}`;
}

export async function writeIndexMarkdown(
  vault: Vault,
  index: VaultIndex,
  folderPath: string
): Promise<string> {
  const outputPath = folderPath ? `${folderPath}/OPENINTEL_INDEX.md` : 'OPENINTEL_INDEX.md';
  const existing = vault.getAbstractFileByPath(outputPath);
  const block = generatedBlock(index);

  if (existing && 'path' in existing) {
    await vault.process(existing as any, (content: string) => {
      const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
      return pattern.test(content)
        ? content.replace(pattern, block)
        : `${content.trimEnd()}\n\n${block}\n`;
    });
  } else {
    const title = folderPath ? folderPath.split('/').pop() : 'OpenIntel Vault';
    await vault.create(outputPath, `# ${title} Semantic Index\n\n${block}\n`);
  }

  return outputPath;
}

export async function writeIndexJSON(
  vault: Vault,
  index: VaultIndex,
  folderPath: string
): Promise<string> {
  const outputPath = folderPath ? `${folderPath}/OPENINTEL_INDEX.json` : 'OPENINTEL_INDEX.json';
  const existing = vault.getAbstractFileByPath(outputPath);
  const content = indexToJSON(index);

  if (existing && 'path' in existing) {
    await vault.modify(existing as any, content);
  } else {
    await vault.create(outputPath, content);
  }

  return outputPath;
}

export interface IndexReportContext {
  presetName: string;
  axis2Label: string;
  enabledCategories: string[];
  enabledTopics: string[];
  graph?: Record<string, unknown>;
}

function reportCell(value: string): string {
  return value.replace(/\|/g, '\\\|').replace(/\r?\n/g, ' ');
}

export async function writeIndexReport(
  vault: Vault,
  index: VaultIndex,
  folderPath: string,
  context: IndexReportContext
): Promise<string> {
  const categoryCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const noteRows: string[] = [];

  for (const [filePath, tags] of index.fileIndex) {
    for (const tag of tags) {
      categoryCounts.set(tag.type, (categoryCounts.get(tag.type) || 0) + 1);
      for (const topic of tag.topics || []) topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
    const tagSummary = tags.length
      ? tags.map((tag) => `${tag.type}: ${tag.label} (${tag.uuid})`).join('<br>')
      : '_No semantic tags found_';
    noteRows.push(`| ${wikiLink(filePath)} | ${tags.length} | ${reportCell(tagSummary)} |`);
  }

  const rows = (counts: Map<string, number>) => Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `| ${reportCell(name)} | ${count} |`).join('\n') || '| _None observed_ | 0 |';
  const graph = context.graph || {};
  const graphCount = (key: string) => Array.isArray(graph[key])
    ? (graph[key] as unknown[]).length
    : (graph[key] && typeof graph[key] === 'object' ? Object.keys(graph[key] as object).length : 0);
  const warnings = index.metadata.warnings?.length
    ? index.metadata.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- None';
  const start = '<!-- SEMANTIC_AI:GENERATED_INDEX_REPORT:START -->';
  const end = '<!-- SEMANTIC_AI:GENERATED_INDEX_REPORT:END -->';
  const block = `${start}
## Run summary

| Field | Value |
|---|---|
| Scope | ${index.metadata.scope} |
| Scope path | \`${reportCell(index.metadata.scopePath)}\` |
| Completed | ${index.metadata.lastUpdated} |
| Active preset | ${reportCell(context.presetName)} |
| Axis 2 | ${reportCell(context.axis2Label)} |
| Notes scanned | ${index.metadata.totalFiles} |
| Tags observed | ${index.metadata.totalTags} |
| Concepts observed | ${index.metadata.totalConcepts} |
| Cross-note relations | ${index.relations.length} |
| Processing time | ${index.metadata.processingTimeMs || 0} ms |

## Classification configuration

**Enabled categories:** ${context.enabledCategories.length ? context.enabledCategories.map(reportCell).join(', ') : '_None_'}  
**Enabled ${reportCell(context.axis2Label)} values:** ${context.enabledTopics.length ? context.enabledTopics.map(reportCell).join(', ') : '_None_'}

## Observed category counts

| Category | Tags |
|---|---:|
${rows(categoryCounts)}

## Observed ${reportCell(context.axis2Label)} counts

| Value | Tags |
|---|---:|
${rows(topicCounts)}

## Linked note detail

| Note | Tags | Tag and UUID |
|---|---:|---|
${noteRows.join('\n') || '| _No notes scanned_ | 0 |  |'}

## Supra Infraque graph records

| Collection | Records |
|---|---:|
| Artifacts | ${graphCount('artifacts')} |
| Source spans | ${graphCount('sourceSpans')} |
| Objects | ${graphCount('objects')} |
| Occurrences | ${graphCount('occurrences')} |
| Relations | ${graphCount('relations')} |
| Classifications | ${graphCount('classifications')} |

## Warnings

${warnings}

> Generated receipt for the latest index run. Source notes remain the source of truth; proposed graph relationships are not proof or admitted support.
${end}`;
  const outputPath = folderPath ? `${folderPath}/SEMANTIC_AI_INDEX_REPORT.md` : 'SEMANTIC_AI_INDEX_REPORT.md';
  const existing = vault.getAbstractFileByPath(outputPath);

  if (existing && 'path' in existing) {
    await vault.process(existing as any, (content: string) => {
      const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
      return pattern.test(content) ? content.replace(pattern, block) : `${content.trimEnd()}\n\n${block}\n`;
    });
  } else {
    const title = folderPath ? folderPath.split('/').pop() : 'OpenIntel Vault';
    await vault.create(outputPath, `# ${title} Semantic AI Index Report\n\n${block}\n`);
  }
  return outputPath;
}
