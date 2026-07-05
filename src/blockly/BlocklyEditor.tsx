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

// DESIGN.md "Blockly chrome": keep Blockly's own canvas/toolbox rendering
// untouched functionally — frame it, don't fight it. Component-level colors
// (workspace/toolbox/flyout background, insertion marker, scrollbar) are set
// via CSS custom properties so the frame stays in sync with the app's
// light/dark theme automatically; block category colours are left as-is
// (Blockly's own Scratch-like category color-coding for Move/Loops/Logic/
// Variables/Functions).
//
// IMPORTANT: Blockly's theme/componentStyles values are NOT run through the
// browser's CSS cascade — Blockly parses them itself (e.g. to derive border/
// shadow shades and validate the insertion-marker colour) using its own
// legacy colour parser, which understands hex/rgb/hsl/named colors but NOT
// CSS custom-property references OR modern oklch()/oklab() syntax (both of
// which this design system's tokens use). Feeding it either throws
// `Invalid colour: "..."`, and that exception firing mid-render/mid-drag was
// the actual cause of the v0.2 "unreliable drag, ghost blocks that can't be
// clicked or removed, workspace secretly containing far more blocks than
// visible" bug. Fix: resolve the CSS var, then normalize via a Canvas 2D
// pixel readback — modern Chromium's `ctx.fillStyle` getter now round-trips
// oklch() as oklch() (no longer downgrades to rgb, so that trick alone
// doesn't work), but actually rasterizing a pixel and reading its RGBA
// channel values back always yields plain 0-255 integers, which is exactly
// what Blockly's legacy colour parser expects.
let normalizeCanvas: HTMLCanvasElement | null = null;
// Exported for regression testing only — Blockly's colour parser silently
// corrupting drag state on an unparseable theme colour is exactly the kind
// of failure that must never silently reappear.
export function cssColorToRgb(cssColor: string): string | null {
  if (typeof document === 'undefined') return null;
  if (!normalizeCanvas) {
    normalizeCanvas = document.createElement('canvas');
    normalizeCanvas.width = 1;
    normalizeCanvas.height = 1;
  }
  const ctx = normalizeCanvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return null;
  }
}

export function readColorToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  return cssColorToRgb(raw) ?? fallback;
}

function buildCodetrekBlocklyTheme(): Blockly.Theme {
  return Blockly.Theme.defineTheme('codetrek', {
    name: 'codetrek',
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: readColorToken('--surface', '#eef1ec'),
      toolboxBackgroundColour: readColorToken('--surface-raised', '#ffffff'),
      toolboxForegroundColour: readColorToken('--ink', '#1a2419'),
      flyoutBackgroundColour: readColorToken('--surface-raised', '#ffffff'),
      flyoutForegroundColour: readColorToken('--ink', '#1a2419'),
      flyoutOpacity: 1,
      scrollbarColour: readColorToken('--border', '#d7ddd3'),
      insertionMarkerColour: readColorToken('--primary', '#4a9a5f'),
      insertionMarkerOpacity: 0.4,
      cursorColour: readColorToken('--accent', '#e0a030'),
    },
  });
}

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
      theme: buildCodetrekBlocklyTheme(),
      zoom: { controls: true, wheel: true, startScale: 1 },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 24, length: 2, colour: readColorToken('--border', '#d7ddd3'), snap: true },
    });
    workspaceRef.current = workspace;

    // Re-resolve and re-apply the theme when the OS light/dark preference
    // flips, since the colors above are resolved once at inject time (they
    // can't be live CSS var() references — see buildCodetrekBlocklyTheme).
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = () => {
      workspace.setTheme(buildCodetrekBlocklyTheme());
    };
    darkModeQuery.addEventListener('change', handleColorSchemeChange);

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
      darkModeQuery.removeEventListener('change', handleColorSchemeChange);
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
