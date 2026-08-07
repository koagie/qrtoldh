-- 同意の記録と、年代・性別の集計
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
-- 前提：profiles.sql / admin.sql / dashboard.sql を適用済みであること。

-- ============================================================
-- 1) 同意した日時を記録する（いつ・どの版に同意したか）
-- ============================================================
alter table public.profiles
  add column if not exists policy_agreed_at timestamptz;

alter table public.profiles
  add column if not exists policy_version text;

comment on column public.profiles.policy_agreed_at is
  'プライバシーポリシーに同意した日時。';
comment on column public.profiles.policy_version is
  '同意した時点のプライバシーポリシーの版（改定時に再同意を求める判断に使う）。';

-- ============================================================
-- 2) 年代・性別の集計
--    records と profiles を突き合わせるが、返すのは集計後の数値のみ。
--    user_id は返さない（個人特定不可）。
--    security definer の理由は admin_org_stats と同じ（既存ビューの流儀に合わせる）。
-- ============================================================
create or replace function public.admin_demographics(
  p_org_code text default null,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  age_band     text,
  gender       text,
  participants integer,  -- 実施人数（ユニークユーザー数）
  measurements integer   -- 測定件数
)
language sql
stable
security definer
set search_path = public
as $$
  with joined as (
    select
      r.user_id,
      case
        when p.age is null   then '未回答'
        when p.age < 10      then '10歳未満'
        when p.age >= 70     then '70代以上'
        else (floor(p.age / 10) * 10)::text || '代'
      end as age_band,
      coalesce(p.gender, 'na') as gender
    from public.records r
    join public.profiles p on p.id = r.user_id
    where public.is_admin()
      and (p_org_code is null or r.org_code = p_org_code)
      and (p_from is null or r.measured_at >= p_from)
      and (p_to   is null or r.measured_at <  p_to)
  )
  select
    joined.age_band,
    joined.gender,
    count(distinct joined.user_id)::integer,
    count(*)::integer
  from joined
  group by joined.age_band, joined.gender;
$$;

revoke all on function public.admin_demographics(text, timestamptz, timestamptz) from anon;
grant execute on function public.admin_demographics(text, timestamptz, timestamptz) to authenticated;

-- 動作確認（管理者としてログインした状態で）
--   select * from public.admin_demographics();
