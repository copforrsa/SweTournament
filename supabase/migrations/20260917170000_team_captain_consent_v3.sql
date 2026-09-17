-- Keep the established team-creation checks, then immediately confirm only
-- the members for whom the captain has explicitly attested prior agreement.
create or replace function public.public_create_team_with_member_code_v3(
  p_token uuid, p_tournament_id uuid, p_player_id uuid, p_code text,
  p_team_name text, p_team_color text, p_player_ids uuid[] default '{}'::uuid[],
  p_confirmed_player_ids uuid[] default '{}'::uuid[], p_guest_names text[] default '{}'::text[]
)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_team uuid; v_pid uuid; v_ids uuid[]; v_confirmed_ids uuid[];
begin
  select array_agg(distinct x) into v_ids
  from unnest(coalesce(p_player_ids,'{}'::uuid[])) x where x<>p_player_id;
  select array_agg(distinct x) into v_confirmed_ids
  from unnest(coalesce(p_confirmed_player_ids,'{}'::uuid[])) x where x<>p_player_id;
  if exists(select 1 from unnest(coalesce(v_confirmed_ids,'{}'::uuid[])) x
            where not (x=any(coalesce(v_ids,'{}'::uuid[])))) then
    raise exception 'Les membres confirmés doivent faire partie de la composition';
  end if;

  v_team:=public.public_create_team_with_member_code_v2(
    p_token,p_tournament_id,p_player_id,p_code,p_team_name,p_team_color,v_ids,p_guest_names
  );
  foreach v_pid in array coalesce(v_confirmed_ids,'{}'::uuid[]) loop
    delete from public.team_player_invitations
    where tournament_id=p_tournament_id and team_id=v_team and player_id=v_pid and status='pending';
    insert into public.team_players(team_id,player_id) values(v_team,v_pid) on conflict do nothing;
  end loop;
  perform private.recalculate_tournament_substitute_flags(p_tournament_id);
  return v_team;
end $$;

revoke all on function public.public_create_team_with_member_code_v3(uuid,uuid,uuid,text,text,text,uuid[],uuid[],text[]) from public, anon, authenticated;
grant execute on function public.public_create_team_with_member_code_v3(uuid,uuid,uuid,text,text,text,uuid[],uuid[],text[]) to anon, authenticated, service_role;
notify pgrst,'reload schema';
