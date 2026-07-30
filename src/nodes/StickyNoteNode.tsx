import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { StickyNoteNodeData } from '../types';

interface Props {
  id: string;
  data: StickyNoteNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

function StickyNoteNodeComponent({ id, data, selected, width, height }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const noteColor = data.color ?? '#fbbf24';

  const onTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      updateNodeData(id, { text: event.target.value }),
    [id, updateNodeData]
  );

  return (
    <>
      <NodeFloatingToolbar
        nodeId={id}
        selected={!!selected}
        color={noteColor}
      />

      <div
        className="relative flex flex-col overflow-hidden rounded-sm shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
        style={{
          width: width ?? 240,
          height: height ?? 210,
          backgroundColor: noteColor,
          outline: selected ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(0,0,0,0.14)',
          outlineOffset: selected ? 2 : 0,
        }}
      >
        <NodeResizer
          isVisible={!!selected}
          minWidth={160}
          minHeight={140}
          color="rgba(255,255,255,0.95)"
          lineStyle={{ borderWidth: 1 }}
          handleStyle={{ width: 9, height: 9, borderRadius: 2 }}
          onResizeStart={() => useGraphStore.getState().snapshot()}
        />

        <div className="flex items-center gap-1.5 px-3 pt-3 text-black/45">
          <StickyNote size={14} strokeWidth={2} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            Note
          </span>
        </div>

        <textarea
          className="nodrag nowheel block min-h-0 w-full flex-1 resize-none bg-transparent px-3 pb-4 pt-2 text-[15px] leading-6 text-zinc-950 placeholder:text-black/35 outline-none"
          value={data.text}
          onChange={onTextChange}
          onMouseDown={(event) => event.stopPropagation()}
          placeholder="Write a note…"
          aria-label="Sticky note text"
        />

        <div
          className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 bg-black/15"
          style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
        />
      </div>
    </>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeComponent);
