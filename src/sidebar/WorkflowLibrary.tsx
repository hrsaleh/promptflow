import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useWorkflowLibraryStore } from '../store/workflowLibraryStore';
import { WorkflowFolder } from './WorkflowFolder';
import { WorkflowItem } from './WorkflowItem';

export function WorkflowLibrary() {
  const { workflows, folders, loaded } = useWorkflowLibraryStore();
  const [query, setQuery] = useState('');

  if (!loaded) {
    return (
      <aside className="w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 flex items-center justify-center">
        <span className="text-zinc-600 text-xs">Loading…</span>
      </aside>
    );
  }

  const q = query.toLowerCase().trim();
  const filtered = q ? workflows.filter((w) => w.name.toLowerCase().includes(q)) : null;

  return (
    <aside className="w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-semibold">Workflows</span>
          <span className="text-zinc-600 text-xs">{workflows.length}</span>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="w-full bg-zinc-800 text-white text-xs rounded px-3 py-1.5 pl-7 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
            placeholder="Search workflows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered ? (
          filtered.length === 0 ? (
            <div className="px-3 py-4 text-zinc-600 text-xs text-center">No results</div>
          ) : (
            <div className="px-1">
              {filtered.map((w) => (
                <WorkflowItem key={w.id} workflow={w} />
              ))}
            </div>
          )
        ) : (
          <div className="px-1">
            {folders.map((folder) => (
              <WorkflowFolder
                key={folder.id}
                folder={folder}
                workflows={workflows.filter((w) => w.folderId === folder.id)}
                defaultOpen={false}
              />
            ))}

            {(() => {
              const unfiled = workflows.filter((w) => !w.folderId);

              if (unfiled.length === 0 && folders.length === 0) {
                return (
                  <div className="px-3 py-6 text-zinc-600 text-xs text-center leading-relaxed">
                    No saved workflows yet.
                    <br />
                    Use the <span className="text-zinc-400">Save</span> button on the canvas.
                  </div>
                );
              }

              if (unfiled.length === 0) return null;

              return (
                <div className="mt-1">
                  {folders.length > 0 && (
                    <div className="px-2 py-1 text-zinc-600 text-xs font-medium uppercase tracking-wider">
                      Unfiled
                    </div>
                  )}
                  {unfiled.map((w) => (
                    <WorkflowItem key={w.id} workflow={w} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer — add folder */}
      <div className="border-t border-zinc-800 px-3 py-2 shrink-0">
        <AddFolderRow />
      </div>
    </aside>
  );
}

function AddFolderRow() {
  const { addFolder } = useWorkflowLibraryStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const commit = async () => {
    if (name.trim()) await addFolder(name.trim());
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
        Add folder
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        className="flex-1 bg-zinc-800 text-white text-xs rounded px-2 py-1 outline-none border border-zinc-700 focus:border-emerald-500"
        placeholder="Folder name…"
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
