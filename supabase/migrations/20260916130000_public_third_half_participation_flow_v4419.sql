-- Parcours public de 3e mi-temps : réponse et apport de chaque inscrit, sans compte obligatoire.

alter table public.tournament_players
  add column if not exists third_half_participating boolean,
  add column if not exists third_half_contribution_mode text,
  add column if not exists third_half_contribution_item text,
  add column if not exists third_half_updated_at timestamptz;

alter table public.tournament_players
  drop constraint if exists tournament_players_third_half_contribution_mode_check,
  drop constraint if exists tournament_players_third_half_contribution_item_check;

alter table public.tournament_players
  add constraint tournament_players_third_half_contribution_mode_check
    check (third_half_contribution_mode is null or third_half_contribution_mode in ('money', 'supplies')),
  add constraint tournament_players_third_half_contribution_item_check
    check (third_half_contribution_item is null or third_half_contribution_item in ('cooler', 'ice', 'beers_12', 'soft_drinks', 'snacks', 'other'));

create or replace function public.get_public_third_half_participation_v1(
  p_token uuid,
  p_tournament_id uuid,
  p_player_id uuid
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
    'registered', tp.player_id is not null,
    'participating', tp.third_half_participating,
    'contribution_mode', tp.third_half_contribution_mode,
    'contribution_amount_cents', least(500, greatest(0, coalesce(tp.third_half_pledge_cents, 0))),
    'contribution_item', tp.third_half_contribution_item,
    'updated_at', tp.third_half_updated_at
  )
  into v_result
  from public.tournaments t
  join public.workspaces w on w.id = t.workspace_id
  left join public.tournament_players tp
    on tp.tournament_id = t.id
   and tp.player_id = p_player_id
   and tp.present = true
   and tp.registration_status <> 'cancelled'
  where t.id = p_tournament_id
    and w.public_token = p_token
    and w.public_enabled = true;

  if v_result is null then raise exception 'Inscription introuvable'; end if;
  return v_result;
end;
$$;

create or replace function public.save_public_third_half_participation_v1(
  p_token uuid,
  p_tournament_id uuid,
  p_player_id uuid,
  p_participating boolean,
  p_contribution_mode text default null,
  p_contribution_amount_cents integer default 0,
  p_contribution_item text default null
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
  if p_participating is null then raise exception 'Indique si tu participes à la 3e mi-temps'; end if;

  if not exists (
    select 1
    from public.tournaments t
    join public.workspaces w on w.id = t.workspace_id
    join public.tournament_players tp on tp.tournament_id = t.id and tp.player_id = p_player_id
    where t.id = p_tournament_id
      and w.public_token = p_token
      and w.public_enabled = true
      and t.third_half_active = true
      and tp.present = true
      and tp.registration_status <> 'cancelled'
  ) then raise exception 'Sélectionne un joueur inscrit à ce Swé'; end if;

  if p_participating then
    if v_mode not in ('money', 'supplies') then raise exception 'Choisis ta participation à la 3e mi-temps'; end if;
    if v_mode = 'money' and (v_amount < 50 or v_amount > 500) then raise exception 'La participation doit être comprise entre 0,50 € et 5 €'; end if;
    if v_mode = 'supplies' and v_item not in ('cooler', 'ice', 'beers_12', 'soft_drinks', 'snacks', 'other') then raise exception 'Choisis ce que tu souhaites apporter'; end if;
  end if;

  update public.tournament_players
  set third_half_participating = p_participating,
      third_half_contribution_mode = case when p_participating then v_mode else null end,
      third_half_pledge_cents = case when p_participating and v_mode = 'money' then v_amount else 0 end,
      third_half_contribution_item = case when p_participating and v_mode = 'supplies' then v_item else null end,
      third_half_updated_at = now()
  where tournament_id = p_tournament_id
    and player_id = p_player_id
    and present = true
    and registration_status <> 'cancelled';

  return jsonb_build_object(
    'saved', true,
    'participating', p_participating,
    'contribution_mode', case when p_participating then v_mode else null end,
    'contribution_amount_cents', case when p_participating and v_mode = 'money' then v_amount else 0 end,
    'contribution_item', case when p_participating and v_mode = 'supplies' then v_item else null end
  );
end;
$$;

revoke all on function public.get_public_third_half_participation_v1(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_public_third_half_participation_v1(uuid,uuid,uuid) to anon, authenticated;

revoke all on function public.save_public_third_half_participation_v1(uuid,uuid,uuid,boolean,text,integer,text) from public, anon, authenticated;
grant execute on function public.save_public_third_half_participation_v1(uuid,uuid,uuid,boolean,text,integer,text) to anon, authenticated;
