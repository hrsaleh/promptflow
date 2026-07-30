create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  color text not null default '#34d399',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8)),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  content text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_bookmarks (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, user_id)
);

create index prompts_team_id_idx on public.prompts(team_id);
create index prompts_author_id_idx on public.prompts(author_id);
create index categories_team_id_idx on public.categories(team_id);
create index team_members_user_id_idx on public.team_members(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, color)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'color', ''), '#34d399')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prompts_touch_updated_at
  before update on public.prompts
  for each row execute procedure public.touch_updated_at();

create or replace function public.is_team_member(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = requested_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.create_team(team_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_team_id uuid;
  default_names text[] := array[
    'Identity', 'Pose', 'Wardrobe', 'Scene',
    'Lighting', 'Camera', 'Color / Grade', 'Negatives'
  ];
  category_name text;
  category_order integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid()) then
    raise exception 'You already belong to a workspace';
  end if;

  insert into public.teams (name, created_by)
  values (trim(team_name), auth.uid())
  returning id into new_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (new_team_id, auth.uid(), 'owner');

  foreach category_name in array default_names loop
    insert into public.categories (team_id, name, sort_order)
    values (new_team_id, category_name, category_order);
    category_order := category_order + 1;
  end loop;

  return new_team_id;
end;
$$;

create or replace function public.join_team_by_code(requested_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_team_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid()) then
    raise exception 'You already belong to a workspace';
  end if;

  select id into requested_team_id
  from public.teams
  where join_code = upper(trim(requested_code));

  if requested_team_id is null then raise exception 'Workspace code not found'; end if;

  insert into public.team_members (team_id, user_id)
  values (requested_team_id, auth.uid());

  return requested_team_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.categories enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_bookmarks enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated using (true);
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can view their team"
  on public.teams for select to authenticated using (public.is_team_member(id));
create policy "Members can view team membership"
  on public.team_members for select to authenticated using (public.is_team_member(team_id));

create policy "Members can view categories"
  on public.categories for select to authenticated using (public.is_team_member(team_id));
create policy "Members can create categories"
  on public.categories for insert to authenticated with check (public.is_team_member(team_id));
create policy "Members can update categories"
  on public.categories for update to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy "Members can delete categories"
  on public.categories for delete to authenticated using (public.is_team_member(team_id));

create policy "Members can view prompts"
  on public.prompts for select to authenticated using (public.is_team_member(team_id));
create policy "Members can create prompts"
  on public.prompts for insert to authenticated
  with check (public.is_team_member(team_id) and author_id = auth.uid());
create policy "Authors can update prompts"
  on public.prompts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_team_member(team_id));
create policy "Authors can delete prompts"
  on public.prompts for delete to authenticated using (author_id = auth.uid());

create policy "Users can view their bookmarks"
  on public.prompt_bookmarks for select to authenticated using (user_id = auth.uid());
create policy "Users can add their bookmarks"
  on public.prompt_bookmarks for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prompts
      where prompts.id = prompt_id and public.is_team_member(prompts.team_id)
    )
  );
create policy "Users can remove their bookmarks"
  on public.prompt_bookmarks for delete to authenticated using (user_id = auth.uid());

grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team_by_code(text) to authenticated;

alter publication supabase_realtime add table public.prompts;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.prompt_bookmarks;
