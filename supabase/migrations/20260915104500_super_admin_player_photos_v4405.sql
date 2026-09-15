create or replace function public.super_admin_get_players_directory_v5()
returns table(
  global_player_id uuid,
  user_id uuid,
  public_player_id text,
  display_name text,
  first_name text,
  last_name text,
  nickname text,
  avatar_url text,
  email text,
  phone_number text,
  home_area text,
  is_public boolean,
  discoverable boolean,
  notify_upcoming_swes boolean,
  consent_accepted boolean,
  consent_accepted_at timestamptz,
  groups_count bigint,
  local_profiles_count bigint,
  created_at timestamptz,
  staff_links jsonb,
  identity_status text,
  identity_review_note text
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
  select g.id,g.user_id,g.public_player_id,g.display_name,g.first_name,g.last_name,g.nickname,g.avatar_url,u.email::text,
    coalesce(g.phone_number,(select max(pc.phone_number) from public.players p join public.player_private_contacts pc on pc.player_id=p.id where p.global_player_id=g.id)),
    g.home_area,g.is_public,g.discoverable,g.notify_upcoming_swes,
    exists(select 1 from public.user_data_consents c where c.user_id=g.user_id and c.terms_version='2026-09-05-beta' and c.privacy_version='2026-09-05-beta' and c.revoked_at is null),
    (select max(c.accepted_at) from public.user_data_consents c where c.user_id=g.user_id and c.terms_version='2026-09-05-beta' and c.privacy_version='2026-09-05-beta' and c.revoked_at is null),
    (select count(distinct p.workspace_id) from public.players p where p.global_player_id=g.id),
    (select count(*) from public.players p where p.global_player_id=g.id),g.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('workspace_id',wm.workspace_id,'workspace_name',w.name,'user_id',wm.user_id,'role',wm.role,'player_id',p.id,'player_name',p.name) order by w.name,p.name) from public.workspace_members wm join public.workspaces w on w.id=wm.workspace_id join public.players p on p.id=wm.linked_player_id where wm.user_id=g.user_id and wm.linked_player_id is not null),'[]'::jsonb),
    g.identity_status,g.identity_review_note
  from public.global_player_profiles g
  join auth.users u on u.id=g.user_id
  order by g.created_at desc;
end
$$;

create or replace function public.super_admin_set_player_avatar_v1(p_global_player_id uuid,p_avatar_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text:=nullif(trim(coalesce(p_avatar_url,'')),'');
  v_row public.global_player_profiles;
begin
  if not private.is_platform_super_admin() then
    raise exception 'Accès super administrateur requis';
  end if;
  if p_global_player_id is null then raise exception 'Joueur requis'; end if;
  if v_url is not null and (length(v_url)>2000 or v_url !~ '^https://(app\.swetournament\.fr|fbppesfxkvledwjemwsn\.supabase\.co)/') then
    raise exception 'Adresse de photo non autorisée';
  end if;
  update public.global_player_profiles set avatar_url=v_url,updated_at=now() where id=p_global_player_id returning * into v_row;
  if v_row.id is null then raise exception 'Joueur introuvable'; end if;
  return jsonb_build_object('global_player_id',v_row.id,'avatar_url',v_row.avatar_url,'public_player_id',v_row.public_player_id);
end
$$;

revoke all on function public.super_admin_get_players_directory_v5() from public,anon;
revoke all on function public.super_admin_set_player_avatar_v1(uuid,text) from public,anon;
grant execute on function public.super_admin_get_players_directory_v5() to authenticated;
grant execute on function public.super_admin_set_player_avatar_v1(uuid,text) to authenticated;

drop policy if exists "platform super admins upload player avatars" on storage.objects;
create policy "platform super admins upload player avatars"
on storage.objects
for insert
to authenticated
with check (bucket_id='player-avatars' and private.is_platform_super_admin());
