begin;
do $$
declare allowed_uid uuid; blocked_uid uuid; super_uid uuid; v boolean; d jsonb; before_enabled boolean;
begin
 select id into allowed_uid from auth.users where email='clikopro@gmail.com';
 select u.id into blocked_uid from auth.users u join public.global_player_profiles g on g.user_id=u.id
 where not private.player_account_enabled_v4469(u.id) order by u.created_at limit 1;
 select wm.user_id into super_uid from public.platform_super_admins wm limit 1;
 if allowed_uid is null or blocked_uid is null or super_uid is null then raise exception 'Missing access fixtures';end if;

 perform set_config('request.jwt.claim.sub',allowed_uid::text,true);execute 'set local role authenticated';
 if not public.get_my_player_account_access_v1() then raise exception 'Whitelisted user denied';end if;
 d:=public.get_my_global_player_dashboard_v2();
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',blocked_uid::text,true);execute 'set local role authenticated';
 if public.get_my_player_account_access_v1() then raise exception 'Ordinary user allowed';end if;
 begin perform public.get_my_global_player_dashboard_v2();raise exception 'Dashboard leaked';exception when others then if sqlerrm<>'Le compte joueur SWÉ est actuellement réservé aux comptes de test autorisés' then raise;end if;end;
 begin perform public.ensure_my_global_player_profile('Blocked test');raise exception 'Profile mutation allowed';exception when others then if sqlerrm<>'Le compte joueur SWÉ est actuellement réservé aux comptes de test autorisés' then raise;end if;end;
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',super_uid::text,true);execute 'set local role authenticated';
 if not exists(select 1 from public.super_admin_get_player_account_access_v1() x where x.user_id=blocked_uid and not x.enabled) then raise exception 'Super Admin directory missing access';end if;
 perform public.super_admin_set_player_account_access_v1(blocked_uid,true);
 if not exists(select 1 from public.super_admin_get_player_account_access_v1() x where x.user_id=blocked_uid and x.enabled) then raise exception 'Super Admin toggle failed';end if;
 execute 'reset role';

 perform set_config('request.jwt.claim.sub',blocked_uid::text,true);execute 'set local role authenticated';
 if not public.get_my_player_account_access_v1() then raise exception 'Granted access not effective';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: only explicit users access player account; dashboard and profile mutations blocked server-side; Super Admin can grant access; test changes rolled back' result;
