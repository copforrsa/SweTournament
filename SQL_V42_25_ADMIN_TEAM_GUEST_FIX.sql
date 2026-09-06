-- V42.25 — création manuelle d'équipe, déplacement d'un joueur et rattachement d'un Guest.

create or replace function public.manager_create_tournament_team(
  p_tournament_id uuid,
  p_team_name text,
  p_team_color text
) returns uuid
language plpgsql security definer set search_path='public','private'
as $$
declare v_t public.tournaments%rowtype;v_name text:=btrim(coalesce(p_team_name,''));v_color text:=lower(btrim(coalesce(p_team_color,'')));v_team_id uuid;
begin
  select * into v_t from public.tournaments where id=p_tournament_id and status<>'finished' for update;
  if not found then raise exception 'Compétition introuvable ou terminée'; end if;
  if not (private.is_workspace_operational_admin(v_t.workspace_id) or private.coorganizer_has_permission(v_t.workspace_id,'generate_teams')) then raise exception 'Autorisation refusée'; end if;
  if char_length(v_name)<2 or char_length(v_name)>30 then raise exception 'Le nom de l’équipe doit contenir 2 à 30 caractères'; end if;
  if v_color not in ('#111827','#2563eb','#f8fafc','#dc2626','#16a34a','#eab308','#f97316','#7c3aed','#ec4899','#78350f','#64748b') then raise exception 'Choisis une couleur valide'; end if;
  if exists(select 1 from public.teams where tournament_id=v_t.id and lower(btrim(name))=lower(v_name)) then raise exception 'Ce nom d’équipe existe déjà'; end if;
  insert into public.teams(tournament_id,name,color,is_preformed) values(v_t.id,v_name,v_color,true) returning id into v_team_id;
  insert into public.audit_logs(workspace_id,user_id,action,entity_type,entity_id,details) values(v_t.workspace_id,auth.uid(),'manager_create_tournament_team','team',v_team_id,jsonb_build_object('tournament_id',v_t.id,'team_name',v_name));
  return v_team_id;
end $$;

create or replace function public.manager_assign_tournament_player_to_team(
  p_team_id uuid,
  p_player_id uuid
) returns void
language plpgsql security definer set search_path='public','private'
as $$
declare v_team public.teams%rowtype;v_t public.tournaments%rowtype;v_count integer;v_inviter uuid;
begin
  select * into v_team from public.teams where id=p_team_id for update;
  if not found then raise exception 'Équipe introuvable'; end if;
  select * into v_t from public.tournaments where id=v_team.tournament_id and status<>'finished';
  if not found then raise exception 'Compétition introuvable ou terminée'; end if;
  if not (private.is_workspace_operational_admin(v_t.workspace_id) or private.coorganizer_has_permission(v_t.workspace_id,'generate_teams')) then raise exception 'Autorisation refusée'; end if;
  if not exists(select 1 from public.players p join public.tournament_players tp on tp.player_id=p.id where p.id=p_player_id and p.workspace_id=v_t.workspace_id and p.active=true and tp.tournament_id=v_t.id and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist') then raise exception 'Ce joueur doit être inscrit et confirmé'; end if;
  select count(*) into v_count from public.team_players where team_id=v_team.id and player_id<>p_player_id;
  if v_count>=5 then raise exception 'Cette équipe contient déjà 5 joueurs'; end if;
  delete from public.team_players tp using public.teams te where tp.team_id=te.id and te.tournament_id=v_t.id and tp.player_id=p_player_id;
  insert into public.team_players(team_id,player_id) values(v_team.id,p_player_id) on conflict do nothing;
  update public.tournament_players set is_substitute=false where tournament_id=v_t.id and player_id=p_player_id;
  if coalesce(v_team.is_preformed,false) and p_player_id<>coalesce(v_team.created_by_player_id,'00000000-0000-0000-0000-000000000000'::uuid) then
    v_inviter:=v_team.created_by_player_id;
    insert into public.team_player_invitations(tournament_id,team_id,player_id,invited_by_player_id,status,responded_at)
    values(v_t.id,v_team.id,p_player_id,v_inviter,'accepted',now())
    on conflict(tournament_id,player_id) do update set team_id=excluded.team_id,invited_by_player_id=excluded.invited_by_player_id,status='accepted',responded_at=now();
  end if;
end $$;

drop function if exists public.manager_register_tournament_guest(uuid,text);
create or replace function public.manager_register_tournament_guest(
  p_tournament_id uuid,
  p_guest_name text,
  p_guest_of_player_id uuid default null
) returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare v_t public.tournaments%rowtype;v_name text:=btrim(coalesce(p_guest_name,''));v_guest_id uuid;v_confirmed integer;v_status text;
begin
  select * into v_t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Compétition introuvable'; end if;
  if not (private.is_workspace_operational_admin(v_t.workspace_id) or private.is_workspace_coorganizer(v_t.workspace_id)) then raise exception 'Action réservée à l’administrateur et aux co-gestionnaires'; end if;
  if v_t.status='finished' then raise exception 'Cette compétition est terminée'; end if;
  if char_length(v_name)<2 or char_length(v_name)>60 then raise exception 'Le nom de l’invité doit contenir 2 à 60 caractères'; end if;
  if p_guest_of_player_id is not null and not exists(select 1 from public.players where id=p_guest_of_player_id and workspace_id=v_t.workspace_id and active=true and is_group_member=true) then raise exception 'Le membre de rattachement est invalide'; end if;
  select id into v_guest_id from public.players where workspace_id=v_t.workspace_id and lower(btrim(name))=lower(v_name) order by created_at desc limit 1;
  if v_guest_id is null then
    insert into public.players(workspace_id,name,active,is_group_member,guest_of_player_id,skill_level) values(v_t.workspace_id,v_name,true,false,p_guest_of_player_id,2) returning id into v_guest_id;
  else
    if exists(select 1 from public.players where id=v_guest_id and is_group_member=true) then raise exception 'Ce nom correspond déjà à un membre du groupe'; end if;
    update public.players set active=true,guest_of_player_id=p_guest_of_player_id where id=v_guest_id;
  end if;
  select count(*) into v_confirmed from public.tournament_players where tournament_id=v_t.id and present=true and coalesce(registration_status,'confirmed')<>'waitlist';
  v_status:=case when exists(select 1 from public.tournament_players where tournament_id=v_t.id and player_id=v_guest_id and coalesce(registration_status,'confirmed')<>'waitlist') then 'confirmed' when v_confirmed<coalesce(v_t.max_players,20) then 'confirmed' else 'waitlist' end;
  insert into public.tournament_players(tournament_id,player_id,present,registration_status,registered_at,registered_by_player_id)
  values(v_t.id,v_guest_id,true,v_status,now(),p_guest_of_player_id)
  on conflict(tournament_id,player_id) do update set present=true,registration_status=excluded.registration_status,registered_by_player_id=excluded.registered_by_player_id;
  insert into public.audit_logs(workspace_id,user_id,action,entity_type,entity_id,details) values(v_t.workspace_id,auth.uid(),'manager_add_tournament_guest','tournament',v_t.id,jsonb_build_object('player_id',v_guest_id,'guest_name',v_name,'guest_of_player_id',p_guest_of_player_id,'status',v_status));
  return jsonb_build_object('status',v_status,'player_id',v_guest_id,'name',v_name,'guest_of_player_id',p_guest_of_player_id);
end $$;

revoke all on function public.manager_create_tournament_team(uuid,text,text) from public,anon;
revoke all on function public.manager_assign_tournament_player_to_team(uuid,uuid) from public,anon;
revoke all on function public.manager_register_tournament_guest(uuid,text,uuid) from public,anon;
grant execute on function public.manager_create_tournament_team(uuid,text,text) to authenticated;
grant execute on function public.manager_assign_tournament_player_to_team(uuid,uuid) to authenticated;
grant execute on function public.manager_register_tournament_guest(uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';
