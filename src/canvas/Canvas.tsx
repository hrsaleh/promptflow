import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type Edge,
  type Connection,
} from '@xyflow/react';
import { useGraphStore } from '../store/graphStore';
import { useWorkflowStore } from '../store/workflowStore';
import { nodeTypes } from '../nodes/registry';
import { hasCycle } from '../eval/evaluate';
import { AddNodePalette } from './AddNodePalette';
import { WorkflowBar } from './WorkflowBar';
import type { SavedPrompt } from '../types';

const AUTOSAVE_DELAY = 2000;

function FlowCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect, addNode,
    undo, redo, copySelected, paste,
    setNodes, setEdges,
  } = useGraphStore();

  const [palette, setPalette] = useState<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  const { autosave, loadLastSave } = useWorkflowStore();
  const lastClickAt = useRef(0);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Load last autosave on mount ──────────────────────────────────────────
  useEffect(() => {
    loadLastSave().then((saved) => {
      if (!saved || saved.nodes.length === 0) return;
      setNodes(saved.nodes);
      setEdges(saved.edges);
      requestAnimationFrame(() => setViewport(saved.viewport));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave on graph change ─────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosave({ nodes, edges, viewport: getViewport() });
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(autosaveTimer.current);
  }, [nodes, edges, autosave, getViewport]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && !inInput) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'c') { e.preventDefault(); copySelected(); }
        if (e.key === 'v') { e.preventDefault(); paste(); }
        if (e.key === 'a') { e.preventDefault(); /* select-all handled by ReactFlow */ }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, copySelected, paste]);

  // ── Validation & helpers ─────────────────────────────────────────────────
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const { edges: cur } = useGraphStore.getState();
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    return !hasCycle(connection.source, connection.target, cur);
  }, []);

  const lastClickAtRef = lastClickAt;
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickAtRef.current < 300) {
      lastClickAtRef.current = 0;
      setPalette({ x: event.clientX, y: event.clientY });
    } else {
      lastClickAtRef.current = now;
    }
  }, [lastClickAtRef]);

  const addNodeAtScreen = useCallback(
    (_type: string, screenX: number, screenY: number) =>
      screenToFlowPosition({ x: screenX, y: screenY }),
    [screenToFlowPosition]
  );

  // ── Drag-and-drop from sidebar ───────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/promptflow');
      if (!raw) return;
      try {
        const prompt = JSON.parse(raw) as SavedPrompt;
        addNode({
          id: `prompt-${Date.now()}`,
          type: 'prompt',
          position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
          data: { title: prompt.name, content: prompt.content, linkedPromptId: prompt.id },
        });
      } catch { /* invalid drag data */ }
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div className="flex-1 relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        zoomOnDoubleClick={false}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: 'default' }}
        proOptions={{ hideAttribution: true }}
        selectNodesOnDrag={false}
      >
        <Background variant={BackgroundVariant.Lines} color="#27272a" gap={32} />
        <Controls />
        <MiniMap nodeColor="#34d399" maskColor="rgba(0,0,0,0.6)" />
        <WorkflowBar />
      </ReactFlow>

      {palette && (
        <AddNodePalette
          screenPos={palette}
          getFlowPosition={addNodeAtScreen}
          onClose={() => setPalette(null)}
        />
      )}
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
