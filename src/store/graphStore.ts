import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { evaluate } from '../eval/evaluate';

const MAX_HISTORY = 50;
type Snapshot = { nodes: Node[]; edges: Edge[] };

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

function computeState(nodes: Node[], edges: Edge[]) {
  const nodeValues = evaluate(nodes, edges);
  const updatedNodes = nodes.map((n) =>
    n.type === 'output' ? { ...n, data: { ...n.data, value: nodeValues[n.id] ?? '' } } : n
  );
  return { nodes: updatedNodes, edges, nodeValues };
}

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  nodeValues: Record<string, string>;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: Snapshot | null;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;

  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  paste: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeValues: {},
  past: [],
  future: [],
  clipboard: null,

  snapshot: () => {
    const { nodes, edges, past } = get();
    const entry: Snapshot = { nodes: [...nodes], edges: [...edges] };
    set({ past: [...past, entry].slice(-MAX_HISTORY), future: [] });
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const current: Snapshot = { nodes: [...nodes], edges: [...edges] };
    set({
      ...computeState(prev.nodes, prev.edges),
      past: past.slice(0, -1),
      future: [current, ...future].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const { past, nodes, edges, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const current: Snapshot = { nodes: [...nodes], edges: [...edges] };
    set({
      ...computeState(next.nodes, next.edges),
      past: [...past, current].slice(-MAX_HISTORY),
      future: future.slice(1),
    });
  },

  copySelected: () => {
    const { nodes, edges } = get();
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    const ids = new Set(selected.map((n) => n.id));
    const internalEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    set({ clipboard: { nodes: selected, edges: internalEdges } });
  },

  paste: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    get().snapshot();

    const idMap = new Map<string, string>();
    const stamp = Date.now();
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
      ...get().nodes.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ];
    set(computeState(nodes, [...get().edges, ...newEdges]));
  },

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) get().snapshot();
    const nodes = applyNodeChanges(changes, get().nodes);
    set(computeState(nodes, get().edges));
  },

  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) get().snapshot();
    const edges = applyEdgeChanges(changes, get().edges);
    let nodes = get().nodes;
    nodes.filter((n) => n.type === 'concatenate').forEach((cn) => {
      nodes = recomputeConcatInputs(cn.id, edges, nodes);
    });
    set(computeState(nodes, edges));
  },

  onConnect: (connection) => {
    get().snapshot();
    const edges = addEdge({ ...connection, type: 'default' }, get().edges);
    let nodes = get().nodes;
    if (connection.target) {
      const target = nodes.find((n) => n.id === connection.target);
      if (target?.type === 'concatenate') {
        nodes = recomputeConcatInputs(connection.target, edges, nodes);
      }
    }
    set(computeState(nodes, edges));
  },

  addNode: (node) => {
    get().snapshot();
    const nodes = [...get().nodes, node];
    set(computeState(nodes, get().edges));
  },

  updateNodeData: (nodeId, data) => {
    const nodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
    );
    set(computeState(nodes, get().edges));
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));
