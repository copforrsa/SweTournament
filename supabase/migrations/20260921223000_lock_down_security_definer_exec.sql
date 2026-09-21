-- Restrict SECURITY DEFINER RPCs.
-- Authenticated users retain the existing checked application RPCs.
-- Anonymous callers get only public registration, live, discovery and token-link RPCs.
do $hardening$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public', r.signature);
    execute format('revoke execute on function %s from anon', r.signature);
    execute format('grant execute on function %s to authenticated', r.signature);
  end loop;

  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and (
        p.proname like 'get_public_%'
        or p.proname like 'public_%'
        or p.proname in (
          'get_platform_public_settings',
          'get_community_swe_venues',
          'list_swe_discovery_public',
          'search_public_global_players',
          'payment_desk_snapshot',
          'payment_desk_add_walkin',
          'payment_desk_delete_walkin',
          'payment_desk_set_paid',
          'payment_desk_set_paid_v2',
          'resolve_payment_desk_short_link',
          'resolve_public_tournament_short_link',
          'record_public_registration_page_view',
          'record_season_page_view',
          'record_swe_page_view',
          'save_public_third_half_participation_v1',
          'request_player_signup'
        )
      )
  loop
    execute format('grant execute on function %s to anon', r.signature);
  end loop;
end
$hardening$;

alter default privileges for role postgres in schema public
revoke execute on functions from public;
