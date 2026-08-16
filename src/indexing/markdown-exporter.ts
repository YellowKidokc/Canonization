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
