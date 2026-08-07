-- 利用者の属性（年齢・性別）
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
--
-- ログイン後に1回だけ入力してもらう。氏名・生年月日・住所は取得しない。
-- RLSにより本人だけが読み書きでき、管理画面には集計値しか出さない。

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  age        smallint check (age between 0 and 120),
  gender     text check (gender in ('male', 'female', 'other', 'na')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 本人の行のみ参照・作成・更新できる
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

grant select, insert, update, delete on public.profiles to authenticated;
