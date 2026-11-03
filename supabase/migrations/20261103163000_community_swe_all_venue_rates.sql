-- Apply the same match fee schedule to community venues.
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

  -- Flat public SWÉ rates apply to partner complexes and shared community venues alike.
  v_local := p_start_at at time zone 'America/Martinique';
  v_fee := case when extract(isodow from v_local) in (6,7) then 500
                when v_local::time >= time '21:30' then 700 else 0 end;

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
