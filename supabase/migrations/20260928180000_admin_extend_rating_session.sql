create or replace function public.admin_extend_tournament_rating_session(
  p_tournament_id uuid,
  p_extension_hours integer default 48
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare
  v_workspace uuid;
  v_closes_at timestamptz;
  v_hours integer:=coalesce(p_extension_hours,48);
begin
  if v_hours<1 or v_hours>168 then
    raise exception 'La prolongation doit être comprise entre 1 et 168 heures';
  end if;
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Accès administrateur requis'; end if;
  update public.tournament_rating_sessions
  set status='open',
      closes_at=greatest(coalesce(closes_at,now()),now())+make_interval(hours=>v_hours),
      opened_at=coalesce(opened_at,now()),
      opened_by=auth.uid()
  where tournament_id=p_tournament_id
  returning closes_at into v_closes_at;
  if v_closes_at is null then raise exception 'Aucune session de notation à prolonger pour ce tournoi'; end if;
  return jsonb_build_object('tournament_id',p_tournament_id,'status','open','closes_at',v_closes_at,'extension_hours',v_hours);
end $function$;

revoke all on function public.admin_extend_tournament_rating_session(uuid,integer) from public, anon;
grant execute on function public.admin_extend_tournament_rating_session(uuid,integer) to authenticated;