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
