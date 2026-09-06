create or replace function public.get_public_season_rankings(
  p_public_token uuid,
  p_season_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $function$
  with target_workspace as (
    select w.id
    from public.workspaces w
    where w.public_token = p_public_token
      and w.public_enabled = true
  ),
  target_season as (
    select s.id, s.workspace_id
    from public.seasons s
    join target_workspace w on w.id = s.workspace_id
    where s.id = p_season_id
  ),
  season_tournaments as (
    select t.id
    from public.tournaments t
    join target_season s on s.id = t.season_id
    where t.workspace_id = s.workspace_id
      and coalesce(t.format, 'tournament') <> 'league'
  ),
  latest_tournament as (
    select t.id
    from public.tournaments t
    join target_season s on s.id = t.season_id
    where t.workspace_id = s.workspace_id
      and coalesce(t.format, 'tournament') <> 'league'
    order by t.tournament_date desc nulls last, t.created_at desc
    limit 1
  ),
  season_goals as (
    select g.*, m.tournament_id
    from public.goals g
    join public.matches m on m.id = g.match_id
    join season_tournaments t on t.id = m.tournament_id
  ),
  player_stats as (
    select
      p.id,
      p.name,
      (p.is_group_member = false) as guest,
      count(g.id) filter (where g.scorer_player_id = p.id)::integer as g,
      count(g.id) filter (where g.assister_player_id = p.id)::integer as a,
      count(g.id) filter (
        where g.scorer_player_id = p.id
          and g.tournament_id = (select id from latest_tournament)
      )::integer as recent_g,
      count(g.id) filter (
        where g.assister_player_id = p.id
          and g.tournament_id = (select id from latest_tournament)
      )::integer as recent_a
    from public.players p
    join target_season s on s.workspace_id = p.workspace_id
    left join season_goals g
      on g.scorer_player_id = p.id or g.assister_player_id = p.id
    group by p.id, p.name, p.is_group_member
  )
  select jsonb_build_object(
    'players', coalesce(
      jsonb_agg(to_jsonb(ps) order by ps.g desc, ps.a desc, ps.name)
        filter (where ps.g > 0 or ps.a > 0),
      '[]'::jsonb
    )
  )
  from player_stats ps;
$function$;

revoke all on function public.get_public_season_rankings(uuid, uuid) from public;
grant execute on function public.get_public_season_rankings(uuid, uuid) to anon, authenticated;
