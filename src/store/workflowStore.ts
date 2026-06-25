import { create } from 'zustand';
import { db } from '../db/dexie';
import type { Node, Edge } from '@xyflow/react';

const AUTOSAVE_ID = '__autosave__';

export interface ViewportSnapshot {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: ViewportSnapshot;
}

interface WorkflowState {
  lastSaved: number | null;
  autosave: (snap: WorkflowSnapshot) => Promise<void>;
  loadLastSave: () => Promise<WorkflowSnapshot | null>;
  exportJSON: (snap: WorkflowSnapshot) => void;
  importJSON: (file: File) => Promise<WorkflowSnapshot | null>;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  lastSaved: null,

  autosave: async (snap) => {
    await db.workflows.put({
      id: AUTOSAVE_ID,
      name: 'Autosave',
      nodes: snap.nodes,
      edges: snap.edges,
      viewport: snap.viewport,
      updatedAt: Date.now(),
    });
    set({ lastSaved: Date.now() });
  },

  loadLastSave: async () => {
    const saved = await db.workflows.get(AUTOSAVE_ID);
    if (!saved) return null;
    return { nodes: saved.nodes, edges: saved.edges, viewport: saved.viewport };
  },

  exportJSON: (snap) => {
    const payload = JSON.stringify({ version: 1, ...snap, exportedAt: Date.now() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON: async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;
      return {
        nodes: data.nodes as Node[],
        edges: data.edges as Edge[],
        viewport: data.viewport ?? { x: 0, y: 0, zoom: 1 },
      };
    } catch {
      return null;
    }
  },
}));
