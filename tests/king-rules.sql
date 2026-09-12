begin;
do $$ declare tid uuid; wid uuid; tok uuid; pid uuid; n integer; i integer; v jsonb;
begin
 select r.tournament_id,r.workspace_id into tid,wid from private.tournament_test_runs r join public.tournaments t on t.id=r.tournament_id where t.short_code='3AF14A2';
 if tid is null then raise exception 'Isolated fixture missing'; end if;
 select public_token into tok from public.workspaces where id=wid;
 update public.tournaments set format='king_of_pitch' where id=tid;
 for i in 31..35 loop
  insert into public.players(workspace_id,name) values(wid,'Validation règles '||i) returning id into pid;
  insert into public.tournament_players(tournament_id,player_id,present,registration_status) values(tid,pid,true,'confirmed');
 end loop;
 for n in 15..35 by 5 loop
  with ranked as(select player_id,row_number() over(order by player_id) rn from public.tournament_players where tournament_id=tid)
  update public.tournament_players p set present=(r.rn<=n) from ranked r where p.tournament_id=tid and p.player_id=r.player_id;
  v:=public.get_public_tournament_king_rules(tok,tid);
  if (v->>'team_count')::int<>n/5 or v->>'title' not like n||' joueurs%' then raise exception 'Wrong rules for %: %',n,v; end if;
  if v->>'common_body' not like '%3 tireurs%' then raise exception 'Missing first king penalties'; end if;
  if n=15 and v->>'title' not like '%1 terrain' then raise exception 'Wrong pitch count for 15'; end if;
 end loop;
 perform set_config('swe.king_test',jsonb_build_object('token',tok,'tid',tid)::text,true);
end $$;
set local role anon;
do $$ declare a jsonb:=current_setting('swe.king_test')::jsonb; v jsonb;
begin
 v:=public.get_public_tournament_king_rules((a->>'token')::uuid,(a->>'tid')::uuid);
 if v->>'title' not like '35 joueurs%' or v ? 'rules' then raise exception 'Public scope invalid'; end if;
 if public.get_public_tournament_king_rules(gen_random_uuid(),(a->>'tid')::uuid) is not null then raise exception 'Invalid public token accepted'; end if;
 begin perform public.super_admin_get_king_rules();raise exception 'Anonymous catalog allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000075","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.super_admin_get_king_rules();raise exception 'Member read all cases';exception when raise_exception then if sqlerrm<>'Accès Super Admin requis' then raise;end if;end;
 begin perform public.super_admin_save_king_rule(3,'Interdit','Interdit');raise exception 'Member modified rules';exception when raise_exception then if sqlerrm<>'Accès Super Admin requis' then raise;end if;end;
end $$;
reset role;
do $$ declare uid uuid; begin select user_id into uid from public.platform_super_admins limit 1;perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);end $$;
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.super_admin_get_king_rules())<>6 then raise exception 'Super Admin cases incomplete';end if;
 perform public.super_admin_save_king_rule(3,'Essai temporaire','Essai enregistré dans une transaction annulée.');
 if not exists(select 1 from jsonb_array_elements(public.super_admin_get_king_rules()) x where x->>'title'='Essai temporaire') then raise exception 'Save not applied';end if;
end $$;
reset role;
select 'PASS: 15/20/25/30/35 players, one public case, first-match TAB, anonymous/member denial, Super Admin edit' as result;
rollback;
