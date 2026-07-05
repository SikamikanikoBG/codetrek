// End-to-end smoke test through the real React tree (profile creation ->
// world map -> Progress view). This project's redesign (App.css/index.css)
// can't be visually verified headlessly, but this at least proves the new
// screens/i18n keys/world data wire up without runtime errors — the kind of
// break tsc wouldn't catch (e.g. a missing translation key, a bad prop).
// Level-play/Blockly is intentionally not exercised here (Blockly injects
// into real DOM/SVG machinery jsdom doesn't fully support).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import '../src/setupTests';
import App from './App';
import { STORAGE_KEY_NAME } from './storage/localStorage';

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY_NAME);
});

afterEach(() => {
  cleanup();
});

describe('App smoke test', () => {
  it('creates a profile, shows both Worlds on the map, and opens the Progress view', () => {
    render(<App />);

    // Profile picker is the boot screen for a fresh localStorage.
    expect(screen.getByText("Who's playing?")).toBeInTheDocument();

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
