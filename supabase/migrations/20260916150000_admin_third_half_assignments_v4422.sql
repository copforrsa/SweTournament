-- Affectation administrative des missions Glacière, avec ou sans inscription.
-- Le paiement SWÉ reste strictement réservé au responsable inscrit au tournoi.

create or replace function public.admin_get_third_half_assignments_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'tournament_id', t.id,
      'cooler_player_id', f.responsible_player_id,
      'ice_player_id', nullif(f.logistics_assignments #>> '{ice,player_id}', '')::uuid,
      'responsible_registered', exists (
        select 1 from public.tournament_players tp
        where tp.tournament_id = t.id
          and tp.player_id = f.responsible_player_id
          and tp.present = true
          and tp.registration_status <> 'cancelled'
      ),
      'registered_player_ids', coalesce((
        select jsonb_agg(tp.player_id order by tp.registered_at, tp.player_id)
        from public.tournament_players tp
        where tp.tournament_id = t.id
          and tp.present = true
          and tp.registration_status <> 'cancelled'
      ), '[]'::jsonb)
    ) order by t.tournament_date desc)
    from public.tournaments t
    left join public.third_half_funds f on f.tournament_id = t.id
    where t.workspace_id = p_workspace_id
      and t.status <> 'finished'
      and coalesce(t.third_half_active, false) = true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_third_half_assignments_v1(
  p_tournament_id uuid,
  p_cooler_player_id uuid,
  p_ice_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace uuid;
  v_enabled boolean;
  v_previous_responsible uuid;
  v_assignments jsonb := '{}'::jsonb;
  v_registered boolean := false;
  v_responsible_changed boolean := false;
begin
  select t.workspace_id, coalesce(t.third_half_active, false)
  into v_workspace, v_enabled
  from public.tournaments t
  where t.id = p_tournament_id;

  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if not v_enabled then raise exception 'Active d’abord le module Glacière pour ce Swé'; end if;

  if p_cooler_player_id is not null and not exists (
    select 1 from public.players p
    where p.id = p_cooler_player_id and p.workspace_id = v_workspace and p.active = true
  ) then raise exception 'Le responsable Glacière ne fait pas partie de ce groupe'; end if;

  if p_ice_player_id is not null and not exists (
    select 1 from public.players p
    where p.id = p_ice_player_id and p.workspace_id = v_workspace and p.active = true
  ) then raise exception 'Le responsable des glaçons ne fait pas partie de ce groupe'; end if;

  select f.responsible_player_id, coalesce(f.logistics_assignments, '{}'::jsonb)
  into v_previous_responsible, v_assignments
  from public.third_half_funds f
  where f.tournament_id = p_tournament_id;

  v_responsible_changed := v_previous_responsible is distinct from p_cooler_player_id;
  v_registered := p_cooler_player_id is not null and exists (
    select 1 from public.tournament_players tp
    where tp.tournament_id = p_tournament_id
      and tp.player_id = p_cooler_player_id
      and tp.present = true
      and tp.registration_status <> 'cancelled'
  );

  v_assignments := jsonb_set(coalesce(v_assignments, '{}'::jsonb), '{cooler}',
    jsonb_build_object('player_id', p_cooler_player_id, 'status', 'assigned'), true);
  v_assignments := jsonb_set(v_assignments, '{ice}',
    jsonb_build_object('player_id', p_ice_player_id, 'status', 'assigned'), true);
  if not (v_assignments ? 'beers') then
    v_assignments := jsonb_set(v_assignments, '{beers}',
      jsonb_build_object('player_id', p_cooler_player_id, 'status', 'assigned', 'quantity', 12), true);
  end if;

  insert into public.third_half_funds(
    tournament_id, workspace_id, status, responsible_player_id,
    logistics_assignments, share_enabled, updated_at, updated_by
  ) values (
    p_tournament_id, v_workspace, 'draft', p_cooler_player_id,
    v_assignments, false, now(), auth.uid()
  )
  on conflict (tournament_id) do update set
    responsible_player_id = excluded.responsible_player_id,
    logistics_assignments = excluded.logistics_assignments,
    provider = case when v_responsible_changed or not v_registered then null else third_half_funds.provider end,
    payment_link = case when v_responsible_changed or not v_registered then null else third_half_funds.payment_link end,
    payment_link_configured_at = case when v_responsible_changed or not v_registered then null else third_half_funds.payment_link_configured_at end,
    share_enabled = case when v_responsible_changed or not v_registered then false else third_half_funds.share_enabled end,
    responsible_contribution_mode = case when v_responsible_changed then null else third_half_funds.responsible_contribution_mode end,
    responsible_contribution_amount_cents = case when v_responsible_changed then 0 else third_half_funds.responsible_contribution_amount_cents end,
    responsible_contribution_item = case when v_responsible_changed then null else third_half_funds.responsible_contribution_item end,
    updated_at = now(),
    updated_by = auth.uid();

  return jsonb_build_object(
    'saved', true,
    'responsible_registered', v_registered,
    'payment_mode', case when v_registered then 'platform' else 'off_platform' end
  );
end;
$$;

create or replace function public.get_public_third_half_registration_v2(
  p_token uuid,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'enabled', coalesce(t.third_half_active, false),
    'status', coalesce(f.status, 'draft'),
    'responsible_player_id', f.responsible_player_id,
    'responsible_player_name', rp.name,
    'responsible_avatar_url', coalesce(gp.avatar_url, rp.avatar_url),
    'responsible_registered', exists (
      select 1 from public.tournament_players owner_tp
      where owner_tp.tournament_id = t.id
        and owner_tp.player_id = f.responsible_player_id
        and owner_tp.present = true
        and owner_tp.registration_status <> 'cancelled'
    ),
    'provider', f.provider,
    'suggested_amount_cents', least(500, coalesce(f.suggested_amount_cents, t.cooler_suggested_cents, 0)),
    'share_enabled', coalesce(f.share_enabled, false),
    'payment_link_ready', exists (
      select 1 from public.tournament_players owner_tp
      where owner_tp.tournament_id = t.id
        and owner_tp.player_id = f.responsible_player_id
        and owner_tp.present = true
        and owner_tp.registration_status <> 'cancelled'
    ) and coalesce(f.share_enabled, false) and f.status = 'open' and f.payment_link is not null,
    'payment_link', case when exists (
      select 1 from public.tournament_players owner_tp
      where owner_tp.tournament_id = t.id
        and owner_tp.player_id = f.responsible_player_id
        and owner_tp.present = true
        and owner_tp.registration_status <> 'cancelled'
    ) and coalesce(f.share_enabled, false) and f.status = 'open' then f.payment_link else null end,
    'can_manage', coalesce(gp.user_id = auth.uid(), false) and exists (
      select 1 from public.tournament_players owner_tp
      where owner_tp.tournament_id = t.id
        and owner_tp.player_id = f.responsible_player_id
        and owner_tp.present = true
        and owner_tp.registration_status <> 'cancelled'
    ),
    'responsible_contribution_mode', f.responsible_contribution_mode,
    'responsible_contribution_amount_cents', least(500, coalesce(f.responsible_contribution_amount_cents, 0)),
    'responsible_contribution_item', f.responsible_contribution_item,
    'eligible_responsibles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player_id', p.id,
        'name', p.name,
        'avatar_url', coalesce(pp.avatar_url, p.avatar_url),
        'account_linked', p.global_player_id is not null
      ) order by p.name)
      from public.tournament_players tp
      join public.players p on p.id = tp.player_id
      left join public.global_player_profiles pp on pp.id = p.global_player_id
      where tp.tournament_id = t.id
        and tp.present = true
        and tp.registration_status <> 'cancelled'
    ), '[]'::jsonb),
    'logistics_tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', task.key,
        'label', case task.key when 'cooler' then 'Amener une glacière' when 'ice' then 'Acheter les glaçons' else 'Apporter au moins 12 bières' end,
        'player_id', nullif(task.value->>'player_id', '')::uuid,
        'player_name', assigned.name,
        'status', coalesce(task.value->>'status', 'assigned'),
        'quantity', case when task.key = 'beers' then greatest(12, coalesce((task.value->>'quantity')::integer, 12)) else null end
      ) order by case task.key when 'cooler' then 1 when 'ice' then 2 else 3 end)
      from jsonb_each(coalesce(nullif(f.logistics_assignments, '{}'::jsonb), jsonb_build_object(
        'cooler', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned'),
        'ice', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned'),
        'beers', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned', 'quantity', 12)
      ))) task
      left join public.players assigned on assigned.id = nullif(task.value->>'player_id', '')::uuid
      where task.key in ('cooler', 'ice', 'beers')
    ), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'public_price_cents', p.public_price_cents,
        'service_moment', p.service_moment,
        'contains_alcohol', p.contains_alcohol
      ) order by p.sort_order, p.name)
      from public.sports_complex_packages p
      where p.id = any(coalesce(f.selected_package_ids, '{}'::uuid[])) and p.active = true
    ), '[]'::jsonb)
  ) into v_result
  from public.tournaments t
  join public.workspaces w on w.id = t.workspace_id
  left join public.third_half_funds f on f.tournament_id = t.id
  left join public.players rp on rp.id = f.responsible_player_id
  left join public.global_player_profiles gp on gp.id = rp.global_player_id
  where t.id = p_tournament_id
    and w.public_token = p_token
    and w.public_enabled = true;

  if v_result is null then raise exception 'Inscription introuvable'; end if;
  return v_result;
end;
$$;

revoke all on function public.admin_get_third_half_assignments_v1(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_third_half_assignments_v1(uuid) to authenticated;
revoke all on function public.admin_save_third_half_assignments_v1(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_save_third_half_assignments_v1(uuid,uuid,uuid) to authenticated;
revoke all on function public.get_public_third_half_registration_v2(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_public_third_half_registration_v2(uuid,uuid) to anon, authenticated;
