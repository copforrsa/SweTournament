-- Sépare les responsables matériel du propriétaire du lien de paiement.
-- Les missions sont décidées par l'administrateur ; seul le propriétaire du lien doit être inscrit.

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
      'payment_player_id', f.responsible_player_id,
      'cooler_player_id', coalesce(
        nullif(f.logistics_assignments #>> '{cooler,player_id}', '')::uuid,
        f.responsible_player_id
      ),
      'ice_player_id', nullif(f.logistics_assignments #>> '{ice,player_id}', '')::uuid,
      'responsible_registered', exists (
        select 1 from public.tournament_players tp
        where tp.tournament_id = t.id
          and tp.player_id = f.responsible_player_id
          and tp.present = true
          and tp.registration_status <> 'cancelled'
      ),
      'payment_responsible_registered', exists (
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

create or replace function public.admin_save_third_half_assignments_v2(
  p_tournament_id uuid,
  p_payment_player_id uuid,
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
  v_previous_payment_player uuid;
  v_assignments jsonb := '{}'::jsonb;
  v_payment_registered boolean := false;
  v_payment_player_changed boolean := false;
begin
  select t.workspace_id, coalesce(t.third_half_active, false)
  into v_workspace, v_enabled
  from public.tournaments t
  where t.id = p_tournament_id;

  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if not v_enabled then raise exception 'Active d’abord le module Glacière pour ce Swé'; end if;

  if p_payment_player_id is not null and not exists (
    select 1 from public.players p
    where p.id = p_payment_player_id and p.workspace_id = v_workspace and p.active = true
  ) then raise exception 'Le responsable du lien ne fait pas partie de ce groupe'; end if;

  if p_cooler_player_id is not null and not exists (
    select 1 from public.players p
    where p.id = p_cooler_player_id and p.workspace_id = v_workspace and p.active = true
  ) then raise exception 'La personne chargée de la glacière ne fait pas partie de ce groupe'; end if;

  if p_ice_player_id is not null and not exists (
    select 1 from public.players p
    where p.id = p_ice_player_id and p.workspace_id = v_workspace and p.active = true
  ) then raise exception 'La personne chargée des glaçons ne fait pas partie de ce groupe'; end if;

  select f.responsible_player_id, coalesce(f.logistics_assignments, '{}'::jsonb)
  into v_previous_payment_player, v_assignments
  from public.third_half_funds f
  where f.tournament_id = p_tournament_id;

  v_payment_player_changed := v_previous_payment_player is distinct from p_payment_player_id;
  v_payment_registered := p_payment_player_id is not null and exists (
    select 1 from public.tournament_players tp
    where tp.tournament_id = p_tournament_id
      and tp.player_id = p_payment_player_id
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
    p_tournament_id, v_workspace, 'draft', p_payment_player_id,
    v_assignments, false, now(), auth.uid()
  )
  on conflict (tournament_id) do update set
    responsible_player_id = excluded.responsible_player_id,
    logistics_assignments = excluded.logistics_assignments,
    provider = case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.provider end,
    payment_link = case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link end,
    payment_link_configured_at = case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link_configured_at end,
    share_enabled = case when v_payment_player_changed or not v_payment_registered then false else third_half_funds.share_enabled end,
    responsible_contribution_mode = case when v_payment_player_changed then null else third_half_funds.responsible_contribution_mode end,
    responsible_contribution_amount_cents = case when v_payment_player_changed then 0 else third_half_funds.responsible_contribution_amount_cents end,
    responsible_contribution_item = case when v_payment_player_changed then null else third_half_funds.responsible_contribution_item end,
    updated_at = now(),
    updated_by = auth.uid();

  return jsonb_build_object(
    'saved', true,
    'payment_responsible_registered', v_payment_registered,
    'payment_mode', case when v_payment_registered then 'platform' else 'off_platform' end
  );
end;
$$;

-- Compatibilité avec les anciennes interfaces : l'ancien responsable Glacière reste aussi le payeur.
create or replace function public.admin_save_third_half_assignments_v1(
  p_tournament_id uuid,
  p_cooler_player_id uuid,
  p_ice_player_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select public.admin_save_third_half_assignments_v2(
    p_tournament_id,
    p_cooler_player_id,
    p_cooler_player_id,
    p_ice_player_id
  );
$$;

-- Le responsable du paiement enregistre sa participation, sans pouvoir écraser les missions admin.
create or replace function public.save_my_third_half_plan_v1(
  p_tournament_id uuid,
  p_player_id uuid,
  p_contribution_mode text,
  p_contribution_amount_cents integer,
  p_contribution_item text,
  p_cooler_player_id uuid,
  p_ice_player_id uuid,
  p_beers_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_mode text := nullif(trim(coalesce(p_contribution_mode, '')), '');
  v_item text := nullif(trim(coalesce(p_contribution_item, '')), '');
  v_amount integer := coalesce(p_contribution_amount_cents, 0);
begin
  if auth.uid() is null then raise exception 'Connecte-toi à ton compte SWÉ'; end if;

  if not exists (
    select 1
    from public.third_half_funds f
    join public.tournament_players tp on tp.tournament_id = f.tournament_id and tp.player_id = f.responsible_player_id
    join public.players p on p.id = f.responsible_player_id
    join public.global_player_profiles gp on gp.id = p.global_player_id
    where f.tournament_id = p_tournament_id
      and f.responsible_player_id = p_player_id
      and tp.present = true
      and tp.registration_status <> 'cancelled'
      and gp.user_id = auth.uid()
  ) then raise exception 'Ce profil n’est pas autorisé à gérer le lien de cette glacière'; end if;

  if v_mode not in ('money', 'supplies') then raise exception 'Choisis une participation financière ou un apport matériel'; end if;
  if v_mode = 'money' and (v_amount < 50 or v_amount > 500) then raise exception 'La participation doit être comprise entre 0,50 € et 5 €'; end if;
  if v_mode = 'supplies' and v_item not in ('cooler', 'ice', 'beers_12', 'soft_drinks', 'snacks', 'other') then raise exception 'Choisis un apport matériel proposé'; end if;

  update public.third_half_funds
  set responsible_contribution_mode = v_mode,
      responsible_contribution_amount_cents = case when v_mode = 'money' then v_amount else 0 end,
      responsible_contribution_item = case when v_mode = 'supplies' then v_item else null end,
      updated_at = now(),
      updated_by = auth.uid()
  where tournament_id = p_tournament_id and responsible_player_id = p_player_id;

  return jsonb_build_object('saved', true);
end;
$$;

revoke all on function public.admin_get_third_half_assignments_v1(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_third_half_assignments_v1(uuid) to authenticated;
revoke all on function public.admin_save_third_half_assignments_v2(uuid,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_save_third_half_assignments_v2(uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.admin_save_third_half_assignments_v1(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_save_third_half_assignments_v1(uuid,uuid,uuid) to authenticated;
revoke all on function public.save_my_third_half_plan_v1(uuid,uuid,text,integer,text,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.save_my_third_half_plan_v1(uuid,uuid,text,integer,text,uuid,uuid,uuid) to authenticated;
