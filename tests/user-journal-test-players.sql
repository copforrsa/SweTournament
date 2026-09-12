begin;
do $$ declare t jsonb;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.platform_super_admins limit 1),'role','authenticated')::text,true);
 t:=public.super_admin_create_test_tournament(gen_random_uuid(),current_date,'classic');
 perform set_config('swe.fixture_workspace',t->>'workspace_id',true);
 perform set_config('swe.fixture_tournament',t->>'tournament_id',true);
 perform set_config('swe.real_player',(select id::text from public.players where workspace_id='3a7b90b2-46a1-4125-9e6b-f580455b5cdb' limit 1),true);
 if (select count(*) from private.test_player_registry r join public.players p on p.id=r.player_id where p.workspace_id=(t->>'workspace_id')::uuid)<>30 then raise exception 'Fixture players not registered';end if;
 if private.journal_safe_values('{"token":"secret","phone_number":"private","status":"live"}')<>'{"status":"live"}'::jsonb then raise exception 'Secret values exposed';end if;
end $$;
set local role authenticated;
do $$ declare ids uuid[];blocked boolean:=false; feed jsonb;visit uuid:=gen_random_uuid(); n integer;begin
 select array_agg(id) into ids from public.players where workspace_id=current_setting('swe.fixture_workspace')::uuid;
 update public.players set name='unit-test-journal-name' where id=ids[1];
 feed:=public.super_admin_get_user_journal('unit-test-journal-name');
 if jsonb_array_length(feed->'rows')=0 or feed->'rows'->0->>'actor_id'<>auth.uid()::text then raise exception 'User or mutation missing from journal';end if;
 perform public.record_my_app_visit(visit);perform public.record_my_app_visit(visit);
 begin perform public.super_admin_delete_test_players(ids||current_setting('swe.real_player')::uuid);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Real player allowed';end if;
 n:=public.super_admin_delete_test_players(ids);if n<>30 then raise exception 'Wrong deletion count: %',n;end if;
 if exists(select 1 from public.players where id=any(ids)) then raise exception 'Test players remain';end if;
 feed:=public.super_admin_get_user_journal('test_players.bulk_delete');if jsonb_array_length(feed->'rows')=0 then raise exception 'Bulk deletion not logged';end if;
 perform public.super_admin_manage_test_tournament(current_setting('swe.fixture_tournament')::uuid,'delete');
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.players where id=current_setting('swe.real_player')::uuid) then raise exception 'Real player changed';end if;
 if exists(select actor_user_id,request_id from public.security_audit_log where action='app.session_open' group by actor_user_id,request_id having count(*)>1) then raise exception 'Duplicate visit';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare blocked boolean:=false;begin
 begin perform public.super_admin_get_user_journal();exception when others then blocked:=true;end;if not blocked then raise exception 'Member read allowed';end if;
 blocked:=false;begin perform public.super_admin_delete_test_players(array[]::uuid[]);exception when others then blocked:=true;end;if not blocked then raise exception 'Member delete allowed';end if;
end $$;
reset role;
set local role anon;
do $$ declare blocked boolean:=false;begin
 begin perform public.super_admin_get_user_journal();exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous read allowed';end if;
end $$;
reset role;
rollback;
select 'PASS: journal author and changes, secret redaction, session deduplication, fixture marking/deletion, real-player protection, authorization and rollback' as result;
