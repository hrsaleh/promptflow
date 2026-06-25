import { useRef, useState } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Undo2, Redo2, Download, Upload, Save } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { useWorkflowStore } from '../store/workflowStore';
import { SaveWorkflowDialog } from '../sidebar/SaveWorkflowDialog';

export function WorkflowBar() {
  const { setViewport } = useReactFlow();

  const tabs = useGraphStore((s) => s.tabs);
  const activeTabId = useGraphStore((s) => s.activeTabId);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const updateTab = useGraphStore((s) => s.updateTab);
  const importIntoActiveTab = useGraphStore((s) => s.importIntoActiveTab);

  const exportJSON = useWorkflowStore((s) => s.exportJSON);
  const importJSON = useWorkflowStore((s) => s.importJSON);

  const activeTab = tabs.find((t) => t.id === activeTabId)!;

  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = () => {
    exportJSON({
      nodes: activeTab.nodes,
      edges: activeTab.edges,
      viewport: activeTab.viewport,
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const snap = await importJSON(file);
    if (!snap) return;
    importIntoActiveTab(snap.nodes, snap.edges, snap.viewport);
    requestAnimationFrame(() => setViewport(snap.viewport));
    e.target.value = '';
  };

  const onSaved = (id: string, name: string) => {
    updateTab(activeTabId, { workflowId: id, title: name, isDirty: false });
    setDialogOpen(false);
  };

  const statusLabel = activeTab.isDirty ? '● Unsaved' : 'Saved';

  return (
    <Panel position="top-right">
      <div className="flex items-center gap-1 bg-zinc-800/90 backdrop-blur border border-zinc-700 rounded-lg px-2 py-1.5 shadow-lg">
        <button
          onClick={undo}
          disabled={activeTab.past.length === 0}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (⌘Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={activeTab.future.length === 0}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        <button
          onClick={() => setDialogOpen(true)}
          className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
          title="Save workflow to library"
        >
          <Save size={14} />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        <button
          onClick={handleExport}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          title="Export workflow JSON"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          title="Import workflow JSON"
        >
          <Upload size={14} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <div className="w-px h-4 bg-zinc-700 mx-1" />
        <span
          className={`text-xs pr-1 ${activeTab.isDirty ? 'text-emerald-500' : 'text-zinc-600'}`}
        >
          {statusLabel}
        </span>
      </div>

      {dialogOpen && (
        <SaveWorkflowDialog
          snap={{ nodes: activeTab.nodes, edges: activeTab.edges, viewport: activeTab.viewport }}
          workflowId={activeTab.workflowId}
          onSaved={onSaved}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Panel>
  );
}
