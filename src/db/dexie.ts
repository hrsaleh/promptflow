import Dexie, { type Table } from 'dexie';
import type { SavedPrompt, PromptCategory, Workflow, WorkflowFolder } from '../types';

class PromptFlowDB extends Dexie {
  prompts!: Table<SavedPrompt, string>;
  categories!: Table<PromptCategory, string>;
  workflows!: Table<Workflow, string>;
  workflowFolders!: Table<WorkflowFolder, string>;

  constructor() {
    super('promptflow');
    this.version(1).stores({
      prompts: 'id, categoryId, bookmarked, createdAt',
      categories: 'id, order',
    });
    this.version(2).stores({
      prompts: 'id, categoryId, bookmarked, createdAt',
      categories: 'id, order',
      workflows: 'id, updatedAt',
    });
    this.version(3).stores({
      prompts: 'id, categoryId, bookmarked, createdAt',
      categories: 'id, order',
      workflows: 'id, folderId, updatedAt',
      workflowFolders: 'id, order',
    });
  }
}

export const db = new PromptFlowDB();
