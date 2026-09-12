create function private.manage_tournament_test(p_tournament_id uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 if p_action not in ('open','delete') or p_action is null then raise exception 'Action inconnue'; end if;
 select r.workspace_id into w from private.tournament_test_runs r join public.tournaments t on t.id=r.tournament_id and t.workspace_id=r.workspace_id where r.tournament_id=p_tournament_id for update of r,t;
 if not found then raise exception 'Tournoi test introuvable : les tournois réels sont exclus de cette action'; end if;
 if p_action='open' then
  insert into public.workspace_members(workspace_id,user_id,role,active) values(w,auth.uid(),'admin',true)
  on conflict(workspace_id,user_id) do update set role='admin',active=true;
 else
  delete from public.tournaments where id=p_tournament_id and workspace_id=w;
 end if;
 return jsonb_build_object('workspace_id',w,'tournament_id',p_tournament_id,'action',p_action);
end $$;
revoke all on function private.manage_tournament_test(uuid,text) from public,anon;
grant execute on function private.manage_tournament_test(uuid,text) to authenticated;
create function public.super_admin_manage_test_tournament(p_tournament_id uuid,p_action text) returns jsonb language sql security invoker set search_path='' as $$
 select private.manage_tournament_test(p_tournament_id,p_action);
$$;
revoke all on function public.super_admin_manage_test_tournament(uuid,text) from public,anon;
grant execute on function public.super_admin_manage_test_tournament(uuid,text) to authenticated;
