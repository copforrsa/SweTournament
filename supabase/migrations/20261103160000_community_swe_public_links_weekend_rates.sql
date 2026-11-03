-- Tarifs fixes SWÉ simple: samedi/dimanche 5 €, jours ouvrés à partir de 21h30 7 €.
-- Avant 21h30 en semaine : tarif non renseigné, affiché comme tel.
CREATE OR REPLACE FUNCTION public.get_community_swe_venues()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select jsonb_build_object(
 'complexes',coalesce((select jsonb_agg(jsonb_build_object(
   'id',c.id,'name',c.name,'address',c.address,'city',c.city,
   'latitude',c.latitude,'longitude',c.longitude,
   'onsite_sunday_price_cents',coalesce(c.onsite_sunday_price_cents,0),
   'onsite_weekday_price_cents',coalesce(c.onsite_weekday_price_cents,0),
   'pitches',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.sort_order,p.name) from public.sports_pitches p where p.complex_id=c.id and p.active=true),'[]'::jsonb)
 ) order by c.name) from public.sports_complexes c where c.active=true and c.allow_community_swe=true),'[]'::jsonb),
 'venues',coalesce((select jsonb_agg(jsonb_build_object(
   'id',v.id,'name',v.name,'address',v.address,'latitude',v.latitude,'longitude',v.longitude,'photo_url',v.photo_url
 ) order by v.name) from public.community_venues v where v.status='active' and v.share_on_swe=true),'[]'::jsonb)
); $function$;

CREATE OR REPLACE FUNCTION public.create_community_swe_v3(p_title text, p_visibility text, p_venue_kind text, p_venue_id uuid, p_start_at timestamp with time zone, p_max_players integer DEFAULT 10, p_reservation_reference text DEFAULT NULL::text, p_third_half_requested boolean DEFAULT false, p_invite_public_ids text[] DEFAULT '{}'::text[], p_terrain_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_profile uuid;
  v_id uuid;
  v_manual boolean;
  v_complex uuid;
  v_cv uuid;
  v_fee integer := 0;
  v_third_half boolean := false;
  v_local timestamp;
  v_invite_count integer := 0;
  v_unique_invites integer := 0;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_profile from public.global_player_profiles where user_id=auth.uid();
  if v_profile is null then raise exception 'Crée d’abord ton ID SWÉ'; end if;
  if p_visibility not in ('public','private') then raise exception 'Visibilité invalide'; end if;
  if p_start_at<=now() then raise exception 'La date doit être future'; end if;
  if coalesce(p_max_players,10) < 10 or coalesce(p_max_players,10) > 12 then raise exception 'Un match simple accepte entre 10 et 12 joueurs'; end if;

  select count(distinct upper(trim(x))) into v_unique_invites
  from unnest(coalesce(p_invite_public_ids,'{}'::text[])) x
  where nullif(trim(x),'') is not null;
  if v_unique_invites > p_max_players-1 then
    raise exception 'Trop d’invitations : % maximum pour un match de % joueurs',p_max_players-1,p_max_players;
  end if;

  if p_venue_kind='complex' then
    select id into v_complex from public.sports_complexes where id=p_venue_id and active=true and allow_community_swe=true;
    if v_complex is null then raise exception 'Complexe non disponible pour créer un SWÉ'; end if;
    v_local := p_start_at at time zone 'America/Martinique';
    v_fee := case when extract(isodow from v_local) in (6,7) then 500
      when v_local::time >= time '21:30' then 700 else 0 end;
    if nullif(trim(coalesce(p_terrain_label,'')),'') is null then raise exception 'Choisis un terrain'; end if;
    if not exists (select 1 from public.sports_pitches sp where sp.complex_id=v_complex and sp.active=true and sp.name=p_terrain_label) then
      raise exception 'Terrain non disponible dans ce complexe'; end if;
  elsif p_venue_kind='community' then
    select id into v_cv from public.community_venues where id=p_venue_id and status='active' and share_on_swe=true;
    if v_cv is null then raise exception 'Lieu non disponible ou non partagé'; end if;
  else
    raise exception 'Type de lieu invalide';
  end if;

  if coalesce(p_third_half_requested,false) then
    select exists(
      select 1
      from public.workspace_members wm
      join public.workspace_entitlements e on e.workspace_id=wm.workspace_id
      where wm.user_id=auth.uid() and wm.active=true and wm.role='admin' and coalesce(e.third_half_enabled,false)=true
    ) into v_third_half;
  end if;

  v_manual:=public.community_swe_manual_moderation_allowed();
  insert into public.community_swes(
    title,creator_user_id,creator_global_player_id,visibility,moderation_mode,
    venue_kind,complex_id,community_venue_id,start_at,max_players,
    reservation_reference,onsite_entry_fee_cents,third_half_active,terrain_label
  ) values(
    trim(coalesce(nullif(p_title,''),'SWÉ simple')),auth.uid(),v_profile,p_visibility,
    case when v_manual then 'manual' else 'auto' end,
    p_venue_kind,v_complex,v_cv,p_start_at,p_max_players,
    nullif(trim(coalesce(p_reservation_reference,'')),''),coalesce(v_fee,0),v_third_half,
    nullif(trim(coalesce(p_terrain_label,'')),'')
  ) returning id into v_id;

  insert into public.community_swe_participants(swe_id,global_player_id,status,responded_at)
  values(v_id,v_profile,'confirmed',now());

  insert into public.community_swe_participants(swe_id,global_player_id,status,invited_by_user_id)
  select v_id,g.id,'invited',auth.uid()
  from public.global_player_profiles g
  join (
    select distinct upper(trim(x)) as code
    from unnest(coalesce(p_invite_public_ids,'{}'::text[])) x
    where nullif(trim(x),'') is not null
  ) q on upper(g.public_player_id)=q.code
  where g.id<>v_profile
    and coalesce(g.identity_status,'active') in ('active','confirmed')
  on conflict(swe_id,global_player_id) do nothing;
  get diagnostics v_invite_count = row_count;

  return jsonb_build_object(
    'id',v_id,
    'moderation_mode',case when v_manual then 'manual' else 'auto' end,
    'onsite_entry_fee_cents',coalesce(v_fee,0),
    'third_half_active',v_third_half,
    'invite_count',v_invite_count
  );
end
$function$;

-- Public guest names are separate from authenticated player identities.
create table if not exists public.community_swe_guest_registrations (
 id uuid primary key default gen_random_uuid(),
 swe_id uuid not null references public.community_swes(id) on delete cascade,
 display_name text not null check (char_length(trim(display_name)) between 2 and 80),
 normalized_name text generated always as (lower(btrim(display_name))) stored,
 created_at timestamptz not null default now(),
 unique(swe_id,normalized_name)
);
alter table public.community_swe_guest_registrations enable row level security;
revoke all on public.community_swe_guest_registrations from public,anon,authenticated;

create or replace function public.public_community_swe_details_v1(p_swe_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $fn$
declare v_swe record; v_count int;
begin
 select s.id,s.title,s.start_at,s.max_players,s.onsite_entry_fee_cents,s.terrain_label,
        case when s.venue_kind='complex' then c.name else v.name end as venue_name,
        case when s.venue_kind='complex' then coalesce(c.address,c.city) else v.address end as venue_address
 into v_swe from public.community_swes s
 left join public.sports_complexes c on c.id=s.complex_id
 left join public.community_venues v on v.id=s.community_venue_id
 where s.id=p_swe_id and s.visibility='public' and s.status='open' and s.start_at>now();
 if not found then return jsonb_build_object('available',false); end if;
 select (select count(*) from public.community_swe_participants p where p.swe_id=p_swe_id and p.status='confirmed')
      + (select count(*) from public.community_swe_guest_registrations g where g.swe_id=p_swe_id) into v_count;
 return jsonb_build_object('available',true,'id',v_swe.id,'title',v_swe.title,
   'start_at',v_swe.start_at,'max_players',v_swe.max_players,'confirmed',v_count,
   'remaining',greatest(0,v_swe.max_players-v_count),'terrain_label',v_swe.terrain_label,
   'venue_name',v_swe.venue_name,'venue_address',v_swe.venue_address,
   'onsite_entry_fee_cents',v_swe.onsite_entry_fee_cents);
end $fn$;

create or replace function public.public_join_community_swe_member_v1(p_swe_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp
as $fn$
declare v_swe public.community_swes%rowtype; v_profile uuid; v_count int; v_existing text;
begin
 if auth.uid() is null then raise exception 'Connecte-toi pour t’inscrire'; end if;
 select id into v_profile from public.global_player_profiles where user_id=auth.uid();
 if v_profile is null then raise exception 'Crée ton profil joueur SWÉ avant de t’inscrire'; end if;
 select * into v_swe from public.community_swes where id=p_swe_id for update;
 if not found or v_swe.visibility<>'public' or v_swe.status<>'open' or v_swe.start_at<=now()
 then raise exception 'Ce SWÉ n’accepte plus les inscriptions'; end if;
 select status into v_existing from public.community_swe_participants where swe_id=p_swe_id and global_player_id=v_profile;
 if v_existing in ('confirmed','invited','requested') then
   return case when v_existing='confirmed' then 'already_registered' else 'already_pending' end;
 end if;
 select (select count(*) from public.community_swe_participants where swe_id=p_swe_id and status='confirmed')
       +(select count(*) from public.community_swe_guest_registrations where swe_id=p_swe_id) into v_count;
 if v_count >= v_swe.max_players then raise exception 'Ce SWÉ est complet'; end if;
 insert into public.community_swe_participants(swe_id,global_player_id,status,responded_at)
 values(p_swe_id,v_profile,'confirmed',now())
 on conflict(swe_id,global_player_id) do update set status='confirmed',responded_at=now(),withdrawn_at=null;
 return 'registered';
end $fn$;

create or replace function public.public_join_community_swe_guest_v1(p_swe_id uuid,p_display_name text)
returns text language plpgsql security definer set search_path=public,pg_temp
as $fn$
declare v_swe public.community_swes%rowtype; v_name text; v_count int;
begin
 if auth.uid() is not null then raise exception 'Connecte-toi comme membre pour t’inscrire'; end if;
 v_name:=btrim(regexp_replace(coalesce(p_display_name,''),'[[:space:]]+',' ','g'));
 if char_length(v_name)<2 or char_length(v_name)>80 or v_name ~ '[[:cntrl:]<>]' then
   raise exception 'Indique ton nom (2 à 80 caractères)'; end if;
 select * into v_swe from public.community_swes where id=p_swe_id for update;
 if not found or v_swe.visibility<>'public' or v_swe.status<>'open' or v_swe.start_at<=now()
 then raise exception 'Ce SWÉ n’accepte plus les inscriptions'; end if;
 if exists(select 1 from public.community_swe_guest_registrations where swe_id=p_swe_id and normalized_name=lower(v_name))
 then raise exception 'Ce nom est déjà inscrit à ce SWÉ'; end if;
 select (select count(*) from public.community_swe_participants where swe_id=p_swe_id and status='confirmed')
       +(select count(*) from public.community_swe_guest_registrations where swe_id=p_swe_id) into v_count;
 if v_count >= v_swe.max_players then raise exception 'Ce SWÉ est complet'; end if;
 insert into public.community_swe_guest_registrations(swe_id,display_name) values(p_swe_id,v_name);
 return 'registered';
end $fn$;

revoke all on function public.public_community_swe_details_v1(uuid) from public;
revoke all on function public.public_join_community_swe_guest_v1(uuid,text) from public;
revoke all on function public.public_join_community_swe_member_v1(uuid) from public;
grant execute on function public.public_community_swe_details_v1(uuid) to anon,authenticated;
grant execute on function public.public_join_community_swe_guest_v1(uuid,text) to anon;
grant execute on function public.public_join_community_swe_member_v1(uuid) to authenticated;
