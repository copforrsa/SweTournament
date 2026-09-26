-- Let the organiser select their own player profile as payment owner during creation.
create or replace function public.admin_save_third_half_assignments_v2(
  p_tournament_id uuid,
  p_payment_player_id uuid,
  p_cooler_player_id uuid,
  p_ice_player_id uuid
) returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare
  v_workspace uuid; v_enabled boolean; v_previous_payment_player uuid; v_assignments jsonb:='{}'::jsonb;
  v_payment_registered boolean:=false; v_payment_player_changed boolean:=false; v_is_creator boolean:=false;
begin
  select t.workspace_id,coalesce(t.third_half_active,false) into v_workspace,v_enabled from public.tournaments t where t.id=p_tournament_id;
  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if not v_enabled then raise exception 'Active d’abord le module Glacière pour ce Swé'; end if;
  if p_payment_player_id is not null and not exists(select 1 from public.players p where p.id=p_payment_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'Le responsable du lien ne fait pas partie de ce groupe'; end if;
  if p_cooler_player_id is not null and not exists(select 1 from public.players p where p.id=p_cooler_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'La personne chargée de la glacière ne fait pas partie de ce groupe'; end if;
  if p_ice_player_id is not null and not exists(select 1 from public.players p where p.id=p_ice_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'La personne chargée des glaçons ne fait pas partie de ce groupe'; end if;

  select exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.user_id=auth.uid() and wm.linked_player_id=p_payment_player_id) into v_is_creator;
  v_payment_registered:=p_payment_player_id is not null and exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p_payment_player_id and tp.present=true and tp.registration_status<>'cancelled');
  if p_payment_player_id is not null and not v_payment_registered then
    if not v_is_creator then raise exception 'Le responsable du lien doit être inscrit au tournoi'; end if;
    insert into public.tournament_players(tournament_id,player_id,present,registration_status,registered_at)
    values(p_tournament_id,p_payment_player_id,true,'confirmed',now())
    on conflict(tournament_id,player_id) do update set present=true,registration_status='confirmed';
    v_payment_registered:=true;
  end if;

  select f.responsible_player_id,coalesce(f.logistics_assignments,'{}'::jsonb) into v_previous_payment_player,v_assignments from public.third_half_funds f where f.tournament_id=p_tournament_id;
  v_payment_player_changed:=v_previous_payment_player is distinct from p_payment_player_id;
  v_assignments:=jsonb_set(coalesce(v_assignments,'{}'::jsonb),'{cooler}',jsonb_build_object('player_id',p_cooler_player_id,'status','assigned'),true);
  v_assignments:=jsonb_set(v_assignments,'{ice}',jsonb_build_object('player_id',p_ice_player_id,'status','assigned'),true);
  if not(v_assignments?'beers') then v_assignments:=jsonb_set(v_assignments,'{beers}',jsonb_build_object('player_id',p_cooler_player_id,'status','assigned','quantity',6),true); end if;
  insert into public.third_half_funds(tournament_id,workspace_id,status,responsible_player_id,logistics_assignments,share_enabled,updated_at,updated_by)
  values(p_tournament_id,v_workspace,'draft',p_payment_player_id,v_assignments,false,now(),auth.uid())
  on conflict(tournament_id) do update set responsible_player_id=excluded.responsible_player_id,logistics_assignments=excluded.logistics_assignments,
    provider=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.provider end,
    payment_link=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link end,
    payment_link_configured_at=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link_configured_at end,
    share_enabled=case when v_payment_player_changed or not v_payment_registered then false else third_half_funds.share_enabled end,
    responsible_contribution_mode=case when v_payment_player_changed then null else third_half_funds.responsible_contribution_mode end,
    responsible_contribution_amount_cents=case when v_payment_player_changed then 0 else third_half_funds.responsible_contribution_amount_cents end,
    responsible_contribution_item=case when v_payment_player_changed then null else third_half_funds.responsible_contribution_item end,
    updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('saved',true,'payment_responsible_registered',v_payment_registered,'payment_mode',case when v_payment_registered then 'platform' else 'off_platform' end);
end;
$$;

revoke all on function public.admin_save_third_half_assignments_v2(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.admin_save_third_half_assignments_v2(uuid,uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
