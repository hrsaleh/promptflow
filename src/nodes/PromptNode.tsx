import { memo, useCallback, useState } from 'react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import { Save, Link, ChevronDown, ChevronRight, Star, Copy, Check } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { useLibraryStore } from '../store/libraryStore';
import { SavePromptDialog } from '../sidebar/SavePromptDialog';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { PromptNodeData } from '../types';

interface Props {
  id: string;
  data: PromptNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

function PromptNodeComponent({ id, data, selected, width, height }: Props) {
  const nodeWidth = width && width >= 220 ? width : 280;
  const nodeHeight = height && height >= 140 ? height : 180;
  const updateNodeData  = useGraphStore((s) => s.updateNodeData);
  const savePrompt      = useLibraryStore((s) => s.savePrompt);
  const toggleBookmark  = useLibraryStore((s) => s.toggleBookmark);
  const prompts         = useLibraryStore((s) => s.prompts);

  const [showDialog, setShowDialog] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);
  const [copied, setCopied]         = useState(false);

  const linkedPrompt = prompts.find((p) => p.id === data.linkedPromptId);
  const isBookmarked = linkedPrompt?.bookmarked ?? false;

  const onTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateNodeData(id, { title: e.target.value }),
    [id, updateNodeData]
  );

  const onContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      updateNodeData(id, { content: e.target.value }),
    [id, updateNodeData]
  );

  const onSaved = useCallback(
    (promptId: string) => updateNodeData(id, { linkedPromptId: promptId }),
    [id, updateNodeData]
  );

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(data.content ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data.content]);

  const onStar = useCallback(async () => {
    if (linkedPrompt) {
      await toggleBookmark(linkedPrompt.id);
    } else {
      const newId = await savePrompt({
        name: data.title || 'Prompt',
        content: data.content,
        categoryId: null,
        bookmarked: true,
        tags: [],
      });
      updateNodeData(id, { linkedPromptId: newId });
    }
  }, [linkedPrompt, toggleBookmark, savePrompt, data.title, data.content, updateNodeData, id]);

  return (
    <>
      <NodeFloatingToolbar nodeId={id} selected={!!selected} color={data.color} />
      <div
        className="relative flex flex-col bg-zinc-800 rounded-lg shadow-xl border"
        style={{
          width: nodeWidth,
          height: collapsed ? 'auto' : nodeHeight,
          borderColor: selected ? '#34d399' : (data.color ?? '#52525b'),
        }}
      >
        <NodeResizer
          isVisible={!!selected && !collapsed}
          minWidth={220}
          minHeight={140}
          color="#34d399"
          lineStyle={{ borderWidth: 1 }}
          handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
          onResizeStart={() => useGraphStore.getState().snapshot()}
        />

        <div
          className="flex items-center gap-1.5 px-2 py-2 border-b border-zinc-700"
          style={data.color ? { backgroundColor: `${data.color}26` } : undefined}
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>

          <input
            className="flex-1 bg-transparent text-white text-sm font-medium outline-none min-w-0"
            value={data.title}
            onChange={onTitleChange}
            onMouseDown={(e) => e.stopPropagation()}
          />

          {/* Star / bookmark */}
          <button
            onClick={onStar}
            onMouseDown={(e) => e.stopPropagation()}
            className={`shrink-0 p-0.5 rounded transition-colors ${
              isBookmarked ? 'text-yellow-400' : 'text-zinc-500 hover:text-yellow-400'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this prompt'}
          >
            <Star size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {/* Save / link */}
          <button
            onClick={() => setShowDialog(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`shrink-0 p-0.5 rounded transition-colors ${
              data.linkedPromptId
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={data.linkedPromptId ? 'Update saved prompt' : 'Save to library'}
          >
            {data.linkedPromptId ? <Link size={13} /> : <Save size={13} />}
          </button>

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />

          <button
            onClick={onCopy}
            onMouseDown={(e) => e.stopPropagation()}
            className="shrink-0 p-0.5 rounded text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Copy prompt to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>

        {!collapsed && (
          <div className="flex-1 min-h-0 p-2">
            <textarea
              className="nodrag nowheel h-full min-h-[80px] w-full resize-none rounded border border-zinc-700 bg-zinc-900 p-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              value={data.content}
              onChange={onContentChange}
              placeholder="Enter prompt text…"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <Handle type="source" position={Position.Right} id="output" title="STRING output" />
      </div>

      {showDialog && (
        <SavePromptDialog
          nodeId={id}
          initialName={data.title}
          content={data.content}
          linkedPromptId={data.linkedPromptId}
          onSaved={onSaved}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}

export const PromptNode = memo(PromptNodeComponent);
