create or replace function private.fast_conquest_event_guard()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare m public.matches%rowtype; t public.tournaments%rowtype;
begin
  if tg_op='UPDATE' and new.match_id<>old.match_id and exists(
    select 1 from public.matches x join public.tournaments y on y.id=x.tournament_id
    where x.id=old.match_id and y.format='fast_conquest'
  ) then
    raise exception 'Réaffectation Fast Conquête interdite';
  end if;
  select * into m from public.matches where id=case when tg_op='DELETE' then old.match_id else new.match_id end;
  if not found then return case when tg_op='DELETE' then old else new end; end if;
  select * into t from public.tournaments where id=m.tournament_id;
  if t.format<>'fast_conquest' or current_setting('swe.fast_commit',true)='on' then
    return case when tg_op='DELETE' then old else new end;
  end if;
  -- Le Super Admin peut rectifier un but ou une passe après la clôture du tournoi.
  -- Les organisateurs et co-gestionnaires restent soumis aux règles de terrain habituelles.
  if private.is_platform_super_admin() then
    return case when tg_op='DELETE' then old else new end;
  end if;
  if not private.swe_workspace_full_access(t.workspace_id)
     or not (private.fast_admin(t.workspace_id) or private.fast_designated(t.id) and private.coorganizer_can_edit_tournament(t.id)) then
    raise exception 'Droit de saisie requis';
  end if;
  if m.pitch is null or m.status='finished' then raise exception 'Match à venir ou déjà terminé'; end if;
  if tg_op='UPDATE' and new.match_id is distinct from old.match_id then raise exception 'Réaffectation interdite'; end if;
  if tg_table_name='match_player_assignments' then
    if tg_op<>'DELETE' and exists(
      select 1 from private.fast_conquest_sub_refusals
      where tournament_id=t.id and team_id=new.team_id and player_id=new.player_id
    ) then raise exception 'Cette équipe refuse ce remplaçant'; end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end
$function$;
