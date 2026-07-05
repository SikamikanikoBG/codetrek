import type { Level, World } from './types';
import { getWorldMeta } from './worldMeta';

// Eagerly load every hand-authored level JSON file at build time.
// Path shape: ./worlds/<world-id>/<level-id>.json
const levelModules = import.meta.glob<Level>('./worlds/*/*.json', {
  eager: true,
  import: 'default',
});

const levelsByWorld = new Map<string, Level[]>();

for (const path in levelModules) {
  const level = levelModules[path];
  const list = levelsByWorld.get(level.worldId) ?? [];
  list.push(level);
  levelsByWorld.set(level.worldId, list);
}

export const worlds: World[] = Array.from(levelsByWorld.entries())
  .map(([worldId, levels]) => {
    const meta = getWorldMeta(worldId);
    return {
      id: worldId,
      order: meta.order,
      titleKey: `levels:worlds.${worldId}.title`,
      colorVar: meta.colorVar,
      icon: meta.icon,
      levels: [...levels].sort((a, b) => a.order - b.order),
    };
  })
  .sort((a, b) => a.order - b.order);

export function getWorld(worldId: string): World | undefined {
  return worlds.find((w) => w.id === worldId);
}

export function getLevel(worldId: string, levelId: string): Level | undefined {
  return getWorld(worldId)?.levels.find((l) => l.id === levelId);
}

export function getAllLevels(): Level[] {
  return worlds.flatMap((w) => w.levels);
}
