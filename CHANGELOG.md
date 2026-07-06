# Changelog

All notable changes to CodeTrek are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [1.0.1] - 2026-07-06

### Fixed
- A brand-new profile (0 XP, nothing completed yet) never reached the
  server until its first level completion or language change — creating a
  profile now pushes it immediately, same as every other mutation. Caught
  by an end-to-end check against production: registering, creating a
  profile, and signing in from a second browser didn't show the profile
  until a reload was thrown in.

## [1.0.0] - 2026-07-06

### Added
- **Real accounts.** Username/password sign-in (scrypt-hashed, session
  tokens) replaces the old 6-character link-code/device-token sync model.
  One account per household — sign in on any device and your kids' profiles
  and progress follow automatically, no code to copy between devices.
- Account settings panel: change password (requires the current password),
  log out, and permanently delete the account and all of its profiles' data.
- A device that already had local-only profiles (from before accounts
  existed) has them automatically claimed under the account on first sign-in
  — nothing is lost.

### Changed
- **Breaking:** signing in is now required to play — the app previously
  worked with no account at all. The sync-era `/api/sync/*` endpoints,
  `devices`/`link_codes` tables, and the "Have a Sync Code?" UI are removed
  entirely in favor of `/api/auth/*` and `/api/profiles/*`.
- Docker images now run as non-root: the frontend uses
  `nginxinc/nginx-unprivileged` (container port 8080, not 80), and the API
  container runs as the `node` user.
- Added a small dependency-free security-headers middleware and an
  in-process rate limiter (10 attempts/5min/IP) on the auth endpoints.

### Fixed
- If the account server is briefly unreachable after a device has already
  signed in once, the app now falls back to the cached local profiles
  instead of locking the family out of their own saved progress — only an
  explicit session rejection (expired/logged out elsewhere/account deleted)
  forces back to the sign-in screen.

## [0.4.0] - 2026-07-06

### Added
- **Buddy**, an on-screen companion that introduces new concepts before a
  level starts and notices when a kid is stuck (repeated failed runs, an
  idle empty workspace, or the same error repeating), escalating from a
  gentle nudge to the level's hint to an animated explanation of the
  underlying concept.
- A top-level error boundary, an About panel, a PWA manifest, and a real
  README/CONTRIBUTING guide (replacing the still-unedited Vite template).

## [0.3.1] - 2026-07-05
- Hardened the nginx `/api/` reverse proxy to degrade to a 503 instead of
  crash-looping the whole frontend container when the backend is briefly
  unreachable; excluded the `server/` workspace from the root Vitest run.

## [0.3.0] - 2026-07-05
- Cross-device profile sync via a 6-character link code + per-device token
  (superseded by real accounts in 1.0.0).

## [0.2.1] - 2026-07-05
- Fixed a critical Blockly drag/render corruption caused by feeding
  unparseable CSS colors into Blockly's own theme.

## [0.2.0] - 2026-07-05
- Second World ("AI Lab"), a Progress view, and a full visual redesign
  (OKLCH design tokens, self-hosted fonts, motion).

## [0.1.0] - 2026-07-05
- Initial MVP: Blockly editor (icon and block-text toolboxes), a robot-grid
  scenario, 12 hand-authored levels, client-side XP/star/badge gamification,
  EN/BG i18n.
