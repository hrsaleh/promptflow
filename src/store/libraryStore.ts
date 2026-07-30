import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { SavedPrompt, PromptCategory } from '../types';

interface SavePromptInput {
  name: string;
  content: string;
  categoryId: string | null;
  bookmarked: boolean;
  tags: string[];
}

interface LibraryState {
  prompts: SavedPrompt[];
  categories: PromptCategory[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  unload: () => Promise<void>;
  savePrompt: (data: SavePromptInput) => Promise<string>;
  updatePrompt: (id: string, updates: Partial<SavedPrompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<string>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

type PromptRow = {
  id: string;
  name: string;
  content: string;
  category_id: string | null;
  tags: string[];
  author_id: string;
  created_at: string;
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

async function fetchLibrary() {
  const { client, user, team } = currentIdentity();
  const [{ data: promptRows, error: promptsError }, { data: categoryRows, error: categoriesError }, { data: bookmarks, error: bookmarksError }] =
    await Promise.all([
      client
        .from('prompts')
        .select('id, name, content, category_id, tags, author_id, created_at, updated_at, profiles!prompts_author_id_fkey(display_name, color)')
        .eq('team_id', team.id)
        .order('created_at'),
      client
        .from('categories')
        .select('id, name, sort_order')
        .eq('team_id', team.id)
        .order('sort_order'),
      client
        .from('prompt_bookmarks')
        .select('prompt_id')
        .eq('user_id', user.id),
    ]);

  const error = promptsError ?? categoriesError ?? bookmarksError;
  if (error) throw error;

  const bookmarkedIds = new Set((bookmarks ?? []).map((row) => row.prompt_id));
  const prompts: SavedPrompt[] = ((promptRows ?? []) as unknown as PromptRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      categoryId: row.category_id,
      bookmarked: bookmarkedIds.has(row.id),
      tags: row.tags ?? [],
      authorId: row.author_id,
      authorName: profile?.display_name ?? 'Teammate',
      authorColor: profile?.color ?? '#71717a',
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  });

  const categories: PromptCategory[] = (categoryRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    order: row.sort_order,
  }));

  return { prompts, categories };
}

async function refresh(set: (partial: Partial<LibraryState>) => void) {
  try {
    const library = await fetchLibrary();
    set({ ...library, loaded: true, error: null });
  } catch (error) {
    set({ loaded: true, error: error instanceof Error ? error.message : 'Could not load shared prompts' });
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  prompts: [],
  categories: [],
  loaded: false,
  error: null,

  load: async () => {
    const { team } = useAuthStore.getState();
    if (!team || !supabase) return;

    await refresh(set);
    if (realtimeChannel) await supabase.removeChannel(realtimeChannel);

    realtimeChannel = supabase
      .channel(`prompt-library-${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts', filter: `team_id=eq.${team.id}` }, () => refresh(set))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `team_id=eq.${team.id}` }, () => refresh(set))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_bookmarks' }, () => refresh(set))
      .subscribe();
  },

  unload: async () => {
    if (realtimeChannel && supabase) await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    set({ prompts: [], categories: [], loaded: false, error: null });
  },

  savePrompt: async (data) => {
    const { client, user, team } = currentIdentity();
    const { data: prompt, error } = await client
      .from('prompts')
      .insert({
        team_id: team.id,
        name: data.name,
        content: data.content,
        category_id: data.categoryId,
        tags: data.tags,
        author_id: user.id,
      })
      .select('id')
      .single();
    if (error) throw error;

    if (data.bookmarked) {
      const { error: bookmarkError } = await client
        .from('prompt_bookmarks')
        .insert({ prompt_id: prompt.id, user_id: user.id });
      if (bookmarkError) throw bookmarkError;
    }

    await refresh(set);
    return prompt.id;
  },

  updatePrompt: async (id, updates) => {
    const { client } = currentIdentity();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.content !== undefined) patch.content = updates.content;
    if (updates.categoryId !== undefined) patch.category_id = updates.categoryId;
    if (updates.tags !== undefined) patch.tags = updates.tags;

    if (Object.keys(patch).length > 0) {
      const { error } = await client.from('prompts').update(patch).eq('id', id);
      if (error) throw error;
    }
    await refresh(set);
  },

  deletePrompt: async (id) => {
    const { client } = currentIdentity();
    const { error } = await client.from('prompts').delete().eq('id', id);
    if (error) throw error;
    set({ prompts: get().prompts.filter((prompt) => prompt.id !== id) });
  },

  toggleBookmark: async (id) => {
    const { client, user } = currentIdentity();
    const prompt = get().prompts.find((item) => item.id === id);
    if (!prompt) return;

    const query = prompt.bookmarked
      ? client.from('prompt_bookmarks').delete().eq('prompt_id', id).eq('user_id', user.id)
      : client.from('prompt_bookmarks').insert({ prompt_id: id, user_id: user.id });
    const { error } = await query;
    if (error) throw error;

    set({
      prompts: get().prompts.map((item) =>
        item.id === id ? { ...item, bookmarked: !item.bookmarked } : item
      ),
    });
  },

  addCategory: async (name) => {
    const { client, team } = currentIdentity();
    const { data, error } = await client
      .from('categories')
      .insert({ team_id: team.id, name, sort_order: get().categories.length })
      .select('id')
      .single();
    if (error) throw error;
    await refresh(set);
    return data.id;
  },

  renameCategory: async (id, name) => {
    const { client } = currentIdentity();
    const { error } = await client.from('categories').update({ name }).eq('id', id);
    if (error) throw error;
    set({
      categories: get().categories.map((category) =>
        category.id === id ? { ...category, name } : category
      ),
    });
  },

  deleteCategory: async (id) => {
    const { client } = currentIdentity();
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) throw error;
    set({
      categories: get().categories.filter((category) => category.id !== id),
      prompts: get().prompts.map((prompt) =>
        prompt.categoryId === id ? { ...prompt, categoryId: null } : prompt
      ),
    });
  },
}));
