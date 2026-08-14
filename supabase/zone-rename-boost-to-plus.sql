-- zone の値を BOOST → PLUS に移行する（カラーチャート改訂案Bの区分記号に合わせる）
--
-- ⚠️ 実行順が大切です。順番を守れば、記録が保存できない瞬間が発生しません。
--
--   ステップ1（このSQLの上半分）を実行
--        ↓
--   アプリを新しい版にデプロイ
--        ↓
--   ステップ2（このSQLの下半分）を実行
--
-- 先にステップ2まで実行すると、まだ BOOST を書き込む古い版のアプリで保存が失敗します。

-- ============================================================
-- ステップ1：制約をゆるめて、BOOST と PLUS の両方を受け付ける
--            （デプロイ前に実行する）
-- ============================================================
do $$
declare
  c text;
begin
  -- zone に付いている check 制約の名前を調べて外す
  select con.conname into c
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where ns.nspname = 'public'
    and rel.relname = 'records'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%zone%';
  if c is not null then
    execute format('alter table public.records drop constraint %I', c);
  end if;
end $$;

alter table public.records
  add constraint records_zone_check
  check (zone in ('KEEP', 'BOOST', 'PLUS', 'ACTION'));

-- ここまで実行したら、アプリをデプロイしてください。


-- ============================================================
-- ステップ2：既存の BOOST を PLUS に置き換え、制約を締め直す
--            （デプロイ後に、下の行を選択して実行する）
-- ============================================================
-- update public.records set zone = 'PLUS' where zone = 'BOOST';
--
-- alter table public.records drop constraint records_zone_check;
-- alter table public.records
--   add constraint records_zone_check
--   check (zone in ('KEEP', 'PLUS', 'ACTION'));
--
-- -- 確認：BOOST が 0 件になっていること
-- select zone, count(*) from public.records group by zone order by zone;
