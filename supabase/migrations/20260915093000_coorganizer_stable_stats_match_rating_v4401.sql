-- V44.01: keep co-organizer insights stable and expose the season match rating.

create or replace function public.get_my_coorganizer_season_stats_v1(p_workspace_id uuid)
returns jsonb
language plpgsql security definer
set search_path='public','private','auth','pg_temp'
as $$
declare
  v_player uuid;
  v_season uuid;
  v_total integer:=0;
  v_present integer:=0;
  v_rated integer:=0;
  v_met integer:=0;
  v_rows jsonb:='[]'::jsonb;
  v_match_rating numeric:=null;
begin
  if not private.is_workspace_coorganizer(p_workspace_id) then raise exception 'Accès co-gestionnaire requis'; end if;
  select wm.linked_player_id into v_player from public.workspace_members wm
   where wm.workspace_id=p_workspace_id and wm.user_id=(select auth.uid()) and wm.active=true;
  if v_player is null then
    select p.id into v_player from public.global_player_profiles gp join public.players p on p.global_player_id=gp.id
     where gp.user_id=(select auth.uid()) and p.workspace_id=p_workspace_id and p.active=true limit 1;
  end if;
  select s.id into v_season from public.seasons s where s.workspace_id=p_workspace_id and s.is_active=true order by s.created_at desc limit 1;
  select count(*) into v_rated from public.player_skill_ratings r where r.workspace_id=p_workspace_id and r.evaluator_user_id=(select auth.uid());
  if v_player is not null then
    select count(*) into v_total from public.tournaments t where t.workspace_id=p_workspace_id and t.season_id=v_season and t.status='finished';
    select count(distinct tp.tournament_id) into v_present from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id
      where tp.player_id=v_player and tp.present=true and coalesce(tp.registration_status,'')<>'waitlist' and t.season_id=v_season and t.status='finished';

    with rated_matches as (
      select least(10::numeric,
        case
          when a.team_id=m.home_team_id and m.home_score-m.away_score>2 then 7
          when a.team_id=m.away_team_id and m.away_score-m.home_score>2 then 7
          when a.team_id=m.home_team_id and m.home_score>m.away_score then 6
          when a.team_id=m.away_team_id and m.away_score>m.home_score then 6
          when m.home_score=m.away_score then 5
          when a.team_id=m.home_team_id and m.home_score-m.away_score>=-2 then 4
          when a.team_id=m.away_team_id and m.away_score-m.home_score>=-2 then 4
          when a.team_id=m.home_team_id and m.home_score-m.away_score>=-5 then 3
          when a.team_id=m.away_team_id and m.away_score-m.home_score>=-5 then 3
          else 2
        end
        + (select count(*) from public.goals g where g.match_id=m.id and g.scorer_player_id=v_player and not coalesce(g.is_own_goal,false))
        + .5 * (select count(*) from public.goals g where g.match_id=m.id and g.assister_player_id=v_player)
      ) score
      from public.match_player_assignments a
      join public.matches m on m.id=a.match_id
      join public.tournaments t on t.id=m.tournament_id
      where a.player_id=v_player and a.team_id is not null and m.status in ('live','finished') and t.season_id=v_season
        and (a.team_id=m.home_team_id or a.team_id=m.away_team_id)
    )
    select round(avg(score),1) into v_match_rating from rated_matches;

    with my_matches as (
      select distinct a.match_id,m.tournament_id from public.match_player_assignments a join public.matches m on m.id=a.match_id
       where a.player_id=v_player and a.team_id is not null and m.status in ('live','finished')
    ), together as (
      select a.player_id,array_agg(distinct coalesce(t.name,'SWÉ du '||to_char(t.tournament_date,'DD/MM/YYYY')) order by coalesce(t.name,'SWÉ du '||to_char(t.tournament_date,'DD/MM/YYYY'))) tournaments
      from my_matches mm join public.match_player_assignments a on a.match_id=mm.match_id and a.player_id<>v_player and a.team_id is not null
      join public.tournaments t on t.id=mm.tournament_id group by a.player_id
    )
    select count(*),coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'player_name',p.name,'tournaments',t.tournaments,
      'rated',r.player_id is not null,'rating',r.rating) order by lower(p.name)),'[]'::jsonb)
      into v_met,v_rows from together t join public.players p on p.id=t.player_id
      left join public.player_skill_ratings r on r.player_id=p.id and r.evaluator_user_id=(select auth.uid());
  end if;
  return jsonb_build_object('linked_player_id',v_player,'profile_linked',v_player is not null,'season_id',v_season,
    'season_tournaments',v_total,'season_attended',v_present,'season_presence_percent',case when v_total>0 then round(v_present*100.0/v_total) else 0 end,
    'season_match_rating',v_match_rating,
    'players_met',v_met,'players_rated',v_rated,'players_unrated',coalesce((select count(*) from jsonb_array_elements(v_rows) as x(value) where coalesce((x.value->>'rated')::boolean,false)=false),0),
    'teammates',v_rows);
end;
$$;

revoke all on function public.get_my_coorganizer_season_stats_v1(uuid) from public,anon;
grant execute on function public.get_my_coorganizer_season_stats_v1(uuid) to authenticated;
