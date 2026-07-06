// End-to-end smoke test through the real React tree (profile creation ->
// world map -> Progress view). This project's redesign (App.css/index.css)
// can't be visually verified headlessly, but this at least proves the new
// screens/i18n keys/world data wire up without runtime errors — the kind of
// break tsc wouldn't catch (e.g. a missing translation key, a bad prop).
// Level-play/Blockly is intentionally not exercised here (Blockly injects
// into real DOM/SVG machinery jsdom doesn't fully support).
//
// A stored session is seeded directly (bypassing the AuthScreen, which has
// its own dedicated tests) so this test can focus on what it's actually
// about: the profile/world-map/progress flow once past the account gate.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../src/setupTests';
import App from './App';
import { STORAGE_KEY_NAME } from './storage/localStorage';
import { setSession, clearSession } from './storage/session';

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY_NAME);
  setSession({ token: 'test-session-token', username: 'test_parent' });
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify({ account: { id: 'acct_1', username: 'test_parent' } }), { status: 200 }),
        );
      }
      if (url.endsWith('/api/profiles')) {
        return Promise.resolve(new Response(JSON.stringify({ profiles: [] }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }),
  );
});

afterEach(() => {
  cleanup();
  clearSession();
  vi.unstubAllGlobals();
});

describe('App smoke test', () => {
  it('creates a profile, shows both Worlds on the map, and opens the Progress view', async () => {
    render(<App />);

    // The account gate validates the seeded session before the profile
    // picker (the boot screen for a signed-in account with no profiles yet)
    // appears.
    await waitFor(() => expect(screen.getByText("Who's playing?")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Test Kid' } });
    fireEvent.click(screen.getByText('Create Profile'));

    // World map: both Worlds render with their level grids.
    expect(screen.getByText('Robots')).toBeInTheDocument();
    expect(screen.getByText('AI Lab')).toBeInTheDocument();
    expect(screen.getByText('0 XP')).toBeInTheDocument();

    // Progress view is reachable from the world map and reads the same profile.
    fireEvent.click(screen.getByText('Progress'));
    expect(screen.getByText('Your Progress')).toBeInTheDocument();
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText('New Recruit')).toBeInTheDocument();
    expect(screen.getByText('No levels completed yet — go earn your first star!')).toBeInTheDocument();

    // Back to the world map.
    fireEvent.click(screen.getByText('Back to World Map'));
    expect(screen.getByText('Robots')).toBeInTheDocument();
  });
});
