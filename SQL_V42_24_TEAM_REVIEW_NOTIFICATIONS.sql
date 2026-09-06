-- SWÉ Tournament V42.24
-- Sollicitation facultative des co-gestionnaires, délai configurable et notifications d'accueil.

alter table public.tournaments
  add column if not exists team_review_requested boolean not null default false,
  add column if not exists team_review_duration_minutes integer not null default 30;

alter table public.tournaments drop constraint if exists tournaments_team_review_duration_minutes_check;
alter table public.tournaments add constraint tournaments_team_review_duration_minutes_check
  check (team_review_duration_minutes between 5 and 1440);

drop function if exists public.admin_configure_tournament_team_review(uuid,integer);
create or replace function public.admin_configure_tournament_team_review(
  p_tournament_id uuid,
  p_max_redraws integer,
  p_requested boolean default false,
  p_duration_minutes integer default 30
) returns void
language plpgsql security definer set search_path='public','private'
as $$
declare t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(t.workspace_id) then raise exception 'Accès administrateur requis'; end if;
  if p_requested and not public.team_review_entitled(t.workspace_id) then
    raise exception 'La validation collaborative des équipes nécessite une offre payante ou une option offerte par le Super Admin';
  end if;
  if p_max_redraws<0 or p_max_redraws>10 then raise exception 'Le nombre de nouveaux tirages doit être compris entre 0 et 10'; end if;
  if p_max_redraws<coalesce(t.team_redraws_used,0) then raise exception 'Impossible de définir une limite inférieure au nombre de tirages déjà utilisés'; end if;
  if p_duration_minutes<5 or p_duration_minutes>1440 then raise exception 'Le délai doit être compris entre 5 minutes et 24 heures'; end if;

  update public.tournaments set
    max_team_redraws=p_max_redraws,
    team_review_requested=coalesce(p_requested,false),
    team_review_duration_minutes=p_duration_minutes,
    team_review_deadline=case
      when coalesce(p_requested,false) and team_review_status='pending' then coalesce(team_review_started_at,now())+make_interval(mins=>p_duration_minutes)
      else team_review_deadline
    end
  where id=t.id;

  if not coalesce(p_requested,false) then
    delete from public.tournament_team_reviews where tournament_id=t.id;
    update public.tournaments set
      team_review_status=case when coalesce(generated_team_count,0)>0 then 'approved' else 'not_started' end,
      team_review_started_at=null,
      team_review_deadline=null
    where id=t.id;
  end if;
end $$;

create or replace function public.start_tournament_team_review(p_tournament_id uuid,p_is_redraw boolean default false)
returns jsonb language plpgsql security definer set search_path='public','private'
as $$
declare t public.tournaments%rowtype; v_eligible integer:=0; v_status text; v_deadline timestamptz; v_used integer;
begin
  select * into t from public.tournaments where id=p_tournament_id and status<>'finished' for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not (private.is_workspace_admin(t.workspace_id) or private.coorganizer_has_permission(t.workspace_id,'generate_teams')) then raise exception 'Autorisation refusée'; end if;
  if not public.team_review_entitled(t.workspace_id) or not coalesce(t.team_review_requested,false) then
    delete from public.tournament_team_reviews where tournament_id=t.id;
    update public.tournaments set team_review_status='approved',team_review_started_at=now(),team_review_deadline=null where id=t.id;
    return jsonb_build_object('status','approved','requested',false,'eligible_count',0,'deadline',null,'duration_minutes',t.team_review_duration_minutes,'redraws_used',t.team_redraws_used,'max_redraws',t.max_team_redraws);
  end if;
  if coalesce(p_is_redraw,false) then
    if not private.is_workspace_admin(t.workspace_id) then raise exception 'Seul l’administrateur peut appliquer un nouveau tirage'; end if;
    if t.team_review_status<>'redraw_requested' then raise exception 'Aucun nouveau tirage n’a été demandé'; end if;
    if coalesce(t.team_redraws_used,0)>=coalesce(t.max_team_redraws,0) then raise exception 'Nombre maximal de nouveaux tirages atteint'; end if;
    v_used:=coalesce(t.team_redraws_used,0)+1;
  else v_used:=coalesce(t.team_redraws_used,0); end if;

  delete from public.tournament_team_reviews where tournament_id=t.id;
  select count(*) into v_eligible from public.workspace_members wm
  join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id
  where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true
    and wm.linked_player_id is not null and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist';
  if v_eligible=0 then v_status:='approved';v_deadline:=null;
  else v_status:='pending';v_deadline:=now()+make_interval(mins=>coalesce(t.team_review_duration_minutes,30));end if;
  update public.tournaments set team_review_status=v_status,team_review_started_at=now(),team_review_deadline=v_deadline,team_redraws_used=v_used where id=t.id;
  return jsonb_build_object('status',v_status,'requested',true,'eligible_count',v_eligible,'deadline',v_deadline,'duration_minutes',t.team_review_duration_minutes,'redraws_used',v_used,'max_redraws',t.max_team_redraws);
end $$;

create or replace function public.get_tournament_team_review_state(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private'
as $$
declare t public.tournaments%rowtype;v_eligible integer:=0;v_validate integer:=0;v_redraw integer:=0;v_my text;v_my_eligible boolean:=false;
begin
  select * into t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not (private.is_workspace_member(t.workspace_id) or private.is_platform_super_admin()) then raise exception 'Accès refusé'; end if;
  perform public.finalize_tournament_team_review(t.id);
  select * into t from public.tournaments where id=t.id;
  select count(*) into v_eligible from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true and wm.linked_player_id is not null and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist';
  select count(*) filter(where r.decision='validate'),count(*) filter(where r.decision='redraw') into v_validate,v_redraw from public.tournament_team_reviews r where r.tournament_id=t.id;
  select r.decision into v_my from public.tournament_team_reviews r where r.tournament_id=t.id and r.user_id=auth.uid();
  select exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist') into v_my_eligible;
  return jsonb_build_object('enabled',public.team_review_entitled(t.workspace_id),'requested',t.team_review_requested,'duration_minutes',t.team_review_duration_minutes,'status',t.team_review_status,'started_at',t.team_review_started_at,'deadline',t.team_review_deadline,'eligible_count',v_eligible,'validate_votes',v_validate,'redraw_votes',v_redraw,'my_vote',v_my,'my_eligible',v_my_eligible,'max_redraws',t.max_team_redraws,'redraws_used',t.team_redraws_used,'redraws_remaining',greatest(0,t.max_team_redraws-t.team_redraws_used));
end $$;

create or replace function public.get_home_team_review_notifications(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private'
as $$
declare v_is_admin boolean;v_result jsonb;
begin
  if not private.is_workspace_member(p_workspace_id) then raise exception 'Accès refusé'; end if;
  v_is_admin:=private.is_workspace_admin(p_workspace_id);
  perform public.finalize_tournament_team_review(t.id)
    from public.tournaments t
    where t.workspace_id=p_workspace_id and t.team_review_status='pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'tournament_id',t.id,'tournament_name',coalesce(t.name,'Tournoi'),'tournament_date',t.tournament_date,
    'status',t.team_review_status,'deadline',t.team_review_deadline,'duration_minutes',t.team_review_duration_minutes,
    'max_redraws',t.max_team_redraws,'redraws_used',t.team_redraws_used,'is_admin',v_is_admin,
    'eligible_count',(select count(*) from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'),
    'validate_votes',(select count(*) from public.tournament_team_reviews r where r.tournament_id=t.id and r.decision='validate'),
    'redraw_votes',(select count(*) from public.tournament_team_reviews r where r.tournament_id=t.id and r.decision='redraw'),
    'my_vote',(select r.decision from public.tournament_team_reviews r where r.tournament_id=t.id and r.user_id=auth.uid()),
    'my_eligible',exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'),
    'teams',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',te.id,'name',te.name,
      'players',(select coalesce(jsonb_agg(p.name order by p.name),'[]'::jsonb) from public.team_players tep join public.players p on p.id=tep.player_id where tep.team_id=te.id)
    ) order by te.created_at),'[]'::jsonb) from public.teams te where te.tournament_id=t.id)
  ) order by t.team_review_deadline nulls last,t.tournament_date),'[]'::jsonb) into v_result
  from public.tournaments t
  where t.workspace_id=p_workspace_id and t.status<>'finished' and coalesce(t.team_review_requested,false)=true
    and t.team_review_status in ('pending','redraw_requested')
    and (v_is_admin or exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'));
  return v_result;
end $$;

revoke all on function public.admin_configure_tournament_team_review(uuid,integer,boolean,integer) from public,anon;
revoke all on function public.start_tournament_team_review(uuid,boolean) from public,anon;
revoke all on function public.get_tournament_team_review_state(uuid) from public,anon;
revoke all on function public.get_home_team_review_notifications(uuid) from public,anon;
grant execute on function public.admin_configure_tournament_team_review(uuid,integer,boolean,integer) to authenticated;
grant execute on function public.start_tournament_team_review(uuid,boolean) to authenticated;
grant execute on function public.get_tournament_team_review_state(uuid) to authenticated;
grant execute on function public.get_home_team_review_notifications(uuid) to authenticated;

notify pgrst,'reload schema';
