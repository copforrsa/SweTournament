begin;
do $$ declare test jsonb;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.platform_super_admins limit 1),'role','authenticated')::text,true);
 test:=public.super_admin_create_test_tournament(gen_random_uuid(),current_date,'classic');
 perform set_config('swe.test_id',test->>'tournament_id',true);
 perform set_config('swe.test_workspace',test->>'workspace_id',true);
end $$;
set local role authenticated;
do $$ declare result jsonb;blocked boolean:=false;begin
 result:=public.super_admin_manage_test_tournament(current_setting('swe.test_id')::uuid,'open');
 if result->>'workspace_id'<>current_setting('swe.test_workspace') then raise exception 'Wrong workspace';end if;
 if not exists(select 1 from public.tournaments where id=current_setting('swe.test_id')::uuid) then raise exception 'Tournament not visible under RLS';end if;
 update public.tournaments set name='TEST — Administration verified' where id=current_setting('swe.test_id')::uuid;
 if not found then raise exception 'Tournament not editable under RLS';end if;
 begin perform public.super_admin_manage_test_tournament('9fc0910f-baeb-4a85-b7e8-9915b8fe7c1d','delete');exception when others then blocked:=true;end;
 if not blocked then raise exception 'Real tournament allowed';end if;
 perform public.super_admin_manage_test_tournament(current_setting('swe.test_id')::uuid,'delete');
 if exists(select 1 from public.tournaments where id=current_setting('swe.test_id')::uuid) then raise exception 'Deletion failed';end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from private.tournament_test_runs where tournament_id=current_setting('swe.test_id')::uuid) or exists(select 1 from public.tournament_players where tournament_id=current_setting('swe.test_id')::uuid) then raise exception 'Dependent test data remains';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare action text;blocked boolean;begin
 foreach action in array array['open','delete'] loop
 blocked:=false;
 begin perform public.super_admin_manage_test_tournament(current_setting('swe.test_id')::uuid,action);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Ordinary user allowed';end if;
 end loop;
end $$;
reset role;
set local role anon;
do $$ declare blocked boolean:=false;begin
 begin perform public.super_admin_manage_test_tournament(current_setting('swe.test_id')::uuid,'delete');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous allowed';end if;
end $$;
reset role;
rollback;
select 'PASS: Super Admin open/edit/delete, cascades, real tournament protection, member/anonymous denial; rolled back' as result;
