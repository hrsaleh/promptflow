import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

export function TabBar() {
  const tabs = useGraphStore((s) => s.tabs);
  const activeTabId = useGraphStore((s) => s.activeTabId);
  const newTab = useGraphStore((s) => s.newTab);
  const closeTab = useGraphStore((s) => s.closeTab);
  const setActiveTab = useGraphStore((s) => s.setActiveTab);

  const [confirmClose, setConfirmClose] = useState<string | null>(null);

  return (
    <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto shrink-0 h-9 min-h-[36px]">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`relative flex items-center gap-1.5 px-3 h-full border-r border-zinc-800 cursor-pointer select-none shrink-0 min-w-0 max-w-48 group ${
            tab.id === activeTabId
              ? 'bg-zinc-800 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          )}
          <span className="text-xs truncate flex-1 max-w-32">{tab.title}</span>

          {confirmClose === tab.id ? (
            <div
              className="flex items-center gap-0.5 ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { closeTab(tab.id); setConfirmClose(null); }}
                className="text-red-400 hover:text-red-300 text-[10px] px-0.5"
              >
                close
              </button>
              <button
                onClick={() => setConfirmClose(null)}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (tab.isDirty) {
                  setConfirmClose(tab.id);
                } else {
                  closeTab(tab.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-opacity shrink-0"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={newTab}
        className="w-8 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors shrink-0"
        title="New tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
