import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Copy, Check, Star, Save } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { useLibraryStore } from '../store/libraryStore';
import { SavePromptDialog } from '../sidebar/SavePromptDialog';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { OutputNodeData } from '../types';

interface Props {
  id: string;
  data: OutputNodeData;
  selected?: boolean;
}

function OutputNodeComponent({ id, data, selected }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const isConnected = useGraphStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.edges.some((e) => e.target === id) ?? false;
  });
  const savePrompt    = useLibraryStore((s) => s.savePrompt);
  const toggleBookmark = useLibraryStore((s) => s.toggleBookmark);
  const prompts       = useLibraryStore((s) => s.prompts);

  const [copied, setCopied]       = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const linkedPrompt = prompts.find((p) => p.id === data.linkedPromptId);
  const isBookmarked = linkedPrompt?.bookmarked ?? false;

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(data.value ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data.value]);

  const onSaved = useCallback(
    (promptId: string) => updateNodeData(id, { linkedPromptId: promptId }),
    [id, updateNodeData]
  );

  const onStar = useCallback(async () => {
    if (linkedPrompt) {
      await toggleBookmark(linkedPrompt.id);
    } else {
      const newId = await savePrompt({
        name: 'Output',
        content: data.value ?? '',
        categoryId: null,
        bookmarked: true,
        tags: [],
      });
      updateNodeData(id, { linkedPromptId: newId });
    }
  }, [linkedPrompt, toggleBookmark, savePrompt, data.value, updateNodeData, id]);

  const words = data.value ? data.value.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = data.value?.length ?? 0;

  return (
    <>
      <NodeFloatingToolbar nodeId={id} selected={!!selected} color={data.color} />
      <div
        className="relative bg-zinc-800 rounded-lg min-w-[280px] max-w-[420px] shadow-xl border"
        style={{ borderColor: selected ? '#34d399' : (data.color ?? '#52525b') }}
      >
        <Handle type="target" position={Position.Left} id="input" title="STRING input" />

        <div
          className="flex items-center gap-1.5 px-2 py-2 border-b border-zinc-700"
          style={data.color ? { backgroundColor: `${data.color}26` } : undefined}
        >
          <span className="text-white text-sm font-semibold flex-1">Output</span>

          {/* Star / bookmark */}
          <button
            onClick={onStar}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-0.5 rounded transition-colors ${
              isBookmarked ? 'text-yellow-400' : 'text-zinc-500 hover:text-yellow-400'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this output'}
          >
            <Star size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {/* Save */}
          <button
            onClick={() => setShowDialog(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-0.5 rounded transition-colors ${
              data.linkedPromptId ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={data.linkedPromptId ? 'Update saved prompt' : 'Save to library'}
          >
            <Save size={13} />
          </button>

          <div className="w-px h-3 bg-zinc-700 mx-0.5" />
          <span className="text-zinc-500 text-xs">{words}w · {chars}ch</span>

          {/* Copy */}
          <button
            onClick={onCopy}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-emerald-400 transition-colors p-0.5 rounded"
            title="Copy to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>

        <div className="p-2">
          <textarea
            className={`w-full bg-zinc-900 text-white text-sm rounded p-2 resize-y outline-none border transition-colors min-h-[80px] max-h-[300px] leading-relaxed ${
              isConnected
                ? 'border-zinc-700 opacity-70 cursor-default select-text'
                : 'border-zinc-700 focus:border-emerald-500'
            }`}
            value={data.value ?? ''}
            onChange={(e) => !isConnected && updateNodeData(id, { value: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            readOnly={isConnected}
            placeholder={isConnected ? '' : 'Connect nodes or type directly…'}
          />
          {isConnected && (
            <p className="text-zinc-600 text-xs mt-1">Live from upstream — disconnect to edit</p>
          )}
        </div>

        <Handle type="source" position={Position.Right} id="output" title="STRING output" />
      </div>

      {showDialog && (
        <SavePromptDialog
          nodeId={id}
          initialName="Output"
          content={data.value ?? ''}
          linkedPromptId={data.linkedPromptId}
          onSaved={onSaved}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}

export const OutputNode = memo(OutputNodeComponent);
