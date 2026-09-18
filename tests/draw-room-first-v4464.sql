-- Roll back all simulated draws, votes and publications: leave the test room empty.
begin;
do $$
declare tid uuid; uid uuid; voter uuid; token uuid; s jsonb; proposal uuid;
begin
 select t.id,wm.user_id,w.public_token into tid,uid,token from public.tournaments t
 join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and wm.active
 join public.workspaces w on w.id=t.workspace_id where t.name='TEST Glacière — 16/09/2026' and t.draw_room_first_enabled limit 1;
 if tid is null then raise exception 'Missing test room';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 execute 'set local role authenticated';
 s:=public.team_draw_room_open_v1(tid);
 if jsonb_array_length(s->'proposals')<>0 then raise exception 'Opening generated teams';end if;
 begin
  perform public.generate_swe_tournament_teams(tid);raise exception 'TEST_FAILED direct generation';
 exception when others then if sqlerrm<>'Ouvre le salon pour lancer le tirage' then raise;end if;end;
 s:=public.team_draw_room_redraw_v1(tid);
 if jsonb_array_length(s->'proposals')<>1 or (s->>'redraws_used')::int<>0 then raise exception 'First draw counted as redraw';end if;
 proposal:=(s->>'current_proposal_id')::uuid;
 execute 'reset role';
 update public.tournaments set team_review_deadline=now()-interval '1 minute' where id=tid;
 execute 'set local role anon';
 s:=public.get_public_workspace_snapshot_v2(token);
 if exists(select 1 from jsonb_array_elements(s->'teams') x where x->>'tournament_id'=tid::text) then raise exception 'Private teams exposed or auto-published';end if;
 execute 'reset role';
 select wm.user_id into voter from public.workspace_members wm join public.tournament_players tp on tp.player_id=wm.linked_player_id and tp.tournament_id=tid where wm.role='coorganizer' and wm.active and tp.present limit 1;
 if voter is null then raise exception 'No eligible co-manager';end if;
 perform set_config('request.jwt.claim.sub',voter::text,true);
 execute 'set local role authenticated';
 perform public.team_draw_room_vote_v1(tid,proposal,'keep');
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',uid::text,true);
 execute 'set local role authenticated';
 perform public.team_draw_room_publish_v1(tid,proposal);
 execute 'reset role';
 s:=public.get_public_workspace_snapshot_v2(token);
 if (select count(*) from jsonb_array_elements(s->'teams') x where x->>'tournament_id'=tid::text)<>4 then raise exception 'Published teams missing';end if;
end $$;
rollback;
select 'PASS empty room, first draw, quota, privacy, co-manager vote, admin publication; test room left empty' validation;
