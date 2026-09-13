-- SWÉ Tournament V43.88 — co-organizer billing visibility and safe member linking.
-- Additive only: no tournament, registration, team, vote, match or score row is changed.

alter table public.workspace_invites
  add column if not exists payment_responsibility text not null default 'admin',
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists preferred_billing_period text,
  add column if not exists paid_by_user_id uuid,
  add column if not exists stripe_subscription_id text,
  add column if not exists payment_started_at timestamptz;

alter table public.workspace_coorganizer_subscriptions
  add column if not exists stripe_status text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists payer_user_id uuid,
  add column if not exists invite_id uuid,
  add column if not exists billing_period text,
  add column if not exists payment_source text not null default 'workspace_admin';

create or replace function public.super_admin_get_coorganizer_billing_v1()
returns table(
  workspace_id uuid,
  workspace_name text,
  organizer_email text,
  coorganizer_user_id uuid,
  coorganizer_email text,
  member_status text,
  payment_status text,
  linked_player_id uuid,
  linked_player_name text,
  billing_period text,
  payment_updated_at timestamptz
)
language plpgsql
security definer
set search_path='public','auth','private','pg_temp'
as $$
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then
    raise exception 'Accès Super Admin requis';
  end if;

  return query
  with admin_emails as (
    select distinct on (wm.workspace_id) wm.workspace_id,u.email::text as email
    from public.workspace_members wm
    left join auth.users u on u.id=wm.user_id
    where wm.role='admin'
    order by wm.workspace_id,wm.created_at
  ), self_paid as (
    select distinct on (s.workspace_id,s.payer_user_id)
      s.workspace_id,s.payer_user_id,s.billing_period,s.updated_at
    from public.workspace_coorganizer_subscriptions s
    where s.payment_source='invitee'
      and s.payer_user_id is not null
      and s.status='active'
      and lower(coalesce(s.stripe_status,'active')) in ('active','trialing')
    order by s.workspace_id,s.payer_user_id,s.updated_at desc
  )
  select wm.workspace_id,w.name::text,ae.email,wm.user_id,u.email::text,
    case when coalesce(wm.active,true) then 'active' else 'suspended' end,
    case when sp.payer_user_id is not null then 'self_paid' else 'organizer_paid' end,
    wm.linked_player_id,p.name::text,sp.billing_period,coalesce(sp.updated_at,wm.created_at)
  from public.workspace_members wm
  join public.workspaces w on w.id=wm.workspace_id
  left join auth.users u on u.id=wm.user_id
  left join admin_emails ae on ae.workspace_id=wm.workspace_id
  left join public.players p on p.id=wm.linked_player_id and p.workspace_id=wm.workspace_id
  left join self_paid sp on sp.workspace_id=wm.workspace_id and sp.payer_user_id=wm.user_id
  where wm.role='coorganizer'

  union all

  select i.workspace_id,w.name::text,ae.email,null::uuid,i.email::text,
    'invited'::text,'pending_payment'::text,null::uuid,null::text,
    i.preferred_billing_period,coalesce(i.payment_started_at,i.created_at)
  from public.workspace_invites i
  join public.workspaces w on w.id=i.workspace_id
  left join admin_emails ae on ae.workspace_id=i.workspace_id
  where i.role='coorganizer'
    and i.accepted_at is null
    and i.payment_responsibility='invitee'
    and i.payment_status<>'paid'

  order by 2,5;
end $$;

revoke all on function public.super_admin_get_coorganizer_billing_v1() from public,anon,authenticated;
grant execute on function public.super_admin_get_coorganizer_billing_v1() to authenticated;

create or replace function public.admin_link_coorganizer_player_v1(
  p_workspace_id uuid,
  p_user_id uuid,
  p_player_id uuid
) returns uuid
language plpgsql
security definer
set search_path='public','auth','private','pg_temp'
as $$
declare
  v_current uuid;
  v_global uuid;
begin
  if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Accès réservé à l’administrateur';
  end if;

  select wm.linked_player_id into v_current
  from public.workspace_members wm
  where wm.workspace_id=p_workspace_id and wm.user_id=p_user_id and wm.role='coorganizer'
  for update;
  if not found then raise exception 'Co-organisateur introuvable'; end if;

  if v_current is not null then
    if v_current=p_player_id then return v_current; end if;
    raise exception 'Le membre associé est verrouillé. Seul le Super Admin peut corriger cette liaison.';
  end if;

  perform 1 from public.players p
  where p.id=p_player_id and p.workspace_id=p_workspace_id
    and p.active=true and p.is_group_member=true
  for update;
  if not found then raise exception 'Membre du groupe invalide'; end if;

  if exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=p_workspace_id and wm.linked_player_id=p_player_id
      and wm.user_id<>p_user_id
  ) then raise exception 'Ce membre est déjà associé à un autre compte'; end if;

  select g.id into v_global
  from public.global_player_profiles g
  where g.user_id=p_user_id
  limit 1;
  if v_global is null then
    raise exception 'Le co-organisateur doit disposer d’un ID SWÉ avant le rattachement.';
  end if;

  if exists(
    select 1 from public.players p
    where p.id=p_player_id and p.global_player_id is not null and p.global_player_id<>v_global
  ) then raise exception 'Ce membre est déjà rattaché à un autre ID SWÉ'; end if;

  update public.workspace_members
  set linked_player_id=p_player_id
  where workspace_id=p_workspace_id and user_id=p_user_id and role='coorganizer';

  update public.players set global_player_id=v_global where id=p_player_id;

  return p_player_id;
end $$;

revoke all on function public.admin_link_coorganizer_player_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_link_coorganizer_player_v1(uuid,uuid,uuid) to authenticated;
