create or replace function public.is_team_admin(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = requested_team_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

drop policy if exists "Authors can update prompts" on public.prompts;
drop policy if exists "Authors can delete prompts" on public.prompts;

create policy "Authors or admins can update prompts"
  on public.prompts for update to authenticated
  using (author_id = auth.uid() or public.is_team_admin(team_id))
  with check (public.is_team_member(team_id));

create policy "Authors or admins can delete prompts"
  on public.prompts for delete to authenticated
  using (author_id = auth.uid() or public.is_team_admin(team_id));

create table if not exists public.workflow_folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  viewport jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  folder_id uuid references public.workflow_folders(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflows_team_id_idx on public.workflows(team_id);
create index if not exists workflows_author_id_idx on public.workflows(author_id);
create index if not exists workflow_folders_team_id_idx on public.workflow_folders(team_id);

drop trigger if exists workflows_touch_updated_at on public.workflows;
create trigger workflows_touch_updated_at
  before update on public.workflows
  for each row execute procedure public.touch_updated_at();

alter table public.workflow_folders enable row level security;
alter table public.workflows enable row level security;

drop policy if exists "Members can view workflow folders" on public.workflow_folders;
drop policy if exists "Members can create workflow folders" on public.workflow_folders;
drop policy if exists "Members can update workflow folders" on public.workflow_folders;
drop policy if exists "Members can delete workflow folders" on public.workflow_folders;

create policy "Members can view workflow folders"
  on public.workflow_folders for select to authenticated
  using (public.is_team_member(team_id));
create policy "Members can create workflow folders"
  on public.workflow_folders for insert to authenticated
  with check (public.is_team_member(team_id));
create policy "Members can update workflow folders"
  on public.workflow_folders for update to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy "Members can delete workflow folders"
  on public.workflow_folders for delete to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "Members can view workflows" on public.workflows;
drop policy if exists "Members can create workflows" on public.workflows;
drop policy if exists "Authors or admins can update workflows" on public.workflows;
drop policy if exists "Authors or admins can delete workflows" on public.workflows;

create policy "Members can view workflows"
  on public.workflows for select to authenticated
  using (public.is_team_member(team_id));
create policy "Members can create workflows"
  on public.workflows for insert to authenticated
  with check (public.is_team_member(team_id) and author_id = auth.uid());
create policy "Authors or admins can update workflows"
  on public.workflows for update to authenticated
  using (author_id = auth.uid() or public.is_team_admin(team_id))
  with check (public.is_team_member(team_id));
create policy "Authors or admins can delete workflows"
  on public.workflows for delete to authenticated
  using (author_id = auth.uid() or public.is_team_admin(team_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workflows'
  ) then
    alter publication supabase_realtime add table public.workflows;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workflow_folders'
  ) then
    alter publication supabase_realtime add table public.workflow_folders;
  end if;
end;
$$;
