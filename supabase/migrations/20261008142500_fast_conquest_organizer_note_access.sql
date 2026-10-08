CREATE OR REPLACE FUNCTION private.fast_present(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $function$
 select auth.uid() is not null and (
 exists(select 1 from public.tournaments x where x.id=t and private.fast_admin(x.workspace_id))
 or (private.fast_designated(t) and exists(select 1 from public.tournament_players p join public.tournaments x on x.id=p.tournament_id join public.workspace_members m on m.workspace_id=x.workspace_id and m.linked_player_id=p.player_id where p.tournament_id=t and m.user_id=auth.uid() and m.active and p.present and p.registration_status<>'waitlist'))
 )
$function$;