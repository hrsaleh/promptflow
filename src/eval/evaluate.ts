import type { Node, Edge } from '@xyflow/react';
import type { NodeValueMap, PromptNodeData, ConcatNodeData, OutputNodeData } from '../types';

function topoSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  });

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const sorted: Node[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    adj.get(node.id)?.forEach((target) => {
      const deg = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, deg);
      if (deg === 0) {
        const t = nodes.find((n) => n.id === target);
        if (t) queue.push(t);
      }
    });
  }

  return sorted;
}

function computeNode(node: Node, inputs: Record<string, string>): string {
  switch (node.type) {
    case 'prompt':
      return (node.data as PromptNodeData).content ?? '';

    case 'concatenate': {
      const data = node.data as ConcatNodeData;
      let parts = Object.keys(inputs)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => inputs[k])
        .filter((v) => v != null && v !== '');
      if (data.cleanWhitespace) {
        parts = parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
      }
      return parts.join(data.delimiter ?? ', ');
    }

    case 'output': {
      const connected = Object.values(inputs).filter((v) => v !== '');
      if (connected.length > 0) return connected[0];
      // No upstream wire — pass through the user-edited value
      return (node.data as OutputNodeData).value ?? '';
    }

    default:
      return '';
  }
}

export function evaluate(nodes: Node[], edges: Edge[]): NodeValueMap {
  const sorted = topoSort(nodes, edges);
  const out: NodeValueMap = {};

  for (const node of sorted) {
    const inputs: Record<string, string> = {};
    edges
      .filter((e) => e.target === node.id)
      .forEach((e) => {
        const idx = e.targetHandle?.split('-')[1] ?? '0';
        inputs[idx] = out[e.source] ?? '';
      });
    out[node.id] = computeNode(node, inputs);
  }

  return out;
}

export function hasCycle(source: string, target: string, edges: Edge[]): boolean {
  const visited = new Set<string>();
  const queue = [target];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((e) => e.source === current).forEach((e) => queue.push(e.target));
  }
  return false;
}
