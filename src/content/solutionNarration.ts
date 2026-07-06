// Turns a SolutionStep tree into a tree of plain-language explanations —
// mirrors the DSL's own nesting (a repeat's body, an if's branches) rather
// than collapsing everything into one sentence, so "how do I combine a
// loop with a variable with a turn" is answered by literally showing the
// combination, indented, step by step.

import type { TFunction } from 'i18next';
import type { SolutionStep } from './solutionTypes';

export interface NarratedNode {
  text: string;
  children?: NarratedNode[];
}

export function narrateStep(step: SolutionStep, t: TFunction): NarratedNode {
  switch (step.kind) {
    case 'forward':
      return { text: t('buddy:solution.actionForward') };
    case 'left':
      return { text: t('buddy:solution.actionTurnLeft') };
    case 'right':
      return { text: t('buddy:solution.actionTurnRight') };
    case 'setVariable':
      return { text: t('buddy:solution.actionSetVariable', { name: step.name, value: step.value }) };
    case 'repeat': {
      const text =
        typeof step.times === 'number'
          ? t('buddy:solution.repeatNumber', { count: step.times })
          : t('buddy:solution.repeatVariable', { name: step.times.variable });
      return { text, children: step.body.map((s) => narrateStep(s, t)) };
    }
    case 'if': {
      const children: NarratedNode[] = [
        { text: t('buddy:solution.ifThen'), children: step.then.map((s) => narrateStep(s, t)) },
      ];
      if (step.else) {
        children.push({ text: t('buddy:solution.ifElse'), children: step.else.map((s) => narrateStep(s, t)) });
      }
      return { text: t('buddy:solution.ifCondition'), children };
    }
  }
}

export function narrateSteps(steps: SolutionStep[], t: TFunction): NarratedNode[] {
  return steps.map((s) => narrateStep(s, t));
}
