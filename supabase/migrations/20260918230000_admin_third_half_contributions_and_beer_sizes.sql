
alter table public.third_half_funds
  add column if not exists admin_contribution_player_id uuid,
  add column if not exists admin_contribution_mode text,
  add column if not exists admin_contribution_amount_cents integer not null default 0,
  add column if not exists admin_contribution_item text,
  add column if not exists admin_contribution_updated_at timestamptz;

alter table public.third_half_funds
  drop constraint if exists third_half_funds_admin_contribution_mode_check;
alter table public.third_half_funds
  add constraint third_half_funds_admin_contribution_mode_check
  check (admin_contribution_mode is null or admin_contribution_mode in ('money','supplies'));

alter table public.third_half_funds
  drop constraint if exists third_half_funds_admin_contribution_amount_check;
alter table public.third_half_funds
  add constraint third_half_funds_admin_contribution_amount_check
  check (admin_contribution_amount_cents between 0 and 500);

create or replace function public.admin_save_third_half_admin_contribution_v1(
  p_tournament_id uuid,
  p_mode text,
  p_amount_cents integer default 0,
  p_item text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare
  v_workspace uuid;
  v_player uuid;
  v_mode text := nullif(trim(coalesce(p_mode,'')), '');
  v_item text := nullif(trim(coalesce(p_item,'')), '');
  v_amount integer := greatest(0, coalesce(p_amount_cents,0));
begin
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;

  select linked_player_id into v_player
  from public.workspace_members
  where workspace_id=v_workspace and user_id=auth.uid() and active=true;

  if v_player is null then
    raise exception 'Associe d’abord ton compte administrateur à ton profil joueur pour enregistrer ton apport';
  end if;

  if v_mode not in ('money','supplies') then
    raise exception 'Choisis un apport financier ou matériel';
  end if;
  if v_mode='money' and (v_amount < 50 or v_amount > 500) then
    raise exception 'L’apport financier doit être compris entre 0,50 € et 5 €';
  end if;
  if v_mode='supplies' and v_item not in ('cooler','ice','beers_3','beers_5','beers_6','ti_punch','fruits','cups','soft_drinks','snacks','other') then
    raise exception 'Choisis un apport matériel valide';
  end if;

  insert into public.third_half_funds(
    tournament_id, workspace_id, status, admin_contribution_player_id,
    admin_contribution_mode, admin_contribution_amount_cents, admin_contribution_item,
    admin_contribution_updated_at, updated_at, updated_by
  ) values (
    p_tournament_id, v_workspace, 'draft', v_player,
    v_mode, case when v_mode='money' then v_amount else 0 end,
    case when v_mode='supplies' then v_item else null end,
    now(), now(), auth.uid()
  )
  on conflict (tournament_id) do update set
    admin_contribution_player_id=excluded.admin_contribution_player_id,
    admin_contribution_mode=excluded.admin_contribution_mode,
    admin_contribution_amount_cents=excluded.admin_contribution_amount_cents,
    admin_contribution_item=excluded.admin_contribution_item,
    admin_contribution_updated_at=excluded.admin_contribution_updated_at,
    updated_at=now(), updated_by=auth.uid();

  return jsonb_build_object('saved',true,'player_id',v_player);
end;
$$;
revoke all on function public.admin_save_third_half_admin_contribution_v1(uuid,text,integer,text) from public;
grant execute on function public.admin_save_third_half_admin_contribution_v1(uuid,text,integer,text) to authenticated;

create or replace function public.admin_get_third_half_assignments_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
begin
  if not private.is_workspace_admin(p_workspace_id) then raise exception 'Accès administrateur requis'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'tournament_id',t.id,
      'payment_player_id',f.responsible_player_id,
      'cooler_player_id',coalesce(nullif(f.logistics_assignments #>> '{cooler,player_id}','')::uuid,f.responsible_player_id),
      'ice_player_id',nullif(f.logistics_assignments #>> '{ice,player_id}','')::uuid,
      'admin_contribution_mode',f.admin_contribution_mode,
      'admin_contribution_amount_cents',coalesce(f.admin_contribution_amount_cents,0),
      'admin_contribution_item',f.admin_contribution_item,
      'responsible_registered',exists(select 1 from public.tournament_players tp where tp.tournament_id=t.id and tp.player_id=f.responsible_player_id and tp.present=true and tp.registration_status<>'cancelled'),
      'payment_responsible_registered',exists(select 1 from public.tournament_players tp where tp.tournament_id=t.id and tp.player_id=f.responsible_player_id and tp.present=true and tp.registration_status<>'cancelled'),
      'registered_player_ids',coalesce((select jsonb_agg(tp.player_id order by tp.registered_at,tp.player_id) from public.tournament_players tp where tp.tournament_id=t.id and tp.present=true and tp.registration_status<>'cancelled'),'[]'::jsonb)
    ) order by t.tournament_date desc)
    from public.tournaments t left join public.third_half_funds f on f.tournament_id=t.id
    where t.workspace_id=p_workspace_id and t.status<>'finished' and coalesce(t.third_half_active,false)=true
  ),'[]'::jsonb);
end;
$$;

create or replace function public.get_public_third_half_contributions_v1(p_token uuid,p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare v_result jsonb;
begin
  if not exists(
    select 1 from public.tournaments t join public.workspaces w on w.id=t.workspace_id
    where t.id=p_tournament_id and w.public_token=p_token and w.public_enabled=true and t.third_half_active=true
  ) then raise exception 'Lien de 3e mi-temps indisponible'; end if;
  with contributions as (
    select p.id player_id,p.name player_name,coalesce(gp.avatar_url,p.avatar_url) avatar_url,
      tp.third_half_contribution_mode contribution_mode,
      case when tp.third_half_contribution_mode='money' then least(500,greatest(0,coalesce(tp.third_half_pledge_cents,0))) else 0 end contribution_amount_cents,
      tp.third_half_contribution_item contribution_item
    from public.tournament_players tp
    join public.players p on p.id=tp.player_id
    left join public.global_player_profiles gp on gp.id=p.global_player_id
    where tp.tournament_id=p_tournament_id and tp.present=true and tp.registration_status<>'cancelled'
      and tp.third_half_participating=true and tp.third_half_contribution_mode in ('money','supplies')
    union all
    select p.id,p.name,coalesce(gp.avatar_url,p.avatar_url),f.admin_contribution_mode,
      case when f.admin_contribution_mode='money' then least(500,greatest(0,coalesce(f.admin_contribution_amount_cents,0))) else 0 end,
      f.admin_contribution_item
    from public.third_half_funds f
    join public.players p on p.id=f.admin_contribution_player_id
    left join public.global_player_profiles gp on gp.id=p.global_player_id
    where f.tournament_id=p_tournament_id and f.admin_contribution_mode in ('money','supplies')
  )
  select jsonb_build_object(
    'money_pool_cents',coalesce(sum(case when contribution_mode='money' then contribution_amount_cents else 0 end),0),
    'money_donor_count',count(*) filter(where contribution_mode='money'),
    'contributions',coalesce(jsonb_agg(jsonb_build_object('player_id',player_id,'player_name',player_name,'avatar_url',avatar_url,'contribution_mode',contribution_mode,'contribution_amount_cents',contribution_amount_cents,'contribution_item',contribution_item) order by player_name),'[]'::jsonb)
  ) into v_result from contributions;
  return coalesce(v_result,jsonb_build_object('money_pool_cents',0,'money_donor_count',0,'contributions','[]'::jsonb));
end;
$$;

create or replace function public.admin_save_third_half_assignments_v2(p_tournament_id uuid,p_payment_player_id uuid,p_cooler_player_id uuid,p_ice_player_id uuid)
returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_workspace uuid; v_enabled boolean; v_previous_payment_player uuid; v_assignments jsonb:='{}'::jsonb;
  v_payment_registered boolean:=false; v_payment_player_changed boolean:=false;
begin
  select t.workspace_id,coalesce(t.third_half_active,false) into v_workspace,v_enabled from public.tournaments t where t.id=p_tournament_id;
  if v_workspace is null then raise exception 'Swé introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if not v_enabled then raise exception 'Active d’abord le module Glacière pour ce Swé'; end if;
  if p_payment_player_id is not null and not exists(select 1 from public.players p where p.id=p_payment_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'Le responsable du lien ne fait pas partie de ce groupe'; end if;
  if p_cooler_player_id is not null and not exists(select 1 from public.players p where p.id=p_cooler_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'La personne chargée de la glacière ne fait pas partie de ce groupe'; end if;
  if p_ice_player_id is not null and not exists(select 1 from public.players p where p.id=p_ice_player_id and p.workspace_id=v_workspace and p.active=true) then raise exception 'La personne chargée des glaçons ne fait pas partie de ce groupe'; end if;
  select f.responsible_player_id,coalesce(f.logistics_assignments,'{}'::jsonb) into v_previous_payment_player,v_assignments from public.third_half_funds f where f.tournament_id=p_tournament_id;
  v_payment_player_changed:=v_previous_payment_player is distinct from p_payment_player_id;
  v_payment_registered:=p_payment_player_id is not null and exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p_payment_player_id and tp.present=true and tp.registration_status<>'cancelled');
  if p_payment_player_id is not null and not v_payment_registered then raise exception 'Le responsable du lien doit être inscrit au tournoi'; end if;
  v_assignments:=jsonb_set(coalesce(v_assignments,'{}'::jsonb),'{cooler}',jsonb_build_object('player_id',p_cooler_player_id,'status','assigned'),true);
  v_assignments:=jsonb_set(v_assignments,'{ice}',jsonb_build_object('player_id',p_ice_player_id,'status','assigned'),true);
  if not(v_assignments?'beers') then v_assignments:=jsonb_set(v_assignments,'{beers}',jsonb_build_object('player_id',p_cooler_player_id,'status','assigned','quantity',6),true); end if;
  insert into public.third_half_funds(tournament_id,workspace_id,status,responsible_player_id,logistics_assignments,share_enabled,updated_at,updated_by)
  values(p_tournament_id,v_workspace,'draft',p_payment_player_id,v_assignments,false,now(),auth.uid())
  on conflict(tournament_id) do update set responsible_player_id=excluded.responsible_player_id,logistics_assignments=excluded.logistics_assignments,
    provider=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.provider end,
    payment_link=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link end,
    payment_link_configured_at=case when v_payment_player_changed or not v_payment_registered then null else third_half_funds.payment_link_configured_at end,
    share_enabled=case when v_payment_player_changed or not v_payment_registered then false else third_half_funds.share_enabled end,
    responsible_contribution_mode=case when v_payment_player_changed then null else third_half_funds.responsible_contribution_mode end,
    responsible_contribution_amount_cents=case when v_payment_player_changed then 0 else third_half_funds.responsible_contribution_amount_cents end,
    responsible_contribution_item=case when v_payment_player_changed then null else third_half_funds.responsible_contribution_item end,
    updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('saved',true,'payment_responsible_registered',v_payment_registered,'payment_mode',case when v_payment_registered then 'platform' else 'off_platform' end);
end;
$$;
