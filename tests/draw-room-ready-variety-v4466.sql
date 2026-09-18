begin;
do $$
declare tid uuid; admin_id uuid; voter uuid; s jsonb; sigs text[]:='{}'; sig text; k integer; p1 uuid; old_count integer;
begin
 select t.id,wm.user_id into tid,admin_id from public.tournaments t join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and wm.active where t.name='TEST Glacière — 16/09/2026' limit 1;
 select wm.user_id into voter from public.workspace_members wm join public.tournament_players tp on tp.player_id=wm.linked_player_id and tp.tournament_id=tid where wm.role='coorganizer' and wm.active and tp.present limit 1;
 if tid is null or voter is null then raise exception 'Missing fixture';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 execute 'set local role authenticated';
 s:=public.team_draw_room_ready_v1(tid,true);
 if not (s->>'mine')::boolean or not (s->>'admin_ready')::boolean or jsonb_array_length(s->'participants')=0 then raise exception 'Admin readiness failed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',voter::text,true);
 execute 'set local role authenticated';
 s:=public.team_draw_room_ready_v1(tid,true);
 if not (s->>'admin_ready')::boolean or not (s->>'mine')::boolean or jsonb_array_length(s->'participants')<>0 then raise exception 'Co-manager readiness/privacy failed';end if;
 execute 'reset role';
 update private.draw_room_readiness set updated_at=now()-interval '61 seconds' where tournament_id=tid;
 execute 'set local role authenticated';
 s:=public.team_draw_room_ready_v1(tid,null);
 if (s->>'mine')::boolean or (s->>'admin_ready')::boolean then raise exception 'Stale status did not expire';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 execute 'set local role authenticated';
 begin
  perform public.team_draw_room_ready_v1(tid,true);
  raise exception 'Unauthorized readiness accepted';
 exception when others then if sqlerrm<>'Accès au salon refusé' then raise;end if;end;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 for k in 1..5 loop
  update public.tournaments set team_redraws_used=0 where id=tid;
  execute 'set local role authenticated';
  s:=public.team_draw_room_redraw_v1(tid);
  execute 'reset role';
  sig:=private.draw_roster_signature_v4466(s->'proposals'->0->'snapshot');
  if sig=any(sigs) then raise exception 'Repeated composition';end if;
  sigs:=array_append(sigs,sig);
  if (select max((t->>'average_rating')::numeric)-min((t->>'average_rating')::numeric) from jsonb_array_elements(s->'proposals'->0->'snapshot'->'teams') t)>0.5 then raise exception 'Unbalanced test teams';end if;
 end loop;
end $$;
rollback;
select 'PASS readiness visibility, expiry, unauthorized access, five different balanced draws; all changes rolled back' result;
