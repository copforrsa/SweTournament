CREATE OR REPLACE FUNCTION public.fast_conquest_commit(p_tournament_id uuid, p_actor uuid, p_version integer, p_state jsonb, p_action text, p_match_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype; c jsonb; m jsonb; mid uuid; round2 boolean; active boolean; begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text,5100));
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update;
 if not found then raise exception 'Fast Conquête introuvable'; end if;
 c:=public.fast_conquest_context(t.id);
 if not coalesce((c->>'entitled')::boolean,false) or (p_action in ('start','draw','validate_draw','correct','delete_match','repair','reset') and not (c->>'admin')::boolean) or (p_action='finish' and not (c->>'can_score')::boolean) or p_action not in ('start','draw','validate_draw','correct','delete_match','repair','reset','finish') then raise exception 'Action non autorisée'; end if;
 insert into private.fast_conquest_sessions(tournament_id) values(t.id) on conflict do nothing;
 select * into s from private.fast_conquest_sessions where tournament_id=t.id for update;
 if s.version<>p_version then raise exception 'VERSION_CONFLICT: actualise avant de réessayer'; end if;
 if not s.locked then raise exception 'Équipes non verrouillées'; end if;
 perform set_config('swe.fast_commit','on',true);
 if p_action in ('correct','delete_match','reset') then
  delete from public.matches x where x.tournament_id=t.id and x.competition_type='fast_conquest' and not exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and (r->>'home')::uuid=x.home_team_id and (r->>'away')::uuid=x.away_team_id and coalesce((r->>'deleted')::boolean,false)=false);
  delete from public.goals g using public.matches x where g.match_id=x.id and x.tournament_id=t.id and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
  delete from public.match_player_assignments a using public.matches x where a.match_id=x.id and x.tournament_id=t.id and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
  -- Reset generated descendants whose slots survive but whose results no longer do.
  update public.matches x set pitch=null,status='scheduled',home_score=0,away_score=0,tie_break_winner_team_id=null,finished_at=null where x.tournament_id=t.id and x.competition_type='fast_conquest' and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
 end if;
 -- Release completed matches before allocating the next round to its terrains.
 for m in select value from jsonb_array_elements(p_state->'matches') where value->>'status'='finished' loop
  update public.matches set status='finished',home_score=(m->>'homeScore')::integer,away_score=(m->>'awayScore')::integer,finished_at=coalesce(finished_at,now()),tie_break_winner_team_id=case when m->>'homeScore'=m->>'awayScore' then (m->>'winner')::uuid else null end,tie_break_method_used=case when m->>'penalties' is not null then 'penalties_3' else null end where tournament_id=t.id and format_slot='fast:'||(m->>'id');
 end loop;
 round2:=not exists(select 1 from jsonb_array_elements(p_state->'matches') r where r->>'label'='Qualification 1' and r->>'status'<>'finished');
 for m in select value from jsonb_array_elements(p_state->'matches') where coalesce((value->>'deleted')::boolean,false)=false loop
  active:=m->>'phase'=p_state->>'phase' and m->>'status'<>'finished' and (m->>'phase'<>'qualification' or m->>'label'=case when round2 then 'Qualification 2' else 'Qualification 1' end);
  if exists(select 1 from public.matches where tournament_id=t.id and format_slot='fast:'||(m->>'id')) then
   update public.matches set pitch=case when status='finished' then pitch when active then m->>'pitch' else null end where tournament_id=t.id and format_slot='fast:'||(m->>'id');
  else
  insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,pitch,round_label,rotation_role,rotation_generated,competition_type,format_stage,format_slot,workflow_version)
  values(t.id,(m->>'home')::uuid,(m->>'away')::uuid,(m->>'order')::integer,m->>'status',case when active then m->>'pitch' else null end,(m->>'label')||' · '||(m->>'pitch'),'fast_conquest',true,'fast_conquest',m->>'phase','fast:'||(m->>'id'),1)
;
  end if;
  insert into public.match_player_assignments(match_id,team_id,player_id) select x.id,tp.team_id,tp.player_id from public.matches x join public.team_players tp on tp.team_id in (x.home_team_id,x.away_team_id) where x.tournament_id=t.id and x.format_slot='fast:'||(m->>'id') and m->>'status'='scheduled' and not exists(select 1 from public.match_player_assignments a where a.match_id=x.id) on conflict(match_id,player_id) do nothing;
 end loop;
 update private.fast_conquest_sessions set state=p_state,version=version+1,notes_open=p_state->>'phase'='finished' and not notes_closed where tournament_id=t.id;
 update public.tournaments set status=case when p_state->>'phase'='finished' then 'finished' else 'live' end,registration_open=false,rotation_mode='fast_conquest',rotation_state=jsonb_build_object('initialized',true,'fast_conquest',p_state) where id=t.id;
 perform set_config('swe.fast_commit','off',true);
 return public.fast_conquest_context(t.id);
end $function$
