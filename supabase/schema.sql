-- お口の観察ログ 第2段：records テーブル＋RLS
-- 実行手順：Supabase 管理画面 → SQL Editor → New query にこの内容を貼り付けて Run。
-- （冪等に書いてあるので、何度実行しても安全です）

-- 1) テーブル
create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  org_id      uuid,                                   -- 第3段（企業集計）用。今は null
  measured_at date not null,                          -- 測定日（1ユーザー1日1件）
  color_value smallint not null check (color_value between 1 and 8),
  zone        text not null check (zone in ('KEEP', 'BOOST', 'ACTION')),
  created_at  timestamptz not null default now(),
  unique (user_id, measured_at)                       -- 同一ユーザー・同一日は1件（上書き用）
);

-- 2) 行レベルセキュリティを有効化
alter table public.records enable row level security;

-- 3) ポリシー：本人（auth.uid() = user_id）だけ読み書きできる
drop policy if exists "records_select_own" on public.records;
create policy "records_select_own"
  on public.records for select
  using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own"
  on public.records for insert
  with check (auth.uid() = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own"
  on public.records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "records_delete_own" on public.records;
create policy "records_delete_own"
  on public.records for delete
  using (auth.uid() = user_id);
