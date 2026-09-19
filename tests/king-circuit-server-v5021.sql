-- Run inside a transaction with swe.test_tournament set to an authorized test ID.
-- Caller must ROLLBACK. Exercises the real RLS policies and integrity triggers.
do $$
declare
 tid uuid:=current_setting('swe.test_tournament')::uuid;
 t public.tournaments; first_match public.matches;
 st jsonb; win uuid; lose uuid; mw uuid; ml uuid; sw uuid; sl uuid;
 nk uuid; nm uuid; ns uuid; next_order integer;
 teams_before jsonb; finished_before jsonb;
begin
 select * into strict t from public.tournaments where id=tid for update;
 select * into strict first_match from public.matches where tournament_id=tid and id=(t.rotation_state#>>'{active,king}')::uuid for update;
 if first_match.status='finished' or (select count(*) from public.matches where tournament_id=tid)<>3 then raise exception 'Test fixture advanced; inspect before running'; end if;
 if not coalesce((t.rotation_state->>'initialized')::boolean,false) then raise exception 'Fixture circuit must be initialized'; end if;
 -- Demonstrate the original server failure before repairing the metadata.
 if first_match.rotation_generated is not true then
  begin
   update public.matches set status='finished' where id=first_match.id;
   raise exception 'Expected integrity guard did not reject manual match';
  exception when others then
   if sqlerrm<>'MATCH_MANUAL_DISABLED_AUTO_ROTATION' then raise; end if;
  end;
 end if;
 update public.matches set rotation_generated=true where tournament_id=tid and rotation_role in ('king','middle','stream');
 select jsonb_agg(to_jsonb(x) order by id) into teams_before from public.teams x where tournament_id=tid;
 select jsonb_agg(to_jsonb(x) order by id) into finished_before from public.matches x where tournament_id=tid and status='finished';
 st:=t.rotation_state;
 win:=case when first_match.home_score>first_match.away_score then first_match.home_team_id when first_match.away_score>first_match.home_score then first_match.away_team_id else coalesce((st->>'king_holder_team_id')::uuid,first_match.home_team_id) end;
 lose:=case when win=first_match.home_team_id then first_match.away_team_id else first_match.home_team_id end;
 mw:=(st#>>'{waiting,middle_winners,0}')::uuid;ml:=(st#>>'{waiting,middle_losers,0}')::uuid;
 sw:=(st#>>'{waiting,stream_winners,0}')::uuid;sl:=(st#>>'{waiting,stream_losers,0}')::uuid;
 if mw is null or ml is null or sw is null or sl is null then raise exception 'Missing previous results';end if;
 update public.matches set status='finished',finished_at=now(),rotation_role='king' where id=first_match.id;
 select coalesce(max(match_order),0)+1 into next_order from public.matches where tournament_id=tid;
 insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,pitch,round_label,status,started_at,rotation_role,rotation_generated)
 values(tid,win,mw,next_order,'Carrefour','👑 Roi','in_progress',now(),'king',true) returning id into nk;
 insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,pitch,round_label,status,started_at,rotation_role,rotation_generated)
 values(tid,lose,sw,next_order+1,'Mercedes','↕️ Intermédiaire','in_progress',now(),'middle',true) returning id into nm;
 insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,pitch,round_label,status,started_at,rotation_role,rotation_generated)
 values(tid,ml,sl,next_order+2,'Boulogne','🌊 Ruisseau','in_progress',now(),'stream',true) returning id into ns;
 st:=st||jsonb_build_object('active',jsonb_build_object('king',nk,'middle',nm,'stream',ns),'king_holder_team_id',win);
 st:=jsonb_set(st,'{waiting,middle_winners}',(st#>'{waiting,middle_winners}')-0);
 st:=jsonb_set(st,'{waiting,middle_losers}',(st#>'{waiting,middle_losers}')-0);
 st:=jsonb_set(st,'{waiting,stream_winners}',(st#>'{waiting,stream_winners}')-0);
 st:=jsonb_set(st,'{waiting,stream_losers}',(st#>'{waiting,stream_losers}')-0);
 update public.tournaments set rotation_state=st where id=tid;
 if (select count(*) from public.matches where tournament_id=tid and status='in_progress')<>3 then raise exception 'Expected 3 next matches'; end if;
 if (select count(distinct id) from (select home_team_id id from public.matches where tournament_id=tid and status='in_progress' union all select away_team_id from public.matches where tournament_id=tid and status='in_progress') p)<>6 then raise exception 'Active team reused'; end if;
 if teams_before is distinct from (select jsonb_agg(to_jsonb(x) order by id) from public.teams x where tournament_id=tid) then raise exception 'Existing teams changed'; end if;
 if finished_before is distinct from (select jsonb_agg(to_jsonb(x) order by id) from public.matches x where tournament_id=tid and status='finished' and id<>first_match.id) then raise exception 'Previous results changed'; end if;
 begin
  insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,pitch,status,rotation_generated)
  values(tid,win,mw,next_order+3,'Carrefour','scheduled',false);
  raise exception 'Manual creation unexpectedly allowed';
 exception when others then if sqlerrm<>'MATCH_MANUAL_DISABLED_AUTO_ROTATION' then raise; end if; end;
end $$;
