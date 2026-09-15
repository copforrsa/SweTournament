alter table public.players
  add column if not exists avatar_url text;

create or replace function public.super_admin_get_player_photo_directory_v1()
returns table(
  player_id uuid,
  global_player_id uuid,
  user_id uuid,
  public_player_id text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_super_admin() then
    raise exception 'Accès super administrateur requis';
  end if;

  return query
  select
    p.id,
    p.global_player_id,
    g.user_id,
    g.public_player_id,
    coalesce(nullif(g.nickname,''),nullif(g.display_name,''),p.name),
    coalesce(g.avatar_url,p.avatar_url)
  from public.players p
  left join public.global_player_profiles g on g.id=p.global_player_id
  order by p.name,p.created_at;
end
$$;

create or replace function public.super_admin_set_player_photo_v2(
  p_player_id uuid,
  p_avatar_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text:=nullif(trim(coalesce(p_avatar_url,'')),'');
  v_player public.players;
begin
  if not private.is_platform_super_admin() then
    raise exception 'Accès super administrateur requis';
  end if;
  if p_player_id is null then raise exception 'Joueur requis'; end if;
  if v_url is not null and (
    length(v_url)>2000
    or v_url !~ '^https://(app\.swetournament\.fr|fbppesfxkvledwjemwsn\.supabase\.co)/'
  ) then
    raise exception 'Adresse de photo non autorisée';
  end if;

  update public.players
     set avatar_url=v_url
   where id=p_player_id
   returning * into v_player;
  if v_player.id is null then raise exception 'Joueur introuvable'; end if;

  if v_player.global_player_id is not null then
    update public.global_player_profiles
       set avatar_url=v_url,updated_at=now()
     where id=v_player.global_player_id;
  end if;

  return jsonb_build_object(
    'player_id',v_player.id,
    'global_player_id',v_player.global_player_id,
    'avatar_url',v_url
  );
end
$$;

revoke all on function public.super_admin_get_player_photo_directory_v1() from public,anon;
revoke all on function public.super_admin_set_player_photo_v2(uuid,text) from public,anon;
grant execute on function public.super_admin_get_player_photo_directory_v1() to authenticated;
grant execute on function public.super_admin_set_player_photo_v2(uuid,text) to authenticated;
