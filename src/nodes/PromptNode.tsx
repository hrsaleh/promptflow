import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Save, Link, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { useLibraryStore } from '../store/libraryStore';
import { SavePromptDialog } from '../sidebar/SavePromptDialog';
import type { PromptNodeData } from '../types';

interface Props {
  id: string;
  data: PromptNodeData;
  selected?: boolean;
}

function PromptNodeComponent({ id, data, selected }: Props) {
  const updateNodeData  = useGraphStore((s) => s.updateNodeData);
  const savePrompt      = useLibraryStore((s) => s.savePrompt);
  const toggleBookmark  = useLibraryStore((s) => s.toggleBookmark);
  const prompts         = useLibraryStore((s) => s.prompts);

  const [showDialog, setShowDialog] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

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
      <div
        className={`relative bg-zinc-800 rounded-lg min-w-[220px] max-w-[320px] shadow-xl border ${
          selected ? 'border-emerald-400' : 'border-zinc-600'
        }`}
      >
        <div className="flex items-center gap-1.5 px-2 py-2 border-b border-zinc-700">
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
        </div>

        {!collapsed && (
          <div className="p-2">
            <textarea
              className="w-full bg-zinc-900 text-white text-sm rounded p-2 resize-y outline-none border border-zinc-700 focus:border-emerald-500 transition-colors min-h-[80px]"
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
