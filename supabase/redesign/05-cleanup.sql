-- データモデル再設計 ⑤旧テーブルの退避（最後・手動）
--
-- ⚠️ 04-migration.sql の件数確認が一致し、アプリの新しい版をデプロイして
--    動作を確かめてから実行すること。すぐ消さず、リネームして残す。
--
-- 実行すると、旧テーブルを参照していた古いVIEWや関数は動かなくなる。
-- 新しいアプリは v_admin_measurements / measurements を見るので影響しない。

-- 旧いVIEW・関数を外す（新設計の v_admin_measurements などに置き換わっている）
drop view if exists public.admin_measurements;
drop function if exists public.admin_org_stats(text, timestamptz, timestamptz);
drop function if exists public.admin_demographics(text, timestamptz, timestamptz);
drop function if exists public.resolve_org(text);
drop function if exists public.delete_my_account();

-- 旧テーブルをリネームして退避（削除はしない）
alter table if exists public.records  rename to records_legacy;
alter table if exists public.profiles rename to profiles_legacy;
alter table if exists public.admins   rename to admins_legacy;
-- organizations_legacy は 01-schema.sql の時点でリネーム済み

-- 退避したテーブルは、しばらく様子を見てから削除する
--   drop table public.records_legacy;
--   drop table public.profiles_legacy;
--   drop table public.admins_legacy;
--   drop table public.organizations_legacy;
