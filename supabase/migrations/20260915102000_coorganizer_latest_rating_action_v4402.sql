-- V44.02: expose only the latest open rating action assigned to the current co-organizer.

create or replace function public.get_my_coorganizer_latest_rating_action_v1(p_workspace_id uuid)
returns jsonb
language plpgsql security definer
set search_path='public','private','auth','pg_temp'
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_player uuid;
  v_tournament public.tournaments%rowtype;
  v_session public.tournament_rating_sessions%rowtype;
  v_total integer:=0;
  v_done integer:=0;
  v_completed_at timestamptz;
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  select wm.linked_player_id into v_player
  from public.workspace_members wm
  where wm.workspace_id=p_workspace_id and wm.user_id=v_uid and wm.role='coorganizer' and coalesce(wm.active,true)=true;
  if not found then raise exception 'Accès refusé'; end if;

  select t.* into v_tournament
  from public.tournaments t
  join public.tournament_rating_sessions s on s.tournament_id=t.id and s.status='open' and s.closes_at>now()
  join public.tournament_rating_evaluators e on e.tournament_id=t.id and e.evaluator_user_id=v_uid
  join public.tournament_players mine on mine.tournament_id=t.id and mine.player_id=v_player
    and coalesce(mine.present,false)=true and coalesce(mine.registration_status,'')<>'waitlist'
  where t.workspace_id=p_workspace_id
  order by t.tournament_date desc nulls last,t.created_at desc
  limit 1;

  if v_tournament.id is null then
    return jsonb_build_object('assigned',false,'rating_action',jsonb_build_object('selected',false,'status','not_started'));
  end if;

  select s.* into v_session from public.tournament_rating_sessions s where s.tournament_id=v_tournament.id;

  select count(distinct tp.player_id) into v_total
  from public.team_players tp
  join public.teams tm on tm.id=tp.team_id and tm.tournament_id=v_tournament.id
  join public.tournament_players tpp on tpp.tournament_id=v_tournament.id and tpp.player_id=tp.player_id
  where coalesce(tpp.present,false)=true and coalesce(tpp.registration_status,'')<>'waitlist';

  select count(distinct h.player_id) into v_done
  from public.player_skill_rating_history h
  where h.tournament_id=v_tournament.id and h.evaluator_user_id=v_uid;

  select e.completed_at into v_completed_at
  from public.tournament_rating_evaluators e
  where e.tournament_id=v_tournament.id and e.evaluator_user_id=v_uid;

  return jsonb_build_object(
    'assigned',true,
    'tournament',jsonb_build_object(
      'id',v_tournament.id,
      'name',coalesce(v_tournament.name,'SWÉ du '||to_char(v_tournament.tournament_date,'DD/MM/YYYY')),
      'date',v_tournament.tournament_date
    ),
    'rating_action',jsonb_build_object(
      'selected',true,'total',v_total,'done',least(v_done,v_total),'completed_at',v_completed_at,
      'status','open','deadline',v_session.closes_at
    )
  );
end;
$$;

revoke all on function public.get_my_coorganizer_latest_rating_action_v1(uuid) from public,anon;
grant execute on function public.get_my_coorganizer_latest_rating_action_v1(uuid) to authenticated;
