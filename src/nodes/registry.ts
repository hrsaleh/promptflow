import type { NodeTypes } from '@xyflow/react';
import { PromptNode } from './PromptNode';
import { ConcatenateNode } from './ConcatenateNode';
import { OutputNode } from './OutputNode';
import { StickyNoteNode } from './StickyNoteNode';
import { GroupNode } from './GroupNode';
import { ImageNode } from './ImageNode';
import type {
  PromptNodeData,
  ConcatNodeData,
  OutputNodeData,
  StickyNoteNodeData,
  GroupNodeData,
  ImageNodeData,
} from '../types';

export const nodeTypes: NodeTypes = {
  prompt: PromptNode as NodeTypes[string],
  concatenate: ConcatenateNode as NodeTypes[string],
  output: OutputNode as NodeTypes[string],
  stickyNote: StickyNoteNode as NodeTypes[string],
  group: GroupNode as NodeTypes[string],
  image: ImageNode as NodeTypes[string],
};

export const nodeDefaults: Record<string, {
  data: PromptNodeData | ConcatNodeData | OutputNodeData | StickyNoteNodeData | GroupNodeData | ImageNodeData;
  label: string;
  description: string;
}> = {
  prompt: {
    label: 'Prompt',
    description: 'Text prompt fragment',
    data: { title: 'Prompt', content: '' } satisfies PromptNodeData,
  },
  concatenate: {
    label: 'Text Concatenate',
    description: 'Combine multiple text inputs',
    data: { inputCount: 1, delimiter: ', ', cleanWhitespace: true } satisfies ConcatNodeData,
  },
  output: {
    label: 'Output',
    description: 'Final combined prompt',
    data: { value: '' } satisfies OutputNodeData,
  },
  stickyNote: {
    label: 'Sticky Note',
    description: 'A colorful note with no wire connections',
    data: { text: '', color: '#fbbf24' } satisfies StickyNoteNodeData,
  },
  image: {
    label: 'Image',
    description: 'A shared, resizable image reference',
    data: { title: 'Image', status: 'empty' } satisfies ImageNodeData,
  },
};

export const nodeList = Object.entries(nodeDefaults).map(([type, def]) => ({
  type,
  label: def.label,
  description: def.description,
}));
