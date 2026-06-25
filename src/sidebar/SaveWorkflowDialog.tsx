import { useState } from 'react';
import { X } from 'lucide-react';
import { useWorkflowLibraryStore } from '../store/workflowLibraryStore';
import type { WorkflowSnapshot } from '../store/workflowStore';

interface Props {
  snap: WorkflowSnapshot;
  onClose: () => void;
}

export function SaveWorkflowDialog({ snap, onClose }: Props) {
  const {
    currentWorkflowId,
    workflows,
    folders,
    saveWorkflow,
    updateWorkflow,
    addFolder,
    setCurrentWorkflowId,
  } = useWorkflowLibraryStore();

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId);
  const isLinked = !!currentWorkflow;

  const [name, setName] = useState(
    currentWorkflow?.name ?? `Workflow ${new Date().toLocaleDateString()}`
  );
  const [folderId, setFolderId] = useState<string>(currentWorkflow?.folderId ?? '');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (asNew = false) => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let finalFolderId = folderId || null;
      if (showNewFolder && newFolderName.trim()) {
        finalFolderId = await addFolder(newFolderName.trim());
      }

      if (isLinked && !asNew) {
        await updateWorkflow(currentWorkflow!.id, {
          name: name.trim(),
          folderId: finalFolderId,
          nodes: snap.nodes,
          edges: snap.edges,
          viewport: snap.viewport,
        });
      } else {
        const id = await saveWorkflow(name.trim(), finalFolderId, snap);
        setCurrentWorkflowId(id);
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
            {isLinked ? 'Update Workflow' : 'Save Workflow'}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(false);
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1 block">Folder</label>
            {!showNewFolder ? (
              <select
                className="w-full bg-zinc-900 text-white text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                value={folderId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewFolder(true);
                    setFolderId('');
                  } else {
                    setFolderId(e.target.value);
                  }
                }}
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                <option value="__new__">+ New folder…</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-zinc-900 text-white text-sm rounded px-3 py-2 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                  placeholder="Folder name…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <button
                  className="text-zinc-400 hover:text-white px-2 text-xs"
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                >
                  Cancel
                </button>
              </div>
            )}
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
