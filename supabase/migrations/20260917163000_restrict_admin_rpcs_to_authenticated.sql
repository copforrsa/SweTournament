-- PostgreSQL grants EXECUTE to PUBLIC by default. Remove that inherited grant
-- from administrative RPCs, then allow only signed-in application users and
-- the server role. Public token-based RPCs are not included.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prokind='f'
      and p.prosecdef
      and p.proname ~ '^(admin_|super_admin_|manager_|generate_)'
  loop
    execute format('revoke all on function %s from public', r.signature);
    execute format('grant execute on function %s to authenticated, service_role', r.signature);
  end loop;
end $$;

notify pgrst,'reload schema';
