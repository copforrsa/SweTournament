create function public.fast_conquest_open_legacy_room(p_tournament_id uuid,p_users uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $f$
declare t public.tournaments%rowtype; users uuid[];co uuid;
begin
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update;
 if not found or not private.fast_admin(t.workspace_id) or not private.swe_workspace_full_access(t.workspace_id) then raise exception 'Organisateur autorisé requis';end if;
 if t.fast_team_mode<>'collaborative' or t.status<>'draft' or exists(select 1 from public.matches where tournament_id=t.id) or exists(select 1 from private.fast_conquest_sessions where tournament_id=t.id and (locked or state is not null)) then raise exception 'Salon indisponible après verrouillage ou lancement';end if;
 if t.registration_open and (select count(*) from public.tournament_players where tournament_id=t.id and present and registration_status<>'waitlist')<t.max_players then raise exception 'Ferme les inscriptions avant le vote';end if;
 if t.team_review_status in ('pending','redraw_requested') then return public.team_draw_room_state_v2(t.id);end if;
 users:=coalesce(p_users,(select array_agg(user_id) from private.fast_conquest_evaluators where tournament_id=t.id),'{}'::uuid[]);
 foreach co in array users loop
 if not exists(select 1 from public.workspace_members where workspace_id=t.workspace_id and user_id=co and role='coorganizer' and active) then raise exception 'Co-gestionnaire actif requis';end if;
 end loop;
 perform public.team_draw_room_setup_v2(t.id);
 update public.team_draw_room_voters_v2 set selected=user_id=any(users),selected_by=auth.uid(),selected_at=now() where tournament_id=t.id;
 insert into private.fast_conquest_sessions(tournament_id) values(t.id) on conflict do nothing;
 update private.fast_conquest_sessions set vote_open=false where tournament_id=t.id;
 delete from private.fast_conquest_evaluators where tournament_id=t.id;
 insert into private.fast_conquest_evaluators select t.id,unnest(users);
 update public.tournaments set registration_open=false,team_review_requested=true,draw_room_first_enabled=true,team_review_status='pending',team_review_started_at=now(),team_review_deadline=now()+interval '1 hour',team_review_duration_minutes=60,max_team_redraws=4,team_redraws_used=0 where id=t.id;
 if (select count(*) from public.teams where tournament_id=t.id)=6 and not exists(select 1 from public.team_draw_room_proposals where tournament_id=t.id) then perform public.team_draw_room_capture_current_v1(t.id);end if;
 return public.team_draw_room_state_v2(t.id);
end;$f$;
revoke all on function public.fast_conquest_open_legacy_room(uuid,uuid[]) from public,anon;
grant execute on function public.fast_conquest_open_legacy_room(uuid,uuid[]) to authenticated;
CREATE OR REPLACE FUNCTION public.team_draw_room_start_v2(p_tournament_id uuid, p_voter_user_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_t public.tournaments%rowtype;
  v_confirmed integer := 0;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then
    raise exception 'Seul l’administrateur peut ouvrir le salon';
  end if;
  if v_t.format='fast_conquest' then return public.fast_conquest_open_legacy_room(v_t.id,p_voter_user_ids);end if;
  if v_t.status = 'finished' or v_t.format = 'league' then
    raise exception 'Salon indisponible pour ce tournoi';
  end if;
  if not public.team_review_entitled(v_t.workspace_id) then
    raise exception 'La validation collaborative des équipes n’est pas activée pour cet espace';
  end if;
  if v_t.team_review_status in ('pending', 'redraw_requested') then
    raise exception 'Le salon est déjà ouvert';
  end if;
  if exists (select 1 from public.matches m where m.tournament_id = v_t.id) then
    raise exception 'Impossible d’ouvrir le salon après la création des matchs';
  end if;
  if exists (
    select 1 from public.teams tm
    where tm.tournament_id = v_t.id and not coalesce(tm.is_preformed, false)
  ) then
    raise exception 'Annule d’abord la création actuelle des équipes avant de recommencer le salon';
  end if;
  if exists (
    select 1 from public.team_draw_room_proposals pr
    where pr.tournament_id = v_t.id and pr.published_at is not null
  ) then
    raise exception 'Une composition est déjà publiée. Annule la création des équipes avant de recommencer.';
  end if;

  select count(*) into v_confirmed
  from public.tournament_players tp
  where tp.tournament_id = v_t.id
    and tp.present
    and coalesce(tp.registration_status, 'confirmed') <> 'waitlist';
  if coalesce(v_t.registration_open, false) and v_confirmed < v_t.max_players then
    raise exception 'Le salon s’ouvre quand les inscriptions sont fermées ou lorsque le quota est atteint';
  end if;

  perform public.team_draw_room_setup_v2(v_t.id);
  if p_voter_user_ids is not null then
    perform public.team_draw_room_save_voters_v2(v_t.id, p_voter_user_ids);
  end if;

  delete from public.team_draw_room_proposals where tournament_id = v_t.id;

  update public.tournaments
  set registration_open = false,
      team_review_requested = true,
      draw_room_first_enabled = true,
      team_review_status = 'pending',
      team_review_started_at = now(),
      team_review_deadline = now() + interval '1 hour',
      team_review_duration_minutes = 60,
      max_team_redraws = 4,
      team_redraws_used = 0
  where id = v_t.id;

  return public.team_draw_room_state_v2(v_t.id);
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_setup_v2(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_t public.tournaments%rowtype;
  v_confirmed integer := 0;
  v_voters jsonb := '[]'::jsonb;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then
    raise exception 'Seul l’administrateur peut préparer le salon';
  end if;
  if v_t.status = 'finished' or v_t.format = 'league' then
    raise exception 'Salon indisponible pour ce tournoi';
  end if;
  if not public.team_review_entitled(v_t.workspace_id) then
    raise exception 'La validation collaborative des équipes n’est pas activée pour cet espace';
  end if;
  if v_t.team_review_status in ('pending', 'redraw_requested') then
    raise exception 'Le salon est déjà ouvert';
  end if;

  -- Au premier affichage, chaque co-gestionnaire inscrit est coché par défaut.
  insert into public.team_draw_room_voters_v2
    (tournament_id, user_id, selected, selected_by, selected_at)
  select
    v_t.id,
    wm.user_id,
    exists (
      select 1
      from public.tournament_players tp
      where tp.tournament_id = v_t.id
        and tp.player_id = wm.linked_player_id
        and tp.present
        and coalesce(tp.registration_status, 'confirmed') <> 'waitlist'
    ),
    auth.uid(),
    now()
  from public.workspace_members wm
  where wm.workspace_id = v_t.workspace_id
    and wm.role = 'coorganizer'
    and coalesce(wm.active, true)
  on conflict (tournament_id, user_id) do nothing;

  select count(*) into v_confirmed
  from public.tournament_players tp
  where tp.tournament_id = v_t.id
    and tp.present
    and coalesce(tp.registration_status, 'confirmed') <> 'waitlist';

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', wm.user_id,
    'name', coalesce(p.name, 'Co-gestionnaire'),
    'registered', exists (
      select 1
      from public.tournament_players tp
      where tp.tournament_id = v_t.id
        and tp.player_id = wm.linked_player_id
        and tp.present
        and coalesce(tp.registration_status, 'confirmed') <> 'waitlist'
    ),
    'selected', coalesce(rv.selected, false)
  ) order by coalesce(p.name, 'Co-gestionnaire')), '[]'::jsonb)
  into v_voters
  from public.workspace_members wm
  left join public.players p on p.id = wm.linked_player_id
  left join public.team_draw_room_voters_v2 rv
    on rv.tournament_id = v_t.id and rv.user_id = wm.user_id
  where wm.workspace_id = v_t.workspace_id
    and wm.role = 'coorganizer'
    and coalesce(wm.active, true);

  return jsonb_build_object(
    'tournament_id', v_t.id,
    'tournament_name', coalesce(v_t.name, 'Tournoi'),
    'status', v_t.team_review_status,
    'confirmed_players', v_confirmed,
    'max_players', v_t.max_players,
    'registration_open', v_t.registration_open,
    'can_start', (not coalesce(v_t.registration_open, false) or v_confirmed >= v_t.max_players),
    'has_generated_teams', v_t.format<>'fast_conquest' and exists (
      select 1 from public.teams tm
      where tm.tournament_id = v_t.id and not coalesce(tm.is_preformed, false)
    ),
    'voters', v_voters
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_generate_v2(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype; v_proposal_count integer := 0; v_result jsonb;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul le pro peut générer une proposition'; end if;
  if not coalesce(v_t.draw_room_first_enabled, false) or v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon n’est pas ouvert'; end if;
  if exists (select 1 from public.matches m where m.tournament_id=v_t.id) then raise exception 'Impossible de modifier les équipes après la création des matchs'; end if;
  select count(*) into v_proposal_count from public.team_draw_room_proposals where tournament_id=v_t.id;
  if v_proposal_count >= 5 then raise exception 'La limite de cinq propositions est atteinte'; end if;
  perform set_config('swe.draw_room_tournament', v_t.id::text, true);
  if v_t.format='fast_conquest' then
   select public.fast_conquest_generate_teams(v_t.id) into v_result;
   perform private.diversify_draw_v4466(v_t.id);
  else select public.generate_swe_tournament_teams(v_t.id) into v_result;end if;
  perform public.team_draw_room_capture_current_v1(v_t.id);
  update public.tournaments set team_redraws_used=greatest(0,v_proposal_count), team_review_status='pending' where id=v_t.id;
  return public.team_draw_room_state_v2(v_t.id);
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_publish_v2(p_tournament_id uuid, p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype;v_result jsonb;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul le pro peut publier la composition'; end if;
  if not coalesce(v_t.draw_room_first_enabled, false) or v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon n’est pas ouvert'; end if;
  if not exists (select 1 from public.team_draw_room_proposals pr where pr.id=p_proposal_id and pr.tournament_id=v_t.id) then raise exception 'Proposition introuvable'; end if;
  if exists (select 1 from public.matches m where m.tournament_id=v_t.id) then raise exception 'Impossible de publier après la création des matchs'; end if;
  v_result:=public.team_draw_room_publish_v1(v_t.id,p_proposal_id);
  if v_t.format='fast_conquest' then perform public.fast_conquest_manage(v_t.id,'lock','{}'::jsonb);end if;
  return v_result;
end;
$function$;
CREATE OR REPLACE FUNCTION public.fast_conquest_inbox(p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'vote_open',coalesce(s.vote_open,false),'notes_open',coalesce(s.notes_open,false),'composition_ready',t.status='draft' and t.fast_team_mode='collaborative' and not coalesce(s.locked,false) and s.state is null))
 from public.tournaments t left join private.fast_conquest_sessions s on s.tournament_id=t.id
 where t.workspace_id=p_workspace_id and t.format='fast_conquest' and private.swe_workspace_full_access(t.workspace_id)
 and (private.fast_admin(t.workspace_id) or private.fast_designated(t.id))
 and (s.vote_open or s.notes_open and (private.fast_admin(t.workspace_id) or private.fast_present(t.id))
 or t.status='draft' and t.fast_team_mode='collaborative' and not coalesce(s.locked,false) and s.state is null and t.team_review_status not in ('pending','redraw_requested')
 and (not t.registration_open or t.registration_deadline<=now() or (select count(*) from public.tournament_players p where p.tournament_id=t.id and p.present)>=t.max_players))),'[]'::jsonb);
end;$function$;