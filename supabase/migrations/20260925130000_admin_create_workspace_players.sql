-- The browser must not write public.players directly: the controlled RPC keeps
-- the group identity rules while allowing the workspace manager to add members.
create or replace function public.manager_add_workspace_players(
  p_workspace_id uuid,
  p_names text[],
  p_is_group_member boolean default true,
  p_guest_of_player_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_allowed boolean := false;
  v_names text[];
  v_created_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  if not exists (select 1 from public.workspaces where id = p_workspace_id) then
    raise exception 'Groupe introuvable';
  end if;

  v_allowed := private.is_workspace_admin(p_workspace_id)
    or exists (
      select 1
      from public.workspace_members wm
      join public.coorganizer_permissions cp
        on cp.workspace_id = wm.workspace_id
       and cp.user_id = wm.user_id
      where wm.workspace_id = p_workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'coorganizer'
        and coalesce(wm.active, true)
        and coalesce(cp.can_add_members, false)
    );
  if not v_allowed then
    raise exception 'Tu n’es pas autorisé à ajouter des membres';
  end if;

  select coalesce(array_agg(name order by name), array[]::text[])
    into v_names
  from (
    select distinct trim(raw_name) as name
    from unnest(coalesce(p_names, array[]::text[])) as input(raw_name)
    where nullif(trim(raw_name), '') is not null
  ) clean_names;

  if coalesce(array_length(v_names, 1), 0) = 0 then
    raise exception 'Entre au moins un joueur';
  end if;
  if exists (select 1 from unnest(v_names) as name where char_length(name) < 2 or char_length(name) > 60) then
    raise exception 'Chaque nom doit contenir entre 2 et 60 caractères';
  end if;

  if not p_is_group_member then
    if p_guest_of_player_id is null then
      raise exception 'Indique le membre qui invite ce guest';
    end if;
    if not exists (
      select 1 from public.players host
      where host.id = p_guest_of_player_id
        and host.workspace_id = p_workspace_id
        and host.active = true
        and host.is_group_member = true
    ) then
      raise exception 'Le membre qui invite ce guest est invalide';
    end if;
  end if;

  insert into public.players (workspace_id, name, active, is_group_member, guest_of_player_id)
  select p_workspace_id, name, true, p_is_group_member,
         case when p_is_group_member then null else p_guest_of_player_id end
  from unnest(v_names) as name
  on conflict (workspace_id, name) do nothing;
  get diagnostics v_created_count = row_count;

  return jsonb_build_object('created_count', v_created_count);
end;
$$;

revoke all on function public.manager_add_workspace_players(uuid, text[], boolean, uuid) from public;
revoke execute on function public.manager_add_workspace_players(uuid, text[], boolean, uuid) from anon;
grant execute on function public.manager_add_workspace_players(uuid, text[], boolean, uuid) to authenticated;