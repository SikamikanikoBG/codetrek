import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor, type BlocklyEditorHandle } from '../blockly/BlocklyEditor';
import { RobotGridCanvas } from '../engine/RobotGridCanvas';
import { createInitialState, type RobotState } from '../engine/robotGrid';
import { runProgram, type ExecutionResult } from '../engine/runner';
import { getAllLevels } from '../content/manifest';
import { recordLevelCompletion } from '../gamification/store';
import type { Level } from '../content/types';
import type { Profile } from '../storage/localStorage';

interface LevelPlayProps {
  level: Level;
  profile: Profile;
  onBackToMap: () => void;
  onNextLevel: (nextLevel: Level | null) => void;
}

const STEP_DELAY_MS = 450;

export function LevelPlay({ level, profile, onBackToMap, onNextLevel }: LevelPlayProps) {
  const { t } = useTranslation(['common', 'levels', 'ui']);
  const blocklyRef = useRef<BlocklyEditorHandle>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [robotState, setRobotState] = useState<RobotState>(() => createInitialState(level.goal));
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealCode, setRevealCode] = useState(false);
  const [pythonCode, setPythonCode] = useState('');
  const [completion, setCompletion] = useState<{ xpAwarded: number; stars: 0 | 1 | 2 | 3; newBadges: string[] } | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level.id]);

  function resetScenario() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setResult(null);
    setStepIndex(0);
    setIsPlaying(false);
    setCompletion(null);
    setMessage(null);
    setRobotState(createInitialState(level.goal));
    blocklyRef.current?.highlightBlock(null);
    startTimeRef.current = Date.now();
  }

  function finishAtStep(execResult: ExecutionResult, index: number) {
    const step = execResult.steps[index];
    setRobotState(step.state);
    blocklyRef.current?.highlightBlock(step.highlightBlockId ?? null);

    if (index >= execResult.steps.length - 1) {
      setIsPlaying(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (execResult.error) {
        setMessage(execResult.error);
      } else if (execResult.won) {
        const blocksUsed = blocklyRef.current?.countBlocks() ?? 0;
        const movesUsed = execResult.steps.filter((s, i) => {
          if (i === 0) return false;
          const prev = execResult.steps[i - 1].state;
          return s.state.x !== prev.x || s.state.y !== prev.y;
        }).length;
        const timeSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const allLevels = getAllLevels();
        const outcome = recordLevelCompletion(profile.id, level, allLevels, {
          won: true,
          blocksUsed,
          movesUsed,
          timeSeconds,
        });
        if (outcome) {
          setCompletion({ xpAwarded: outcome.xpAwarded, stars: outcome.stars, newBadges: outcome.newBadges });
        }
      } else if (execResult.crashed) {
        setMessage(t('levelPlay.crashed'));
      } else {
        setMessage(t('levelPlay.notThere'));
      }
    }
  }

  function handleRun() {
    const code = blocklyRef.current?.getJavaScriptCode() ?? '';
    const execResult = runProgram(code, level.goal);
    setResult(execResult);
    setCompletion(null);
    setMessage(null);
    setIsPlaying(true);

    let index = 0;
    finishAtStep(execResult, index);
    timerRef.current = setInterval(() => {
      index += 1;
      if (index >= execResult.steps.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      setStepIndex(index);
      finishAtStep(execResult, index);
    }, STEP_DELAY_MS);
  }

  function handleStep() {
    let execResult = result;
    if (!execResult) {
      const code = blocklyRef.current?.getJavaScriptCode() ?? '';
      execResult = runProgram(code, level.goal);
      setResult(execResult);
      setCompletion(null);
      setMessage(null);
      setStepIndex(0);
      finishAtStep(execResult, 0);
      return;
    }
    const nextIndex = Math.min(stepIndex + 1, execResult.steps.length - 1);
    setStepIndex(nextIndex);
    finishAtStep(execResult, nextIndex);
  }

  function handleReset() {
    resetScenario();
  }

  function handleToggleReveal() {
    if (!revealCode) {
      setPythonCode(blocklyRef.current?.getPythonCode() ?? '');
    }
    setRevealCode((v) => !v);
  }

  const allLevels = getAllLevels();
  const worldLevels = allLevels
    .filter((l) => l.worldId === level.worldId)
    .sort((a, b) => a.order - b.order);
  const nextLevel = worldLevels.find((l) => l.order > level.order) ?? null;

  const hintKeys = level.hints;

  return (
    <div className="level-play">
      <header className="level-play__header">
        <button type="button" className="btn btn-secondary" onClick={onBackToMap}>
          {t('nav.backToMap')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleToggleReveal}>
          {revealCode ? t('levelPlay.hideCode') : t('levelPlay.revealCode')}
        </button>
      </header>

      <div className="level-play__body">
        <div className="level-play__editor">
          <BlocklyEditor
            ref={blocklyRef}
            toolboxRef={level.tier === 'icon' ? 'icon' : 'block-text'}
            startingWorkspace={level.startingWorkspace}
          />
        </div>

        <div className="level-play__scenario">
          <RobotGridCanvas goal={level.goal} robotState={robotState} />

          <div className="level-play__controls">
            <button type="button" className="btn btn-primary" onClick={handleRun} disabled={isPlaying}>
              {t('levelPlay.run')}
            </button>
            <button type="button" className="btn" onClick={handleStep} disabled={isPlaying}>
              {t('levelPlay.step')}
            </button>
            <button type="button" className="btn" onClick={handleReset}>
              {t('levelPlay.reset')}
            </button>
          </div>

          {message && <p className="level-play__message">{message}</p>}

          {hintKeys.length > 0 && (
            <details className="level-play__hints">
              <summary>{t('levelPlay.hints')}</summary>
              <ul>
                {hintKeys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </details>
          )}

          {revealCode && (
            <pre className="level-play__code">
              <code>{pythonCode || '# run once to generate code'}</code>
            </pre>
          )}

          {completion && (
            <div className="completion-toast">
              <p>{'⭐'.repeat(completion.stars)}</p>
              {completion.xpAwarded > 0 && <p>{t('ui:xpToast', { xp: completion.xpAwarded })}</p>}
              {completion.newBadges.map((badgeId) => (
                <p key={badgeId}>
                  {t('ui:badgeEarnedToast', { badge: t(`ui:badges.${toCamel(badgeId)}`) })}
                </p>
              ))}
              <button type="button" className="btn btn-primary" onClick={() => onNextLevel(nextLevel)}>
                {t('levelPlay.nextLevel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toCamel(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
