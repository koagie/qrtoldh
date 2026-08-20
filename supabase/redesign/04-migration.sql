-- データモデル再設計 ④既存データの移行
-- 03-rls.sql の後に実行する。
--
-- ⚠️ 実行前に必ずバックアップ（supabase/backup-export.sql）を取ること。
--
-- 仕様書の手順に、現行にしか無いもの（profiles / admins / records.org_code）を足している。
-- 何度実行しても二重に入らないようにしてある。

begin;

-- ============================================================
-- 1) 旧 organizations（配布コードを含む形）を
--    organizations（団体）と distributions（配布コード）に分割
-- ============================================================
-- 団体種別の読み替え：
--   corp→corporate / muni→municipality / clinic→dental / event→event
--   kenpo→kenpo / kokuho→kenpo（国保組合も保険者のため）/ other→internal
insert into public.organizations (id, name, org_type, created_at)
select
  l.id,
  l.name,
  case l.org_type
    when 'corp'   then 'corporate'
    when 'muni'   then 'municipality'
    when 'clinic' then 'dental'
    when 'kenpo'  then 'kenpo'
    when 'kokuho' then 'kenpo'
    when 'event'  then 'event'
    else 'internal'
  end,
  l.created_at
from public.organizations_legacy l
on conflict (id) do nothing;

insert into public.distributions
  (code, organization_id, purpose, label, distributed_count, created_at)
select
  l.code,
  l.id,
  'general',
  nullif(concat_ws(' / ', nullif(l.issued_ym, ''), nullif(l.note, '')), ''),
  l.distributed_count,
  l.created_at
from public.organizations_legacy l
where l.code ~ '^[2-9a-hj-km-np-z]{10}$'   -- 新しい書式に合う配布コードだけ移す
on conflict (code) do nothing;

-- ============================================================
-- 2) 利用者を app_users へ
--    記録がある人と、属性だけ登録した人の両方を拾う
-- ============================================================
insert into public.app_users (auth_user_id, registered_at)
select x.uid, min(x.ts)
from (
  select r.user_id as uid, r.created_at as ts from public.records r where r.user_id is not null
  union all
  select p.id as uid, p.created_at as ts from public.profiles p
) x
group by x.uid
on conflict (auth_user_id) do nothing;

-- 年齢・性別を移す（'na' は新しい表記 'no_answer' に読み替え）
update public.app_users u
set age    = p.age,
    gender = case p.gender when 'na' then 'no_answer' else p.gender end
from public.profiles p
where p.id = u.auth_user_id
  and (u.age is null and u.gender is null);

-- 最初に読み取った配布コードを entry_code に入れる
update public.app_users u
set entry_code = s.code
from (
  select r.user_id, min(r.org_code) as code
  from public.records r
  where r.org_code is not null
    and exists (select 1 from public.distributions d where d.code = r.org_code)
  group by r.user_id
) s
where s.user_id = u.auth_user_id
  and u.entry_code is null;

-- ============================================================
-- 3) 認証プロバイダを external_identities に記録
-- ============================================================
insert into public.external_identities (app_user_id, provider, external_id, linked_at)
select u.id, 'supabase_email', u.auth_user_id::text, u.registered_at
from public.app_users u
where u.auth_user_id is not null
on conflict (provider, external_id) do nothing;

-- ============================================================
-- 4) 管理者を staff_roles へ（admins はメールアドレスで持っていた）
-- ============================================================
insert into public.staff_roles (auth_user_id, role)
select au.id, 'admin'
from public.admins a
join auth.users au on lower(au.email) = lower(a.email)
on conflict (auth_user_id) do nothing;

-- ============================================================
-- 5) 同意を consents へ
--    現行は profiles.policy_agreed_at / policy_version に1つだけ持っていた。
--    プライバシーポリシーへの同意として移す（本文は当時の版を記録）。
-- ============================================================
insert into public.consent_documents (purpose, version, body, effective_from)
select 'privacy', p.policy_version,
       '（移行時に作成した記録用の版。本文は当時アプリに掲示していたプライバシーポリシー）',
       min(p.policy_agreed_at)
from public.profiles p
where p.policy_version is not null and p.policy_agreed_at is not null
group by p.policy_version
on conflict (purpose, version) do nothing;

insert into public.consents
  (app_user_id, consent_document_id, purpose, version, granted_at)
select u.id, cd.id, 'privacy', p.policy_version, p.policy_agreed_at
from public.profiles p
join public.app_users u on u.auth_user_id = p.id
join public.consent_documents cd
  on cd.purpose = 'privacy' and cd.version = p.policy_version
where p.policy_agreed_at is not null
  and not exists (
    select 1 from public.consents c
    where c.app_user_id = u.id and c.purpose = 'privacy' and c.version = p.policy_version
  );

-- ============================================================
-- 6) 測定値を measurements へ
--    zone は捨てる（scale_versions から導出する）。配布コードも引き継ぐ。
-- ============================================================
insert into public.measurements
  (app_user_id, measured_on, recorded_at, color_value, scale_version, distribution_code, context)
select
  u.id,
  r.measured_at,
  r.created_at,
  r.color_value,
  'v5',
  case when exists (select 1 from public.distributions d where d.code = r.org_code)
       then r.org_code else null end,
  'self'
from public.records r
join public.app_users u on u.auth_user_id = r.user_id
on conflict (app_user_id, measured_on, context) do nothing;

commit;

-- ============================================================
-- 移行後の確認：左右の件数が一致すること
-- ============================================================
select
  (select count(*) from public.records)                 as old_records,
  (select count(*) from public.measurements)            as new_measurements,
  (select count(distinct user_id) from public.records)  as old_users,
  (select count(*) from public.app_users)               as new_users,
  (select count(*) from public.admins)                  as old_admins,
  (select count(*) from public.staff_roles)             as new_staff,
  (select count(*) from public.organizations_legacy)    as old_orgs,
  (select count(*) from public.organizations)           as new_orgs,
  (select count(*) from public.distributions)           as new_distributions;
