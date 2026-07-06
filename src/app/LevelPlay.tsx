import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor, type BlocklyEditorHandle } from '../blockly/BlocklyEditor';
import { RobotGridCanvas } from '../engine/RobotGridCanvas';
import { createInitialState, type RobotState } from '../engine/robotGrid';
import { runProgram, type ExecutionResult } from '../engine/runner';
import { getAllLevels } from '../content/manifest';
import { getWorldMeta } from '../content/worldMeta';
import { recordLevelCompletion, markConceptsSeen, purchaseHint, unlockedHintCount } from '../gamification/store';
import { hintCost } from '../gamification/rules';
import { findUnseenConcepts, getConceptInfo, type ConceptInfo } from '../content/concepts';
import { useStuckDetector } from './useStuckDetector';
import type { StuckTier } from '../gamification/stuckDetector';
import { Buddy, ConceptSteps } from './Buddy';
import { ConfettiBurst } from './ConfettiBurst';
import { XpToast } from './XpToast';
import { SolutionPanel } from './SolutionPanel';
import { getSolution } from '../content/solutions';
import { compileSolutionToWorkspaceJson } from '../content/solutionCompiler';
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
  const [showXpToast, setShowXpToast] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const seenConceptsRef = useRef<Set<string>>(new Set(profile.seenConcepts ?? []));
  const [conceptIntro, setConceptIntro] = useState<ConceptInfo[] | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const stuckDetector = useStuckDetector(level.id);

  const [currentXp, setCurrentXp] = useState(profile.xp);
  const [unlockedHints, setUnlockedHints] = useState(() => unlockedHintCount(profile, level.id));
  const [showSolutionPanel, setShowSolutionPanel] = useState(false);
  const [solutionBuilt, setSolutionBuilt] = useState(false);
  const solution = getSolution(level.id);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setHintsOpen(false);
    setExplainOpen(false);
    setUnlockedHints(unlockedHintCount(profile, level.id));
    setShowSolutionPanel(false);
    setSolutionBuilt(false);
    const unseen = findUnseenConcepts(level.concepts, Array.from(seenConceptsRef.current));
    setConceptIntro(unseen.length > 0 ? unseen : null);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, level.concepts]);

  function handleBuildSolution() {
    if (!solution) return;
    const hasExistingBlocks = (blocklyRef.current?.countBlocks() ?? 0) > 0;
    if (hasExistingBlocks && !window.confirm(t('buddy:solution.buildConfirm'))) return;
    blocklyRef.current?.loadSolutionJson(compileSolutionToWorkspaceJson(solution.steps));
    setSolutionBuilt(true);
    handleRun();
  }

  function handleBuyHint() {
    const result = purchaseHint(profile.id, level.id);
    if (result.ok) {
      setCurrentXp(result.newXp);
      setUnlockedHints((n) => n + 1);
    }
  }

  function dismissConceptIntro(concepts: ConceptInfo[]) {
    const ids = concepts.map((c) => c.id);
    for (const id of ids) seenConceptsRef.current.add(id);
    markConceptsSeen(profile.id, ids);
    setConceptIntro(null);
  }

  function resetScenario() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setResult(null);
    setStepIndex(0);
    setIsPlaying(false);
    setCompletion(null);
    setShowXpToast(false);
    setMessage(null);
    setExplainOpen(false);
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
        stuckDetector.reportAttempt(execResult.error);
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
        stuckDetector.reportSuccess();
        if (outcome) {
          setCompletion({ xpAwarded: outcome.xpAwarded, stars: outcome.stars, newBadges: outcome.newBadges });
          setShowXpToast(outcome.xpAwarded > 0);
          setCurrentXp((xp) => xp + outcome.xpAwarded);
        }
      } else if (execResult.crashed) {
        setMessage(t('levelPlay.crashed'));
        stuckDetector.reportAttempt('crashed');
      } else {
        setMessage(t('levelPlay.notThere'));
        stuckDetector.reportAttempt('not-there');
      }
    }
  }

  function handleRun() {
    const code = blocklyRef.current?.getJavaScriptCode() ?? '';
    const execResult = runProgram(code, level.goal);
    setResult(execResult);
    setCompletion(null);
    setShowXpToast(false);
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
      setShowXpToast(false);
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
  const worldMeta = getWorldMeta(level.worldId);

  return (
    <div className="level-play">
      {conceptIntro && (
        <Buddy
          variant="focused"
          mood="curious"
          conceptId={conceptIntro[0].id}
          message={
            <>
              <strong>{t(`buddy:nudge.newSkillTitle`, { concept: t(conceptIntro[0].titleKey) })}</strong>
              <ConceptSteps stepsKey={conceptIntro[0].stepsKey} />
            </>
          }
          actions={[{ label: t('buddy:nudge.newSkillCta'), onClick: () => dismissConceptIntro(conceptIntro), primary: true }]}
        />
      )}
      <header className="level-play__header">
        <button type="button" className="btn btn-secondary" onClick={onBackToMap}>
          {t('nav.backToMap')}
        </button>
        <div className="level-play__header-actions">
          {solution && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowSolutionPanel(true)}>
              {t('buddy:solution.title')}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={handleToggleReveal}>
            {revealCode ? t('levelPlay.hideCode') : t('levelPlay.revealCode')}
          </button>
        </div>
      </header>
      {showSolutionPanel && solution && (
        <SolutionPanel
          steps={solution.steps}
          built={solutionBuilt}
          onBuild={handleBuildSolution}
          onClose={() => setShowSolutionPanel(false)}
        />
      )}

      <div className="level-play__body">
        <div className="level-play__editor">
          <BlocklyEditor
            ref={blocklyRef}
            toolboxRef={level.tier === 'icon' ? 'icon' : 'block-text'}
            startingWorkspace={level.startingWorkspace}
          />
        </div>

        <div className="level-play__scenario">
          <div className="level-play__canvas-wrap">
            <RobotGridCanvas goal={level.goal} robotState={robotState} targetGlyph={worldMeta.targetGlyph} />
            {completion && <ConfettiBurst burstKey={level.id} />}
          </div>

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

          {!conceptIntro && !completion && stuckDetector.tier > 0 && (
            <StuckBuddy
              tier={stuckDetector.tier}
              level={level}
              explainOpen={explainOpen}
              onOpenHints={() => setHintsOpen(true)}
              onOpenExplain={() => setExplainOpen(true)}
              onCloseExplain={() => {
                setExplainOpen(false);
                stuckDetector.dismiss();
              }}
              onDismiss={() => stuckDetector.dismiss()}
            />
          )}

          {hintKeys.length > 0 && (
            <details className="level-play__hints" open={hintsOpen} onToggle={(e) => setHintsOpen(e.currentTarget.open)}>
              <summary>
                {t('levelPlay.hints')} <span className="xp-pill xp-pill--inline">{t('ui:hints.xpBalance', { xp: currentXp })}</span>
              </summary>
              <ul className="hint-list">
                {hintKeys.map((key, index) => {
                  const unlocked = index < unlockedHints;
                  const cost = hintCost(index);
                  return (
                    <li key={key} className="hint-list__item">
                      {unlocked ? (
                        t(key)
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary hint-list__buy"
                          onClick={handleBuyHint}
                          disabled={currentXp < cost || index > unlockedHints}
                        >
                          {t('ui:hints.buy', { cost })}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          {revealCode && (
            <pre className="level-play__code">
              <code>{pythonCode || '# run once to generate code'}</code>
            </pre>
          )}

          {completion && (
            <div className="level-complete-panel">
              <p className="level-complete-panel__stars" aria-label={`${completion.stars} stars`}>
                {Array.from({ length: 3 }, (_, i) => (
                  <span
                    key={i}
                    className={i < completion.stars ? 'star-pop star-pop--earned' : 'star-pop star-pop--empty'}
                    style={{ ['--star-index' as string]: i }}
                    aria-hidden="true"
                  >
                    {i < completion.stars ? '⭐' : '☆'}
                  </span>
                ))}
              </p>
              {completion.newBadges.map((badgeId) => (
                <p key={badgeId} className="level-complete-panel__badge">
                  {'✓ '}
                  {t('ui:badgeEarnedToast', { badge: t(`ui:badges.${toCamel(badgeId)}`) })}
                </p>
              ))}
              <button type="button" className="btn btn-primary" onClick={() => onNextLevel(nextLevel)}>
                {t('levelPlay.nextLevel')}
              </button>
            </div>
          )}

          {showXpToast && completion && completion.xpAwarded > 0 && (
            <XpToast
              message={t('ui:xpToast', { xp: completion.xpAwarded })}
              onDismiss={() => setShowXpToast(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function toCamel(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

interface StuckBuddyProps {
  tier: StuckTier;
  level: Level;
  explainOpen: boolean;
  onOpenHints: () => void;
  onOpenExplain: () => void;
  onCloseExplain: () => void;
  onDismiss: () => void;
}

/** Renders whichever thing Buddy should say for the current stuck tier — a
 * gentle nudge, the level's own hint, or (tier 3 / after tapping "Explain")
 * a short teaching moment about the level's primary concept. */
function StuckBuddy({ tier, level, explainOpen, onOpenHints, onOpenExplain, onCloseExplain, onDismiss }: StuckBuddyProps) {
  const { t } = useTranslation(['buddy', 'levels']);
  const primaryConcept = level.concepts[0] ? getConceptInfo(level.concepts[0]) : null;

  if (explainOpen && primaryConcept) {
    return (
      <Buddy
        mood="thinking"
        conceptId={primaryConcept.id}
        message={<ConceptSteps stepsKey={primaryConcept.stepsKey} />}
        actions={[{ label: t('buddy:nudge.closeExplain'), onClick: onCloseExplain, primary: true }]}
      />
    );
  }

  if (tier === 1) {
    return <Buddy mood="idle" message={t('buddy:nudge.idle')} onDismiss={onDismiss} />;
  }

  if (tier === 2) {
    if (level.hints.length === 0) {
      return <Buddy mood="thinking" message={t('buddy:nudge.genericHint')} onDismiss={onDismiss} />;
    }
    return (
      <Buddy
        mood="thinking"
        message={t('buddy:nudge.hintIntro')}
        actions={[{ label: t('buddy:nudge.hintsCta'), onClick: onOpenHints, primary: true }]}
        onDismiss={onDismiss}
      />
    );
  }

  if (primaryConcept) {
    return (
      <Buddy
        mood="curious"
        message={t('buddy:nudge.explainOffer', { concept: t(primaryConcept.titleKey) })}
        actions={[
          {
            label: t('buddy:nudge.explainCta', { concept: t(primaryConcept.titleKey) }),
            onClick: onOpenExplain,
            primary: true,
          },
        ]}
        onDismiss={onDismiss}
      />
    );
  }

  return <Buddy mood="thinking" message={t('buddy:nudge.genericHint')} onDismiss={onDismiss} />;
}
