// "Show Solution" — a full walkthrough of one correct way to solve the
// current level, narrated step by step (nested to match the actual block
// structure: a repeat's body and an if/else's branches are shown indented
// underneath it) so a stuck parent gets something to follow and try, not
// just an abstract description. "Build This For Me" materializes the exact
// same steps as real blocks in the workspace (BlocklyEditor.loadSolutionJson).

import { useTranslation } from 'react-i18next';
import { narrateSteps, type NarratedNode } from '../content/solutionNarration';
import type { SolutionStep } from '../content/solutionTypes';

function NarratedList({ nodes }: { nodes: NarratedNode[] }) {
  return (
    <ol className="solution-steps">
      {nodes.map((node, i) => (
        <li key={i}>
          {node.text}
          {node.children && node.children.length > 0 && <NarratedList nodes={node.children} />}
        </li>
      ))}
    </ol>
  );
}

interface SolutionPanelProps {
  steps: SolutionStep[];
  built: boolean;
  onBuild: () => void;
  onClose: () => void;
}

export function SolutionPanel({ steps, built, onBuild, onClose }: SolutionPanelProps) {
  const { t } = useTranslation('buddy');
  const narrated = narrateSteps(steps, t);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card solution-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{t('solution.title')}</h2>
        <p>{t('solution.intro')}</p>
        <NarratedList nodes={narrated} />
        {built ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('solution.closeButton')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onBuild}>
            {t('solution.buildButton')}
          </button>
        )}
      </div>
    </div>
  );
}
