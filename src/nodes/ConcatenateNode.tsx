import { memo, useCallback, useState } from 'react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { NodeFloatingToolbar } from './NodeFloatingToolbar';
import type { ConcatNodeData } from '../types';

const HEADER_H = 36;
const ROW_H = 28;

interface Props {
  id: string;
  data: ConcatNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

function ConcatenateNodeComponent({ id, data, selected, width, height }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const [collapsed, setCollapsed] = useState(false);
  const handles = Array.from({ length: data.inputCount }, (_, i) => i);

  const onDelimiterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateNodeData(id, { delimiter: e.target.value }),
    [id, updateNodeData]
  );

  const onCleanChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      updateNodeData(id, { cleanWhitespace: e.target.value === 'true' }),
    [id, updateNodeData]
  );

  return (
    <>
    <NodeFloatingToolbar nodeId={id} selected={!!selected} color={data.color} />
    <div
      className="relative flex flex-col overflow-hidden rounded-lg border bg-zinc-800 shadow-xl"
      style={{
        width: width ?? 260,
        height: collapsed ? 'auto' : (height ?? 'auto'),
        minHeight: collapsed ? undefined : HEADER_H + data.inputCount * ROW_H + 82,
        borderColor: selected ? '#34d399' : (data.color ?? '#52525b'),
      }}
    >
      <NodeResizer
        isVisible={!!selected && !collapsed}
        minWidth={240}
        minHeight={HEADER_H + data.inputCount * ROW_H + 82}
        color="#34d399"
        lineStyle={{ borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        onResizeStart={() => useGraphStore.getState().snapshot()}
      />

      {/* Input handles — absolutely positioned; hidden when collapsed */}
      {!collapsed &&
        handles.map((i) => (
          <Handle
            key={`in-${i}`}
            type="target"
            position={Position.Left}
            id={`in-${i}`}
            style={{ top: HEADER_H + i * ROW_H + ROW_H / 2 }}
            title={`Input ${i}`}
          />
        ))}

      {/* When collapsed, single centred input handle */}
      {collapsed && (
        <Handle
          type="target"
          position={Position.Left}
          id="in-0"
          style={{ top: '50%' }}
          title="Input 0"
        />
      )}

      {/* Header */}
      <div
        className="h-9 flex items-center gap-1.5 px-2 border-b border-zinc-700"
        style={data.color ? { backgroundColor: `${data.color}26` } : undefined}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <span className="text-white text-sm font-semibold">Text Concatenate</span>
      </div>

      {!collapsed && (
        <>
          {/* Input label rows */}
          <div className="border-b border-zinc-700">
            {handles.map((i) => (
              <div key={i} className="h-7 flex items-center px-3 pl-5">
                <span className="text-zinc-500 text-xs">in-{i}</span>
              </div>
            ))}
          </div>

          {/* Widgets */}
          <div className="flex-1 space-y-1.5 p-2">
            <div className="flex items-center gap-2">
              <label className="text-zinc-400 text-xs w-14 shrink-0">Delimiter</label>
              <input
                className="flex-1 bg-zinc-900 text-white text-xs rounded px-2 py-1 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                value={data.delimiter}
                onChange={onDelimiterChange}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-zinc-400 text-xs w-14 shrink-0">Clean WS</label>
              <select
                className="flex-1 bg-zinc-900 text-white text-xs rounded px-2 py-1 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
                value={String(data.cleanWhitespace)}
                onChange={onCleanChange}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
        </>
      )}

      <Handle type="source" position={Position.Right} id="output" title="STRING output" />
    </div>
    </>
  );
}

export const ConcatenateNode = memo(ConcatenateNodeComponent);
