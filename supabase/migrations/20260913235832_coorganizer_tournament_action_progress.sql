create or replace function public.get_my_coorganizer_tournament_action_progress_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments%rowtype;
  v_member public.workspace_members%rowtype;
  v_permissions public.coorganizer_permissions%rowtype;
  v_review jsonb := '{}'::jsonb;
  v_rating_session public.tournament_rating_sessions%rowtype;
  v_rating_completed_at timestamptz;
  v_team_total integer := 0;
  v_rating_total integer := 0;
  v_rating_done integer := 0;
  v_profile_name text;
begin
  if v_user_id is null then raise exception 'Authentification requise'; end if;
  select * into v_tournament from public.tournaments t where t.id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;

  select * into v_member
  from public.workspace_members wm
  where wm.workspace_id=v_tournament.workspace_id
    and wm.user_id=v_user_id
    and wm.role='coorganizer'
    and coalesce(wm.active,true)=true;
  if not found then raise exception 'Accès refusé'; end if;

  select * into v_permissions
  from public.coorganizer_permissions cp
  where cp.workspace_id=v_tournament.workspace_id and cp.user_id=v_user_id;

  select p.name into v_profile_name from public.players p where p.id=v_member.linked_player_id;
  select count(*) into v_team_total from public.teams tm where tm.tournament_id=p_tournament_id;

  if public.team_review_entitled(v_tournament.workspace_id) then
    v_review:=public.get_tournament_team_review_state(p_tournament_id);
  end if;

  select s.* into v_rating_session
  from public.tournament_rating_sessions s
  where s.tournament_id=p_tournament_id;

  select e.completed_at into v_rating_completed_at
  from public.tournament_rating_evaluators e
  where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id;

  if exists(
    select 1 from public.tournament_rating_evaluators e
    where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id
  ) then
    select count(distinct tp.player_id) into v_rating_total
    from public.team_players tp
    join public.teams tm on tm.id=tp.team_id and tm.tournament_id=p_tournament_id
    join public.tournament_players tpp on tpp.tournament_id=p_tournament_id and tpp.player_id=tp.player_id
    where coalesce(tpp.present,false)=true and coalesce(tpp.registration_status,'')<>'waitlist';

    select count(distinct h.player_id) into v_rating_done
    from public.player_skill_rating_history h
    where h.tournament_id=p_tournament_id and h.evaluator_user_id=v_user_id;
  end if;

  return jsonb_build_object(
    'tournament',jsonb_build_object(
      'id',v_tournament.id,
      'workspace_id',v_tournament.workspace_id,
      'name',coalesce(v_tournament.name,'SWÉ du '||to_char(v_tournament.tournament_date,'DD/MM/YYYY')),
      'date',v_tournament.tournament_date,
      'status',v_tournament.status
    ),
    'profile',jsonb_build_object('linked_player_id',v_member.linked_player_id,'name',v_profile_name),
    'permissions',jsonb_build_object(
      'can_enter_scores',coalesce(v_permissions.can_enter_scores,false),
      'can_view_players',coalesce(v_permissions.can_view_players,true),
      'can_generate_teams',coalesce(v_permissions.can_generate_teams,false),
      'can_create_tournaments',coalesce(v_permissions.can_create_tournaments,false),
      'can_add_members',coalesce(v_permissions.can_add_members,false),
      'can_delete_members',coalesce(v_permissions.can_delete_members,false),
      'can_invite_coorganizers',coalesce(v_permissions.can_invite_coorganizers,false),
      'temporary_admin_until',v_permissions.temporary_admin_until,
      'personal_instructions',v_permissions.personal_instructions
    ),
    'team_action',jsonb_build_object(
      'total',v_team_total,
      'done',case when coalesce(v_review->>'my_vote','')<>'' then v_team_total else 0 end,
      'enabled',coalesce((v_review->>'enabled')::boolean,false),
      'requested',coalesce((v_review->>'requested')::boolean,false),
      'eligible',coalesce((v_review->>'my_eligible')::boolean,false),
      'status',coalesce(v_review->>'status','not_started'),
      'my_vote',v_review->>'my_vote',
      'deadline',v_review->>'deadline'
    ),
    'rating_action',jsonb_build_object(
      'selected',exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=p_tournament_id and e.evaluator_user_id=v_user_id),
      'total',v_rating_total,
      'done',least(v_rating_done,v_rating_total),
      'completed_at',v_rating_completed_at,
      'status',case when v_rating_session.tournament_id is null then 'not_started' when v_rating_session.status<>'open' or v_rating_session.closes_at<=now() then 'expired' else 'open' end,
      'deadline',v_rating_session.closes_at
    )
  );
end
$function$;

revoke all on function public.get_my_coorganizer_tournament_action_progress_v1(uuid) from public,anon;
grant execute on function public.get_my_coorganizer_tournament_action_progress_v1(uuid) to authenticated;
