-- フェーズ1：サンプルデータ団体のフラグ
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run。冪等。
--
-- 管理ダッシュボードで「サンプルデータ（実際の測定記録ではありません）」バッジを
-- 出すかどうかを、環境変数やハードコードではなくDBで制御する。
--
-- ※仕様書では `where org_code = 'bguh7znkqg'` と記載されているが、
--   organizations の実際の列名は `code` のため読み替えている。

alter table public.organizations
  add column if not exists is_demo boolean not null default false;

comment on column public.organizations.is_demo is
  'サンプルデータの団体。管理画面で「サンプルデータ」バッジを表示する。';

update public.organizations set is_demo = true where code = 'bguh7znkqg';

-- 確認
select code, name, is_demo from public.organizations order by name;
