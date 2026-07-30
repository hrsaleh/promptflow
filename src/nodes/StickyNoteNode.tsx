import { memo, useCallback } from 'react';
import { StickyNote } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { StickyNoteNodeData } from '../types';

interface Props {
  id: string;
  data: StickyNoteNodeData;
  selected?: boolean;
}

function StickyNoteNodeComponent({ id, data, selected }: Props) {
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
        className="relative w-[240px] min-h-[210px] overflow-hidden rounded-sm shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
        style={{
          backgroundColor: noteColor,
          outline: selected ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(0,0,0,0.14)',
          outlineOffset: selected ? 2 : 0,
        }}
      >
        <div className="flex items-center gap-1.5 px-3 pt-3 text-black/45">
          <StickyNote size={14} strokeWidth={2} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            Note
          </span>
        </div>

        <textarea
          className="nodrag nowheel block w-full min-h-[172px] resize-none bg-transparent px-3 pb-4 pt-2 text-[15px] leading-6 text-zinc-950 placeholder:text-black/35 outline-none"
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
