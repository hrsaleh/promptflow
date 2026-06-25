import { create } from 'zustand';
import { db } from '../db/dexie';
import type { Workflow, WorkflowFolder } from '../types';
import type { WorkflowSnapshot } from './workflowStore';

const AUTOSAVE_ID = '__autosave__';

interface WorkflowLibraryState {
  workflows: Workflow[];
  folders: WorkflowFolder[];
  loaded: boolean;

  load: () => Promise<void>;
  saveWorkflow: (name: string, folderId: string | null, snap: WorkflowSnapshot) => Promise<string>;
  updateWorkflow: (id: string, updates: Partial<Omit<Workflow, 'id'>>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

export const useWorkflowLibraryStore = create<WorkflowLibraryState>((set, get) => ({
  workflows: [],
  folders: [],
  loaded: false,

  load: async () => {
    const [all, folders] = await Promise.all([
      db.workflows.orderBy('updatedAt').reverse().toArray(),
      db.workflowFolders.orderBy('order').toArray(),
    ]);
    set({ workflows: all.filter((w) => w.id !== AUTOSAVE_ID), folders, loaded: true });
  },

  saveWorkflow: async (name, folderId, snap) => {
    const id = crypto.randomUUID();
    const workflow: Workflow = {
      id,
      name,
      nodes: snap.nodes,
      edges: snap.edges,
      viewport: snap.viewport,
      folderId,
      updatedAt: Date.now(),
    };
    await db.workflows.add(workflow);
    set({ workflows: [workflow, ...get().workflows] });
    return id;
  },

  updateWorkflow: async (id, updates) => {
    const updatedAt = Date.now();
    await db.workflows.update(id, { ...updates, updatedAt });
    set({
      workflows: get().workflows.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt } : w
      ),
    });
  },

  deleteWorkflow: async (id) => {
    await db.workflows.delete(id);
    set({ workflows: get().workflows.filter((w) => w.id !== id) });
  },

  addFolder: async (name) => {
    const id = crypto.randomUUID();
    const order = get().folders.length;
    const folder: WorkflowFolder = { id, name, order };
    await db.workflowFolders.add(folder);
    set({ folders: [...get().folders, folder] });
    return id;
  },

  renameFolder: async (id, name) => {
    await db.workflowFolders.update(id, { name });
    set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name } : f)) });
  },

  deleteFolder: async (id) => {
    await db.workflowFolders.delete(id);
    const affected = get().workflows.filter((w) => w.folderId === id);
    await Promise.all(affected.map((w) => db.workflows.update(w.id, { folderId: null })));
    set({
      folders: get().folders.filter((f) => f.id !== id),
      workflows: get().workflows.map((w) =>
        w.folderId === id ? { ...w, folderId: null } : w
      ),
    });
  },
}));
