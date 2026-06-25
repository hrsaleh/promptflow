import { useRef, useState } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Undo2, Redo2, Download, Upload, Save } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useWorkflowLibraryStore } from '../store/workflowLibraryStore';
import { SaveWorkflowDialog } from '../sidebar/SaveWorkflowDialog';
import type { WorkflowSnapshot } from '../store/workflowStore';

export function WorkflowBar() {
  const { getViewport, setViewport } = useReactFlow();

  // Individual selectors — no object selector to avoid infinite re-render loop
  const past     = useGraphStore((s) => s.past);
  const future   = useGraphStore((s) => s.future);
  const undo     = useGraphStore((s) => s.undo);
  const redo     = useGraphStore((s) => s.redo);
  const setNodes = useGraphStore((s) => s.setNodes);
  const setEdges = useGraphStore((s) => s.setEdges);
  const nodes    = useGraphStore((s) => s.nodes);
  const edges    = useGraphStore((s) => s.edges);

  const lastSaved  = useWorkflowStore((s) => s.lastSaved);
  const exportJSON = useWorkflowStore((s) => s.exportJSON);
  const importJSON = useWorkflowStore((s) => s.importJSON);

  const setCurrentWorkflowId = useWorkflowLibraryStore((s) => s.setCurrentWorkflowId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [saveSnap, setSaveSnap] = useState<WorkflowSnapshot | null>(null);

  const handleExport = () => {
    exportJSON({ nodes, edges, viewport: getViewport() });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const snap = await importJSON(file);
    if (!snap) return;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCurrentWorkflowId(null);
    requestAnimationFrame(() => setViewport(snap.viewport));
    e.target.value = '';
  };

  const handleSave = () => {
    setSaveSnap({ nodes, edges, viewport: getViewport() });
  };

  const savedLabel = lastSaved
    ? `Saved ${Math.round((Date.now() - lastSaved) / 1000)}s ago`
    : 'Not saved yet';

  return (
    <Panel position="top-right">
      <div className="flex items-center gap-1 bg-zinc-800/90 backdrop-blur border border-zinc-700 rounded-lg px-2 py-1.5 shadow-lg">
        <button
          onClick={undo}
          disabled={past.length === 0}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (⌘Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        <button
          onClick={handleSave}
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
        <span className="text-zinc-600 text-xs pr-1">{savedLabel}</span>
      </div>

      {saveSnap && (
        <SaveWorkflowDialog snap={saveSnap} onClose={() => setSaveSnap(null)} />
      )}
    </Panel>
  );
}
