begin;
-- Values remain inside this transaction: no shared tokens are exported.
do $$ declare v_token uuid; v_player uuid; v_tournament uuid; v_result jsonb; v_expected numeric;
begin
 select w.public_token,p.id,t.id into v_token,v_player,v_tournament
 from private.tournament_test_runs r join public.workspaces w on w.id=r.workspace_id
 join public.tournaments t on t.id=r.tournament_id join public.players p on p.workspace_id=w.id
 where r.request_id='0d9dfef5-a373-49d7-b734-300000000073' and p.name='Joueur test 30';
 if v_player is null then raise exception 'Test fixture missing'; end if;
 perform set_config('swe.test_rating_args',jsonb_build_object('token',v_token,'player',v_player,'tournament',v_tournament)::text,true);
 if (select count(*) from public.tournament_players where tournament_id=v_tournament and present)<>30 then raise exception 'Expected 30 registrations'; end if;
 select w.public_token,p.id,t.id into v_token,v_player,v_tournament from public.workspaces w
 join public.players p on p.workspace_id=w.id join public.tournaments t on t.workspace_id=w.id
 where t.short_code='18BD3F5' and lower(p.name)='forssa' limit 1;
 select round(avg(rating)::numeric,1) into v_expected from public.player_skill_ratings where player_id=v_player;
 v_result:=public.get_public_registration_player_rating(v_token,v_tournament,v_player);
 if (v_result->>'avg_rating')::numeric is distinct from v_expected then raise exception 'Selected live player rating mismatch'; end if;
 if v_result->>'rating_group_name'<>'Chien Boul Academy' then raise exception 'Group label mismatch'; end if;
end $$;
set local role anon;
do $$ declare a jsonb:=current_setting('swe.test_rating_args')::jsonb; v jsonb;
begin
 v:=public.get_public_registration_player_rating((a->>'token')::uuid,(a->>'tournament')::uuid,(a->>'player')::uuid);
 if v is null or v->>'avg_rating' is not null then raise exception 'Unrated player should be readable without authentication'; end if;
 if public.get_public_registration_player_rating(gen_random_uuid(),(a->>'tournament')::uuid,(a->>'player')::uuid) is not null then raise exception 'Invalid link accepted'; end if;
 if public.get_public_registration_player_rating((a->>'token')::uuid,gen_random_uuid(),(a->>'player')::uuid) is not null then raise exception 'Wrong tournament accepted'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000073","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
  perform public.super_admin_create_test_tournament(gen_random_uuid(),current_date+1,'classic');
  raise exception 'Unauthorized user created a test';
 exception when raise_exception then
  if sqlerrm<>'Accès Super Admin requis' then raise; end if;
 end;
 begin
  perform public.super_admin_list_test_tournaments();
  raise exception 'Unauthorized user read tests';
 exception when raise_exception then
  if sqlerrm<>'Accès Super Admin requis' then raise; end if;
 end;
end $$;
reset role;
select 'PASS: anonymous selected rating, missing rating, scoped token, live rating match and Super Admin authorization' as result;
rollback;
