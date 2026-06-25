import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { nodeDefaults, nodeList } from '../nodes/registry';

interface Props {
  screenPos: { x: number; y: number };
  getFlowPosition: (type: string, x: number, y: number) => { x: number; y: number };
  onClose: () => void;
}

export function AddNodePalette({ screenPos, getFlowPosition, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addNode = useGraphStore((s) => s.addNode);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = nodeList.filter(
    (n) =>
      n.label.toLowerCase().includes(query.toLowerCase()) ||
      n.description.toLowerCase().includes(query.toLowerCase())
  );

  const selectNode = (type: string) => {
    const position = getFlowPosition(type, screenPos.x, screenPos.y);
    const id = `${type}-${Date.now()}`;
    addNode({
      id,
      type,
      position,
      data: { ...nodeDefaults[type].data },
    });
    onClose();
  };

  // Keep palette on screen
  const style: React.CSSProperties = {
    left: Math.min(screenPos.x, window.innerWidth - 272),
    top: Math.min(screenPos.y, window.innerHeight - 220),
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl w-64 overflow-hidden"
        style={style}
      >
        <div className="p-2 border-b border-zinc-700">
          <input
            ref={inputRef}
            className="w-full bg-zinc-900 text-white text-sm rounded px-3 py-1.5 outline-none border border-zinc-700 focus:border-emerald-500 transition-colors"
            placeholder="Search nodes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) selectNode(filtered[0].type);
            }}
          />
        </div>
        <div className="py-1">
          {filtered.map((n) => (
            <button
              key={n.type}
              className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors"
              onClick={() => selectNode(n.type)}
            >
              <div className="text-white text-sm font-medium">{n.label}</div>
              <div className="text-zinc-500 text-xs">{n.description}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-zinc-500 text-sm">No nodes found</div>
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-zinc-700 text-zinc-600 text-xs">
          Double-click canvas to add nodes
        </div>
      </div>
    </>
  );
}
