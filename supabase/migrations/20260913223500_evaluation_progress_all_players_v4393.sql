-- V43.93 — tous les membres du groupe utilisent le même dénominateur.
create or replace function public.get_admin_evaluation_progress_v1(p_workspace_id uuid)
returns table(evaluator_user_id uuid,evaluated_players bigint,evaluations_count bigint)
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;
  return query
  select r.evaluator_user_id,
         count(distinct r.player_id) filter (where p.is_group_member is not false)::bigint,
         count(*) filter (where p.is_group_member is not false)::bigint
  from public.player_skill_ratings r
  join public.players p on p.id=r.player_id and p.workspace_id=p_workspace_id
  where r.workspace_id=p_workspace_id
  group by r.evaluator_user_id;
end $$;

revoke all on function public.get_admin_evaluation_progress_v1(uuid) from public,anon;
grant execute on function public.get_admin_evaluation_progress_v1(uuid) to authenticated;
