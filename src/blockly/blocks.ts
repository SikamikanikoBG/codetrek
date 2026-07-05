// Custom block definitions + JS/Python generators for the robot-grid
// scenario. Icon-tier blocks (`*_icon`) render as a bare glyph (no text) so
// pre-readers never depend on a translation; block-text-tier blocks add a
// text label alongside the same glyph. Both variants generate identical
// JavaScript/Python calls against the runner's native API
// (moveForward/turnLeft/turnRight/isPathClear).

import * as Blockly from 'blockly';
import { javascriptGenerator, Order as JsOrder } from 'blockly/javascript';
import { pythonGenerator, Order as PyOrder } from 'blockly/python';

function arrowIcon(rotationDeg: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">` +
    `<g transform="rotate(${rotationDeg} 12 12)"><path d="M12 2L4 12h5v10h6V12h5z" fill="#ffffff"/></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const FORWARD_ICON = arrowIcon(0);
const LEFT_ICON = arrowIcon(-90);
const RIGHT_ICON = arrowIcon(90);

let registered = false;

/** Idempotent: safe to call from every BlocklyEditor mount (including React StrictMode's double-invoke in dev). */
export function registerBlocklyExtensions(): void {
  if (registered) return;
  registered = true;

  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'move_forward_icon',
      message0: '%1',
      args0: [{ type: 'field_image', src: FORWARD_ICON, width: 28, height: 28, alt: 'move forward' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Move forward one step',
    },
    {
      type: 'turn_left_icon',
      message0: '%1',
      args0: [{ type: 'field_image', src: LEFT_ICON, width: 28, height: 28, alt: 'turn left' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Turn left',
    },
    {
      type: 'turn_right_icon',
      message0: '%1',
      args0: [{ type: 'field_image', src: RIGHT_ICON, width: 28, height: 28, alt: 'turn right' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Turn right',
    },
    {
      type: 'move_forward',
      message0: '%1 move forward',
      args0: [{ type: 'field_image', src: FORWARD_ICON, width: 20, height: 20, alt: 'move forward' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Move forward one step',
    },
    {
      type: 'turn_left',
      message0: '%1 turn left',
      args0: [{ type: 'field_image', src: LEFT_ICON, width: 20, height: 20, alt: 'turn left' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Turn left',
    },
    {
      type: 'turn_right',
      message0: '%1 turn right',
      args0: [{ type: 'field_image', src: RIGHT_ICON, width: 20, height: 20, alt: 'turn right' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Turn right',
    },
    {
      type: 'path_ahead_clear',
      message0: 'path ahead clear?',
      output: 'Boolean',
      colour: 210,
      tooltip: 'True if the cell ahead of the robot has no wall or obstacle',
    },
  ]);

  javascriptGenerator.forBlock['move_forward_icon'] = () => 'moveForward();\n';
  javascriptGenerator.forBlock['move_forward'] = () => 'moveForward();\n';
  javascriptGenerator.forBlock['turn_left_icon'] = () => 'turnLeft();\n';
  javascriptGenerator.forBlock['turn_left'] = () => 'turnLeft();\n';
  javascriptGenerator.forBlock['turn_right_icon'] = () => 'turnRight();\n';
  javascriptGenerator.forBlock['turn_right'] = () => 'turnRight();\n';
  javascriptGenerator.forBlock['path_ahead_clear'] = () =>
    ['isPathClear()', JsOrder.FUNCTION_CALL] as [string, number];

  pythonGenerator.forBlock['move_forward_icon'] = () => 'move_forward()\n';
  pythonGenerator.forBlock['move_forward'] = () => 'move_forward()\n';
  pythonGenerator.forBlock['turn_left_icon'] = () => 'turn_left()\n';
  pythonGenerator.forBlock['turn_left'] = () => 'turn_left()\n';
  pythonGenerator.forBlock['turn_right_icon'] = () => 'turn_right()\n';
  pythonGenerator.forBlock['turn_right'] = () => 'turn_right()\n';
  pythonGenerator.forBlock['path_ahead_clear'] = () =>
    ['path_ahead_clear()', PyOrder.FUNCTION_CALL] as [string, number];

  // Block-highlighting during stepped execution (same pattern Blockly Games uses).
  javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  javascriptGenerator.addReservedWords('highlightBlock');

  // Infinite-loop guard: the runner injects checkLoopTrap() as a native function that throws past a step budget.
  javascriptGenerator.INFINITE_LOOP_TRAP = 'checkLoopTrap();\n';
  javascriptGenerator.addReservedWords('checkLoopTrap');
}
