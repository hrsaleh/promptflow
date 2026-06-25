import { useState, useCallback } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { Trash2, ChevronDown } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

const PALETTE: (string | undefined)[] = [
  undefined,   // no color / reset
  '#71717a',   // zinc
  '#34d399',   // emerald
  '#38bdf8',   // sky
  '#818cf8',   // violet
  '#fb7185',   // rose
  '#fbbf24',   // amber
  '#a3e635',   // lime
  '#22d3ee',   // cyan
  '#fb923c',   // orange
];

interface Props {
  nodeId: string;
  selected: boolean;
  color?: string;
}

export function NodeFloatingToolbar({ nodeId, selected, color }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const onDelete = useCallback(() => {
    const { tabs, activeTabId, deleteNodes } = useGraphStore.getState();
    const nodes = tabs.find((t) => t.id === activeTabId)?.nodes ?? [];
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    deleteNodes(selectedIds.length > 0 ? selectedIds : [nodeId]);
  }, [nodeId]);

  const onPickColor = useCallback((c: string | undefined) => {
    const { tabs, activeTabId, updateNodeData } = useGraphStore.getState();
    const nodes = tabs.find((t) => t.id === activeTabId)?.nodes ?? [];
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    const ids = selectedIds.length > 0 ? selectedIds : [nodeId];
    ids.forEach((id) => updateNodeData(id, { color: c }));
    setPickerOpen(false);
  }, [nodeId]);

  return (
    <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
      <div className="flex flex-col items-center gap-1">
        {pickerOpen && (
          <div className="flex gap-1 px-1.5 py-1 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl">
            {PALETTE.map((c, i) =>
              c === undefined ? (
                <button
                  key="none"
                  onClick={() => onPickColor(undefined)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-5 h-5 rounded-full border-2 bg-zinc-700 flex items-center justify-center transition-transform hover:scale-110 ${
                    color === undefined ? 'border-white' : 'border-zinc-600'
                  }`}
                  title="No color"
                >
                  <span className="text-zinc-400 text-[9px] leading-none">✕</span>
                </button>
              ) : (
                <button
                  key={i}
                  onClick={() => onPickColor(c)}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? 'border-white' : 'border-transparent'
                  }`}
                  title={c}
                />
              )
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5 px-1 py-0.5 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl">
          <button
            onClick={onDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
          <div className="w-px h-3.5 bg-zinc-700 mx-0.5" />
          <button
            onClick={() => setPickerOpen((o) => !o)}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Node color"
          >
            <span
              className="w-3 h-3 rounded-full border border-zinc-600"
              style={{ backgroundColor: color ?? '#71717a' }}
            />
            <ChevronDown size={10} className="text-zinc-500" />
          </button>
        </div>
      </div>
    </NodeToolbar>
  );
}
