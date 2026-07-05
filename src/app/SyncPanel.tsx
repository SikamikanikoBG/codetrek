// "Enable sync" panel — lives on the Progress view (DESIGN.md's per-profile
// stats screen). Optional and unobtrusive per PRODUCT.md: most families may
// never touch it, so it's one quiet section, not a modal or an interruption.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../storage/localStorage';
import { getSyncMeta, setSyncMeta } from '../storage/syncMeta';
import { createSync, requestNewCode } from '../sync/client';

interface SyncPanelProps {
  profile: Profile;
}

export function SyncPanel({ profile }: SyncPanelProps) {
  const { t } = useTranslation('ui');
  const meta = getSyncMeta(profile.id);
  const [linked, setLinked] = useState(!!meta);
  const [code, setCode] = useState<string | null>(meta?.lastLinkCode ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const result = await createSync(profile);
      setSyncMeta(profile.id, { deviceToken: result.deviceToken, lastLinkCode: result.linkCode });
      setCode(result.linkCode);
      setLinked(true);
    } catch {
      setError(t('sync.error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleNewCode() {
    const current = getSyncMeta(profile.id);
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestNewCode(current.deviceToken);
      setSyncMeta(profile.id, { ...current, lastLinkCode: result.linkCode });
      setCode(result.linkCode);
    } catch {
      setError(t('sync.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="progress-panel sync-panel">
      <h2>{t('sync.title')}</h2>

      {!linked && (
        <>
          <p className="sync-panel__desc">{t('sync.desc')}</p>
          <button type="button" className="btn btn-primary" onClick={handleEnable} disabled={busy}>
            {busy ? t('sync.enabling') : t('sync.enable')}
          </button>
        </>
      )}

      {linked && (
        <>
          <p className="sync-panel__status">{t('sync.linked')}</p>
          {code && (
            <div className="sync-code" aria-label={t('sync.codeAria')}>
              {code}
            </div>
          )}
          <p className="sync-panel__hint">{t('sync.codeHint')}</p>
          <button type="button" className="btn btn-secondary" onClick={handleNewCode} disabled={busy}>
            {t('sync.getNewCode')}
          </button>
        </>
      )}

      {error && <p className="sync-panel__error">{error}</p>}
    </section>
  );
}
