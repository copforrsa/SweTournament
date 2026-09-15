create or replace function public.request_my_third_half_owner_link_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_player public.players%rowtype;
  v_global uuid;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;

  perform public.ensure_my_global_player_profile(null);
  select id into v_global from public.global_player_profiles where user_id=v_uid limit 1;

  select p.* into v_player
  from public.third_half_funds f
  join public.players p on p.id=f.responsible_player_id and p.active=true
  join public.tournaments t on t.id=f.tournament_id and t.workspace_id=p.workspace_id
  where f.tournament_id=p_tournament_id
  limit 1;

  if not found then raise exception 'Responsable Glacière introuvable'; end if;
  if v_player.global_player_id=v_global then
    return jsonb_build_object('status','already_linked','player_id',v_player.id);
  end if;
  if v_player.global_player_id is not null then
    raise exception 'Ce profil joueur est déjà rattaché à un autre compte SWÉ';
  end if;

  return public.request_my_group_player_link(v_player.group_player_code);
end
$function$;

revoke all on function public.request_my_third_half_owner_link_v1(uuid) from public,anon;
grant execute on function public.request_my_third_half_owner_link_v1(uuid) to authenticated;

-- Ces deux RPC existaient déjà avec un contrôle administrateur interne.
-- On retire aussi leur exposition anonyme puisque ce parcours les utilise désormais.
revoke all on function public.admin_get_identity_link_requests(uuid) from public,anon;
grant execute on function public.admin_get_identity_link_requests(uuid) to authenticated;
revoke all on function public.admin_decide_identity_link_request(uuid,boolean,text) from public,anon;
grant execute on function public.admin_decide_identity_link_request(uuid,boolean,text) to authenticated;
