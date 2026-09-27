create or replace function public.finish_conquest_by_qualification_v2(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','pg_temp'
as $$
declare
  v_t public.tournaments%rowtype;
  v_team_count integer;
  v_expected integer;
  v_completed integer;
  v_ranked uuid[];
  v_winner uuid;
  v_report jsonb;
  v_outcome jsonb;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if coalesce(v_t.format,'')<>'conquest' and coalesce(v_t.rotation_mode,'')<>'conquest' then
    raise exception 'Cette clôture est réservée au format Conquête';
  end if;
  if not private.is_workspace_admin(v_t.workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;
  if v_t.status='finished' then raise exception 'Ce tournoi est déjà terminé'; end if;

  select count(*) into v_team_count from public.teams where tournament_id=v_t.id;
  if v_team_count<4 then raise exception 'Au moins 4 équipes sont requises'; end if;
  v_expected:=v_team_count*(v_team_count-1)/2;
  select count(*) into v_completed from public.matches
  where tournament_id=v_t.id and competition_type='championship_qualification' and status='finished';
  if v_completed<>v_expected then
    raise exception 'Le championnat qualificatif doit être entièrement terminé avant cette clôture';
  end if;
  if exists (select 1 from public.matches where tournament_id=v_t.id and competition_type='conquest_playoff' and status='finished') then
    raise exception 'La phase Conquête a déjà commencé : termine-la normalement';
  end if;

  v_ranked:=public.conquest_ranked_teams_v2(v_t.id);
  v_winner:=v_ranked[1];
  if v_winner is null then raise exception 'Classement qualificatif indisponible'; end if;
  v_outcome:=jsonb_build_object(
    'completion_reason','qualification_only',
    'champion_team_id',v_winner,
    'champion_source','championship_qualification',
    'completion_label','Phase Conquête non jouée',
    'completed_at',now()
  );

  update public.tournaments set rotation_state=coalesce(rotation_state,'{}'::jsonb)||v_outcome,registration_open=false where id=v_t.id;
  update public.tournament_format_workflows set phase='finished',state=coalesce(state,'{}'::jsonb)||v_outcome,version=coalesce(version,0)+1,updated_at=now()
  where tournament_id=v_t.id and format='conquest';
  v_report:=public.finish_tournament_with_payment_report(v_t.id);
  return coalesce(v_report,'{}'::jsonb)||v_outcome;
end;
$$;

revoke all on function public.finish_conquest_by_qualification_v2(uuid) from public, anon;
grant execute on function public.finish_conquest_by_qualification_v2(uuid) to authenticated;
