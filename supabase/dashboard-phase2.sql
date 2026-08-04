-- フェーズ2：参加率・継続率
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
-- 既存の dashboard.sql は書き換えない（適用済みのため）。

-- ============================================================
-- (a) 配布枚数（参加率の分母）
-- ============================================================
alter table public.organizations
  add column if not exists distributed_count integer;

comment on column public.organizations.distributed_count is
  '当該団体への配布枚数（参加率の分母）。未設定時は参加率を表示しない。';

-- ============================================================
-- (b) 集計関数：user単位の集約をDB内で完結させ、集約後の数値だけを返す
--
--     ※security definer にしている理由：
--       既存の admin_measurements ビューは security_invoker 指定が無く
--       view owner 権限で動作しており、その流儀に揃える必要があるため。
--       invoker のままだと records の RLS（本人のみ）に阻まれて 0 行になる。
--     ※安全弁として WHERE に is_admin() を入れている。ここを外さない。
--     ※返り値に user_id を含めない。これが匿名性の担保。
-- ============================================================
create or replace function public.admin_org_stats(
  p_org_code text default null,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  org_code      text,
  participants  integer,  -- 実施人数（ユニークユーザー数）
  repeaters     integer,  -- 2回以上記録した人数
  measurements  integer   -- 測定件数
)
language sql
stable
security definer
set search_path = public
as $$
  with per_user as (
    select
      r.org_code,
      r.user_id,
      count(*) as n
    from public.records r
    where public.is_admin()
      and r.org_code is not null
      and (p_org_code is null or r.org_code = p_org_code)
      and (p_from is null or r.measured_at >= p_from)
      and (p_to   is null or r.measured_at <  p_to)
    group by r.org_code, r.user_id
  )
  select
    per_user.org_code,
    count(*)::integer,
    count(*) filter (where per_user.n >= 2)::integer,
    sum(per_user.n)::integer
  from per_user
  group by per_user.org_code;
$$;

revoke all on function public.admin_org_stats(text, timestamptz, timestamptz) from anon;
grant execute on function public.admin_org_stats(text, timestamptz, timestamptz) to authenticated;

-- ============================================================
-- 動作確認：管理者としてログインした状態で実行すること
--   select * from public.admin_org_stats();
-- ============================================================

-- 配布枚数の設定例（実際の枚数に置き換えて実行）
-- update public.organizations set distributed_count = 200 where code = 'bguh7znkqg';
