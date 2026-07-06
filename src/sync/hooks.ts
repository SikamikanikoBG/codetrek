// The one place the gamification store (src/gamification/store.ts) touches
// the network — kept tiny and side-effect-only so store.ts stays free of
// fetch/session concerns. No-ops when nobody is signed in (local-only play,
// e.g. the auth backend is unreachable and App.tsx fell back to offline
// mode — see App.tsx's session-check comment).

import type { Profile } from '../storage/localStorage';
import { getSession } from '../storage/session';
import { scheduleProfilePush } from '../auth/profilesApi';

/** Call after any meaningful profile mutation (level completed, XP/badge
 * awarded, profile edited) so the signed-in account's server copy stays
 * fresh. Debounced and fire-and-forget — never blocks or throws. */
export function notifyProfileChanged(profile: Profile): void {
  const session = getSession();
  if (!session) return;
  scheduleProfilePush(session.token, profile);
}
