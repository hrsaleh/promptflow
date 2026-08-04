import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import { Layers3 } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { GroupNodeData } from '../types';

interface Props {
  id: string;
  data: GroupNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

function GroupNodeComponent({ id, data, selected, width, height }: Props) {
  const updateNodeData = useGraphStore((state) => state.updateNodeData);
  const color = data.color ?? '#38bdf8';
  const nodeWidth = width && width >= 280 ? width : 520;
  const nodeHeight = height && height >= 180 ? height : 320;

  const onTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      updateNodeData(id, { title: event.target.value }),
    [id, updateNodeData]
  );

  return (
    <>
      <NodeFloatingToolbar nodeId={id} selected={!!selected} color={color} />
      <div
        className="relative h-full w-full overflow-hidden rounded-md border"
        style={{
          width: nodeWidth,
          height: nodeHeight,
          borderColor: selected ? color : `${color}b3`,
          backgroundColor: `${color}12`,
          boxShadow: selected ? `0 0 0 1px ${color}55` : 'none',
        }}
      >
        <NodeResizer
          isVisible={!!selected}
          minWidth={280}
          minHeight={180}
          color={color}
          lineStyle={{ borderWidth: 1 }}
          handleStyle={{ width: 9, height: 9, borderRadius: 2 }}
          onResizeStart={() => useGraphStore.getState().snapshot()}
        />

        <div
          className="flex h-9 items-center gap-2 border-b px-3"
          style={{ borderColor: `${color}55`, backgroundColor: `${color}20` }}
        >
          <Layers3 size={14} style={{ color }} />
          <input
            className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30"
            style={{ color }}
            value={data.title}
            onChange={onTitleChange}
            onMouseDown={(event) => event.stopPropagation()}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Group name"
            aria-label="Group name"
          />
        </div>
      </div>
    </>
  );
}

export const GroupNode = memo(GroupNodeComponent);
