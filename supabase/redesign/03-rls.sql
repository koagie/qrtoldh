-- データモデル再設計 ③RLS（行レベルセキュリティ）
-- 02-views.sql の後に実行する。

alter table public.app_users           enable row level security;
alter table public.measurements        enable row level security;
alter table public.consents            enable row level security;
alter table public.consent_documents   enable row level security;
alter table public.external_identities enable row level security;
alter table public.distributions       enable row level security;
alter table public.organizations       enable row level security;
alter table public.staff_roles         enable row level security;
alter table public.audit_logs          enable row level security;

-- ── app_users：本人のみ読み書き／adminは全件読み取り ──
drop policy if exists app_users_self on public.app_users;
create policy app_users_self on public.app_users
  for all using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists app_users_admin_read on public.app_users;
create policy app_users_admin_read on public.app_users
  for select using (public.has_role('admin'));

-- ── measurements：本人のみ読み書き／adminは全件読み取り ──
drop policy if exists measurements_self on public.measurements;
create policy measurements_self on public.measurements
  for all using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

drop policy if exists measurements_admin_read on public.measurements;
create policy measurements_admin_read on public.measurements
  for select using (public.has_role('admin'));

-- ── consents：本人が作成・参照。撤回はUPDATEのみ（DELETEは許可しない） ──
drop policy if exists consents_self_select on public.consents;
create policy consents_self_select on public.consents
  for select using (app_user_id = public.current_app_user_id()
                    or public.has_role('admin'));

drop policy if exists consents_self_insert on public.consents;
create policy consents_self_insert on public.consents
  for insert with check (app_user_id = public.current_app_user_id());

drop policy if exists consents_self_revoke on public.consents;
create policy consents_self_revoke on public.consents
  for update using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

-- ── consent_documents：ログイン済みは本文を参照できる（同意画面に全文を出すため） ──
drop policy if exists consent_docs_read on public.consent_documents;
create policy consent_docs_read on public.consent_documents
  for select using (auth.uid() is not null);

drop policy if exists consent_docs_write on public.consent_documents;
create policy consent_docs_write on public.consent_documents
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ── external_identities：本人とadmin ──
drop policy if exists ext_self on public.external_identities;
create policy ext_self on public.external_identities
  for all using (app_user_id = public.current_app_user_id()
                 or public.has_role('admin'));

-- ── organizations / distributions：ログイン済みは参照のみ、更新はadmin ──
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations
  for select using (auth.uid() is not null);

drop policy if exists org_write on public.organizations;
create policy org_write on public.organizations
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists dist_read on public.distributions;
create policy dist_read on public.distributions
  for select using (auth.uid() is not null);

drop policy if exists dist_write on public.distributions;
create policy dist_write on public.distributions
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ── staff_roles：adminのみ ──
drop policy if exists staff_admin on public.staff_roles;
create policy staff_admin on public.staff_roles
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- 本人が自分の権限を確認できる（管理画面のログイン後の振り分けに使う）
drop policy if exists staff_self_read on public.staff_roles;
create policy staff_self_read on public.staff_roles
  for select using (auth_user_id = auth.uid());

-- ── audit_logs：adminのみ読み取り。書き込みはサーバー側(service_role)から ──
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select using (public.has_role('admin'));

grant select, insert, update, delete on public.app_users to authenticated;
grant select, insert, update, delete on public.measurements to authenticated;
grant select, insert, update on public.consents to authenticated;
grant select on public.consent_documents to authenticated;
grant select, insert, update, delete on public.external_identities to authenticated;
grant select on public.organizations to authenticated;
grant select on public.distributions to authenticated;
grant select on public.staff_roles to authenticated;
