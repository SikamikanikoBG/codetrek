// XP toast: slides in (bottom on mobile / side on desktop via CSS), then
// auto-dismisses with a progress-bar wipe. The slide/wipe animations are the
// only motion here; reduced-motion fallback (instant show/hide) lives in
// App.css so this component stays animation-agnostic.

import { useEffect } from 'react';

interface XpToastProps {
  message: string;
  durationMs?: number;
  onDismiss: () => void;
}

export function XpToast({ message, durationMs = 3200, onDismiss }: XpToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div className="xp-toast" role="status">
      <span className="xp-toast__message">{message}</span>
      <span className="xp-toast__bar-track">
        <span className="xp-toast__bar" style={{ animationDuration: `${durationMs}ms` }} />
      </span>
    </div>
  );
}
