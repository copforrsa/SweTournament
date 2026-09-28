create or replace function public.admin_get_tournament_rating_report_v2(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare
  v_workspace uuid;
  v_tournament_name text;
  v_tournament_date date;
  v_session_status text;
  v_closes_at timestamptz;
begin
  select workspace_id, coalesce(name,'Swé du '||to_char(tournament_date,'DD/MM/YYYY')), tournament_date into v_workspace,v_tournament_name,v_tournament_date from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Accès administrateur requis'; end if;
  select status,closes_at into v_session_status,v_closes_at from public.tournament_rating_sessions where tournament_id=p_tournament_id;
  return jsonb_build_object(
    'tournament_id',p_tournament_id,'tournament_name',v_tournament_name,'tournament_date',v_tournament_date,'status',coalesce(v_session_status,'closed'),'closes_at',v_closes_at,'expired',coalesce(v_closes_at<=now(),true),
    'evaluators',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',e.evaluator_user_id,
        'display_name',coalesce(p.name,nullif(split_part(u.email,'@',1),''),'Membre'),
        'role',case when wm.role='admin' then 'Administrateur' else 'Co-gestionnaire' end,
        'completed_at',e.completed_at,
        'submitted_ratings',coalesce((select count(*)::integer from public.player_skill_rating_history h where h.tournament_id=p_tournament_id and h.evaluator_user_id=e.evaluator_user_id),0),
        'has_started',(exists(select 1 from public.player_skill_rating_history h where h.tournament_id=p_tournament_id and h.evaluator_user_id=e.evaluator_user_id)),
        'has_voted',e.completed_at is not null
      ) order by case when wm.role='admin' then 0 else 1 end, lower(coalesce(p.name,u.email,'')))
      from public.tournament_rating_evaluators e
      left join public.workspace_members wm on wm.workspace_id=v_workspace and wm.user_id=e.evaluator_user_id
      left join public.players p on p.id=wm.linked_player_id
      left join auth.users u on u.id=e.evaluator_user_id
      where e.tournament_id=p_tournament_id
    ),'[]'::jsonb),
    'player_addons',coalesce((
      with latest as (
        select distinct on (h.evaluator_user_id,h.player_id) h.evaluator_user_id,h.player_id
        from public.player_skill_rating_history h
        where h.tournament_id=p_tournament_id
        order by h.evaluator_user_id,h.player_id,h.created_at desc
      )
      select jsonb_agg(jsonb_build_object(
        'player_id',x.player_id,'player_name',x.player_name,'voters',x.voters,
        'addon_label','Profil SWÉ enrichi',
        'addon_description','Évaluation prise en compte pour les prochains tirages équilibrés.'
      ) order by lower(x.player_name))
      from (
        select p.id as player_id,p.name as player_name,count(*)::integer as voters
        from latest l join public.players p on p.id=l.player_id
        group by p.id,p.name
      ) x
    ),'[]'::jsonb)
  );
end $function$;
revoke all on function public.admin_get_tournament_rating_report_v2(uuid) from public, anon;
grant execute on function public.admin_get_tournament_rating_report_v2(uuid) to authenticated;