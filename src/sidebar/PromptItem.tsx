import { useState, useRef } from 'react';
import { Star, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import type { SavedPrompt } from '../types';

interface Props {
  prompt: SavedPrompt;
}

export function PromptItem({ prompt }: Props) {
  const { toggleBookmark, deletePrompt, updatePrompt } = useLibraryStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(prompt.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = async () => {
    const name = draft.trim();
    if (name && name !== prompt.name) await updatePrompt(prompt.id, { name });
    setRenaming(false);
  };

  const cancelRename = () => {
    setDraft(prompt.name);
    setRenaming(false);
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/promptflow', JSON.stringify(prompt));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className="group flex items-start gap-1.5 px-2 py-1.5 rounded hover:bg-zinc-700/60 cursor-grab active:cursor-grabbing transition-colors"
      draggable
      onDragStart={onDragStart}
    >
      <GripVertical size={12} className="text-zinc-600 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 bg-zinc-900 text-white text-xs rounded px-1.5 py-0.5 outline-none border border-zinc-600 focus:border-emerald-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check size={11} />
            </button>
            <button onClick={cancelRename} className="text-zinc-500 hover:text-white p-0.5">
              <X size={11} />
            </button>
          </div>
        ) : (
          <div className="text-zinc-200 text-xs font-medium truncate leading-tight">
            {prompt.name}
          </div>
        )}
        {!renaming && (
          <div className="text-zinc-500 text-xs truncate leading-tight mt-0.5">
            {prompt.content || <span className="italic">empty</span>}
          </div>
        )}
      </div>

      {!renaming && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); toggleBookmark(prompt.id); }}
            className={`p-0.5 rounded transition-colors ${prompt.bookmarked ? 'text-yellow-400' : 'text-zinc-600 hover:text-yellow-400'}`}
            title="Bookmark"
          >
            <Star size={11} fill={prompt.bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setDraft(prompt.name); }}
            className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded transition-colors"
            title="Rename"
          >
            <Pencil size={11} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                className="text-red-400 hover:text-red-300 p-0.5 text-xs font-medium"
              >
                del
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
