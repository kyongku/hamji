create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  career_result_id uuid not null references public.career_results(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_history_result_created
  on public.ai_chat_history (career_result_id, created_at);

create index if not exists idx_ai_chat_history_user_result
  on public.ai_chat_history (user_id, career_result_id);

alter table public.ai_chat_history enable row level security;

drop policy if exists "ai_chat_history_select_own" on public.ai_chat_history;
create policy "ai_chat_history_select_own"
  on public.ai_chat_history
  for select
  using (user_id = auth.uid());

drop policy if exists "ai_chat_history_insert_own" on public.ai_chat_history;
create policy "ai_chat_history_insert_own"
  on public.ai_chat_history
  for insert
  with check (user_id = auth.uid());

drop policy if exists "ai_chat_history_delete_own" on public.ai_chat_history;
create policy "ai_chat_history_delete_own"
  on public.ai_chat_history
  for delete
  using (user_id = auth.uid());
