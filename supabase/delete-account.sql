-- 本人アカウント＆データの完全削除用 関数
-- 実行手順：Supabase 管理画面 → SQL Editor → New query に貼って Run（1回だけ）。
--
-- ねらい：service_role キーをフロントに置かずに、ログイン本人が
--   「自分の記録 + 自分のアカウント（ログイン用メールアドレス含む）」を完全削除できるようにする。
--   SECURITY DEFINER で関数所有者(postgres)権限で auth.users を削除する。
--   auth.uid() はリクエストのJWTから本人IDを取得するため、本人のデータしか消せない。

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- 本人の観察記録を削除
  delete from public.records where user_id = auth.uid();

  -- 本人のアカウント（auth.users＝ログイン用メールアドレス等）を削除
  -- （records には user_id への on delete cascade があるため、ここでも連鎖削除される）
  delete from auth.users where id = auth.uid();
end;
$$;

-- 匿名や一般には実行させず、ログイン済み(authenticated)のみ実行可
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
