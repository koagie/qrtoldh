-- ============================================================================
-- データモデル再設計 一括適用
--
-- Supabase 管理画面 → SQL Editor → New query に貼って Run。
-- 01→02→03→04→06→07→08 を順につなげたもの。何度実行してもよい。
--
-- ⚠️ 旧テーブル（records / profiles / admins）は消さない。
--    動作確認が済んでから 05-cleanup.sql で退避する。
--
-- 最後に2つの表が出る：
--   1つ目 … 移行の件数（旧と新が一致するか）
--   2つ目 … デモ用データの件数
-- ============================================================================



-- ████████████████ 01-schema.sql ████████████████

-- データモデル再設計 ①スキーマ
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
--
-- ⚠️ 実行前に必ずバックアップ（supabase/backup-export.sql）を取ること。
-- ⚠️ 01 → 02 → 03 → 04 の順に実行すること。
--
-- 現行との違いで注意した点：
--  ・organizations は既に別の形（配布コードを含む）で存在するため、
--    旧テーブルを organizations_legacy にリネームしてから新しい形で作り直す。
--  ・ゾーン名称は PLUS で確定（カラーチャート改訂案B・DB移行済み。仕様書13-1）。

-- ============================================================
-- 0) 旧 organizations を退避（配布コードを持つ旧い形のときだけ）
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'code'
  ) then
    alter table public.organizations rename to organizations_legacy;
  end if;
end $$;

-- ============================================================
-- 4-1. 組織と配布コード
-- ============================================================
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  org_type    text not null check (org_type in
              ('municipality','kenpo','corporate','dental','event','academic','internal')),
  created_at  timestamptz not null default now()
);

create table if not exists public.distributions (
  code                text primary key
                      check (code ~ '^[2-9a-hj-km-np-z]{10}$'),
  organization_id     uuid not null references public.organizations(id),
  purpose             text not null check (purpose in
                      ('research','health_business','general')),
  label               text,
  distributed_count   integer check (distributed_count >= 0),
  valid_from          date,
  valid_to            date,
  created_at          timestamptz not null default now()
);

create index if not exists idx_distributions_org
  on public.distributions (organization_id);

-- ============================================================
-- 4-2. ユーザーと外部ID
--   メールアドレスは auth.users にのみ置き、app_users に複製しない（原則5）
-- ============================================================
create table if not exists public.app_users (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  age            smallint check (age between 6 and 120),
  gender         text check (gender in ('male','female','other','no_answer')),
  entry_code     text references public.distributions(code),
  registered_at  timestamptz not null default now(),
  deleted_at     timestamptz
);

create index if not exists idx_app_users_auth on public.app_users (auth_user_id);
create index if not exists idx_app_users_entry on public.app_users (entry_code);

create table if not exists public.external_identities (
  id            uuid primary key default gen_random_uuid(),
  app_user_id   uuid not null references public.app_users(id) on delete cascade,
  provider      text not null check (provider in
                ('supabase_email','dempre','jpki','kenpo','other')),
  external_id   text not null,
  linked_at     timestamptz not null default now(),
  unique (provider, external_id)
);

create index if not exists idx_ext_identities_user
  on public.external_identities (app_user_id);

-- ============================================================
-- 4-3. 同意（目的別・版別。フラグではなくレコードで持つ）
-- ============================================================
create table if not exists public.consent_documents (
  id              uuid primary key default gen_random_uuid(),
  purpose         text not null check (purpose in
                  ('terms','privacy','research','health_business','external_link')),
  version         text not null,
  body            text not null,
  effective_from  timestamptz not null default now(),
  unique (purpose, version)
);

create table if not exists public.consents (
  id                    uuid primary key default gen_random_uuid(),
  app_user_id           uuid not null references public.app_users(id) on delete cascade,
  consent_document_id   uuid not null references public.consent_documents(id),
  purpose               text not null,
  version               text not null,
  granted_at            timestamptz not null default now(),
  revoked_at            timestamptz
);

create index if not exists idx_consents_user_purpose
  on public.consents (app_user_id, purpose) where revoked_at is null;

-- ============================================================
-- 4-4. カラーチャートの版と測定
--   zone は保存しない。色→ゾーンの対応は scale_versions だけが持つ。
-- ============================================================
create table if not exists public.scale_versions (
  version      text primary key,
  zone_labels  jsonb not null,
  description  text,
  created_at   timestamptz not null default now()
);

-- ゾーン名称は PLUS（仕様書13-1の確定事項）。
-- 範囲（1-3 / 4-5 / 6-8）は BOOST 時代から変わっていないため、版は分けない。
insert into public.scale_versions (version, zone_labels, description)
values (
  'v5',
  '[{"zone":"KEEP","min":1,"max":3},
    {"zone":"PLUS","min":4,"max":5},
    {"zone":"ACTION","min":6,"max":8}]'::jsonb,
  'カラーチャート改訂案B（たもつ／ふやす／みなおす）。A6結果票 ver5 相当'
)
on conflict (version) do nothing;

create table if not exists public.measurements (
  id                 uuid primary key default gen_random_uuid(),
  app_user_id        uuid not null references public.app_users(id) on delete cascade,
  measured_on        date not null,
  recorded_at        timestamptz not null default now(),
  color_value        smallint not null check (color_value between 1 and 8),
  scale_version      text not null default 'v5' references public.scale_versions(version),
  distribution_code  text references public.distributions(code),
  context            text not null default 'self'
                     check (context in ('self','event','clinic')),
  unique (app_user_id, measured_on, context)
);

create index if not exists idx_measurements_user
  on public.measurements (app_user_id, measured_on desc);
create index if not exists idx_measurements_dist
  on public.measurements (distribution_code);

-- ============================================================
-- 4-5. 権限と監査
-- ============================================================
create table if not exists public.staff_roles (
  auth_user_id     uuid primary key references auth.users(id) on delete cascade,
  role             text not null check (role in ('admin','researcher','org_viewer')),
  organization_id  uuid references public.organizations(id),
  created_at       timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id               bigserial primary key,
  actor_auth_id    uuid,
  actor_role       text,
  action           text not null,
  target           text,
  organization_id  uuid references public.organizations(id),
  occurred_at      timestamptz not null default now(),
  detail           jsonb
);

create index if not exists idx_audit_time on public.audit_logs (occurred_at desc);

-- ============================================================
-- 4-6. 補助関数
-- ============================================================
create or replace function public.current_app_user_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.app_users
  where auth_user_id = auth.uid() and deleted_at is null
  limit 1;
$$;

create or replace function public.has_role(target_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_roles
    where auth_user_id = auth.uid() and role = target_role
  );
$$;

create or replace function public.viewer_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.staff_roles
  where auth_user_id = auth.uid() and role = 'org_viewer'
  limit 1;
$$;

create or replace function public.age_group(a smallint)
returns text language sql immutable as $$
  select case
    when a is null   then '不明'
    when a < 20      then '10代以下'
    when a < 30      then '20代'
    when a < 40      then '30代'
    when a < 50      then '40代'
    when a < 60      then '50代'
    when a < 70      then '60代'
    when a < 80      then '70代'
    else '80代以上'
  end;
$$;

create or replace function public.zone_of(v smallint, sv text)
returns text language sql stable as $$
  select z->>'zone'
  from public.scale_versions s,
       jsonb_array_elements(s.zone_labels) z
  where s.version = sv
    and v between (z->>'min')::int and (z->>'max')::int
  limit 1;
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.viewer_org_id() to authenticated;
grant execute on function public.age_group(smallint) to authenticated;
grant execute on function public.zone_of(smallint, text) to authenticated;

-- 旧 is_admin() は staff_roles を見るように差し替える（移行中も既存画面が動くように）
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin');
$$;


-- ████████████████ 02-views.sql ████████████████

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


-- ████████████████ 03-rls.sql ████████████████

-- データモデル再設計 ③RLS（行レベルセキュリティ）
-- 02-views.sql の後に実行する。

alter table public.app_users           enable row level security;
alter table public.measurements        enable row level security;
alter table public.consents            enable row level security;
alter table public.consent_documents   enable row level security;
alter table public.external_identities enable row level security;
alter table public.distributions       enable row level security;
alter table public.organizations       enable row level security;
alter table public.staff_roles         enable row level security;
alter table public.audit_logs          enable row level security;

-- ── app_users：本人のみ読み書き／adminは全件読み取り ──
drop policy if exists app_users_self on public.app_users;
create policy app_users_self on public.app_users
  for all using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists app_users_admin_read on public.app_users;
create policy app_users_admin_read on public.app_users
  for select using (public.has_role('admin'));

-- ── measurements：本人のみ読み書き／adminは全件読み取り ──
drop policy if exists measurements_self on public.measurements;
create policy measurements_self on public.measurements
  for all using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

drop policy if exists measurements_admin_read on public.measurements;
create policy measurements_admin_read on public.measurements
  for select using (public.has_role('admin'));

-- ── consents：本人が作成・参照。撤回はUPDATEのみ（DELETEは許可しない） ──
drop policy if exists consents_self_select on public.consents;
create policy consents_self_select on public.consents
  for select using (app_user_id = public.current_app_user_id()
                    or public.has_role('admin'));

drop policy if exists consents_self_insert on public.consents;
create policy consents_self_insert on public.consents
  for insert with check (app_user_id = public.current_app_user_id());

drop policy if exists consents_self_revoke on public.consents;
create policy consents_self_revoke on public.consents
  for update using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

-- ── consent_documents：ログイン済みは本文を参照できる（同意画面に全文を出すため） ──
drop policy if exists consent_docs_read on public.consent_documents;
create policy consent_docs_read on public.consent_documents
  for select using (auth.uid() is not null);

drop policy if exists consent_docs_write on public.consent_documents;
create policy consent_docs_write on public.consent_documents
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ── external_identities：本人とadmin ──
drop policy if exists ext_self on public.external_identities;
create policy ext_self on public.external_identities
  for all using (app_user_id = public.current_app_user_id()
                 or public.has_role('admin'));

-- ── organizations / distributions：ログイン済みは参照のみ、更新はadmin ──
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations
  for select using (auth.uid() is not null);

drop policy if exists org_write on public.organizations;
create policy org_write on public.organizations
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists dist_read on public.distributions;
create policy dist_read on public.distributions
  for select using (auth.uid() is not null);

drop policy if exists dist_write on public.distributions;
create policy dist_write on public.distributions
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ── staff_roles：adminのみ ──
drop policy if exists staff_admin on public.staff_roles;
create policy staff_admin on public.staff_roles
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- 本人が自分の権限を確認できる（管理画面のログイン後の振り分けに使う）
drop policy if exists staff_self_read on public.staff_roles;
create policy staff_self_read on public.staff_roles
  for select using (auth_user_id = auth.uid());

-- ── audit_logs：adminのみ読み取り。書き込みはサーバー側(service_role)から ──
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select using (public.has_role('admin'));

grant select, insert, update, delete on public.app_users to authenticated;
grant select, insert, update, delete on public.measurements to authenticated;
grant select, insert, update on public.consents to authenticated;
grant select on public.consent_documents to authenticated;
grant select, insert, update, delete on public.external_identities to authenticated;
grant select on public.organizations to authenticated;
grant select on public.distributions to authenticated;
grant select on public.staff_roles to authenticated;


-- ████████████████ 04-migration.sql ████████████████

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


-- ████████████████ 06-account-delete.sql ████████████████

-- データモデル再設計 ⑥退会（本人による削除）
-- 01〜03 の後に実行する。
--
-- 仕様書8：退会は app_users.deleted_at を設定 → 別途バッチで物理削除。auth.users も削除。
-- ここでは「本人がアプリから退会する」操作を1つの関数にまとめる。
--   ・app_users に deleted_at を立てる（同意の記録は残す＝撤回の証跡）
--   ・測定値を消す
--   ・auth.users を削除する（ログイン用メールアドレスが消える）

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_app_user uuid;
  v_auth_user uuid := auth.uid();
begin
  if v_auth_user is null then
    raise exception 'not authenticated';
  end if;

  select id into v_app_user from public.app_users where auth_user_id = v_auth_user;

  if v_app_user is not null then
    -- 退会日時を記録（物理削除までの猶予。推奨30日）
    update public.app_users set deleted_at = now() where id = v_app_user;
    -- 測定値は即時に消す
    delete from public.measurements where app_user_id = v_app_user;
  end if;

  -- ログイン用メールアドレスを含むアカウントを削除
  -- （app_users.auth_user_id は on delete set null なので行は残る）
  delete from auth.users where id = v_auth_user;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- 物理削除バッチ（猶予30日を過ぎた退会者を消す）
--   運用が固まるまでは手動で実行してよい。
-- ============================================================
-- delete from public.app_users
-- where deleted_at is not null and deleted_at < now() - interval '30 days';


-- ████████████████ 07-admin-stats.sql ████████████████

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


-- ████████████████ 08-seed-demo.sql ████████████████

-- データモデル再設計 ⑧デモ用データの作成
-- 04-migration.sql の後に実行する。
--
-- 移行で引き継げなかった場合に備えて、見せるためのデータをここで作り直す。
-- 何度実行しても二重に入らない。
--
-- 作るもの：
--   ・デモ用の団体と配布コード
--   ・デモ用アカウント（demo@example.com）の app_users 行
--   ・7月の測定値10件（色4→1へなだらかに変化。説明用に見やすい並び）

-- ============================================================
-- 1) 管理者が1人もいなければ、既存の admins から復元を試みる
--    （04 を飛ばした場合の保険。admins が無ければ何もしない）
-- ============================================================
do $$
begin
  if not exists (select 1 from public.staff_roles where role = 'admin')
     and to_regclass('public.admins') is not null then
    execute $q$
      insert into public.staff_roles (auth_user_id, role)
      select au.id, 'admin'
      from public.admins a
      join auth.users au on lower(au.email) = lower(a.email)
      on conflict (auth_user_id) do nothing
    $q$;
  end if;
end $$;

-- ============================================================
-- 2) デモ用の団体と配布コード
-- ============================================================
insert into public.organizations (id, name, org_type)
values ('11111111-1111-4111-8111-111111111111', 'デモ株式会社', 'corporate')
on conflict (id) do nothing;

insert into public.distributions
  (code, organization_id, purpose, label, distributed_count)
values
  ('bguh7znkqg', '11111111-1111-4111-8111-111111111111', 'general', '説明用', 50)
on conflict (code) do nothing;

-- ============================================================
-- 3) デモ用アカウントの app_users 行
--    アプリ側もログイン時に作るが、先に作って属性を入れておく
-- ============================================================
insert into public.app_users (auth_user_id, age, gender, entry_code)
select au.id, 42, 'female', 'bguh7znkqg'
from auth.users au
where lower(au.email) = 'demo@example.com'
on conflict (auth_user_id) do update
  set age        = coalesce(public.app_users.age, excluded.age),
      gender     = coalesce(public.app_users.gender, excluded.gender),
      entry_code = coalesce(public.app_users.entry_code, excluded.entry_code);

-- ============================================================
-- 4) 7月の測定値（4→1 へなだらかに）
-- ============================================================
insert into public.measurements
  (app_user_id, measured_on, color_value, scale_version, distribution_code, context)
select u.id, d.measured_on, d.color_value, 'v5', 'bguh7znkqg', 'self'
from public.app_users u
join auth.users au on au.id = u.auth_user_id and lower(au.email) = 'demo@example.com'
cross join (values
  (date '2026-07-01', 4), (date '2026-07-04', 4),
  (date '2026-07-08', 3), (date '2026-07-11', 3), (date '2026-07-15', 3),
  (date '2026-07-18', 2), (date '2026-07-22', 2), (date '2026-07-25', 2),
  (date '2026-07-29', 1), (date '2026-07-31', 1)
) as d(measured_on, color_value)
on conflict (app_user_id, measured_on, context) do update
  set color_value = excluded.color_value;

-- ============================================================
-- 確認
-- ============================================================
select
  (select count(*) from public.staff_roles where role = 'admin')  as 管理者,
  (select count(*) from public.organizations)                     as 団体,
  (select count(*) from public.distributions)                     as 配布コード,
  (select count(*) from public.app_users)                         as 利用者,
  (select count(*) from public.measurements)                      as 測定値;
