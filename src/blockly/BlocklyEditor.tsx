// Injects Blockly into a ref'd div in useEffect and tears down on unmount —
// React never re-renders into Blockly's own DOM. Exposes the workspace via
// an imperative handle (JS/Python code generation, XML serialization, block
// highlighting for stepped execution, block count for star-rating).

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import iconToolbox from './toolbox/icon.json';
import blockTextToolbox from './toolbox/block-text.json';
import { registerBlocklyExtensions } from './blocks';

registerBlocklyExtensions();

export type ToolboxRef = 'icon' | 'block-text';

const TOOLBOXES: Record<ToolboxRef, Blockly.utils.toolbox.ToolboxDefinition> = {
  icon: iconToolbox as unknown as Blockly.utils.toolbox.ToolboxDefinition,
  'block-text': blockTextToolbox as unknown as Blockly.utils.toolbox.ToolboxDefinition,
};

export interface BlocklyEditorHandle {
  getJavaScriptCode: () => string;
  getPythonCode: () => string;
  getWorkspaceXml: () => string;
  loadWorkspaceXml: (xml: string) => void;
  highlightBlock: (id: string | null) => void;
  countBlocks: () => number;
  resetWorkspace: () => void;
}

interface BlocklyEditorProps {
  toolboxRef: ToolboxRef;
  startingWorkspace?: string;
}

export const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(function BlocklyEditor(
  { toolboxRef, startingWorkspace },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const startingWorkspaceRef = useRef(startingWorkspace);
  startingWorkspaceRef.current = startingWorkspace;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Blockly ships built-in touch/pointer support out of the box; injecting
    // with a scrollable/zoomable workspace is enough for it to work on tablets/phones.
    const workspace = Blockly.inject(container, {
      toolbox: TOOLBOXES[toolboxRef],
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1 },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: '#3a3f4b', snap: true },
    });
    workspaceRef.current = workspace;

    const initial = startingWorkspaceRef.current;
    if (initial) {
      try {
        const dom = Blockly.utils.xml.textToDom(initial);
        Blockly.Xml.domToWorkspace(dom, workspace);
      } catch {
        // Malformed/missing starting workspace — start blank rather than crash the level.
      }
    }

    return () => {
      workspace.dispose();
      if (workspaceRef.current === workspace) workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolboxRef]);

  useImperativeHandle(ref, () => ({
    getJavaScriptCode: () => {
      const ws = workspaceRef.current;
      return ws ? javascriptGenerator.workspaceToCode(ws) : '';
    },
    getPythonCode: () => {
      const ws = workspaceRef.current;
      return ws ? pythonGenerator.workspaceToCode(ws) : '';
    },
    getWorkspaceXml: () => {
      const ws = workspaceRef.current;
      return ws ? Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws)) : '';
    },
    loadWorkspaceXml: (xml: string) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      ws.clear();
      try {
        const dom = Blockly.utils.xml.textToDom(xml);
        Blockly.Xml.domToWorkspace(dom, ws);
      } catch {
        // ignore malformed xml
      }
    },
    highlightBlock: (id: string | null) => {
      workspaceRef.current?.highlightBlock(id);
    },
    countBlocks: () => workspaceRef.current?.getAllBlocks(false).length ?? 0,
    resetWorkspace: () => {
      workspaceRef.current?.clear();
    },
  }));

  return <div ref={containerRef} className="blockly-editor" />;
});
