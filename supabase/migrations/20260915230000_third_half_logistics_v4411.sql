-- Parcours Glacière : participation du responsable et missions logistiques délégables.

alter table public.third_half_funds
  add column if not exists responsible_contribution_mode text,
  add column if not exists responsible_contribution_amount_cents integer not null default 0,
  add column if not exists responsible_contribution_item text,
  add column if not exists logistics_assignments jsonb not null default '{}'::jsonb;

alter table public.third_half_funds
  drop constraint if exists third_half_funds_contribution_mode_check,
  drop constraint if exists third_half_funds_contribution_amount_check,
  drop constraint if exists third_half_funds_logistics_object_check;

alter table public.third_half_funds
  add constraint third_half_funds_contribution_mode_check
    check (responsible_contribution_mode is null or responsible_contribution_mode in ('money', 'supplies')),
  add constraint third_half_funds_contribution_amount_check
    check (responsible_contribution_amount_cents between 0 and 500),
  add constraint third_half_funds_logistics_object_check
    check (jsonb_typeof(logistics_assignments) = 'object');

update public.third_half_funds f
set logistics_assignments = jsonb_build_object(
  'cooler', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned'),
  'ice', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned'),
  'beers', jsonb_build_object('player_id', f.responsible_player_id, 'status', 'assigned', 'quantity', 12)
)
where f.responsible_player_id is not null
  and (f.logistics_assignments = '{}'::jsonb or f.logistics_assignments is null);

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
    'provider', f.provider,
    'suggested_amount_cents', least(500, coalesce(f.suggested_amount_cents, t.cooler_suggested_cents, 0)),
    'share_enabled', coalesce(f.share_enabled, false),
    'payment_link_ready', coalesce(f.share_enabled, false) and f.status = 'open' and f.payment_link is not null,
    'payment_link', case when coalesce(f.share_enabled, false) and f.status = 'open' then f.payment_link else null end,
    'can_manage', coalesce(gp.user_id = auth.uid(), false),
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
  v_delegate uuid;
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
  ) then raise exception 'Ce profil n’est pas autorisé à organiser cette glacière'; end if;

  if v_mode not in ('money', 'supplies') then raise exception 'Choisis une participation financière ou un apport matériel'; end if;
  if v_mode = 'money' and (v_amount < 50 or v_amount > 500) then raise exception 'La participation doit être comprise entre 0,50 € et 5 €'; end if;
  if v_mode = 'supplies' and v_item not in ('cooler', 'ice', 'beers_12', 'soft_drinks', 'snacks', 'other') then raise exception 'Choisis un apport matériel proposé'; end if;

  foreach v_delegate in array array[p_cooler_player_id, p_ice_player_id, p_beers_player_id]
  loop
    if v_delegate is null or not exists (
      select 1 from public.tournament_players tp
      where tp.tournament_id = p_tournament_id
        and tp.player_id = v_delegate
        and tp.present = true
        and tp.registration_status <> 'cancelled'
    ) then raise exception 'Chaque mission doit être confiée à un joueur inscrit'; end if;
  end loop;

  update public.third_half_funds
  set responsible_contribution_mode = v_mode,
      responsible_contribution_amount_cents = case when v_mode = 'money' then v_amount else 0 end,
      responsible_contribution_item = case when v_mode = 'supplies' then v_item else null end,
      logistics_assignments = jsonb_build_object(
        'cooler', jsonb_build_object('player_id', p_cooler_player_id, 'status', 'assigned'),
        'ice', jsonb_build_object('player_id', p_ice_player_id, 'status', 'assigned'),
        'beers', jsonb_build_object('player_id', p_beers_player_id, 'status', 'assigned', 'quantity', 12)
      ),
      updated_at = now(),
      updated_by = auth.uid()
  where tournament_id = p_tournament_id and responsible_player_id = p_player_id;

  return jsonb_build_object('saved', true);
end;
$$;

revoke all on function public.get_public_third_half_registration_v2(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_public_third_half_registration_v2(uuid,uuid) to anon, authenticated;

revoke all on function public.save_my_third_half_plan_v1(uuid,uuid,text,integer,text,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.save_my_third_half_plan_v1(uuid,uuid,text,integer,text,uuid,uuid,uuid) to authenticated;
