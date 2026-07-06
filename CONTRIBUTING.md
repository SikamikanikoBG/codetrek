# Contributing to CodeTrek

Thanks for considering it — a few pointers to get oriented.

## Adding a level

Levels are plain JSON, one file per level, under
`src/content/worlds/<world-id>/`. See `src/content/types.ts` for the schema
and any existing level in that folder for a working example. A level needs
no code changes — the manifest (`src/content/manifest.ts`) picks up every
file in that directory automatically.

## Adding a translation

All UI strings live in `src/locales/<lang>/*.json`, split by namespace
(`common`, `levels`, `ui`, `buddy`). Keep the same key structure across
languages — `src/locales/buddyParity.test.ts` enforces this for the `buddy`
namespace and is a good template if you add checks for others.

Icon-tier levels (`tier: "icon"` in the level JSON) must stay text-free by
design — don't add a `titleKey` or hint text to one; that's what keeps them
playable before a kid can read.

## Adding a new concept for Buddy to teach

`src/content/concepts.ts` is the registry Buddy (the on-screen companion)
draws its explanations from. Add an entry there plus matching
`buddy.json` keys in every language, then reference the concept id in a
level's `concepts` array.

## Running the checks before opening a PR

```bash
npm run build
npx vitest run
npm run lint
```

CI runs the same checks, plus a Docker build+boot smoke test.

## Code style

No enforced abstraction beyond what's already there — small, direct
components over frameworks-within-the-framework. If in doubt, match the
nearest existing file.
