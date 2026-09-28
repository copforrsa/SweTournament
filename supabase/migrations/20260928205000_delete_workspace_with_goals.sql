-- Match and goal rows must disappear before players, whose goal references
-- use ON DELETE RESTRICT. Keep the deletion atomic in this RPC.
create or replace function public.super_admin_delete_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_platform_super_admin() then
    raise exception 'Accès super administrateur requis';
  end if;

  if not exists (select 1 from public.workspaces where id = p_workspace_id) then
    raise exception 'Espace introuvable';
  end if;

  -- A player may have been used in another workspace's match. Preserve that
  -- match and refuse the deletion rather than altering another space's data.
  if exists (
    select 1
    from public.players p
    join public.goals g on g.scorer_player_id = p.id or g.assister_player_id = p.id
    join public.matches m on m.id = g.match_id
    join public.tournaments t on t.id = m.tournament_id
    where p.workspace_id = p_workspace_id and t.workspace_id <> p_workspace_id
  ) then
    raise exception 'Suppression impossible : un joueur est lié à un but dans un autre espace';
  end if;

  delete from public.tournaments where workspace_id = p_workspace_id;
  delete from public.workspaces where id = p_workspace_id;
end;
$function$;

revoke all on function public.super_admin_delete_workspace(uuid) from public, anon;
grant execute on function public.super_admin_delete_workspace(uuid) to authenticated;
