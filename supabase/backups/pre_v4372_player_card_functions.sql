-- Sauvegarde avant V43.72. Fonctions existantes ; aucune donnée modifiée.

CREATE OR REPLACE FUNCTION public.get_my_global_player_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_profile public.global_player_profiles%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into v_profile from public.global_player_profiles where user_id=auth.uid();
  if not found then return null; end if;

  with my_players as (
    select distinct p.id from public.players p where p.global_player_id=v_profile.id
    union
    select distinct wm.linked_player_id from public.workspace_members wm where wm.user_id=auth.uid() and coalesce(wm.active,true)=true and wm.linked_player_id is not null
  ),
  my_matches as (
    select distinct a.match_id,a.player_id,a.team_id from public.match_player_assignments a join my_players mp on mp.id=a.player_id
  ),
  finished_team_table as (
    select t.id tournament_id,tm.id team_id,tm.name,
      coalesce(sum(case when m.home_team_id=tm.id and m.home_score>m.away_score then 3 when m.away_team_id=tm.id and m.away_score>m.home_score then 3 when (m.home_team_id=tm.id or m.away_team_id=tm.id) and m.home_score=m.away_score then 1 else 0 end),0)::int pts,
      coalesce(sum(case when m.home_team_id=tm.id then m.home_score when m.away_team_id=tm.id then m.away_score else 0 end),0)::int gf,
      coalesce(sum(case when m.home_team_id=tm.id then m.away_score when m.away_team_id=tm.id then m.home_score else 0 end),0)::int ga
    from public.tournaments t join public.teams tm on tm.tournament_id=t.id left join public.matches m on m.tournament_id=t.id and (m.home_team_id=tm.id or m.away_team_id=tm.id)
    where t.status='finished' and coalesce(t.format,'classic')<>'league'
    group by t.id,tm.id,tm.name
  ),
  champions as (
    select tournament_id,team_id from (select f.*,row_number() over(partition by f.tournament_id order by f.pts desc,(f.gf-f.ga) desc,f.gf desc,f.name) rn from finished_team_table f) x where rn=1
  ),
  trophy_count as (
    select count(distinct c.tournament_id)::int trophies from champions c join public.matches m on m.tournament_id=c.tournament_id join my_matches mm on mm.match_id=m.id and mm.team_id=c.team_id
  )
  select jsonb_build_object(
    'profile',jsonb_build_object('id',v_profile.id,'public_player_id',v_profile.public_player_id,'display_name',v_profile.display_name,'is_public',v_profile.is_public,'discoverable',v_profile.discoverable,'notify_upcoming_swes',v_profile.notify_upcoming_swes,'home_area',v_profile.home_area,'age',v_profile.age,'avatar_url',v_profile.avatar_url),
    'stats',jsonb_build_object(
      'groups',(select count(distinct p.workspace_id) from public.players p join my_players mp on mp.id=p.id),
      'tournaments',(select count(distinct tp.tournament_id) from public.tournament_players tp join my_players mp on mp.id=tp.player_id where tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'),
      'matches',(select count(distinct mm.match_id) from my_matches mm),
      'wins',(select count(distinct mm.match_id) from my_matches mm join public.matches m on m.id=mm.match_id where (mm.team_id=m.home_team_id and m.home_score>m.away_score) or (mm.team_id=m.away_team_id and m.away_score>m.home_score)),
      'trophies',coalesce((select trophies from trophy_count),0),
      'goals',(select count(*) from public.goals g join my_players mp on mp.id=g.scorer_player_id where coalesce(g.is_own_goal,false)=false),
      'assists',(select count(*) from public.goals g join my_players mp on mp.id=g.assister_player_id),
      'rating',(select round(avg(r.rating)::numeric,1) from public.player_skill_ratings r join my_players mp on mp.id=r.player_id where r.rating is not null)
    ),
    'groups',coalesce((select jsonb_agg(x order by x->>'workspace_name') from (select jsonb_build_object('workspace_id',w.id,'workspace_name',w.name,'player_id',p.id,'player_name',p.name,'is_group_member',p.is_group_member) x from public.players p join public.workspaces w on w.id=p.workspace_id join my_players mp on mp.id=p.id) q),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'status',i.status,'created_at',i.created_at,'message',i.message,'tournament_id',t.id,'tournament_name',t.name,'tournament_date',t.tournament_date,'start_time',t.start_time,'venue',t.venue,'workspace_name',w.name) order by i.created_at desc) from public.global_player_tournament_invites i join public.tournaments t on t.id=i.tournament_id join public.workspaces w on w.id=i.workspace_id where i.global_player_id=v_profile.id),'[]'::jsonb),
    'upcoming_swes',case when v_profile.is_public and v_profile.notify_upcoming_swes then coalesce((select jsonb_agg(z order by (z->>'tournament_date')::date) from (select jsonb_build_object('tournament_id',t.id,'tournament_name',t.name,'tournament_date',t.tournament_date,'start_time',t.start_time,'venue',t.venue,'workspace_name',w.name,'public_token',w.public_token) z from public.tournaments t join public.workspaces w on w.id=t.workspace_id where w.public_enabled=true and t.registration_open=true and t.status<>'finished' and t.tournament_date>=current_date and not exists(select 1 from public.players p join my_players mp on mp.id=p.id where p.workspace_id=w.id) order by t.tournament_date limit 30) s),'[]'::jsonb) else '[]'::jsonb end
  ) into v_result;
  return v_result;
end $function$
;

CREATE OR REPLACE FUNCTION public.get_my_player_card_stats_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_gid uuid; v_result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select id into v_gid from public.global_player_profiles where user_id=auth.uid() limit 1;
 if v_gid is null then return jsonb_build_object('tournament_wins',0); end if;
 with my_players as (
   select id from public.players where global_player_id=v_gid
 ), finals as (
   select distinct on (m.tournament_id) m.tournament_id,m.id,m.home_team_id,m.away_team_id,m.home_score,m.away_score
   from public.matches m join public.tournaments t on t.id=m.tournament_id
   where t.status='finished' and m.status='finished'
   order by m.tournament_id,m.match_order desc nulls last,m.finished_at desc nulls last,m.created_at desc
 ), won as (
   select distinct f.tournament_id
   from finals f
   join public.match_player_assignments a on a.match_id=f.id
   join my_players p on p.id=a.player_id
   where (a.team_id=f.home_team_id and f.home_score>f.away_score)
      or (a.team_id=f.away_team_id and f.away_score>f.home_score)
 )
 select jsonb_build_object('tournament_wins',count(*)) into v_result from won;
 return v_result;
end $function$
;

CREATE OR REPLACE FUNCTION public.get_public_player_card_by_token_v1(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_gid uuid; v_gp public.global_player_profiles%rowtype; v_rating numeric; v_role text; v_matches bigint; v_wins bigint; v_goals bigint; v_assists bigint; v_twins bigint;
begin
 select s.global_player_id into v_gid from public.player_card_share_tokens s where s.token=p_token and s.active=true limit 1;
 if v_gid is null then return null; end if;
 select * into v_gp from public.global_player_profiles where id=v_gid;
 if not found then return null; end if;
 with mp as (select id from public.players where global_player_id=v_gid), r as (select psr.* from public.player_skill_ratings psr join mp on mp.id=psr.player_id)
 select round(avg(rating)::numeric,1) into v_rating from r where rating is not null;
 with mp as (select id from public.players where global_player_id=v_gid), rc as (
  select psr.preferred_role,count(*) c from public.player_skill_ratings psr join mp on mp.id=psr.player_id where psr.preferred_role is not null group by psr.preferred_role order by count(*) desc,psr.preferred_role limit 1
 ) select preferred_role into v_role from rc;
 with mp as (select id from public.players where global_player_id=v_gid)
 select count(distinct a.match_id),count(distinct a.match_id) filter(where (a.team_id=m.home_team_id and m.home_score>m.away_score) or (a.team_id=m.away_team_id and m.away_score>m.home_score)) into v_matches,v_wins
 from public.match_player_assignments a join mp on mp.id=a.player_id join public.matches m on m.id=a.match_id;
 with mp as (select id from public.players where global_player_id=v_gid) select count(*) into v_goals from public.goals g join mp on mp.id=g.scorer_player_id where coalesce(g.is_own_goal,false)=false;
 with mp as (select id from public.players where global_player_id=v_gid) select count(*) into v_assists from public.goals g join mp on mp.id=g.assister_player_id;
 with mp as (select id from public.players where global_player_id=v_gid), finals as (
   select distinct on (m.tournament_id) m.tournament_id,m.id,m.home_team_id,m.away_team_id,m.home_score,m.away_score
   from public.matches m join public.tournaments t on t.id=m.tournament_id where t.status='finished' and m.status='finished'
   order by m.tournament_id,m.match_order desc nulls last,m.finished_at desc nulls last,m.created_at desc
 ), won as (
   select distinct f.tournament_id from finals f join public.match_player_assignments a on a.match_id=f.id join mp on mp.id=a.player_id
   where (a.team_id=f.home_team_id and f.home_score>f.away_score) or (a.team_id=f.away_team_id and f.away_score>f.home_score)
 ) select count(*) into v_twins from won;
 return jsonb_build_object('public_player_id',v_gp.public_player_id,'display_name',coalesce(nullif(trim(v_gp.nickname),''),nullif(trim(v_gp.first_name),''),v_gp.display_name),'avatar_url',v_gp.avatar_url,'rating',v_rating,'preferred_role',v_role,'matches',coalesce(v_matches,0),'wins',coalesce(v_wins,0),'goals',coalesce(v_goals,0),'assists',coalesce(v_assists,0),'tournament_wins',coalesce(v_twins,0));
end $function$
;

CREATE OR REPLACE FUNCTION public.get_public_player_card_v1(p_public_player_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_gp public.global_player_profiles%rowtype; v_rating numeric; v_role text; v_matches bigint; v_wins bigint; v_goals bigint; v_assists bigint; v_twins bigint;
begin
 select * into v_gp from public.global_player_profiles where upper(public_player_id)=upper(trim(p_public_player_id)) and is_public=true limit 1;
 if not found then return null; end if;
 with mp as (select id from public.players where global_player_id=v_gp.id), r as (
   select psr.* from public.player_skill_ratings psr join mp on mp.id=psr.player_id
 ) select round(avg(rating)::numeric,1) into v_rating from r where rating is not null;
 with mp as (select id from public.players where global_player_id=v_gp.id), rc as (
   select psr.preferred_role,count(*) c from public.player_skill_ratings psr join mp on mp.id=psr.player_id where psr.preferred_role is not null group by psr.preferred_role order by count(*) desc,psr.preferred_role limit 1
 ) select preferred_role into v_role from rc;
 with mp as (select id from public.players where global_player_id=v_gp.id)
 select count(distinct a.match_id),count(distinct a.match_id) filter(where (a.team_id=m.home_team_id and m.home_score>m.away_score) or (a.team_id=m.away_team_id and m.away_score>m.home_score))
 into v_matches,v_wins from public.match_player_assignments a join mp on mp.id=a.player_id join public.matches m on m.id=a.match_id;
 with mp as (select id from public.players where global_player_id=v_gp.id)
 select count(*) into v_goals from public.goals g join mp on mp.id=g.scorer_player_id where coalesce(g.is_own_goal,false)=false;
 with mp as (select id from public.players where global_player_id=v_gp.id)
 select count(*) into v_assists from public.goals g join mp on mp.id=g.assister_player_id;
 with mp as (select id from public.players where global_player_id=v_gp.id), finals as (
   select distinct on (m.tournament_id) m.tournament_id,m.id,m.home_team_id,m.away_team_id,m.home_score,m.away_score
   from public.matches m join public.tournaments t on t.id=m.tournament_id where t.status='finished' and m.status='finished'
   order by m.tournament_id,m.match_order desc nulls last,m.finished_at desc nulls last,m.created_at desc
 ), won as (
   select distinct f.tournament_id from finals f join public.match_player_assignments a on a.match_id=f.id join mp on mp.id=a.player_id
   where (a.team_id=f.home_team_id and f.home_score>f.away_score) or (a.team_id=f.away_team_id and f.away_score>f.home_score)
 ) select count(*) into v_twins from won;
 return jsonb_build_object('public_player_id',v_gp.public_player_id,'display_name',v_gp.display_name,'avatar_url',v_gp.avatar_url,'rating',v_rating,'preferred_role',v_role,'matches',coalesce(v_matches,0),'wins',coalesce(v_wins,0),'goals',coalesce(v_goals,0),'assists',coalesce(v_assists,0),'tournament_wins',coalesce(v_twins,0));
end $function$
;
