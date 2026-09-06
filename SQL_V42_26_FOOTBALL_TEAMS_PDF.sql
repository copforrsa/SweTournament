-- V42.26 — moyenne d'équipe selon les co-gestionnaires et enrichissement de l'affichage public.

create or replace function private.team_coorganizer_rating_summary(p_team_id uuid)
returns jsonb language sql stable security definer set search_path='public','private'
as $$
  select jsonb_build_object(
    'score',round(avg(r.rating)::numeric,2),
    'rating_count',count(r.rating)
  )
  from public.teams tm
  join public.tournaments t on t.id=tm.tournament_id
  join public.team_players tp on tp.team_id=tm.id
  join public.players local_player on local_player.id=tp.player_id
  join public.players rated_player on coalesce(rated_player.global_player_id,rated_player.id)=coalesce(local_player.global_player_id,local_player.id)
  join public.player_skill_ratings r on r.player_id=rated_player.id and r.workspace_id=t.workspace_id
  join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.user_id=r.evaluator_user_id and wm.role='coorganizer' and coalesce(wm.active,true)=true
  where tm.id=p_team_id
$$;

revoke all on function private.team_coorganizer_rating_summary(uuid) from public,anon,authenticated;

create or replace function public.get_tournament_team_coorganizer_scores(p_tournament_id uuid)
returns table(team_id uuid,team_name text,team_score numeric,rating_count bigint)
language plpgsql security definer set search_path='public','private'
as $$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Compétition introuvable'; end if;
  if not private.is_workspace_member(v_workspace) then raise exception 'Accès refusé'; end if;
  return query
  select tm.id,tm.name::text,
    nullif(private.team_coorganizer_rating_summary(tm.id)->>'score','')::numeric,
    coalesce((private.team_coorganizer_rating_summary(tm.id)->>'rating_count')::bigint,0)
  from public.teams tm where tm.tournament_id=p_tournament_id order by tm.created_at,tm.id;
end $$;

revoke all on function public.get_tournament_team_coorganizer_scores(uuid) from public,anon;
grant execute on function public.get_tournament_team_coorganizer_scores(uuid) to authenticated;

create or replace function public.get_public_workspace_snapshot_v2(p_token uuid)
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare v_base jsonb; v_workspace_id uuid; v_third boolean; v_top boolean; v_match boolean; v_review boolean; r record;
begin
  v_base:=public.get_public_workspace_snapshot(p_token);
  if v_base is null then return null; end if;
  select w.id into v_workspace_id from public.workspaces w where w.public_token=p_token and w.public_enabled=true;
  select coalesce(e.third_half_enabled,false),coalesce(e.top_player_enabled,false),coalesce(e.match_ratings_enabled,false)
    into v_third,v_top,v_match from public.workspace_entitlements e where e.workspace_id=v_workspace_id;
  v_third:=coalesce(v_third,false);v_top:=coalesce(v_top,false);v_match:=coalesce(v_match,false);
  v_review:=public.team_review_entitled(v_workspace_id);

  if v_review then
    for r in select id from public.tournaments where workspace_id=v_workspace_id and team_review_status='pending' loop
      perform public.finalize_tournament_team_review(r.id);
    end loop;
  end if;

  v_base:=jsonb_set(v_base,'{teams}',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at)
    from (
      select tm.*,round(coalesce(avg(public.get_effective_player_rating(p.id)),0),2) team_score,
        case when count(tp.player_id)=0 then 'À composer'
          when avg(public.get_effective_player_rating(p.id))>=4.25 then 'Excellent'
          when avg(public.get_effective_player_rating(p.id))>=3.50 then 'Très solide'
          when avg(public.get_effective_player_rating(p.id))>=2.75 then 'Solide'
          when avg(public.get_effective_player_rating(p.id))>=2.00 then 'Équilibrée' else 'À renforcer' end mention,
        nullif(private.team_coorganizer_rating_summary(tm.id)->>'score','')::numeric coorg_team_score,
        coalesce((private.team_coorganizer_rating_summary(tm.id)->>'rating_count')::bigint,0) coorg_rating_count
      from public.teams tm
      join public.tournaments t on t.id=tm.tournament_id
      left join public.team_players tp on tp.team_id=tm.id
      left join public.players p on p.id=tp.player_id
      where t.workspace_id=v_workspace_id
        and (coalesce(tm.is_preformed,false)=true or not v_review or coalesce(t.generated_team_count,0)=0 or t.team_review_status='approved')
      group by tm.id
    ) x
  ),'[]'::jsonb),true);

  v_base:=jsonb_set(v_base,'{team_players}',coalesce((
    select jsonb_agg(to_jsonb(tp))
    from public.team_players tp
    join public.teams tm on tm.id=tp.team_id
    join public.tournaments t on t.id=tm.tournament_id
    where t.workspace_id=v_workspace_id
      and (coalesce(tm.is_preformed,false)=true or not v_review or coalesce(t.generated_team_count,0)=0 or t.team_review_status='approved')
  ),'[]'::jsonb),true);

  v_base:=jsonb_set(v_base,'{team_review_states}',coalesce((
    select jsonb_agg(jsonb_build_object('tournament_id',t.id,'status',t.team_review_status,'deadline',t.team_review_deadline))
    from public.tournaments t where t.workspace_id=v_workspace_id
  ),'[]'::jsonb),true);

  return jsonb_set(
    jsonb_set(v_base,'{features}',coalesce(v_base->'features','{}'::jsonb)||jsonb_build_object(
      'third_half_enabled',v_third,'top_player_enabled',v_top,'match_ratings_enabled',v_match,'team_review_enabled',v_review
    ),true),
    '{workspace}',coalesce(v_base->'workspace','{}'::jsonb)||jsonb_build_object('third_half_enabled',v_third,'top_player_enabled',v_top),true
  );
end $$;

revoke all on function public.get_public_workspace_snapshot_v2(uuid) from public;
grant execute on function public.get_public_workspace_snapshot_v2(uuid) to anon,authenticated;
notify pgrst,'reload schema';
