import { Feature } from '@/store/app-store';

/**
 * Checks if adding a dependency from sourceId to targetId would create a circular dependency.
 * Uses DFS to detect if targetId can reach sourceId through existing dependencies.
 *
 * @param features - All features in the system
 * @param sourceId - The feature that would become a dependency (the prerequisite)
 * @param targetId - The feature that would depend on sourceId
 * @returns true if adding this dependency would create a cycle
 */
export function wouldCreateCircularDependency(
  features: Feature[],
  sourceId: string,
  targetId: string
): boolean {
  const featureMap = new Map(features.map((f) => [f.id, f]));
  const visited = new Set<string>();

  function canReach(currentId: string, targetId: string): boolean {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    const feature = featureMap.get(currentId);
    if (!feature?.dependencies) return false;

    for (const depId of feature.dependencies) {
      if (canReach(depId, targetId)) return true;
    }
    return false;
  }

  // Check if source can reach target through existing dependencies
  // If so, adding target -> source would create a cycle
  return canReach(sourceId, targetId);
}

/**
 * Checks if a dependency already exists between two features.
 *
 * @param features - All features in the system
 * @param sourceId - The potential dependency (prerequisite)
 * @param targetId - The feature that might depend on sourceId
 * @returns true if targetId already depends on sourceId
 */
export function dependencyExists(features: Feature[], sourceId: string, targetId: string): boolean {
  const targetFeature = features.find((f) => f.id === targetId);
  if (!targetFeature?.dependencies) return false;
  return targetFeature.dependencies.includes(sourceId);
}
