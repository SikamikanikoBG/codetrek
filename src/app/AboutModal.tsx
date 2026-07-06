// A single lightweight modal standing in for a "marketing landing page" —
// reachable from the profile picker (the first thing anyone, kid or parent,
// sees) without needing a separate route. Deliberately simple: no routing,
// no separate build output, just what a public open-source project needs to
// explain itself in one glance.

import { useTranslation } from 'react-i18next';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  const { t } = useTranslation('common');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{t('about.title')}</h2>
        <p>{t('about.intro')}</p>
        <ul className="modal-card__points">
          <li>{t('about.point1')}</li>
          <li>{t('about.point2')}</li>
          <li>{t('about.point3')}</li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('about.close')}
        </button>
      </div>
    </div>
  );
}
