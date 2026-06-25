import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'prompt' | 'concatenate' | 'output';

export interface PromptNodeData extends Record<string, unknown> {
  title: string;
  content: string;
  linkedPromptId?: string;
}

export interface ConcatNodeData extends Record<string, unknown> {
  inputCount: number;
  delimiter: string;
  cleanWhitespace: boolean;
}

export interface OutputNodeData extends Record<string, unknown> {
  value: string;
  linkedPromptId?: string;
}

export type NodeValueMap = Record<string, string>;

export interface SavedPrompt {
  id: string;
  name: string;
  content: string;
  categoryId: string | null;
  bookmarked: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PromptCategory {
  id: string;
  name: string;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  updatedAt: number;
}
