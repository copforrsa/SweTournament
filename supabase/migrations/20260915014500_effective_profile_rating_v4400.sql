-- V44.00: expose post-match adjustments on the player's own profile and card.

create or replace function public.get_my_player_profile_summary_v1()
returns jsonb
language plpgsql security definer
set search_path='public','auth','private','pg_temp'
as $$
declare v_uid uuid:=auth.uid(); v_gp uuid; v_player uuid; v_avg numeric; v_count bigint; v_max bigint; v_role text; v_ties integer;
begin
  if v_uid is null then raise exception 'Connexion requise'; end if;
  select id into v_gp from public.global_player_profiles where user_id=v_uid limit 1;
  if v_gp is null then return jsonb_build_object('rating',null,'preferred_role',null,'voter_count',0); end if;
  select id into v_player from public.players where global_player_id=v_gp order by created_at limit 1;
  if v_player is not null then v_avg:=private.swe_effective_player_rating_v4400(v_player); end if;
  select count(distinct psr.evaluator_user_id) into v_count from public.player_skill_ratings psr join public.players p on p.id=psr.player_id where p.global_player_id=v_gp;
  with rc as (
    select psr.preferred_role,count(*)::bigint c from public.player_skill_ratings psr join public.players p on p.id=psr.player_id
    where p.global_player_id=v_gp and psr.preferred_role is not null group by psr.preferred_role
  ) select max(c) into v_max from rc;
  if v_max is not null then
    with rc as (
      select psr.preferred_role,count(*)::bigint c from public.player_skill_ratings psr join public.players p on p.id=psr.player_id
      where p.global_player_id=v_gp and psr.preferred_role is not null group by psr.preferred_role
    ) select count(*)::int,min(preferred_role) into v_ties,v_role from rc where c=v_max;
    if v_ties>1 then v_role:='couteau_suisse'; end if;
  end if;
  return jsonb_build_object('rating',v_avg,'preferred_role',v_role,'voter_count',coalesce(v_count,0));
end;
$$;
revoke all on function public.get_my_player_profile_summary_v1() from public,anon;
grant execute on function public.get_my_player_profile_summary_v1() to authenticated;

create or replace function public.get_my_player_card_stats_v1()
returns jsonb
language plpgsql stable security definer
set search_path=''
as $$
declare v_gid uuid; v_player uuid; v_result jsonb; v_rating numeric;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into v_gid from public.global_player_profiles where user_id=auth.uid();
  v_result:=private.player_card_stats_v1(v_gid);
  select id into v_player from public.players where global_player_id=v_gid order by created_at limit 1;
  if v_player is not null then v_rating:=private.swe_effective_player_rating_v4400(v_player); end if;
  return jsonb_set(v_result,'{rating}',coalesce(to_jsonb(v_rating),'null'::jsonb),true);
end;
$$;
revoke all on function public.get_my_player_card_stats_v1() from public,anon;
grant execute on function public.get_my_player_card_stats_v1() to authenticated;
