import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection, Viewport } from '@xyflow/react';
import { evaluate } from '../eval/evaluate';
import type { Workflow } from '../types';

const MAX_HISTORY = 50;
const SESSION_KEY = 'promptflow_session';

type Snapshot = { nodes: Node[]; edges: Edge[] };

export interface OpenTab {
  id: string;
  title: string;
  workflowId: string | null;
  nodes: Node[];
  edges: Edge[];
  nodeValues: Record<string, string>;
  viewport: Viewport;
  isDirty: boolean;
  past: Snapshot[];
  future: Snapshot[];
}

// ── Pure helpers ──────────────────────────────────────────────────────────

function recomputeConcatInputs(nodeId: string, edges: Edge[], nodes: Node[]): Node[] {
  const incoming = edges.filter((e) => e.target === nodeId);
  const maxIdx = incoming.reduce((m, e) => {
    const i = Number((e.targetHandle ?? 'in-0').split('-')[1]);
    return Math.max(m, i);
  }, -1);
  const inputCount = Math.max(1, maxIdx + 2);
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, inputCount } } : n
  );
}

function computeTab(tab: OpenTab): OpenTab {
  const nodeValues = evaluate(tab.nodes, tab.edges);
  const nodes = tab.nodes.map((n) =>
    n.type === 'output' ? { ...n, data: { ...n.data, value: nodeValues[n.id] ?? '' } } : n
  );
  return { ...tab, nodes, nodeValues };
}

function snapshotTab(tab: OpenTab): OpenTab {
  const entry: Snapshot = { nodes: [...tab.nodes], edges: [...tab.edges] };
  return {
    ...tab,
    past: [...tab.past, entry].slice(-MAX_HISTORY),
    future: [],
  };
}

function patchActive(
  tabs: OpenTab[],
  activeTabId: string,
  fn: (tab: OpenTab) => OpenTab
): OpenTab[] {
  return tabs.map((t) => (t.id === activeTabId ? fn(t) : t));
}

function nextUnsavedTitle(tabs: OpenTab[]): string {
  const base = 'Unsaved Workflow';
  const existing = new Set(tabs.map((t) => t.title));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

function makeEmptyTab(title: string): OpenTab {
  return {
    id: crypto.randomUUID(),
    title,
    workflowId: null,
    nodes: [],
    edges: [],
    nodeValues: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    isDirty: false,
    past: [],
    future: [],
  };
}

// ── Session persistence ───────────────────────────────────────────────────

function loadSession(): { tabs: OpenTab[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { tabs: OpenTab[]; activeTabId: string }) : null;
  } catch {
    return null;
  }
}

const session = loadSession();
const _defaultTab = makeEmptyTab('Unsaved Workflow');
const INITIAL_TABS: OpenTab[] = session
  ? session.tabs.map((t) => computeTab(t))
  : [_defaultTab];
const INITIAL_ACTIVE_ID: string = session?.activeTabId ?? _defaultTab.id;

// ── Store interface ───────────────────────────────────────────────────────

interface GraphState {
  tabs: OpenTab[];
  activeTabId: string;
  clipboard: Snapshot | null;

  // Tab management
  newTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  openWorkflowInTab: (workflow: Workflow) => void;
  updateTab: (tabId: string, patch: Partial<OpenTab>) => void;
  setTabViewport: (viewport: Viewport) => void;
  importIntoActiveTab: (nodes: Node[], edges: Edge[], viewport: Viewport) => void;

  // Graph operations — all target the active tab
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  deleteNodes: (ids: string[]) => void;

  // Undo/redo — scoped to the active tab
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Copy/paste — clipboard is global across tabs
  copySelected: () => void;
  paste: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>((set, get) => ({
  tabs: INITIAL_TABS,
  activeTabId: INITIAL_ACTIVE_ID,
  clipboard: null,

  // ── Tab management ──────────────────────────────────────────────────────

  newTab: () => {
    const { tabs } = get();
    const tab = makeEmptyTab(nextUnsavedTitle(tabs));
    set({ tabs: [...tabs, tab], activeTabId: tab.id });
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      const fresh = makeEmptyTab('Unsaved Workflow');
      set({ tabs: [fresh], activeTabId: fresh.id });
      return;
    }
    const idx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    const newActiveId =
      activeTabId === tabId
        ? (idx > 0 ? newTabs[idx - 1] : newTabs[0]).id
        : activeTabId;
    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  openWorkflowInTab: (workflow) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.workflowId === workflow.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const tab = computeTab({
      id: crypto.randomUUID(),
      title: workflow.name,
      workflowId: workflow.id,
      nodes: workflow.nodes as Node[],
      edges: workflow.edges as Edge[],
      nodeValues: {},
      viewport: workflow.viewport,
      isDirty: false,
      past: [],
      future: [],
    });
    set({ tabs: [...tabs, tab], activeTabId: tab.id });
  },

  updateTab: (tabId, patch) => {
    const { tabs } = get();
    set({
      tabs: tabs.map((t) => {
        if (t.id !== tabId) return t;
        const merged = { ...t, ...patch };
        return 'nodes' in patch || 'edges' in patch ? computeTab(merged) : merged;
      }),
    });
  },

  setTabViewport: (viewport) => {
    const { tabs, activeTabId } = get();
    set({ tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, viewport } : t)) });
  },

  importIntoActiveTab: (nodes, edges, viewport) => {
    const { tabs, activeTabId } = get();
    const title = nextUnsavedTitle(tabs.filter((t) => t.id !== activeTabId));
    set({
      tabs: tabs.map((t) => {
        if (t.id !== activeTabId) return t;
        return computeTab({
          ...t,
          nodes,
          edges,
          viewport,
          workflowId: null,
          title,
          isDirty: false,
          past: [],
          future: [],
        });
      }),
    });
  },

  // ── Graph operations ────────────────────────────────────────────────────

  onNodesChange: (changes) => {
    const { tabs, activeTabId } = get();
    const makeDirty = changes.some((c) => c.type !== 'select' && c.type !== 'dimensions');
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = changes.some((c) => c.type === 'remove') ? snapshotTab(tab) : tab;
        const nodes = applyNodeChanges(changes, base.nodes);
        return computeTab({ ...base, nodes, isDirty: tab.isDirty || makeDirty });
      }),
    });
  },

  onEdgesChange: (changes) => {
    const { tabs, activeTabId } = get();
    const makeDirty = changes.some((c) => c.type !== 'select');
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = changes.some((c) => c.type === 'remove') ? snapshotTab(tab) : tab;
        const edges = applyEdgeChanges(changes, base.edges);
        let nodes = base.nodes;
        nodes.filter((n) => n.type === 'concatenate').forEach((cn) => {
          nodes = recomputeConcatInputs(cn.id, edges, nodes);
        });
        return computeTab({ ...base, nodes, edges, isDirty: tab.isDirty || makeDirty });
      }),
    });
  },

  onConnect: (connection) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = snapshotTab(tab);
        const edges = addEdge({ ...connection, type: 'default' }, base.edges);
        let nodes = base.nodes;
        if (connection.target) {
          const target = nodes.find((n) => n.id === connection.target);
          if (target?.type === 'concatenate') {
            nodes = recomputeConcatInputs(connection.target, edges, nodes);
          }
        }
        return computeTab({ ...base, nodes, edges, isDirty: true });
      }),
    });
  },

  addNode: (node) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = snapshotTab(tab);
        return computeTab({ ...base, nodes: [...base.nodes, node], isDirty: true });
      }),
    });
  },

  updateNodeData: (nodeId, data) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const nodes = tab.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        );
        return computeTab({ ...tab, nodes, isDirty: true });
      }),
    });
  },

  deleteNodes: (ids) => {
    const { tabs, activeTabId } = get();
    const idSet = new Set(ids);
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = snapshotTab(tab);
        const nodes = base.nodes.filter((n) => !idSet.has(n.id));
        const edges = base.edges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target)
        );
        return computeTab({ ...base, nodes, edges, isDirty: true });
      }),
    });
  },

  // ── Undo/redo ───────────────────────────────────────────────────────────

  snapshot: () => {
    const { tabs, activeTabId } = get();
    set({ tabs: patchActive(tabs, activeTabId, snapshotTab) });
  },

  undo: () => {
    const { tabs, activeTabId } = get();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        if (tab.past.length === 0) return tab;
        const prev = tab.past[tab.past.length - 1];
        const current: Snapshot = { nodes: [...tab.nodes], edges: [...tab.edges] };
        const restored = computeTab({ ...tab, nodes: prev.nodes, edges: prev.edges });
        return {
          ...restored,
          past: tab.past.slice(0, -1),
          future: [current, ...tab.future].slice(0, MAX_HISTORY),
          isDirty: true,
        };
      }),
    });
  },

  redo: () => {
    const { tabs, activeTabId } = get();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        if (tab.future.length === 0) return tab;
        const next = tab.future[0];
        const current: Snapshot = { nodes: [...tab.nodes], edges: [...tab.edges] };
        const restored = computeTab({ ...tab, nodes: next.nodes, edges: next.edges });
        return {
          ...restored,
          past: [...tab.past, current].slice(-MAX_HISTORY),
          future: tab.future.slice(1),
          isDirty: true,
        };
      }),
    });
  },

  // ── Copy/paste ──────────────────────────────────────────────────────────

  copySelected: () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId)!;
    const selected = tab.nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    set({
      clipboard: {
        nodes: selected,
        edges: tab.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      },
    });
  },

  paste: () => {
    const { clipboard, tabs, activeTabId } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    const stamp = Date.now();
    set({
      tabs: patchActive(tabs, activeTabId, (tab) => {
        const base = snapshotTab(tab);
        const idMap = new Map<string, string>();
        const newNodes: Node[] = clipboard.nodes.map((n, i) => {
          const newId = `${n.type ?? 'node'}-${stamp}-${i}`;
          idMap.set(n.id, newId);
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + 40, y: n.position.y + 40 },
            selected: true,
          };
        });
        const newEdges: Edge[] = clipboard.edges
          .filter((e) => idMap.has(e.source) && idMap.has(e.target))
          .map((e, i) => ({
            ...e,
            id: `edge-${stamp}-${i}`,
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
          }));
        const nodes = [
          ...base.nodes.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ];
        return computeTab({ ...base, nodes, edges: [...base.edges, ...newEdges], isDirty: true });
      }),
    });
  },
}));

// ── Debounced session autosave ────────────────────────────────────────────

let _sessionTimer: ReturnType<typeof setTimeout>;
useGraphStore.subscribe((state) => {
  clearTimeout(_sessionTimer);
  _sessionTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ tabs: state.tabs, activeTabId: state.activeTabId })
      );
    } catch { /* storage quota exceeded */ }
  }, 2000);
});
