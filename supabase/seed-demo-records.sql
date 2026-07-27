-- デモ株式会社（配布ID: bguh7znkqg）向けの動作確認用データ投入
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。
-- 前提：organizations.sql / admin.sql / dashboard.sql を実行済みであること。
--
-- ⚠️ これは「本物の測定記録」ではありません。ダッシュボードの動作確認・提示用に
--    DBへ投入するテストデータです。実運用前に必ず末尾の「取り消し」で削除してください。
--
-- 仕組み：records は unique(user_id, measured_at) なので「1ユーザー1日1件」。
--        既存の auth.users を使い、ユーザーごとに別の日付を割り当てて投入する。

insert into public.records (user_id, org_code, measured_at, color_value, zone, created_at)
select
  u.id,
  'bguh7znkqg',
  d.day::date,
  v.color_value,
  case
    when v.color_value <= 3 then 'KEEP'
    when v.color_value <= 5 then 'BOOST'
    else 'ACTION'
  end,
  now()
from auth.users u
cross join lateral (
  -- ユーザーごとに過去90日から30日ぶんを均等に選ぶ
  select generate_series(
           current_date - interval '90 days',
           current_date - interval '1 day',
           interval '3 days'
         ) as day
) d
cross join lateral (
  -- 日付から決まる擬似的な色（1〜8）。日が進むにつれ緩やかに散らばる
  select (1 + (abs(hashtext(u.id::text || d.day::text)) % 8))::smallint as color_value
) v
on conflict (user_id, measured_at) do nothing;

-- 投入結果の確認
select org_code, count(*) as 件数, round(avg(color_value), 2) as 平均
from public.records
where org_code = 'bguh7znkqg'
group by org_code;


-- ============================================================
-- 取り消し（テストデータを消す）：下の1行だけを選択して Run
-- ============================================================
-- delete from public.records where org_code = 'bguh7znkqg';
