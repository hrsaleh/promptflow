import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { Workflow, WorkflowFolder } from '../types';
import type { WorkflowSnapshot } from './workflowStore';

interface WorkflowLibraryState {
  workflows: Workflow[];
  folders: WorkflowFolder[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  unload: () => Promise<void>;
  saveWorkflow: (name: string, folderId: string | null, snap: WorkflowSnapshot) => Promise<string>;
  updateWorkflow: (id: string, updates: Partial<Omit<Workflow, 'id'>>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

type WorkflowRow = {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  folder_id: string | null;
  author_id: string;
  updated_at: string;
  profiles:
    | { display_name: string; color: string }
    | { display_name: string; color: string }[]
    | null;
};

let realtimeChannel: RealtimeChannel | null = null;

function currentIdentity() {
  const { user, team } = useAuthStore.getState();
  if (!supabase || !user || !team) throw new Error('Team workspace is not connected');
  return { client: supabase, user, team };
}

async function fetchWorkflows() {
  const { client, team } = currentIdentity();
  const [{ data: workflowRows, error: workflowsError }, { data: folderRows, error: foldersError }] =
    await Promise.all([
      client
        .from('workflows')
        .select('id, name, nodes, edges, viewport, folder_id, author_id, updated_at, profiles!workflows_author_id_fkey(display_name, color)')
        .eq('team_id', team.id)
        .order('updated_at', { ascending: false }),
      client
        .from('workflow_folders')
        .select('id, name, sort_order')
        .eq('team_id', team.id)
        .order('sort_order'),
    ]);

  const error = workflowsError ?? foldersError;
  if (error) throw error;

  const workflows: Workflow[] = ((workflowRows ?? []) as unknown as WorkflowRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      name: row.name,
      nodes: row.nodes ?? [],
      edges: row.edges ?? [],
      viewport: row.viewport ?? { x: 0, y: 0, zoom: 1 },
      folderId: row.folder_id,
      authorId: row.author_id,
      authorName: profile?.display_name ?? 'Teammate',
      authorColor: profile?.color ?? '#71717a',
      updatedAt: new Date(row.updated_at).getTime(),
    };
  });

  const folders: WorkflowFolder[] = (folderRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    order: row.sort_order,
  }));

  return { workflows, folders };
}

async function refresh(set: (partial: Partial<WorkflowLibraryState>) => void) {
  try {
    const library = await fetchWorkflows();
    set({ ...library, loaded: true, error: null });
  } catch (error) {
    set({
      loaded: true,
      error: error instanceof Error ? error.message : 'Could not load shared workflows',
    });
  }
}

export const useWorkflowLibraryStore = create<WorkflowLibraryState>((set, get) => ({
  workflows: [],
  folders: [],
  loaded: false,
  error: null,

  load: async () => {
    const { team } = useAuthStore.getState();
    if (!team || !supabase) return;
    await refresh(set);

    if (realtimeChannel) await supabase.removeChannel(realtimeChannel);
    realtimeChannel = supabase
      .channel(`workflow-library-${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows', filter: `team_id=eq.${team.id}` }, () => refresh(set))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_folders', filter: `team_id=eq.${team.id}` }, () => refresh(set))
      .subscribe();
  },

  unload: async () => {
    if (realtimeChannel && supabase) await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    set({ workflows: [], folders: [], loaded: false, error: null });
  },

  saveWorkflow: async (name, folderId, snap) => {
    const { client, user, team } = currentIdentity();
    const { data, error } = await client
      .from('workflows')
      .insert({
        team_id: team.id,
        name,
        nodes: snap.nodes,
        edges: snap.edges,
        viewport: snap.viewport,
        folder_id: folderId,
        author_id: user.id,
      })
      .select('id')
      .single();
    if (error) throw error;
    await refresh(set);
    return data.id;
  },

  updateWorkflow: async (id, updates) => {
    const { client } = currentIdentity();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.nodes !== undefined) patch.nodes = updates.nodes;
    if (updates.edges !== undefined) patch.edges = updates.edges;
    if (updates.viewport !== undefined) patch.viewport = updates.viewport;
    if (updates.folderId !== undefined) patch.folder_id = updates.folderId;

    const { error } = await client.from('workflows').update(patch).eq('id', id);
    if (error) throw error;
    await refresh(set);
  },

  deleteWorkflow: async (id) => {
    const { client } = currentIdentity();
    const { error } = await client.from('workflows').delete().eq('id', id);
    if (error) throw error;
    set({ workflows: get().workflows.filter((workflow) => workflow.id !== id) });
  },

  addFolder: async (name) => {
    const { client, team } = currentIdentity();
    const { data, error } = await client
      .from('workflow_folders')
      .insert({ team_id: team.id, name, sort_order: get().folders.length })
      .select('id')
      .single();
    if (error) throw error;
    await refresh(set);
    return data.id;
  },

  renameFolder: async (id, name) => {
    const { client } = currentIdentity();
    const { error } = await client.from('workflow_folders').update({ name }).eq('id', id);
    if (error) throw error;
    set({
      folders: get().folders.map((folder) =>
        folder.id === id ? { ...folder, name } : folder
      ),
    });
  },

  deleteFolder: async (id) => {
    const { client } = currentIdentity();
    const { error } = await client.from('workflow_folders').delete().eq('id', id);
    if (error) throw error;
    set({
      folders: get().folders.filter((folder) => folder.id !== id),
      workflows: get().workflows.map((workflow) =>
        workflow.folderId === id ? { ...workflow, folderId: null } : workflow
      ),
    });
  },
}));
