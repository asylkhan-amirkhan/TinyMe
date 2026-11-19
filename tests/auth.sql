begin;
do $$
declare
  u uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,raw_user_meta_data)
    values(u,'auth-sql-test@example.invalid','{"username":"auth_sql_test","display_name":"Test","role":"admin"}'),
          (other_user,'auth-other-test@example.invalid','{"username":"auth_sql_other"}');
  assert (select role = 'user' from public.user_profiles where user_id = u), 'metadata cannot grant admin';
  assert public.login_email('AUTH_SQL_TEST') = 'auth-sql-test@example.invalid', 'case-insensitive login';
  begin
    insert into auth.users(id,email,raw_user_meta_data)
      values(gen_random_uuid(),'duplicate-test@example.invalid','{"username":"AUTH_SQL_TEST"}');
    raise exception 'duplicate login was accepted';
  exception when unique_violation then null;
  end;
  assert not has_function_privilege('anon','public.login_email(text)','EXECUTE'), 'anon cannot resolve emails';
  assert not has_function_privilege('authenticated','public.login_email(text)','EXECUTE'), 'users cannot resolve emails';
  assert not has_table_privilege('authenticated','public.user_profiles','UPDATE'), 'roles cannot be edited directly';
  assert not has_function_privilege('anon','public.admin_users(integer)','EXECUTE'), 'admin RPC unavailable to guests';
  for i in 1..10 loop assert public.auth_attempt('sql-test'), 'first ten attempts'; end loop;
  assert not public.auth_attempt('sql-test'), 'rate limit enforced';
  insert into auth.sessions(id,user_id,created_at,updated_at) values(s,u,now(),now());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',s)::text,true);
  perform public.check_session();
  begin
    perform public.admin_users();
    raise exception 'regular user reached admin RPC';
  exception when insufficient_privilege then null;
  end;
  update public.user_profiles set role='admin' where user_id=u;
  assert jsonb_array_length(public.admin_users()) >= 2, 'admin can list users';
  perform public.admin_set_role(other_user,'admin');
  assert (select role='admin' from public.user_profiles where user_id=other_user), 'admin role persisted';
  perform public.admin_set_role(other_user,'user');
  delete from auth.sessions where id=s;
  begin
    perform public.admin_users();
    raise exception 'revoked session reached admin RPC';
  exception when sqlstate 'PT401' then null;
  end;
end; $$;
rollback;
