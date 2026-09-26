-- A payment owner selected during tournament creation becomes a confirmed participant.
create or replace function public.admin_save_third_half_assignments_v3(
  p_tournament_id uuid,
  p_payment_player_id uuid,
  p_cooler_player_id uuid,
  p_ice_player_id uuid
) returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare v_workspace uuid; v_enabled boolean;
begin
  select t.workspace_id,coalesce(t.third_half_active,false) into v_workspace,v_enabled from public.tournaments t where t.id=p_tournament_id;
  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if not v_enabled then raise exception 'Active d’abord le module Glacière pour ce Swé'; end if;
  if p_payment_player_id is not null then
    if not exists(select 1 from public.players p where p.id=p_payment_player_id and p.workspace_id=v_workspace and p.active=true) then
      raise exception 'Le responsable du lien ne fait pas partie de ce groupe';
    end if;
    insert into public.tournament_players(tournament_id,player_id,present,registration_status,registered_at)
    values(p_tournament_id,p_payment_player_id,true,'confirmed',now())
    on conflict(tournament_id,player_id) do update set present=true,registration_status='confirmed';
  end if;
  return public.admin_save_third_half_assignments_v2(p_tournament_id,p_payment_player_id,p_cooler_player_id,p_ice_player_id);
end;
$$;

revoke all on function public.admin_save_third_half_assignments_v3(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.admin_save_third_half_assignments_v3(uuid,uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
