import { describe, it, expect, beforeEach } from 'vitest';
import { getSession, setSession, clearSession, SESSION_STORAGE_KEY_NAME } from './session';

beforeEach(() => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY_NAME);
});

describe('session storage', () => {
  it('returns null when nothing is stored', () => {
    expect(getSession()).toBeNull();
  });

  it('round-trips a session through localStorage', () => {
    setSession({ token: 'abc123', username: 'test_parent' });
    expect(getSession()).toEqual({ token: 'abc123', username: 'test_parent' });
  });

  it('clearSession removes it', () => {
    setSession({ token: 'abc123', username: 'test_parent' });
    clearSession();
    expect(getSession()).toBeNull();
  });

  it('treats corrupted JSON as no session rather than throwing', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY_NAME, '{not json');
    expect(getSession()).toBeNull();
  });
});
