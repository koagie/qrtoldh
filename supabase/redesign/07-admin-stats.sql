-- データモデル再設計 ⑦管理ダッシュボードの集計関数（新スキーマ版）
-- 01〜03 の後に実行する。
--
-- 旧 admin_org_stats / admin_demographics は records / profiles を見ていたため作り直す。
-- どちらも user 単位の集約をDB内で完結させ、集約後の数値だけを返す（app_user_id は返さない）。

-- ============================================================
-- 実施人数・継続人数・測定件数
-- ============================================================
create or replace function public.admin_org_stats(
  p_org_code text default null,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  org_code      text,
  participants  integer,
  repeaters     integer,
  measurements  integer
)
language sql
stable
security definer
set search_path = public
as $$
  with per_user as (
    select
      m.distribution_code as org_code,
      m.app_user_id,
      count(*) as n
    from public.measurements m
    join public.app_users u on u.id = m.app_user_id and u.deleted_at is null
    where public.has_role('admin')
      and m.distribution_code is not null
      and (p_org_code is null or m.distribution_code = p_org_code)
      and (p_from is null or m.measured_on >= p_from)
      and (p_to   is null or m.measured_on <  p_to)
    group by 1, 2
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
-- 年代・性別ごとの集計
-- ============================================================
create or replace function public.admin_demographics(
  p_org_code text default null,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  age_band     text,
  gender       text,
  participants integer,
  measurements integer
)
language sql
stable
security definer
set search_path = public
as $$
  with joined as (
    select
      m.app_user_id,
      public.age_group(u.age) as age_band,
      coalesce(u.gender, 'no_answer') as gender
    from public.measurements m
    join public.app_users u on u.id = m.app_user_id and u.deleted_at is null
    where public.has_role('admin')
      and (p_org_code is null or m.distribution_code = p_org_code)
      and (p_from is null or m.measured_on >= p_from)
      and (p_to   is null or m.measured_on <  p_to)
  )
  select
    joined.age_band,
    joined.gender,
    count(distinct joined.app_user_id)::integer,
    count(*)::integer
  from joined
  group by joined.age_band, joined.gender;
$$;

revoke all on function public.admin_demographics(text, timestamptz, timestamptz) from anon;
grant execute on function public.admin_demographics(text, timestamptz, timestamptz) to authenticated;

-- ============================================================
-- 配布コードから組織を引く（QRで開いたときに使う。組織一覧は露出させない）
-- ============================================================
create or replace function public.resolve_org(p_code text)
returns table (organization_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select d.organization_id
  from public.distributions d
  where d.code = p_code
    and (d.valid_from is null or d.valid_from <= current_date)
    and (d.valid_to   is null or d.valid_to   >= current_date)
  limit 1;
$$;

revoke all on function public.resolve_org(text) from public;
grant execute on function public.resolve_org(text) to anon, authenticated;
