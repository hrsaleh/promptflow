import { useState } from 'react';
import { X } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';

interface Props {
  nodeId: string;
  initialName: string;
  content: string;
  linkedPromptId?: string;
  onSaved: (promptId: string) => void;
  onClose: () => void;
}

export function SavePromptDialog({
  initialName,
  content,
  linkedPromptId,
  onSaved,
  onClose,
}: Props) {
  const { categories, prompts, savePrompt, updatePrompt, addCategory } = useLibraryStore();
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState<string | null>(
    linkedPromptId
      ? (prompts.find((p) => p.id === linkedPromptId)?.categoryId ?? null)
      : null
  );
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLinked = !!linkedPromptId && prompts.some((p) => p.id === linkedPromptId);

  const handleSave = async (asNew = false) => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let finalCategoryId = categoryId;
      if (showNewCat && newCatName.trim()) {
        finalCategoryId = await addCategory(newCatName.trim());
      }

      if (isLinked && !asNew) {
        await updatePrompt(linkedPromptId!, { name: name.trim(), content, categoryId: finalCategoryId });
        onSaved(linkedPromptId!);
      } else {
        const id = await savePrompt({
          name: name.trim(),
          content,
          categoryId: finalCategoryId,
          bookmarked: false,
          tags: [],
        });
        onSaved(id);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-800 border border-zinc-600 rounded-xl shadow-2xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">
            {isLinked ? 'Update Prompt' : 'Save Prompt'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Name</label>
            <input
              autoFocus
              className="w-full bg-zinc-900 text-white text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Category</label>
            {!showNewCat ? (
              <select
                className="w-full bg-zinc-900 text-white text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                value={categoryId ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewCat(true);
                    setCategoryId(null);
                  } else {
                    setCategoryId(e.target.value || null);
                  }
                }}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__new__">+ New category…</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-zinc-900 text-white text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                  placeholder="Category name…"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <button
                  className="text-zinc-400 hover:text-white px-2 text-xs"
                  onClick={() => { setShowNewCat(false); setNewCatName(''); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="text-zinc-600 text-xs border-t border-zinc-700 pt-2 max-h-[60px] overflow-hidden text-ellipsis whitespace-nowrap">
            {content || <span className="italic">Empty prompt</span>}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded px-3 py-2 transition-colors disabled:opacity-50"
            onClick={() => handleSave(false)}
            disabled={saving || !name.trim()}
          >
            {isLinked ? 'Update' : 'Save'}
          </button>
          {isLinked && (
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded px-3 py-2 transition-colors disabled:opacity-50"
              onClick={() => handleSave(true)}
              disabled={saving || !name.trim()}
            >
              Save as new
            </button>
          )}
          <button
            className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded px-3 py-2 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
