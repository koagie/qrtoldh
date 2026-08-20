-- データモデル再設計 ⑥退会（本人による削除）
-- 01〜03 の後に実行する。
--
-- 仕様書8：退会は app_users.deleted_at を設定 → 別途バッチで物理削除。auth.users も削除。
-- ここでは「本人がアプリから退会する」操作を1つの関数にまとめる。
--   ・app_users に deleted_at を立てる（同意の記録は残す＝撤回の証跡）
--   ・測定値を消す
--   ・auth.users を削除する（ログイン用メールアドレスが消える）

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_app_user uuid;
  v_auth_user uuid := auth.uid();
begin
  if v_auth_user is null then
    raise exception 'not authenticated';
  end if;

  select id into v_app_user from public.app_users where auth_user_id = v_auth_user;

  if v_app_user is not null then
    -- 退会日時を記録（物理削除までの猶予。推奨30日）
    update public.app_users set deleted_at = now() where id = v_app_user;
    -- 測定値は即時に消す
    delete from public.measurements where app_user_id = v_app_user;
  end if;

  -- ログイン用メールアドレスを含むアカウントを削除
  -- （app_users.auth_user_id は on delete set null なので行は残る）
  delete from auth.users where id = v_auth_user;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- 物理削除バッチ（猶予30日を過ぎた退会者を消す）
--   運用が固まるまでは手動で実行してよい。
-- ============================================================
-- delete from public.app_users
-- where deleted_at is not null and deleted_at < now() - interval '30 days';
