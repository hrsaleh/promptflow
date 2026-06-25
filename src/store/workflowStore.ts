import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

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
  exportJSON: (snap: WorkflowSnapshot) => void;
  importJSON: (file: File) => Promise<WorkflowSnapshot | null>;
}

export const useWorkflowStore = create<WorkflowState>(() => ({
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
