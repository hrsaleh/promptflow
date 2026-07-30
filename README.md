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
- Prompt changes appear live without refreshing.
- Each prompt displays its author’s name and assigned color.
- Only an author can rename, edit, or delete their own saved prompt.
- Bookmarks are personal and appear only in that teammate’s Bookmarks tab.
- Workflows and canvas autosaves remain local to each browser for now.
