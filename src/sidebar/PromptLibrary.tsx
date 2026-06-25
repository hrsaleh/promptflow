import { useState } from 'react';
import { Search, Star, Plus } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { CategoryFolder } from './CategoryFolder';
import { PromptItem } from './PromptItem';

type Tab = 'all' | 'bookmarks';

export function PromptLibrary() {
  const { prompts, categories, loaded } = useLibraryStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  if (!loaded) {
    return (
      <aside className="w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 flex items-center justify-center">
        <span className="text-zinc-600 text-xs">Loading…</span>
      </aside>
    );
  }

  const q = query.toLowerCase().trim();
  const filtered = q
    ? prompts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      )
    : null; // null = not filtering

  const displayPrompts = filtered ?? (tab === 'bookmarks' ? prompts.filter((p) => p.bookmarked) : prompts.filter((p) => !p.bookmarked));
  const bookmarked = prompts.filter((p) => p.bookmarked);

  return (
    <aside className="w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-semibold">Prompts</span>
          <span className="text-zinc-600 text-xs">{prompts.length}</span>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="w-full bg-zinc-800 text-white text-xs rounded px-3 py-1.5 pl-7 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
            placeholder="Search prompts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      {!filtered && (
        <div className="flex border-b border-zinc-800 shrink-0">
          {(['all', 'bookmarks'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setTab(t)}
            >
              {t === 'bookmarks' ? (
                <span className="flex items-center justify-center gap-1">
                  <Star size={10} /> Bookmarks
                </span>
              ) : (
                'All'
              )}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered ? (
          /* Search results — flat list */
          filtered.length === 0 ? (
            <div className="px-3 py-4 text-zinc-600 text-xs text-center">No results</div>
          ) : (
            <div className="px-1">
              {filtered.map((p) => (
                <PromptItem key={p.id} prompt={p} />
              ))}
            </div>
          )
        ) : tab === 'bookmarks' ? (
          /* Bookmarks tab */
          bookmarked.length === 0 ? (
            <div className="px-3 py-4 text-zinc-600 text-xs text-center">
              No bookmarks yet. Star a prompt to bookmark it.
            </div>
          ) : (
            <div className="px-1 mt-1">
              {bookmarked.map((p) => (
                <PromptItem key={p.id} prompt={p} />
              ))}
            </div>
          )
        ) : (
          /* All tab — categorised */
          <>
            {/* Category folders */}
            <div className="px-1">
              {categories.map((cat) => (
                <CategoryFolder
                  key={cat.id}
                  category={cat}
                  prompts={displayPrompts.filter((p) => p.categoryId === cat.id)}
                  defaultOpen={false}
                />
              ))}

              {/* Uncategorized */}
              {(() => {
                const uncategorized = displayPrompts.filter((p) => !p.categoryId);
                if (uncategorized.length === 0) return null;
                return (
                  <div className="mt-1">
                    <div className="px-2 py-1 text-zinc-600 text-xs font-medium uppercase tracking-wider">
                      Uncategorized
                    </div>
                    {uncategorized.map((p) => (
                      <PromptItem key={p.id} prompt={p} />
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Footer — add category */}
      <div className="border-t border-zinc-800 px-3 py-2 shrink-0">
        <AddCategoryRow />
      </div>
    </aside>
  );
}

function AddCategoryRow() {
  const { addCategory } = useLibraryStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const commit = async () => {
    if (name.trim()) await addCategory(name.trim());
    setName('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs transition-colors w-full"
      >
        <Plus size={11} />
        Add category
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        className="flex-1 bg-zinc-800 text-white text-xs rounded px-2 py-1 outline-none border border-zinc-700 focus:border-emerald-500"
        placeholder="Category name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setAdding(false); setName(''); }
        }}
      />
      <button onClick={commit} className="text-emerald-400 text-xs px-1">Add</button>
    </div>
  );
}
