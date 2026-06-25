import { useEffect } from 'react';
import { Canvas } from './canvas/Canvas';
import { PromptLibrary } from './sidebar/PromptLibrary';
import { useLibraryStore } from './store/libraryStore';

export default function App() {
  const load = useLibraryStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950">
      <header className="flex items-center px-4 h-10 border-b border-zinc-800 shrink-0">
        <span className="text-emerald-400 font-semibold text-sm tracking-wide">PromptFlow</span>
        <span className="ml-3 text-zinc-600 text-xs">
          Double-click canvas to add nodes · Drag handles to connect · Drag from library to place
        </span>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <PromptLibrary />
        <Canvas />
      </div>
    </div>
  );
}
