-- Administrative and team-generation RPCs already enforce their own rights,
-- but they must not be callable by an anonymous client at all.  Token-based
-- public flows (registration/payment desk) are intentionally not covered.
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
      and has_function_privilege('anon',p.oid,'execute')
      and p.proname ~ '^(admin_|super_admin_|manager_|generate_)'
  loop
    execute format('revoke execute on function %s from anon', r.signature);
  end loop;
end $$;

notify pgrst,'reload schema';
