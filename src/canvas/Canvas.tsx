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
  type Viewport,
} from '@xyflow/react';
import { useGraphStore } from '../store/graphStore';
import { nodeTypes } from '../nodes/registry';
import { hasCycle } from '../eval/evaluate';
import { AddNodePalette } from './AddNodePalette';
import { WorkflowBar } from './WorkflowBar';
import type { SavedPrompt } from '../types';

function FlowCanvas() {
  const tabs = useGraphStore((s) => s.tabs);
  const activeTabId = useGraphStore((s) => s.activeTabId);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const setTabViewport = useGraphStore((s) => s.setTabViewport);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const copySelected = useGraphStore((s) => s.copySelected);
  const paste = useGraphStore((s) => s.paste);
  const deleteNodes = useGraphStore((s) => s.deleteNodes);
  const groupSelected = useGraphStore((s) => s.groupSelected);
  const ungroupSelected = useGraphStore((s) => s.ungroupSelected);

  const activeTab = tabs.find((t) => t.id === activeTabId)!;

  const [palette, setPalette] = useState<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();
  const lastClickAt = useRef(0);

  // ── Restore viewport when switching tabs ─────────────────────────────────
  useEffect(() => {
    requestAnimationFrame(() => setViewport(activeTab.viewport));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, setViewport]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (!inInput && !mod && (e.key === 'Delete' || e.key === 'Backspace')) {
        const selectedIds = activeTab.nodes.filter((node) => node.selected).map((node) => node.id);
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteNodes(selectedIds);
        }
      }

      if (mod && !inInput) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'c') { e.preventDefault(); copySelected(); }
        if (e.key === 'v') { e.preventDefault(); paste(); }
        if (e.key.toLowerCase() === 'g' && e.shiftKey) {
          e.preventDefault();
          ungroupSelected();
        } else if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          groupSelected();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, copySelected, paste, deleteNodes, groupSelected, ungroupSelected, activeTab.nodes]);

  // ── Validation ───────────────────────────────────────────────────────────
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const { tabs: t, activeTabId: id } = useGraphStore.getState();
    const cur = t.find((tab) => tab.id === id)?.edges ?? [];
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    return !hasCycle(connection.source, connection.target, cur);
  }, []);

  const onMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, vp: Viewport) => {
      setTabViewport(vp);
    },
    [setTabViewport]
  );

  // ── Pane double-click → palette ──────────────────────────────────────────
  const lastClickAtRef = lastClickAt;
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastClickAtRef.current < 300) {
        lastClickAtRef.current = 0;
        setPalette({ x: event.clientX, y: event.clientY });
      } else {
        lastClickAtRef.current = now;
      }
    },
    [lastClickAtRef]
  );

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
        nodes={activeTab.nodes}
        edges={activeTab.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={null}
        selectionKeyCode={['Meta', 'Control']}
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
