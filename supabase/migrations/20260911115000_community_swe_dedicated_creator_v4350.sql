alter table public.community_swes
  add column if not exists reservation_reference text,
  add column if not exists onsite_entry_fee_cents integer not null default 0,
  add column if not exists third_half_active boolean not null default false,
  add column if not exists finished_at timestamp with time zone;

create or replace function public.get_community_swe_venues()
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
select jsonb_build_object(
 'complexes',coalesce((select jsonb_agg(jsonb_build_object(
   'id',c.id,'name',c.name,'address',c.address,'city',c.city,
   'latitude',c.latitude,'longitude',c.longitude,
   'onsite_sunday_price_cents',coalesce(c.onsite_sunday_price_cents,0),
   'onsite_weekday_price_cents',coalesce(c.onsite_weekday_price_cents,0)
 ) order by c.name) from public.sports_complexes c where c.active=true and c.allow_community_swe=true),'[]'::jsonb),
 'venues',coalesce((select jsonb_agg(jsonb_build_object(
   'id',v.id,'name',v.name,'address',v.address,'latitude',v.latitude,'longitude',v.longitude,'photo_url',v.photo_url
 ) order by v.name) from public.community_venues v where v.status='active' and v.share_on_swe=true),'[]'::jsonb)
); $function$;

create or replace function public.community_swe_third_half_entitlement_v1()
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select exists(
    select 1
    from public.workspace_members wm
    join public.workspace_entitlements e on e.workspace_id=wm.workspace_id
    where wm.user_id=auth.uid() and wm.active=true and wm.role='admin' and coalesce(e.third_half_enabled,false)=true
  );
$function$;

create or replace function public.create_community_swe_v2(
  p_title text,
  p_visibility text,
  p_venue_kind text,
  p_venue_id uuid,
  p_start_at timestamp with time zone,
  p_max_players integer default 10,
  p_reservation_reference text default null,
  p_third_half_requested boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_profile uuid;
  v_id uuid;
  v_manual boolean;
  v_complex uuid;
  v_cv uuid;
  v_fee integer := 0;
  v_third_half boolean := false;
  v_local timestamp;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_profile from public.global_player_profiles where user_id=auth.uid();
  if v_profile is null then raise exception 'Crée d’abord ton ID SWÉ'; end if;
  if p_visibility not in ('public','private') then raise exception 'Visibilité invalide'; end if;
  if p_start_at<=now() then raise exception 'La date doit être future'; end if;
  if coalesce(p_max_players,10) < 10 or coalesce(p_max_players,10) > 12 then raise exception 'Un match simple accepte entre 10 et 12 joueurs'; end if;

  if p_venue_kind='complex' then
    select id into v_complex from public.sports_complexes where id=p_venue_id and active=true and allow_community_swe=true;
    if v_complex is null then raise exception 'Complexe non disponible pour créer un SWÉ'; end if;
    v_local := p_start_at at time zone 'America/Martinique';
    select case when extract(dow from v_local)=0 then coalesce(onsite_sunday_price_cents,0) else coalesce(onsite_weekday_price_cents,0) end
      into v_fee from public.sports_complexes where id=v_complex;
  elsif p_venue_kind='community' then
    select id into v_cv from public.community_venues where id=p_venue_id and status='active' and share_on_swe=true;
    if v_cv is null then raise exception 'Lieu non disponible ou non partagé'; end if;
  else
    raise exception 'Type de lieu invalide';
  end if;

  if coalesce(p_third_half_requested,false) then
    select public.community_swe_third_half_entitlement_v1() into v_third_half;
  end if;

  v_manual:=public.community_swe_manual_moderation_allowed();
  insert into public.community_swes(
    title,creator_user_id,creator_global_player_id,visibility,moderation_mode,
    venue_kind,complex_id,community_venue_id,start_at,max_players,
    reservation_reference,onsite_entry_fee_cents,third_half_active
  ) values(
    trim(coalesce(nullif(p_title,''),'SWÉ simple')),auth.uid(),v_profile,p_visibility,
    case when v_manual then 'manual' else 'auto' end,
    p_venue_kind,v_complex,v_cv,p_start_at,p_max_players,
    nullif(trim(coalesce(p_reservation_reference,'')),''),coalesce(v_fee,0),v_third_half
  ) returning id into v_id;

  insert into public.community_swe_participants(swe_id,global_player_id,status,responded_at)
  values(v_id,v_profile,'confirmed',now());

  return jsonb_build_object(
    'id',v_id,
    'moderation_mode',case when v_manual then 'manual' else 'auto' end,
    'onsite_entry_fee_cents',coalesce(v_fee,0),
    'third_half_active',v_third_half
  );
end $function$;

create or replace function public.get_my_community_swes_v2()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_gp uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_gp from public.global_player_profiles where user_id=auth.uid();
  return jsonb_build_object(
    'created',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'title',s.title,'visibility',s.visibility,'moderation_mode',s.moderation_mode,
        'start_at',s.start_at,'status',s.status,'max_players',s.max_players,
        'confirmed',(select count(*) from public.community_swe_participants p where p.swe_id=s.id and p.status='confirmed'),
        'requests',(select count(*) from public.community_swe_participants p where p.swe_id=s.id and p.status='requested'),
        'venue_kind',s.venue_kind,
        'venue_id',case when s.venue_kind='complex' then s.complex_id else s.community_venue_id end,
        'venue_name',case when s.venue_kind='complex' then c.name else cv.name end,
        'venue_address',case when s.venue_kind='complex' then coalesce(c.address,c.city) else cv.address end,
        'reservation_reference',s.reservation_reference,
        'onsite_entry_fee_cents',s.onsite_entry_fee_cents,
        'third_half_active',s.third_half_active
      ) order by s.start_at)
      from public.community_swes s
      left join public.sports_complexes c on c.id=s.complex_id
      left join public.community_venues cv on cv.id=s.community_venue_id
      where s.creator_user_id=auth.uid()
    ),'[]'::jsonb),
    'participations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'title',s.title,'start_at',s.start_at,'visibility',s.visibility,'status',p.status,
        'venue_name',case when s.venue_kind='complex' then c.name else cv.name end
      ) order by s.start_at)
      from public.community_swe_participants p
      join public.community_swes s on s.id=p.swe_id
      left join public.sports_complexes c on c.id=s.complex_id
      left join public.community_venues cv on cv.id=s.community_venue_id
      where p.global_player_id=v_gp
    ),'[]'::jsonb)
  );
end $function$;

create or replace function public.finish_community_swe_v1(p_swe_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  update public.community_swes
     set status='finished',finished_at=now(),updated_at=now()
   where id=p_swe_id and creator_user_id=auth.uid() and status<>'finished';
  if not found then raise exception 'SWÉ introuvable ou déjà terminé'; end if;
  return jsonb_build_object('status','finished');
end $function$;

revoke all on function public.community_swe_third_half_entitlement_v1() from public;
grant execute on function public.community_swe_third_half_entitlement_v1() to authenticated;
revoke all on function public.create_community_swe_v2(text,text,text,uuid,timestamp with time zone,integer,text,boolean) from public;
grant execute on function public.create_community_swe_v2(text,text,text,uuid,timestamp with time zone,integer,text,boolean) to authenticated;
revoke all on function public.get_my_community_swes_v2() from public;
grant execute on function public.get_my_community_swes_v2() to authenticated;
revoke all on function public.finish_community_swe_v1(uuid) from public;
grant execute on function public.finish_community_swe_v1(uuid) to authenticated;
