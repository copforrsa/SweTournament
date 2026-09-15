-- Module Glacière intégré à l'inscription.
-- Le responsable est un joueur réellement inscrit et lié à son compte SWÉ.

alter table public.third_half_funds
  add column if not exists responsible_player_id uuid references public.players(id) on delete set null,
  add column if not exists payment_link_configured_at timestamptz;

alter table public.third_half_funds
  drop constraint if exists third_half_funds_suggested_amount_cents_max_check;
alter table public.third_half_funds
  add constraint third_half_funds_suggested_amount_cents_max_check
  check (suggested_amount_cents between 0 and 500);

alter table public.tournaments
  drop constraint if exists tournaments_cooler_suggested_cents_max_check;
alter table public.tournaments
  add constraint tournaments_cooler_suggested_cents_max_check
  check (cooler_suggested_cents between 0 and 500);

alter table public.tournament_players
  drop constraint if exists tournament_players_third_half_pledge_max_check;
alter table public.tournament_players
  add constraint tournament_players_third_half_pledge_max_check
  check (third_half_pledge_cents between 0 and 500);

alter table public.global_player_tournament_requests
  drop constraint if exists global_player_requests_third_half_pledge_max_check;
alter table public.global_player_tournament_requests
  add constraint global_player_requests_third_half_pledge_max_check
  check (third_half_pledge_cents between 0 and 500);

create or replace function public.get_admin_third_half_setup_v2(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;

  return jsonb_build_object(
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tournament_id', t.id,
        'tournament_name', coalesce(t.name, 'Swé'),
        'tournament_date', t.tournament_date,
        'complex_id', t.complex_id,
        'complex_name', c.name,
        'status', coalesce(f.status, 'draft'),
        'provider', f.provider,
        'payment_link', f.payment_link,
        'target_amount_cents', coalesce(f.target_amount_cents, 0),
        'collected_amount_cents', coalesce(f.collected_amount_cents, 0),
        'suggested_amount_cents', least(500, coalesce(f.suggested_amount_cents, t.cooler_suggested_cents, 0)),
        'notes', f.notes,
        'share_enabled', coalesce(f.share_enabled, false),
        'responsible_player_id', f.responsible_player_id,
        'responsible_player_name', rp.name,
        'selected_package_ids', coalesce(f.selected_package_ids, '{}'::uuid[]),
        'eligible_responsibles', coalesce((
          select jsonb_agg(jsonb_build_object(
            'player_id', p.id,
            'name', p.name,
            'avatar_url', coalesce(gp.avatar_url, p.avatar_url),
            'account_linked', p.global_player_id is not null
          ) order by p.name)
          from public.tournament_players tp
          join public.players p on p.id = tp.player_id
          left join public.global_player_profiles gp on gp.id = p.global_player_id
          where tp.tournament_id = t.id
            and tp.present = true
            and tp.registration_status <> 'cancelled'
        ), '[]'::jsonb)
      ) order by t.tournament_date desc)
      from public.tournaments t
      left join public.sports_complexes c on c.id = t.complex_id
      left join public.third_half_funds f on f.tournament_id = t.id
      left join public.players rp on rp.id = f.responsible_player_id
      where t.workspace_id = p_workspace_id
        and t.status <> 'finished'
        and coalesce(t.third_half_active, false) = true
    ), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'complex_id', p.complex_id,
        'name', p.name,
        'description', p.description,
        'service_moment', p.service_moment,
        'public_price_cents', p.public_price_cents,
        'contains_alcohol', p.contains_alcohol,
        'active', p.active,
        'sort_order', p.sort_order
      ) order by p.complex_id, p.sort_order, p.name)
      from public.sports_complex_packages p
      where p.active = true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_third_half_setup_v2(
  p_tournament_id uuid,
  p_status text,
  p_provider text,
  p_payment_link text,
  p_target_amount_cents integer,
  p_collected_amount_cents integer,
  p_suggested_amount_cents integer,
  p_notes text,
  p_share_enabled boolean,
  p_selected_package_ids uuid[] default '{}'::uuid[],
  p_responsible_player_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_workspace uuid;
  v_complex uuid;
  v_enabled boolean;
  v_link text := nullif(trim(coalesce(p_payment_link, '')), '');
  v_provider text := nullif(trim(coalesce(p_provider, '')), '');
  v_amount integer := coalesce(p_suggested_amount_cents, 0);
begin
  select workspace_id, complex_id into v_workspace, v_complex
  from public.tournaments where id = p_tournament_id;
  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;

  select coalesce(e.third_half_enabled, false) into v_enabled
  from public.workspace_entitlements e where e.workspace_id = v_workspace;
  if not coalesce(v_enabled, false) then raise exception 'Le module 3e mi-temps est désactivé'; end if;
  if p_status not in ('draft', 'open', 'paused', 'closed') then raise exception 'Statut invalide'; end if;
  if coalesce(p_target_amount_cents, 0) < 0 or coalesce(p_collected_amount_cents, 0) < 0 then raise exception 'Montant invalide'; end if;
  if v_amount < 0 or v_amount > 500 then raise exception 'La participation doit être comprise entre 0 et 5 €'; end if;
  if v_link is not null and (lower(v_link) !~ '^https://[^[:space:]]+$' or char_length(v_link) > 500) then raise exception 'Le lien de paiement doit être une adresse HTTPS valide'; end if;
  if v_provider is not null and char_length(v_provider) > 40 then raise exception 'Nom de solution de paiement trop long'; end if;
  if v_link is not null and (v_amount < 50 or v_amount > 500) then raise exception 'Avec un lien actif, choisis un montant fixe entre 0,50 € et 5 €'; end if;
  if coalesce(p_share_enabled, false) and (v_link is null or p_responsible_player_id is null) then raise exception 'Choisis un responsable et ajoute son lien avant le partage'; end if;

  if p_responsible_player_id is not null and not exists (
    select 1
    from public.tournament_players tp
    join public.players p on p.id = tp.player_id
    where tp.tournament_id = p_tournament_id
      and tp.player_id = p_responsible_player_id
      and tp.present = true
      and tp.registration_status <> 'cancelled'
      and p.workspace_id = v_workspace
  ) then raise exception 'Le responsable doit être inscrit à ce Swé'; end if;

  if exists (
    select 1
    from unnest(coalesce(p_selected_package_ids, '{}'::uuid[])) x(id)
    left join public.sports_complex_packages p on p.id = x.id
    where p.id is null or p.active = false or p.complex_id is distinct from v_complex
  ) then raise exception 'Un pack sélectionné ne correspond pas au complexe de ce Swé'; end if;

  insert into public.third_half_funds(
    tournament_id, workspace_id, status, provider, payment_link,
    target_amount_cents, collected_amount_cents, suggested_amount_cents,
    notes, share_enabled, selected_package_ids, responsible_player_id,
    payment_link_configured_at, updated_at, updated_by
  ) values (
    p_tournament_id, v_workspace, p_status, v_provider, v_link,
    coalesce(p_target_amount_cents, 0), coalesce(p_collected_amount_cents, 0), v_amount,
    nullif(trim(coalesce(p_notes, '')), ''), coalesce(p_share_enabled, false),
    coalesce(p_selected_package_ids, '{}'::uuid[]), p_responsible_player_id,
    case when v_link is null then null else now() end, now(), auth.uid()
  )
  on conflict (tournament_id) do update set
    status = excluded.status,
    provider = excluded.provider,
    payment_link = excluded.payment_link,
    target_amount_cents = excluded.target_amount_cents,
    collected_amount_cents = excluded.collected_amount_cents,
    suggested_amount_cents = excluded.suggested_amount_cents,
    notes = excluded.notes,
    share_enabled = excluded.share_enabled,
    selected_package_ids = excluded.selected_package_ids,
    responsible_player_id = excluded.responsible_player_id,
    payment_link_configured_at = excluded.payment_link_configured_at,
    updated_at = now(),
    updated_by = auth.uid();

  update public.tournaments set cooler_suggested_cents = v_amount where id = p_tournament_id;
end;
$$;

create or replace function public.get_public_third_half_registration_v1(
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

create or replace function public.save_my_third_half_payment_link_v1(
  p_tournament_id uuid,
  p_player_id uuid,
  p_provider text,
  p_payment_link text,
  p_suggested_amount_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_link text := nullif(trim(coalesce(p_payment_link, '')), '');
  v_provider text := nullif(trim(coalesce(p_provider, '')), '');
  v_amount integer := coalesce(p_suggested_amount_cents, 0);
begin
  if auth.uid() is null then raise exception 'Connecte-toi à ton compte SWÉ pour enregistrer ce lien'; end if;
  if v_link is null or lower(v_link) !~ '^https://[^[:space:]]+$' or char_length(v_link) > 500 then raise exception 'Ajoute un lien HTTPS valide'; end if;
  if v_provider is null or char_length(v_provider) > 40 then raise exception 'Choisis une solution de paiement'; end if;
  if v_amount < 50 or v_amount > 500 then raise exception 'Choisis un montant fixe entre 0,50 € et 5 €'; end if;

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
  ) then raise exception 'Ce profil n’est pas autorisé à gérer cette glacière'; end if;

  update public.third_half_funds
  set provider = v_provider,
      payment_link = v_link,
      suggested_amount_cents = v_amount,
      status = 'open',
      share_enabled = true,
      payment_link_configured_at = now(),
      updated_at = now(),
      updated_by = auth.uid()
  where tournament_id = p_tournament_id and responsible_player_id = p_player_id;

  update public.tournaments set cooler_suggested_cents = v_amount where id = p_tournament_id;
  return jsonb_build_object('saved', true, 'suggested_amount_cents', v_amount);
end;
$$;

revoke all on function public.get_admin_third_half_setup_v2(uuid) from public;
revoke all on function public.admin_save_third_half_setup_v2(uuid,text,text,text,integer,integer,integer,text,boolean,uuid[],uuid) from public;
revoke all on function public.save_my_third_half_payment_link_v1(uuid,uuid,text,text,integer) from public;
revoke all on function public.get_admin_third_half_setup_v2(uuid) from anon;
revoke all on function public.admin_save_third_half_setup_v2(uuid,text,text,text,integer,integer,integer,text,boolean,uuid[],uuid) from anon;
revoke all on function public.save_my_third_half_payment_link_v1(uuid,uuid,text,text,integer) from anon;
grant execute on function public.get_admin_third_half_setup_v2(uuid) to authenticated;
grant execute on function public.admin_save_third_half_setup_v2(uuid,text,text,text,integer,integer,integer,text,boolean,uuid[],uuid) to authenticated;
grant execute on function public.save_my_third_half_payment_link_v1(uuid,uuid,text,text,integer) to authenticated;

revoke all on function public.get_public_third_half_registration_v1(uuid,uuid) from public;
grant execute on function public.get_public_third_half_registration_v1(uuid,uuid) to anon, authenticated;
