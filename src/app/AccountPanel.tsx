// Household account settings — reachable from WorldMap's header. Separate
// from the per-kid ProfilePicker/Progress views since an account is a
// household-level concept, not a per-kid one.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changePassword, deleteAccount, AuthApiError } from '../auth/client';

interface AccountPanelProps {
  username: string;
  sessionToken: string;
  onClose: () => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
}

export function AccountPanel({ username, sessionToken, onClose, onLogout, onAccountDeleted }: AccountPanelProps) {
  const { t } = useTranslation('auth');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 8) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    setBusy(true);
    try {
      await changePassword(sessionToken, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(t('account.deleteAccountConfirm'))) return;
    setDeleting(true);
    try {
      await deleteAccount(sessionToken);
      onAccountDeleted();
    } catch {
      setError(t('errors.generic'));
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card account-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{t('account.title')}</h2>
        <p className="account-panel__row">{t('account.signedInAs', { username })}</p>
        <button type="button" className="btn btn-secondary" onClick={onLogout}>
          {t('account.logout')}
        </button>

        <h3>{t('account.changePasswordTitle')}</h3>
        <form onSubmit={handleChangePassword}>
          <label className="flabel" htmlFor="account-current-password">
            {t('account.currentPasswordLabel')}
          </label>
          <input
            id="account-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <label className="flabel" htmlFor="account-new-password">
            {t('account.newPasswordLabel')}
          </label>
          <input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {error && <p className="profile-picker__error">{error}</p>}
          {success && <p className="account-panel__success">{t('account.changePasswordSuccess')}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('account.changingPassword') : t('account.changePassword')}
          </button>
        </form>

        <div className="account-panel__danger-zone">
          <h3>{t('account.dangerZoneTitle')}</h3>
          <p>{t('account.deleteAccountDesc')}</p>
          <button type="button" className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? t('account.deleting') : t('account.deleteAccount')}
          </button>
        </div>

        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('account.close')}
        </button>
      </div>
    </div>
  );
}
