create table if not exists private.player_account_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid null references auth.users(id)
);
alter table private.player_account_access enable row level security;
revoke all on private.player_account_access from public,anon,authenticated;

insert into private.player_account_access(user_id,enabled,updated_at)
select u.id,true,now() from auth.users u
where lower(split_part(coalesce(u.email,''),'@',1)) in ('laurencesarahlouison','la.louison','clikopro')
on conflict(user_id) do update set enabled=true,updated_at=now();

create or replace function private.player_account_enabled_v4469(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select a.enabled from private.player_account_access a where a.user_id=p_user_id),false);
$$;
revoke all on function private.player_account_enabled_v4469(uuid) from public,anon,authenticated;

create or replace function public.get_my_player_account_access_v1()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.player_account_enabled_v4469(auth.uid());
$$;
revoke all on function public.get_my_player_account_access_v1() from public,anon;
grant execute on function public.get_my_player_account_access_v1() to authenticated;

create or replace function public.super_admin_get_player_account_access_v1()
returns table(user_id uuid,global_player_id uuid,email text,display_name text,public_player_id text,enabled boolean,updated_at timestamptz)
language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
 if not private.is_platform_super_admin() then raise exception 'Accès super administrateur requis';end if;
 return query
 select u.id,g.id,u.email::text,coalesce(g.display_name,u.email)::text,g.public_player_id,
        private.player_account_enabled_v4469(u.id),a.updated_at
 from auth.users u
 left join public.global_player_profiles g on g.user_id=u.id
 left join private.player_account_access a on a.user_id=u.id
 where g.id is not null
 order by lower(coalesce(g.display_name,u.email)),lower(u.email);
end $$;
revoke all on function public.super_admin_get_player_account_access_v1() from public,anon;
grant execute on function public.super_admin_get_player_account_access_v1() to authenticated;

create or replace function public.super_admin_set_player_account_access_v1(p_user_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
begin
 if not private.is_platform_super_admin() then raise exception 'Accès super administrateur requis';end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Compte introuvable';end if;
 insert into private.player_account_access(user_id,enabled,updated_at,updated_by)
 values(p_user_id,coalesce(p_enabled,false),now(),auth.uid())
 on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now(),updated_by=auth.uid();
 return coalesce(p_enabled,false);
end $$;
revoke all on function public.super_admin_set_player_account_access_v1(uuid,boolean) from public,anon;
grant execute on function public.super_admin_set_player_account_access_v1(uuid,boolean) to authenticated;

create or replace function private.require_player_account_access_v4469()
returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.player_account_enabled_v4469(auth.uid()) then
  raise exception 'Le compte joueur SWÉ est actuellement réservé aux comptes de test autorisés';
 end if;
end $$;
revoke all on function private.require_player_account_access_v4469() from public,anon,authenticated;

-- Protect the dashboard data at the server boundary as well as the navigation.
do $$
declare d text;
begin
 select pg_get_functiondef('public.get_my_global_player_dashboard_v2()'::regprocedure) into d;
 if position('require_player_account_access_v4469' in d)=0 then
  d:=replace(d,E'begin\n',E'begin\n  perform private.require_player_account_access_v4469();\n');
  execute d;
 end if;
end $$;

-- Block the main account mutations too; public tournament registration remains independent.
do $$
declare r record; d text;
begin
 for r in
  select p.oid from pg_proc p
  where p.pronamespace='public'::regnamespace and p.proname in (
   'ensure_my_global_player_profile','update_my_global_player_profile',
   'respond_global_player_participation_request','respond_global_player_tournament_invite',
   'link_my_member_player_to_swe','claim_swe_identity_player'
  )
 loop
  d:=pg_get_functiondef(r.oid);
  if position('require_player_account_access_v4469' in d)=0 then
   d:=replace(d,E'begin\n',E'begin\n  perform private.require_player_account_access_v4469();\n');
   execute d;
  end if;
 end loop;
end $$;
