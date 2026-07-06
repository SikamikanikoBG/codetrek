// Guards against the classic i18n gotcha: adding a key to one language's
// buddy.json and forgetting the other, which would silently fall back to
// English text inside what's supposed to be a Bulgarian-language session
// (or, worse, render a raw i18next key like "buddy:nudge.idle").

import { describe, it, expect } from 'vitest';
import en from './en/buddy.json';
import bg from './bg/buddy.json';
import { CONCEPTS } from '../content/concepts';

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function collectLeafPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([key, value]) => collectLeafPaths(value, prefix ? `${prefix}.${key}` : key));
}

describe('buddy.json en/bg parity', () => {
  it('has the exact same set of keys in both languages', () => {
    expect(collectLeafPaths(bg).sort()).toEqual(collectLeafPaths(en).sort());
  });

  it('every ConceptInfo titleKey/explainKey resolves to non-empty text in both languages', () => {
    for (const info of Object.values(CONCEPTS)) {
      for (const key of [info.titleKey, info.explainKey]) {
        const path = key.replace(/^buddy:/, '');
        expect(get(en, path), `en missing ${key}`).toBeTruthy();
        expect(get(bg, path), `bg missing ${key}`).toBeTruthy();
      }
    }
  });
});
