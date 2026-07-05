// The one place the gamification store (src/gamification/store.ts) touches
// sync — kept tiny and side-effect-only so store.ts stays free of fetch/
// network concerns. No-ops for any profile that has never enabled sync.

import type { Profile } from '../storage/localStorage';
import { getSyncMeta } from '../storage/syncMeta';
import { scheduleSyncPush } from './client';

/** Call after any meaningful profile mutation (level completed, XP/badge
 * awarded, profile edited) so a LINKED profile's server copy stays fresh.
 * Debounced and fire-and-forget — never blocks or throws. */
export function notifyProfileChanged(profile: Profile): void {
  const meta = getSyncMeta(profile.id);
  if (!meta) return;
  scheduleSyncPush(profile.id, meta.deviceToken, profile);
}
