import { Feature } from '@/store/app-store';

export interface AncestorContext {
  id: string;
  title?: string;
  description: string;
  spec?: string;
  summary?: string;
  depth: number; // 0 = immediate parent, 1 = grandparent, etc.
}

/**
 * Traverses the dependency graph to find all ancestors of a feature.
 * Returns ancestors ordered by depth (closest first).
 *
 * @param feature - The feature to find ancestors for
 * @param allFeatures - All features in the system
 * @param maxDepth - Maximum depth to traverse (prevents infinite loops)
 * @returns Array of ancestor contexts, sorted by depth (closest first)
 */
export function getAncestors(
  feature: Feature,
  allFeatures: Feature[],
  maxDepth: number = 10
): AncestorContext[] {
  const featureMap = new Map(allFeatures.map((f) => [f.id, f]));
  const ancestors: AncestorContext[] = [];
  const visited = new Set<string>();

  function traverse(featureId: string, depth: number) {
    if (depth > maxDepth || visited.has(featureId)) return;
    visited.add(featureId);

    const f = featureMap.get(featureId);
    if (!f?.dependencies) return;

    for (const depId of f.dependencies) {
      const dep = featureMap.get(depId);
      if (dep && !visited.has(depId)) {
        ancestors.push({
          id: dep.id,
          title: dep.title,
          description: dep.description,
          spec: dep.spec,
          summary: dep.summary,
          depth,
        });
        traverse(depId, depth + 1);
      }
    }
  }

  traverse(feature.id, 0);

  // Sort by depth (closest ancestors first)
  return ancestors.sort((a, b) => a.depth - b.depth);
}

/**
 * Formats ancestor context for inclusion in a task description.
 *
 * @param ancestors - Array of ancestor contexts (including parent)
 * @param selectedIds - Set of selected ancestor IDs to include
 * @returns Formatted markdown string with ancestor context
 */
export function formatAncestorContextForPrompt(
  ancestors: AncestorContext[],
  selectedIds: Set<string>
): string {
  const selectedAncestors = ancestors.filter((a) => selectedIds.has(a.id));
  if (selectedAncestors.length === 0) return '';

  const sections = selectedAncestors.map((ancestor) => {
    const parts: string[] = [];
    const title = ancestor.title || `Task (${ancestor.id.slice(0, 8)})`;

    parts.push(`### ${title}`);

    if (ancestor.description) {
      parts.push(`**Description:** ${ancestor.description}`);
    }
    if (ancestor.spec) {
      parts.push(`**Specification:**\n${ancestor.spec}`);
    }
    if (ancestor.summary) {
      parts.push(`**Summary:** ${ancestor.summary}`);
    }

    return parts.join('\n\n');
  });

  return `## Ancestor Context\n\n${sections.join('\n\n---\n\n')}`;
}
