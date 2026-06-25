import { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2, Pencil, Check, X } from 'lucide-react';
import { useWorkflowLibraryStore } from '../store/workflowLibraryStore';
import { WorkflowItem } from './WorkflowItem';
import type { WorkflowFolder as WorkflowFolderType, Workflow } from '../types';

interface Props {
  folder: WorkflowFolderType;
  workflows: Workflow[];
  defaultOpen?: boolean;
}

export function WorkflowFolder({ folder, workflows, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { renameFolder, deleteFolder } = useWorkflowLibraryStore();

  const commitRename = async () => {
    const name = draft.trim();
    if (name && name !== folder.name) await renameFolder(folder.id, name);
    setRenaming(false);
  };

  const cancelRename = () => {
    setDraft(folder.name);
    setRenaming(false);
  };

  return (
    <div className="mb-0.5">
      <div
        className="group flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-700/40 cursor-pointer"
        onClick={() => !renaming && setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown size={12} className="text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-zinc-500 shrink-0" />
        )}

        {renaming ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              className="flex-1 bg-zinc-900 text-white text-xs rounded px-1.5 py-0.5 outline-none border border-zinc-600 focus:border-emerald-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelRename();
              }}
            />
            <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check size={11} />
            </button>
            <button onClick={cancelRename} className="text-zinc-500 hover:text-white p-0.5">
              <X size={11} />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-zinc-300 text-xs font-medium truncate">{folder.name}</span>
            <span className="text-zinc-600 text-xs mr-1">{workflows.length}</span>
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setRenaming(true); setDraft(folder.name); }}
                className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded"
                title="Rename"
              >
                <Pencil size={10} />
              </button>
              {confirmDelete ? (
                <>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium px-0.5"
                  >
                    del
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-zinc-500 hover:text-white p-0.5"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-zinc-600 hover:text-red-400 p-0.5 rounded"
                  title="Delete folder"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="pl-3">
          {workflows.length === 0 ? (
            <div className="px-2 py-1 text-zinc-600 text-xs italic">No workflows</div>
          ) : (
            workflows.map((w) => <WorkflowItem key={w.id} workflow={w} />)
          )}
        </div>
      )}
    </div>
  );
}
