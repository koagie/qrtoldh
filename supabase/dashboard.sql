-- 管理ダッシュボード 実データ接続（タスク3-b）
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run（1回だけ）。
-- 冪等（何度実行しても安全）。

-- ============================================================
-- 1) orgs：所属マスタ（個人を特定しない「集団のラベル」）
--    例）code = 'medipal_event_1018' / name = 'メディパル イベント(10/18)'
-- ============================================================
create table if not exists public.orgs (
  code       text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.orgs enable row level security;

-- ダッシュボードのフィルタ用。管理者のみ参照可。
drop policy if exists "orgs_select_admin" on public.orgs;
create policy "orgs_select_admin" on public.orgs
  for select using (public.is_admin());

grant select on public.orgs to authenticated;

-- ============================================================
-- 2) records に org_code を追加（null可 → 既存データに影響なし）
--    ※ FK は張らない：未知のコードでも記録の保存自体は失敗させないため
-- ============================================================
alter table public.records
  add column if not exists org_code text;

create index if not exists records_org_code_idx on public.records (org_code);

-- ============================================================
-- 3) admin_measurements：管理者用の「匿名ビュー」
--    user_id を一切含まない（所属コード・スコア・測定日のみ）＝個人特定不可。
--    where is_admin() により、管理者以外は 0 件しか見えない。
--    ※ ビューは所有者(postgres)権限で動くため records のRLSを跨いで集計できる。
--      公開範囲はこの where と grant で制御している。
-- ============================================================
create or replace view public.admin_measurements as
select
  r.org_code,
  r.color_value,
  r.measured_at
from public.records r
where public.is_admin();

revoke all on public.admin_measurements from anon;
grant select on public.admin_measurements to authenticated;

-- ============================================================
-- 4) 所属を登録する（配布するQRの ?org= と同じコードにする）
--    ↓ 実際の所属に置き換えて実行してください
-- ============================================================
-- insert into public.orgs (code, name) values
--   ('medipal_event_1018', 'メディパル イベント(10/18)'),
--   ('kenpo_A',            '健保組合A')
-- on conflict (code) do nothing;
