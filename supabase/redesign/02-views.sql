-- データモデル再設計 ②VIEW（3層の出し分け）
-- 01-schema.sql の後に実行する。
--
--  L1 生テーブル              本人・admin      年齢（整数）・測定値
--  L2 v_measurements_research researcher       年代・性別・測定値（メール・年齢なし）
--  L3 v_org_summary           org_viewer       年代別集計のみ（n<5はマスク）

-- ============================================================
-- L2: 研究解析用（研究に同意しているユーザーの行だけが出る）
--     アプリ側でフィルタせず、DBのVIEWで遮断するのが要点。
-- ============================================================
create or replace view public.v_measurements_research as
select
  m.id                                  as measurement_id,
  m.app_user_id                         as subject_id,
  public.age_group(u.age)               as age_group,
  u.gender,
  m.color_value,
  m.scale_version,
  public.zone_of(m.color_value, m.scale_version) as zone,
  m.measured_on,
  m.context,
  d.organization_id
from public.measurements m
join public.app_users u  on u.id = m.app_user_id and u.deleted_at is null
left join public.distributions d on d.code = m.distribution_code
where exists (
  select 1 from public.consents c
  where c.app_user_id = u.id
    and c.purpose = 'research'
    and c.revoked_at is null
);

-- ============================================================
-- L3: B2Bダッシュボード用（k匿名性 n>=5）
-- ============================================================
create or replace view public.v_org_summary as
select
  d.organization_id,
  date_trunc('month', m.measured_on)::date       as month,
  public.age_group(u.age)                        as age_group,
  u.gender,
  public.zone_of(m.color_value, m.scale_version) as zone,
  case when count(*) < 5 then null else count(*) end        as n,
  case when count(*) < 5 then null else round(avg(m.color_value), 2) end as avg_value
from public.measurements m
join public.app_users u  on u.id = m.app_user_id and u.deleted_at is null
join public.distributions d on d.code = m.distribution_code
group by 1, 2, 3, 4, 5;

-- 呼び出したユーザーの権限で評価する（VIEW所有者の権限で素通りさせない）
alter view public.v_measurements_research set (security_invoker = on);
alter view public.v_org_summary           set (security_invoker = on);

grant select on public.v_measurements_research to authenticated;
grant select on public.v_org_summary to authenticated;

-- ============================================================
-- 管理ダッシュボード用（admin）：
--   v_org_summary は組織別の粗い集計なので、現行画面が使っている
--   「配布コード・色番号・測定日」の3項目だけを返す匿名ビューも用意する。
--   user_id は含まない（個人特定不可）。
-- ============================================================
create or replace view public.v_admin_measurements as
select
  m.distribution_code,
  m.color_value,
  m.measured_on,
  m.scale_version,
  public.zone_of(m.color_value, m.scale_version) as zone
from public.measurements m
join public.app_users u on u.id = m.app_user_id and u.deleted_at is null
where public.has_role('admin');

alter view public.v_admin_measurements set (security_invoker = on);
grant select on public.v_admin_measurements to authenticated;
