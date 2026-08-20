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
