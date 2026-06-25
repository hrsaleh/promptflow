import { create } from 'zustand';
import { db } from '../db/dexie';
import type { SavedPrompt, PromptCategory } from '../types';

const DEFAULT_CATEGORIES: Omit<PromptCategory, 'id'>[] = [
  { name: 'Identity', order: 0 },
  { name: 'Pose', order: 1 },
  { name: 'Wardrobe', order: 2 },
  { name: 'Scene', order: 3 },
  { name: 'Lighting', order: 4 },
  { name: 'Camera', order: 5 },
  { name: 'Color / Grade', order: 6 },
  { name: 'Negatives', order: 7 },
];

interface LibraryState {
  prompts: SavedPrompt[];
  categories: PromptCategory[];
  loaded: boolean;

  load: () => Promise<void>;
  savePrompt: (data: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePrompt: (id: string, updates: Partial<SavedPrompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<string>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  prompts: [],
  categories: [],
  loaded: false,

  load: async () => {
    const [prompts, cats] = await Promise.all([
      db.prompts.orderBy('createdAt').toArray(),
      db.categories.orderBy('order').toArray(),
    ]);

    if (cats.length === 0) {
      const seeded: PromptCategory[] = DEFAULT_CATEGORIES.map((c) => ({
        id: crypto.randomUUID(),
        ...c,
      }));
      await db.categories.bulkAdd(seeded);
      set({ prompts, categories: seeded, loaded: true });
    } else {
      set({ prompts, categories: cats, loaded: true });
    }
  },

  savePrompt: async (data) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const prompt: SavedPrompt = { id, ...data, createdAt: now, updatedAt: now };
    await db.prompts.add(prompt);
    set({ prompts: [...get().prompts, prompt] });
    return id;
  },

  updatePrompt: async (id, updates) => {
    const updatedAt = Date.now();
    await db.prompts.update(id, { ...updates, updatedAt });
    set({
      prompts: get().prompts.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt } : p
      ),
    });
  },

  deletePrompt: async (id) => {
    await db.prompts.delete(id);
    set({ prompts: get().prompts.filter((p) => p.id !== id) });
  },

  toggleBookmark: async (id) => {
    const prompt = get().prompts.find((p) => p.id === id);
    if (!prompt) return;
    await get().updatePrompt(id, { bookmarked: !prompt.bookmarked });
  },

  addCategory: async (name) => {
    const id = crypto.randomUUID();
    const order = get().categories.length;
    const cat: PromptCategory = { id, name, order };
    await db.categories.add(cat);
    set({ categories: [...get().categories, cat] });
    return id;
  },

  renameCategory: async (id, name) => {
    await db.categories.update(id, { name });
    set({
      categories: get().categories.map((c) => (c.id === id ? { ...c, name } : c)),
    });
  },

  deleteCategory: async (id) => {
    await db.categories.delete(id);
    const affected = get().prompts.filter((p) => p.categoryId === id);
    await Promise.all(affected.map((p) => db.prompts.update(p.id, { categoryId: null })));
    set({
      categories: get().categories.filter((c) => c.id !== id),
      prompts: get().prompts.map((p) =>
        p.categoryId === id ? { ...p, categoryId: null } : p
      ),
    });
  },
}));
