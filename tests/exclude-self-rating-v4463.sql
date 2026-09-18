begin;
do $$
declare f record; sheet jsonb; progress jsonb; expected integer; actual integer;
begin
 select e.tournament_id,e.evaluator_user_id,wm.linked_player_id,wm.role into f
 from public.tournament_rating_evaluators e join public.tournaments t on t.id=e.tournament_id
 join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.user_id=e.evaluator_user_id
 where wm.linked_player_id is not null and wm.role='coorganizer' and wm.active
 and exists(select 1 from public.team_players tp join public.teams tm on tm.id=tp.team_id where tm.tournament_id=t.id and tp.player_id=wm.linked_player_id)
 order by t.tournament_date desc limit 1;
 if f is null then raise exception 'Missing linked evaluator fixture'; end if;
 perform set_config('request.jwt.claim.sub',f.evaluator_user_id::text,true);
 select count(distinct tp.player_id)-1 into expected from public.team_players tp join public.teams tm on tm.id=tp.team_id
 join public.tournament_players p on p.tournament_id=tm.tournament_id and p.player_id=tp.player_id
 where tm.tournament_id=f.tournament_id and p.present and coalesce(p.registration_status,'')<>'waitlist';
 execute 'set local role authenticated';
 sheet:=public.get_post_tournament_rating_sheet(f.tournament_id);
 select count(*) into actual from jsonb_array_elements(sheet->'teams') tm cross join lateral jsonb_array_elements(tm->'players') p;
 if actual<>expected then raise exception 'Sheet: expected %, got %',expected,actual;end if;
 if exists(select 1 from jsonb_array_elements(sheet->'teams') tm cross join lateral jsonb_array_elements(tm->'players') p where p->>'player_id'=f.linked_player_id::text) then raise exception 'Own player still shown';end if;
 progress:=public.get_my_coorganizer_tournament_action_progress_v1(f.tournament_id);
 if (progress->'rating_action'->>'total')::int<>expected then raise exception 'Dashboard count mismatch';end if;
 execute 'reset role';
 update public.tournament_rating_sessions set status='open',closes_at=now()+interval '1 hour' where tournament_id=f.tournament_id;
 execute 'set local role authenticated';
 begin
  perform public.submit_post_tournament_player_observation_v1(f.tournament_id,f.linked_player_id,6::smallint);
  raise exception 'TEST_FAILED self appreciation accepted';
 exception when others then if sqlerrm<>'Tu ne peux pas évaluer ton propre profil' then raise;end if;end;
 execute 'reset role';
 raise notice 'PASS: % other players, own profile excluded, matching dashboard, self appreciation rejected',expected;
end $$;
rollback;
select 'PASS: self exclusion, matching counts, self appreciation blocked; rollback complete' validation;
