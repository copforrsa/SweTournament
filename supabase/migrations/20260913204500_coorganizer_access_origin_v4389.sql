-- SWÉ Tournament V43.89 — explicit co-organizer access origin and invitation lifecycle.
-- Existing co-organizers were historically activated by the Super Admin: mark them as gifted.
-- No account is disabled and no tournament data is touched.

alter table public.workspace_members
  add column if not exists coorganizer_access_origin text;
alter table public.workspace_members
  drop constraint if exists workspace_members_coorganizer_access_origin_check;
alter table public.workspace_members
  add constraint workspace_members_coorganizer_access_origin_check
  check (coorganizer_access_origin is null or coorganizer_access_origin in ('gifted','organizer_paid','self_paid'));
alter table public.workspace_members
  alter column coorganizer_access_origin set default 'gifted';

alter table public.workspace_invites
  add column if not exists coorganizer_access_origin text;
alter table public.workspace_invites
  drop constraint if exists workspace_invites_coorganizer_access_origin_check;
alter table public.workspace_invites
  add constraint workspace_invites_coorganizer_access_origin_check
  check (coorganizer_access_origin is null or coorganizer_access_origin in ('gifted','organizer_paid','self_paid'));
alter table public.workspace_invites
  alter column coorganizer_access_origin set default 'gifted';

-- Business decision V43.89: every legacy co-organizer access is a Super Admin gift.
update public.workspace_members
set coorganizer_access_origin='gifted'
where role='coorganizer';

update public.workspace_invites
set coorganizer_access_origin=case when payment_responsibility='invitee' then 'self_paid' else 'gifted' end
where role='coorganizer';

create or replace function public.create_coorganizer_invite(p_workspace_id uuid,p_email text)
returns table(id uuid,email text,created_at timestamptz)
language plpgsql security definer set search_path='public','auth','private','pg_temp'
as $$
declare v_id uuid;v_norm_email text:=lower(trim(coalesce(p_email,'')));v_count integer;v_limit integer;
begin
  if (select auth.uid()) is null or not (private.is_workspace_admin(p_workspace_id) or private.coorganizer_has_permission(p_workspace_id,'invite')) then
    raise exception 'Tu n’es pas autorisé à inviter un co-organisateur';
  end if;
  if v_norm_email='' or position('@' in v_norm_email)=0 then raise exception 'Adresse e-mail invalide'; end if;
  select w.max_coorganizers into v_limit from public.workspaces w where w.id=p_workspace_id;
  if v_limit is null then raise exception 'Espace introuvable'; end if;
  select count(*) into v_count from public.workspace_members wm
    where wm.workspace_id=p_workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true;
  v_count:=v_count+(select count(*) from public.workspace_invites wi
    where wi.workspace_id=p_workspace_id and wi.role='coorganizer' and wi.accepted_at is null and lower(wi.email)<>v_norm_email);
  if v_count>=v_limit then raise exception 'Limite de % co-gestionnaires / invitations atteinte',v_limit; end if;

  insert into public.workspace_invites(
    workspace_id,email,role,invited_by,payment_responsibility,payment_status,coorganizer_access_origin
  ) values(p_workspace_id,v_norm_email,'coorganizer',(select auth.uid()),'admin','paid','organizer_paid')
  on conflict on constraint workspace_invites_workspace_id_email_key do update set
    invited_by=excluded.invited_by,role='coorganizer',accepted_at=null,
    payment_responsibility='admin',payment_status='paid',coorganizer_access_origin='organizer_paid',
    preferred_billing_period=null,paid_by_user_id=null,stripe_subscription_id=null,payment_started_at=null
  returning workspace_invites.id into v_id;
  return query select wi.id,wi.email,wi.created_at from public.workspace_invites wi where wi.id=v_id;
end $$;

revoke all on function public.create_coorganizer_invite(uuid,text) from public,anon,authenticated;
grant execute on function public.create_coorganizer_invite(uuid,text) to authenticated;

create or replace function public.create_self_paid_coorganizer_invite(p_workspace_id uuid,p_email text)
returns table(id uuid,email text,created_at timestamptz)
language plpgsql security definer set search_path='public','auth','private','pg_temp'
as $$
declare v_id uuid;v_norm_email text:=lower(trim(coalesce(p_email,'')));v_pending integer;
begin
  if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace_id) then raise exception 'Réservé à l’administrateur'; end if;
  if v_norm_email='' or position('@' in v_norm_email)=0 then raise exception 'Adresse e-mail invalide'; end if;
  select count(*) into v_pending from public.workspace_invites
   where workspace_id=p_workspace_id and role='coorganizer' and accepted_at is null and payment_responsibility='invitee';
  if v_pending>=20 then raise exception 'Trop d’invitations en attente'; end if;

  insert into public.workspace_invites(
    workspace_id,email,role,invited_by,payment_responsibility,payment_status,coorganizer_access_origin,
    preferred_billing_period,paid_by_user_id,stripe_subscription_id,payment_started_at
  ) values(p_workspace_id,v_norm_email,'coorganizer',(select auth.uid()),'invitee','pending','self_paid',null,null,null,null)
  on conflict on constraint workspace_invites_workspace_id_email_key do update set
    invited_by=excluded.invited_by,role='coorganizer',accepted_at=null,
    payment_responsibility='invitee',payment_status='pending',coorganizer_access_origin='self_paid',
    preferred_billing_period=null,paid_by_user_id=null,stripe_subscription_id=null,payment_started_at=null
  returning workspace_invites.id into v_id;
  return query select wi.id,wi.email,wi.created_at from public.workspace_invites wi where wi.id=v_id;
end $$;

revoke all on function public.create_self_paid_coorganizer_invite(uuid,text) from public,anon,authenticated;
grant execute on function public.create_self_paid_coorganizer_invite(uuid,text) to authenticated;

create or replace function public.accept_workspace_invite(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path='public','auth','pg_temp'
as $$
declare v_inv public.workspace_invites%rowtype;v_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  v_email:=lower(coalesce(auth.jwt()->>'email',''));
  select * into v_inv from public.workspace_invites where id=p_invite_id and accepted_at is null for update;
  if not found then raise exception 'invite not found'; end if;
  if lower(v_inv.email)<>v_email then raise exception 'invite email does not match authenticated user'; end if;
  if v_inv.payment_responsibility='invitee' and v_inv.payment_status<>'paid' then
    raise exception 'Paiement requis avant activation de l’accès co-gestionnaire';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role,active,coorganizer_access_origin)
  values(v_inv.workspace_id,(select auth.uid()),v_inv.role,true,
    case when v_inv.role='coorganizer' then coalesce(v_inv.coorganizer_access_origin,'gifted') else null end)
  on conflict(workspace_id,user_id) do update set role=excluded.role,active=true,
    coorganizer_access_origin=case when excluded.role='coorganizer' then excluded.coorganizer_access_origin else public.workspace_members.coorganizer_access_origin end;
  if v_inv.role='coorganizer' then
    insert into public.coorganizer_permissions(workspace_id,user_id,can_invite_coorganizers,can_enter_scores,can_add_members,can_delete_members,can_create_tournaments,can_view_players,can_generate_teams,can_generate_team_codes,can_edit_player_personal_info,updated_at)
    values(v_inv.workspace_id,(select auth.uid()),false,false,false,false,false,true,false,false,false,now())
    on conflict(workspace_id,user_id) do nothing;
  end if;
  update public.workspace_invites set accepted_at=now() where id=p_invite_id;
  return v_inv.workspace_id;
end $$;

revoke all on function public.accept_workspace_invite(uuid) from public,anon,authenticated;
grant execute on function public.accept_workspace_invite(uuid) to authenticated;

create or replace function public.activate_paid_coorganizer_invite(
  p_invite_id uuid,p_user_id uuid,p_stripe_subscription_id text,p_billing_period text
) returns uuid language plpgsql security definer set search_path='public','auth','pg_temp'
as $$
declare v_inv public.workspace_invites%rowtype;v_user_email text;
begin
  select * into v_inv from public.workspace_invites where id=p_invite_id for update;
  if not found or v_inv.role<>'coorganizer' or v_inv.payment_responsibility<>'invitee' then raise exception 'Invalid paid invite'; end if;
  select lower(email) into v_user_email from auth.users where id=p_user_id;
  if v_user_email is null or v_user_email<>lower(v_inv.email) then raise exception 'Invite payer mismatch'; end if;
  if p_billing_period not in ('month','year') then raise exception 'Invalid billing period'; end if;
  update public.workspace_invites set payment_status='paid',coorganizer_access_origin='self_paid',
    preferred_billing_period=p_billing_period,paid_by_user_id=p_user_id,
    stripe_subscription_id=p_stripe_subscription_id,accepted_at=coalesce(accepted_at,now())
  where id=p_invite_id;
  insert into public.workspace_members(workspace_id,user_id,role,active,coorganizer_access_origin)
  values(v_inv.workspace_id,p_user_id,'coorganizer',true,'self_paid')
  on conflict(workspace_id,user_id) do update set role='coorganizer',active=true,coorganizer_access_origin='self_paid';
  insert into public.coorganizer_permissions(workspace_id,user_id,can_invite_coorganizers,can_enter_scores,can_add_members,can_delete_members,can_create_tournaments,can_view_players,can_generate_teams,can_generate_team_codes,can_edit_player_personal_info,updated_at)
  values(v_inv.workspace_id,p_user_id,false,false,false,false,false,true,false,false,false,now())
  on conflict(workspace_id,user_id) do nothing;
  return v_inv.workspace_id;
end $$;

revoke all on function public.activate_paid_coorganizer_invite(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.activate_paid_coorganizer_invite(uuid,uuid,text,text) to service_role;

drop function if exists public.super_admin_get_coorganizer_billing_v1();
create function public.super_admin_get_coorganizer_billing_v1()
returns table(
  workspace_id uuid,workspace_name text,organizer_email text,coorganizer_user_id uuid,coorganizer_email text,
  member_status text,payment_status text,linked_player_id uuid,linked_player_name text,billing_period text,
  payment_updated_at timestamptz,invite_id uuid
)
language plpgsql security definer set search_path='public','auth','private','pg_temp'
as $$
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  return query
  with admin_emails as (
    select distinct on (wm.workspace_id) wm.workspace_id,u.email::text email
    from public.workspace_members wm left join auth.users u on u.id=wm.user_id
    where wm.role='admin' order by wm.workspace_id,wm.created_at
  ),self_paid as (
    select distinct on (s.workspace_id,s.payer_user_id) s.workspace_id,s.payer_user_id,s.billing_period,s.updated_at
    from public.workspace_coorganizer_subscriptions s
    where s.payment_source='invitee' and s.payer_user_id is not null and s.status='active'
      and lower(coalesce(s.stripe_status,'active')) in ('active','trialing')
    order by s.workspace_id,s.payer_user_id,s.updated_at desc
  )
  select wm.workspace_id,w.name::text,ae.email,wm.user_id,u.email::text,
    case when coalesce(wm.active,true) then 'active' else 'suspended' end,
    case when sp.payer_user_id is not null then 'self_paid' else coalesce(wm.coorganizer_access_origin,'gifted') end,
    wm.linked_player_id,p.name::text,sp.billing_period,coalesce(sp.updated_at,wm.created_at),null::uuid
  from public.workspace_members wm join public.workspaces w on w.id=wm.workspace_id
  left join auth.users u on u.id=wm.user_id left join admin_emails ae on ae.workspace_id=wm.workspace_id
  left join public.players p on p.id=wm.linked_player_id and p.workspace_id=wm.workspace_id
  left join self_paid sp on sp.workspace_id=wm.workspace_id and sp.payer_user_id=wm.user_id
  where wm.role='coorganizer'
  union all
  select i.workspace_id,w.name::text,ae.email,null::uuid,i.email::text,'invited'::text,
    case when i.payment_responsibility='invitee' and i.payment_status<>'paid' then 'pending_payment'
      when i.payment_responsibility='invitee' then 'self_paid'
      else coalesce(i.coorganizer_access_origin,'gifted') end,
    null::uuid,null::text,i.preferred_billing_period,coalesce(i.payment_started_at,i.created_at),i.id
  from public.workspace_invites i join public.workspaces w on w.id=i.workspace_id
  left join admin_emails ae on ae.workspace_id=i.workspace_id
  where i.role='coorganizer' and i.accepted_at is null
  order by 2,5;
end $$;

revoke all on function public.super_admin_get_coorganizer_billing_v1() from public,anon,authenticated;
grant execute on function public.super_admin_get_coorganizer_billing_v1() to authenticated;

create or replace function public.super_admin_set_coorganizer_access_origin_v1(
  p_workspace_id uuid,p_user_id uuid default null,p_invite_id uuid default null,p_origin text default 'gifted'
) returns void language plpgsql security definer set search_path='public','auth','private','pg_temp'
as $$
declare v_email text;
begin
  if (select auth.uid()) is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
  if p_origin not in ('gifted','organizer_paid') then raise exception 'Origine d’accès invalide'; end if;
  if (p_user_id is null)=(p_invite_id is null) then raise exception 'Choisis exactement un accès ou une invitation'; end if;
  if p_user_id is not null then
    if exists(select 1 from public.workspace_coorganizer_subscriptions s where s.workspace_id=p_workspace_id
      and s.payer_user_id=p_user_id and s.payment_source='invitee' and s.status='active') then
      raise exception 'Un abonnement personnel actif ne peut pas être reclassé';
    end if;
    update public.workspace_members set coorganizer_access_origin=p_origin
    where workspace_id=p_workspace_id and user_id=p_user_id and role='coorganizer';
    if not found then raise exception 'Co-organisateur introuvable'; end if;
    select lower(email) into v_email from auth.users where id=p_user_id;
    update public.workspace_invites set coorganizer_access_origin=p_origin,payment_responsibility='admin',
      payment_status=case when p_origin='organizer_paid' then 'paid' else 'not_required' end
    where workspace_id=p_workspace_id and lower(email)=v_email and role='coorganizer';
  else
    update public.workspace_invites set coorganizer_access_origin=p_origin,payment_responsibility='admin',
      payment_status=case when p_origin='organizer_paid' then 'paid' else 'not_required' end
    where id=p_invite_id and workspace_id=p_workspace_id and role='coorganizer' and accepted_at is null;
    if not found then raise exception 'Invitation introuvable'; end if;
  end if;
  insert into public.security_audit_log(workspace_id,actor_user_id,actor_type,action,target_type,target_id,metadata)
  values(p_workspace_id,(select auth.uid()),'super_admin','billing.coorganizer_access_origin','workspace_members',
    coalesce(p_user_id,p_invite_id)::text,jsonb_build_object('origin',p_origin));
end $$;

revoke all on function public.super_admin_set_coorganizer_access_origin_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.super_admin_set_coorganizer_access_origin_v1(uuid,uuid,uuid,text) to authenticated;
