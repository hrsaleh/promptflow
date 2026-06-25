import { useEffect, useState } from 'react';
import { BookOpen, GitBranch } from 'lucide-react';
import { Canvas } from './canvas/Canvas';
import { PromptLibrary } from './sidebar/PromptLibrary';
import { WorkflowLibrary } from './sidebar/WorkflowLibrary';
import { useLibraryStore } from './store/libraryStore';
import { useWorkflowLibraryStore } from './store/workflowLibraryStore';

type Section = 'prompts' | 'workflows';

const NAV_ITEMS: { section: Section; icon: React.ReactNode; label: string }[] = [
  { section: 'prompts', icon: <BookOpen size={16} />, label: 'Prompts' },
  { section: 'workflows', icon: <GitBranch size={16} />, label: 'Flows' },
];

function NavRail({ section, onSelect }: { section: Section; onSelect: (s: Section) => void }) {
  return (
    <nav className="w-11 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-2 gap-0.5">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.section}
          onClick={() => onSelect(item.section)}
          className={`w-9 flex flex-col items-center gap-0.5 py-2 rounded-md transition-colors ${
            section === item.section
              ? 'bg-zinc-800 text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
          title={item.label}
        >
          {item.icon}
          <span className="text-[9px] font-medium leading-tight">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const load = useLibraryStore((s) => s.load);
  const loadWorkflows = useWorkflowLibraryStore((s) => s.load);
  const [section, setSection] = useState<Section>('prompts');

  useEffect(() => {
    load();
    loadWorkflows();
  }, [load, loadWorkflows]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950">
      <header className="flex items-center px-4 h-10 border-b border-zinc-800 shrink-0">
        <span className="text-emerald-400 font-semibold text-sm tracking-wide">PromptFlow</span>
        <span className="ml-3 text-zinc-600 text-xs">
          Double-click canvas to add nodes · Drag handles to connect · Drag from library to place
        </span>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <NavRail section={section} onSelect={setSection} />
        {section === 'prompts' ? <PromptLibrary /> : <WorkflowLibrary />}
        <Canvas />
      </div>
    </div>
  );
}
