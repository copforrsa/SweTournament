-- SWÉ Tournament V43.95 — couverture des évaluations, centre matchs global et visuels de composition.

alter table public.tournaments
  add column if not exists composition_display_mode text not null default 'site',
  add column if not exists composition_image_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='tournaments_composition_display_mode_check') then
    alter table public.tournaments add constraint tournaments_composition_display_mode_check
      check (composition_display_mode in ('site','image'));
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('team-composition-images','team-composition-images',true,8388608,array['image/jpeg','image/png'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png'];

drop policy if exists "workspace admins upload composition images" on storage.objects;
create policy "workspace admins upload composition images" on storage.objects
for insert to authenticated with check (
  case when bucket_id='team-composition-images'
    and storage.extension(name) in ('jpg','jpeg','png')
    and coalesce((storage.foldername(name))[1],'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then private.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  else false end
);

create or replace function public.admin_set_tournament_composition_visual_v1(
  p_tournament_id uuid,p_mode text,p_image_url text default null
) returns jsonb language plpgsql security definer
set search_path='public','private','auth','pg_temp' as $$
declare v_workspace uuid; v_mode text:=lower(coalesce(p_mode,''));
begin
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id;
  if v_workspace is null or (select auth.uid()) is null or not private.is_workspace_admin(v_workspace) then
    raise exception 'Accès administrateur requis';
  end if;
  if v_mode not in ('site','image') then raise exception 'Mode de composition invalide'; end if;
  if v_mode='image' and coalesce(trim(p_image_url),'')='' then raise exception 'Image requise'; end if;
  update public.tournaments set composition_display_mode=v_mode,
    composition_image_url=case when v_mode='image' then trim(p_image_url) else composition_image_url end
  where id=p_tournament_id;
  return jsonb_build_object('ok',true,'mode',v_mode,'image_url',p_image_url);
end $$;

create or replace function public.get_admin_evaluation_matrix_v1(p_workspace_id uuid)
returns table(evaluator_user_id uuid,player_id uuid)
language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
  if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;
  return query select r.evaluator_user_id,r.player_id
  from public.player_skill_ratings r
  join public.players p on p.id=r.player_id and p.workspace_id=p_workspace_id
  where r.workspace_id=p_workspace_id;
end $$;

create or replace function public.super_admin_get_match_center_v1()
returns table(
  match_id uuid,workspace_id uuid,workspace_name text,tournament_id uuid,tournament_name text,
  tournament_date date,tournament_format text,match_order integer,match_status text,
  home_team_id uuid,home_team_name text,away_team_id uuid,away_team_name text,
  home_score integer,away_score integer,pitch text,started_at timestamptz,finished_at timestamptz,is_test boolean
) language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return query
  select m.id,w.id,w.name,t.id,t.name,t.tournament_date,t.format,m.match_order,m.status,
         h.id,h.name,a.id,a.name,m.home_score,m.away_score,m.pitch,m.started_at,m.finished_at,
         (exists(select 1 from private.match_test_runs x where x.match_id=m.id)
          or exists(select 1 from private.tournament_test_runs x where x.tournament_id=t.id))
  from public.matches m join public.tournaments t on t.id=m.tournament_id
  join public.workspaces w on w.id=t.workspace_id
  join public.teams h on h.id=m.home_team_id join public.teams a on a.id=m.away_team_id
  order by case when m.status in ('live','in_progress') then 0 else 1 end,t.tournament_date desc,w.name,m.match_order;
end $$;

create or replace function public.super_admin_get_match_composition_v1(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
declare v_workspace uuid; v_home uuid; v_away uuid; v_tournament uuid;
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  select t.workspace_id,m.home_team_id,m.away_team_id,m.tournament_id
    into v_workspace,v_home,v_away,v_tournament
  from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=p_match_id;
  if v_workspace is null then raise exception 'Match introuvable'; end if;
  return jsonb_build_object(
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'active',p.active,'is_group_member',p.is_group_member) order by p.name),'[]'::jsonb) from public.players p where p.workspace_id=v_workspace),
    'home_player_ids',(select coalesce(jsonb_agg(x.player_id),'[]'::jsonb) from (select ma.player_id from public.match_player_assignments ma where ma.match_id=p_match_id and ma.team_id=v_home union select tp.player_id from public.team_players tp where tp.team_id=v_home and not exists(select 1 from public.match_player_assignments z where z.match_id=p_match_id)) x),
    'away_player_ids',(select coalesce(jsonb_agg(x.player_id),'[]'::jsonb) from (select ma.player_id from public.match_player_assignments ma where ma.match_id=p_match_id and ma.team_id=v_away union select tp.player_id from public.team_players tp where tp.team_id=v_away and not exists(select 1 from public.match_player_assignments z where z.match_id=p_match_id)) x),
    'goals',(select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at),'[]'::jsonb) from public.goals g where g.match_id=p_match_id)
  );
end $$;

create or replace function public.super_admin_update_match_v1(p_match_id uuid,p_home_score integer,p_away_score integer,p_status text)
returns boolean language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if p_home_score not between 0 and 99 or p_away_score not between 0 and 99 then raise exception 'Score invalide'; end if;
  if p_status not in ('scheduled','live','in_progress','finished') then raise exception 'Statut invalide'; end if;
  update public.matches set home_score=p_home_score,away_score=p_away_score,status=p_status,
    started_at=case when p_status in ('live','in_progress','finished') then coalesce(started_at,now()) else null end,
    finished_at=case when p_status='finished' then coalesce(finished_at,now()) else null end
  where id=p_match_id;
  return found;
end $$;

create or replace function public.super_admin_set_match_composition_v1(p_match_id uuid,p_home_player_ids uuid[],p_away_player_ids uuid[])
returns boolean language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
declare v_workspace uuid; v_home uuid; v_away uuid; v_id uuid;
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  select t.workspace_id,m.home_team_id,m.away_team_id into v_workspace,v_home,v_away
  from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=p_match_id;
  if v_workspace is null then raise exception 'Match introuvable'; end if;
  if coalesce(p_home_player_ids,'{}') && coalesce(p_away_player_ids,'{}') then raise exception 'Un joueur ne peut pas jouer dans les deux équipes'; end if;
  foreach v_id in array coalesce(p_home_player_ids,'{}') loop
    if not exists(select 1 from public.players where id=v_id and workspace_id=v_workspace) then raise exception 'Joueur hors du groupe'; end if;
  end loop;
  foreach v_id in array coalesce(p_away_player_ids,'{}') loop
    if not exists(select 1 from public.players where id=v_id and workspace_id=v_workspace) then raise exception 'Joueur hors du groupe'; end if;
  end loop;
  delete from public.match_player_assignments where match_id=p_match_id;
  insert into public.match_player_assignments(match_id,player_id,team_id,updated_by)
    select p_match_id,x,v_home,auth.uid() from unnest(coalesce(p_home_player_ids,'{}')) x;
  insert into public.match_player_assignments(match_id,player_id,team_id,updated_by)
    select p_match_id,x,v_away,auth.uid() from unnest(coalesce(p_away_player_ids,'{}')) x;
  return true;
end $$;

create or replace function public.super_admin_save_match_goal_v1(p_match_id uuid,p_goal_id uuid,p_team_id uuid,p_scorer_id uuid,p_assister_id uuid,p_delete boolean default false)
returns uuid language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
declare v_workspace uuid; v_home uuid; v_away uuid; v_id uuid:=coalesce(p_goal_id,gen_random_uuid());
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  select t.workspace_id,m.home_team_id,m.away_team_id into v_workspace,v_home,v_away from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=p_match_id;
  if v_workspace is null then raise exception 'Match introuvable'; end if;
  if p_delete then delete from public.goals where id=p_goal_id and match_id=p_match_id; return p_goal_id; end if;
  if p_team_id not in (v_home,v_away) then raise exception 'Équipe invalide'; end if;
  if not exists(select 1 from public.players where id=p_scorer_id and workspace_id=v_workspace) then raise exception 'Buteur hors du groupe'; end if;
  if p_assister_id is not null and (p_assister_id=p_scorer_id or not exists(select 1 from public.players where id=p_assister_id and workspace_id=v_workspace)) then raise exception 'Passeur invalide'; end if;
  insert into public.goals(id,match_id,team_id,scorer_player_id,assister_player_id,created_by)
  values(v_id,p_match_id,p_team_id,p_scorer_id,p_assister_id,auth.uid())
  on conflict(id) do update set team_id=excluded.team_id,scorer_player_id=excluded.scorer_player_id,assister_player_id=excluded.assister_player_id;
  return v_id;
end $$;

create or replace function public.super_admin_delete_test_match_v1(p_match_id uuid)
returns boolean language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if not exists(select 1 from private.match_test_runs where match_id=p_match_id)
     and not exists(select 1 from private.tournament_test_runs tr join public.matches m on m.tournament_id=tr.tournament_id where m.id=p_match_id)
  then raise exception 'Suppression réservée aux matchs test'; end if;
  delete from private.match_test_runs where match_id=p_match_id;
  delete from public.matches where id=p_match_id;
  return found;
end $$;

revoke all on function public.admin_set_tournament_composition_visual_v1(uuid,text,text) from public,anon;
revoke all on function public.get_admin_evaluation_matrix_v1(uuid) from public,anon;
revoke all on function public.super_admin_get_match_center_v1() from public,anon;
revoke all on function public.super_admin_get_match_composition_v1(uuid) from public,anon;
revoke all on function public.super_admin_update_match_v1(uuid,integer,integer,text) from public,anon;
revoke all on function public.super_admin_set_match_composition_v1(uuid,uuid[],uuid[]) from public,anon;
revoke all on function public.super_admin_save_match_goal_v1(uuid,uuid,uuid,uuid,uuid,boolean) from public,anon;
revoke all on function public.super_admin_delete_test_match_v1(uuid) from public,anon;
grant execute on function public.admin_set_tournament_composition_visual_v1(uuid,text,text) to authenticated;
grant execute on function public.get_admin_evaluation_matrix_v1(uuid) to authenticated;
grant execute on function public.super_admin_get_match_center_v1() to authenticated;
grant execute on function public.super_admin_get_match_composition_v1(uuid) to authenticated;
grant execute on function public.super_admin_update_match_v1(uuid,integer,integer,text) to authenticated;
grant execute on function public.super_admin_set_match_composition_v1(uuid,uuid[],uuid[]) to authenticated;
grant execute on function public.super_admin_save_match_goal_v1(uuid,uuid,uuid,uuid,uuid,boolean) to authenticated;
grant execute on function public.super_admin_delete_test_match_v1(uuid) to authenticated;
