begin;
do $$
declare tid uuid; wid uuid; uid uuid; pid uuid; r jsonb;
begin
 select t.id,t.workspace_id into tid,wid from public.tournaments t where t.name='TEST Glacière — 16/09/2026' limit 1;
 select wm.user_id into uid from public.workspace_members wm join public.players p on p.id=wm.linked_player_id where wm.workspace_id=wid and wm.role='coorganizer' and p.name='Dopé';
 select tp.player_id into pid from public.tournament_players tp join public.players p on p.id=tp.player_id where tp.tournament_id=tid and p.name<>'Dopé' and tp.present limit 1;
 if uid is null or pid is null then raise exception 'Missing test fixture';end if;
 update public.tournament_rating_sessions set status='open',closes_at=now()+interval '1 hour' where tournament_id=tid;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 execute 'set local role authenticated';
 begin perform public.get_post_tournament_rating_sheet(tid);raise exception 'Sheet allowed';exception when others then if sqlerrm<>'La notation après tournoi sera disponible une fois le tournoi terminé' then raise;end if;end;
 begin perform public.submit_player_skill_review_v2(pid,3::smallint,3::smallint,3::smallint,3::smallint,'metronome',null,null,tid);raise exception 'Initial rating allowed';exception when others then if sqlerrm<>'La notation après tournoi sera disponible une fois le tournoi terminé' then raise;end if;end;
 begin perform public.submit_post_tournament_player_observation_v1(tid,pid,4::smallint);raise exception 'Observation allowed';exception when others then if sqlerrm<>'La notation après tournoi sera disponible une fois le tournoi terminé' then raise;end if;end;
 begin perform public.complete_post_tournament_rating_session(tid);raise exception 'Completion allowed';exception when others then if sqlerrm<>'La notation après tournoi sera disponible une fois le tournoi terminé' then raise;end if;end;
 if exists(select 1 from public.get_my_post_tournament_rating_sessions(wid) where tournament_id=tid) or exists(select 1 from public.get_my_post_tournament_rating_sessions_v2(wid) where tournament_id=tid) then raise exception 'Unfinished tournament advertised';end if;
 r:=public.get_my_coorganizer_tournament_action_progress_v1(tid);
 if (r->'rating_action'->>'selected')::boolean or r->'rating_action'->>'status'<>'not_started' then raise exception 'Dashboard offers ratings';end if;
 execute 'reset role';
 update public.tournaments set status='finished' where id=tid;
 execute 'set local role authenticated';
 r:=public.get_post_tournament_rating_sheet(tid);
 if r->'tournament'->>'id'<>tid::text then raise exception 'Finished tournament unavailable';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS Dopé blocked from sheet, initial rating, appreciation and completion before finish, including stale open session; available after finish; no test data saved' result;
