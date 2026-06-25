import type { NodeTypes } from '@xyflow/react';
import { PromptNode } from './PromptNode';
import { ConcatenateNode } from './ConcatenateNode';
import { OutputNode } from './OutputNode';
import type { PromptNodeData, ConcatNodeData, OutputNodeData } from '../types';

export const nodeTypes: NodeTypes = {
  prompt: PromptNode as NodeTypes[string],
  concatenate: ConcatenateNode as NodeTypes[string],
  output: OutputNode as NodeTypes[string],
};

export const nodeDefaults: Record<string, { data: PromptNodeData | ConcatNodeData | OutputNodeData; label: string; description: string }> = {
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
};

export const nodeList = Object.entries(nodeDefaults).map(([type, def]) => ({
  type,
  label: def.label,
  description: def.description,
}));
