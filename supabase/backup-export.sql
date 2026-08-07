-- データ書き出し（バックアップ）
--
-- 目的：無料プランには自動の巻き戻し機能が無いため、誤操作でデータが消えても
--       戻せるように、定期的に手元へ書き出しておく。
--
-- 手順：Supabase 管理画面 → SQL Editor で下のクエリを1つずつ実行し、
--       結果表の右上「Download CSV」で保存する。
--       保存先は社内の管理された場所に置くこと（個人情報を含むため）。
--
-- 推奨頻度：週1回。配布・イベントの直後は都度。
-- 保管：ファイル名に日付を入れる（例 records_2026-08-07.csv）。

-- ============================================================
-- 1) 観察記録（本体）
-- ============================================================
select
  id,
  user_id,
  org_code,
  measured_at,
  color_value,
  zone,
  created_at
from public.records
order by measured_at, user_id;

-- ============================================================
-- 2) 属性（年齢・性別）
--    ※個人情報を含む。取り扱いに注意し、不要になったら削除する。
-- ============================================================
select
  id,
  age,
  gender,
  created_at,
  updated_at
from public.profiles
order by created_at;

-- ============================================================
-- 3) 団体マスタ（配布IDと団体名の対応＝社外秘）
-- ============================================================
select
  id,
  code,
  name,
  org_type,
  issued_ym,
  note,
  is_active,
  is_demo,
  distributed_count,
  created_at
from public.organizations
order by created_at;

-- ============================================================
-- 4) 管理者一覧
-- ============================================================
select email, created_at from public.admins order by created_at;

-- ============================================================
-- 5) 書き出し前の件数確認（記録しておくと復旧時に照合できる）
-- ============================================================
select
  (select count(*) from public.records)       as records,
  (select count(*) from public.profiles)      as profiles,
  (select count(*) from public.organizations) as organizations,
  (select count(*) from public.admins)        as admins;
