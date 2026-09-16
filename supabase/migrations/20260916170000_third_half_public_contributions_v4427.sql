-- Affiche publiquement les contributions annoncées pour la 3e mi-temps.

alter table public.tournament_players
  drop constraint if exists tournament_players_third_half_contribution_item_check;

alter table public.tournament_players
  add constraint tournament_players_third_half_contribution_item_check
    check (third_half_contribution_item is null or third_half_contribution_item in (
      'cooler', 'ice', 'beers_3', 'beers_6', 'beers_12', 'ti_punch', 'fruits',
      'cups', 'soft_drinks', 'snacks', 'other'
    ));

create or replace function public.get_public_third_half_contributions_v1(
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
  if not exists (
    select 1
    from public.tournaments t
    join public.workspaces w on w.id = t.workspace_id
    where t.id = p_tournament_id
      and w.public_token = p_token
      and w.public_enabled = true
      and t.third_half_active = true
  ) then
    raise exception 'Lien de 3e mi-temps indisponible';
  end if;

  select jsonb_build_object(
    'money_pool_cents', coalesce(sum(case when tp.third_half_contribution_mode = 'money' then least(500, greatest(0, coalesce(tp.third_half_pledge_cents, 0))) else 0 end), 0),
    'money_donor_count', count(*) filter (where tp.third_half_contribution_mode = 'money'),
    'contributions', coalesce(jsonb_agg(jsonb_build_object(
      'player_id', p.id,
      'player_name', p.name,
      'avatar_url', coalesce(gp.avatar_url, p.avatar_url),
      'contribution_mode', tp.third_half_contribution_mode,
      'contribution_amount_cents', case when tp.third_half_contribution_mode = 'money' then least(500, greatest(0, coalesce(tp.third_half_pledge_cents, 0))) else 0 end,
      'contribution_item', tp.third_half_contribution_item
    ) order by p.name) filter (where tp.third_half_contribution_mode in ('money', 'supplies')), '[]'::jsonb)
  )
  into v_result
  from public.tournament_players tp
  join public.players p on p.id = tp.player_id
  left join public.global_player_profiles gp on gp.id = p.global_player_id
  where tp.tournament_id = p_tournament_id
    and tp.present = true
    and tp.registration_status <> 'cancelled'
    and tp.third_half_participating = true;

  return coalesce(v_result, jsonb_build_object('money_pool_cents', 0, 'money_donor_count', 0, 'contributions', '[]'::jsonb));
end;
$$;

revoke all on function public.get_public_third_half_contributions_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_public_third_half_contributions_v1(uuid,uuid) to anon, authenticated;
