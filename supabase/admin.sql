-- お口の観察ログ：管理者（健保組合・企業担当者）判定
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run（1回だけ）。
--
-- 設計：admins テーブルに「管理者のメールアドレス」を列挙する。
--   ログインユーザーのメール（JWTのclaim）が admins にあれば管理者とみなす。
--   /admin 配下は middleware が is_admin() で検証する（一般ログインには影響しない）。

-- 1) admins テーブル
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 本人は自分のadmin行のみ参照可（一覧の漏えい防止）
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins
  for select
  using (lower(email) = lower((auth.jwt() ->> 'email')));

-- 2) is_admin(): ログイン本人が管理者かどうかを返す
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower((auth.jwt() ->> 'email'))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- 3) 最初の管理者を登録する（↓のメールを自分の管理者用アドレスに置き換えて実行）
-- insert into public.admins (email) values ('admin@example.com')
--   on conflict (email) do nothing;
