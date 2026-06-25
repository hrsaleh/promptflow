import { useState } from 'react';
import { Trash2, Pencil, Check, X, FolderInput, Play } from 'lucide-react';
import { useWorkflowLibraryStore } from '../store/workflowLibraryStore';
import { useGraphStore } from '../store/graphStore';
import type { Workflow } from '../types';

interface Props {
  workflow: Workflow;
}

export function WorkflowItem({ workflow }: Props) {
  const { updateWorkflow, deleteWorkflow, setPendingLoad, folders } = useWorkflowLibraryStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(workflow.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [movingTo, setMovingTo] = useState(false);

  const dateLabel = new Date(workflow.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const commitRename = async () => {
    const name = draft.trim();
    if (name && name !== workflow.name) await updateWorkflow(workflow.id, { name });
    setRenaming(false);
  };

  const cancelRename = () => {
    setDraft(workflow.name);
    setRenaming(false);
  };

  const handleLoad = () => {
    const { nodes } = useGraphStore.getState();
    if (nodes.length > 0) {
      setConfirmLoad(true);
    } else {
      setPendingLoad(workflow);
    }
  };

  return (
    <div className="group flex items-start gap-1.5 px-2 py-1.5 rounded hover:bg-zinc-700/60 transition-colors">
      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-1">
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
        ) : confirmLoad ? (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-zinc-400 text-xs">Replace canvas?</span>
            <button
              onClick={() => { setConfirmLoad(false); setPendingLoad(workflow); }}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
            >
              Load
            </button>
            <button onClick={() => setConfirmLoad(false)} className="text-zinc-500 hover:text-white p-0.5">
              <X size={10} />
            </button>
          </div>
        ) : (
          <>
            <div className="text-zinc-200 text-xs font-medium truncate leading-tight">
              {workflow.name}
            </div>
            <div className="text-zinc-500 text-xs leading-tight mt-0.5">{dateLabel}</div>
          </>
        )}
      </div>

      {!renaming && !confirmLoad && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleLoad}
            className="text-zinc-600 hover:text-emerald-400 p-0.5 rounded transition-colors"
            title="Load workflow"
          >
            <Play size={11} />
          </button>

          {movingTo ? (
            <select
              autoFocus
              className="bg-zinc-900 text-white text-xs rounded px-1 py-0.5 border border-zinc-700 max-w-[90px]"
              value={workflow.folderId ?? ''}
              onChange={(e) => {
                updateWorkflow(workflow.id, { folderId: e.target.value || null });
                setMovingTo(false);
              }}
              onBlur={() => setMovingTo(false)}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setMovingTo(true); }}
              className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded transition-colors"
              title="Move to folder"
            >
              <FolderInput size={11} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setDraft(workflow.name); }}
            className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded transition-colors"
            title="Rename"
          >
            <Pencil size={11} />
          </button>

          {confirmDelete ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); deleteWorkflow(workflow.id); }}
                className="text-red-400 hover:text-red-300 text-xs font-medium px-0.5"
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
