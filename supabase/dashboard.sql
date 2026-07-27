-- 管理ダッシュボード 実データ接続
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
-- 前提：先に supabase/organizations.sql と supabase/admin.sql を実行しておくこと。
--
-- 団体マスタは organizations に一本化する（旧 orgs は作らない）。
-- 記録には配布ID（organizations.code = QRの ?c= の値）を org_code として持たせる。

-- ============================================================
-- 1) records に org_code を追加（null可 → 既存データに影響なし）
--    ※FKは張らない：未知/失効IDでも記録の保存自体は失敗させないため
-- ============================================================
alter table public.records
  add column if not exists org_code text;

create index if not exists records_org_code_idx on public.records (org_code);

-- ============================================================
-- 2) 旧 orgs テーブルが残っていれば撤去（organizations に統合済み）
-- ============================================================
drop view if exists public.admin_measurements;
drop table if exists public.orgs;

-- ============================================================
-- 3) admin_measurements：管理者用の「匿名ビュー」
--    user_id を一切含まない（所属コード・スコア・測定日のみ）＝個人特定不可。
--    where is_admin() により、管理者以外は 0 件しか見えない。
-- ============================================================
create view public.admin_measurements as
select
  r.org_code,
  r.color_value,
  r.measured_at
from public.records r
where public.is_admin();

revoke all on public.admin_measurements from anon;
grant select on public.admin_measurements to authenticated;
