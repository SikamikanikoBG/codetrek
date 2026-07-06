// Regression coverage for the login<->register toggle: an earlier version
// had the switch-link ternary inverted (showed the WRONG mode's label),
// caught by live Playwright verification rather than a unit test — this
// locks the fix in.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '../setupTests';
import { AuthScreen } from './AuthScreen';

afterEach(() => cleanup());

describe('AuthScreen', () => {
  it('starts on the sign-in tab with a link to create an account', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create an account' })).toBeInTheDocument();
  });

  it('switching to register shows the create-account submit button and a link back to sign in', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('rejects a too-short password before ever calling the network', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<AuthScreen onAuthenticated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newkid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('rejects mismatched passwords before ever calling the network', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<AuthScreen onAuthenticated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newkid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
