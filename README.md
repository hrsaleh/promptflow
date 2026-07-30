# PromptFlow

A visual, node-based prompt composition tool with a shared team prompt library.

## Local development

```bash
npm install
npm run dev
```

## Team collaboration setup

PromptFlow uses Supabase for individual accounts, shared prompts, author colors,
personal bookmarks, and live updates.

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run:
   `supabase/migrations/202607300001_team_collaboration.sql`
3. Copy `.env.example` to `.env.local`.
4. In Supabase Project Settings → API, copy the project URL and publishable
   (anon) key into `.env.local`.
5. Restart `npm run dev`.

The first teammate creates a workspace after signing in. They share the
eight-character workspace code shown in the PromptFlow header. The other four
teammates create their own accounts and join with that code.

### Collaboration behavior

- Everyone in the workspace sees the same prompts and categories.
- Saved workflows and workflow folders are shared with the team.
- Prompt changes appear live without refreshing.
- Each prompt displays its author’s name and assigned color.
- The workspace creator is the admin and can edit or delete any team prompt or workflow.
- Regular members can edit or delete only their own prompts and workflows.
- Bookmarks are personal and appear only in that teammate’s Bookmarks tab.
- Unsaved canvas tabs and automatic canvas recovery remain local to each browser.
