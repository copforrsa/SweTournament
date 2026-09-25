-- The platform grants EXECUTE to anon by default for public RPCs. This action
-- must be available only after authentication.
revoke execute on function public.manager_add_workspace_players(uuid, text[], boolean, uuid) from anon;
