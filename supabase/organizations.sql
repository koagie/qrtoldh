-- 団体マスタ（配布先）＋ 配布ID解決RPC
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run（1回だけ）。冪等。
--
-- 設計方針（指示書v2）：
--   QR/URL に出るのは 10桁の不透明ID（?c=bguh7znkqg）のみ。
--   団体名・種別・発行年月は DB 内の列に持ち、外に出る文字列からは一切読めないようにする。
--   → 印刷物のQRから取引先団体が特定されない／他団体のIDを推測・列挙できない。

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,            -- 配布ID（QRの ?c= の値。10桁の不透明ID）
  name        text not null,                   -- 表示名（例：デモ株式会社）
  org_type    text not null default 'other',   -- kokuho/kenpo/corp/event/muni/clinic/other
  issued_ym   text,                            -- 発行年月 'YYMM'（例 '2607'）
  note        text,                            -- 社内メモ（担当者・配布枚数など）
  is_active   boolean not null default true,   -- 失効させたいときは false（行は消さない）
  created_at  timestamptz not null default now(),
  constraint code_format check (code ~ '^[a-z2-9]{10}$')
);

create index if not exists organizations_type_ym_idx
  on public.organizations (org_type, issued_ym);

-- RLS を有効化。一般ポリシーは作らない＝クライアントからは一覧を一切読めない
-- （団体リスト＝顧客リストの流出を防ぐ）。取得は下の resolve_org() 経由のみ。
alter table public.organizations enable row level security;

-- 管理者は台帳として参照できる（QR発行ページの候補表示などに使用）
drop policy if exists "organizations_select_admin" on public.organizations;
create policy "organizations_select_admin" on public.organizations
  for select using (public.is_admin());

grant select on public.organizations to authenticated;

-- ============================================================
-- 配布ID → 団体を引くRPC（団体一覧を露出させない）
--   IDを知っている人だけがその1件を引ける。返すのは organization_id のみで
--   団体名・種別は返さない。存在しないIDなら0行（アプリはエラーで止めない）。
-- ============================================================
create or replace function public.resolve_org(p_code text)
returns table (organization_id uuid)
language sql
security definer
set search_path = public
as $$
  select id from public.organizations
  where code = p_code and is_active = true
  limit 1;
$$;

revoke all on function public.resolve_org(text) from public;
grant execute on function public.resolve_org(text) to anon, authenticated;

-- ============================================================
-- デモ用シード（動作確認用。本番配布には使わない）
--   デモQR: https://qrtoldhtestnagata.vercel.app/?c=bguh7znkqg
-- ============================================================
insert into public.organizations (code, name, org_type, issued_ym, note) values
  ('bguh7znkqg', 'デモ株式会社', 'corp', '2607', '動作確認用のデモ団体。本番配布には使わない')
on conflict (code) do nothing;
