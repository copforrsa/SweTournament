-- SWÉ Tournament V43.90 — automatically keep the common substitute bench in sync.
-- Fixes players added from the Teams attendance selector after teams already exist.

create or replace function private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_capacity integer:=0;
  v_assigned integer:=0;
  v_free integer:=0;
  v_substitutes integer:=0;
begin
  select count(tm.id)*greatest(2,least(11,coalesce(t.team_size,5)))
  into v_capacity
  from public.tournaments t
  left join public.teams tm on tm.tournament_id=t.id
  where t.id=p_tournament_id
  group by t.team_size;

  if v_capacity is null then return 0; end if;

  select count(distinct tp.player_id)
  into v_assigned
  from public.team_players tp
  join public.teams tm on tm.id=tp.team_id
  join public.tournament_players tr
    on tr.tournament_id=tm.tournament_id and tr.player_id=tp.player_id
  where tm.tournament_id=p_tournament_id
    and tr.present
    and coalesce(tr.registration_status,'confirmed')<>'waitlist';

  v_free:=greatest(0,v_capacity-v_assigned);

  update public.tournament_players
  set is_substitute=false
  where tournament_id=p_tournament_id and is_substitute is distinct from false;

  with unassigned as (
    select tr.player_id,
      row_number() over(order by tr.registered_at nulls last,tr.player_id) as position
    from public.tournament_players tr
    where tr.tournament_id=p_tournament_id
      and tr.present
      and coalesce(tr.registration_status,'confirmed')<>'waitlist'
      and not exists(
        select 1
        from public.team_players tp
        join public.teams tm on tm.id=tp.team_id
        where tm.tournament_id=p_tournament_id and tp.player_id=tr.player_id
      )
  )
  update public.tournament_players tr
  set is_substitute=true
  from unassigned u
  where tr.tournament_id=p_tournament_id
    and tr.player_id=u.player_id
    and v_capacity>0
    and u.position>v_free;

  select count(*) into v_substitutes
  from public.tournament_players
  where tournament_id=p_tournament_id
    and present
    and coalesce(registration_status,'confirmed')<>'waitlist'
    and is_substitute;

  return v_substitutes;
end $$;

revoke all on function private.recalculate_tournament_substitute_flags(uuid) from public,anon,authenticated;

create or replace function private.trigger_recalculate_substitutes_from_registration()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.recalculate_tournament_substitute_flags(coalesce(new.tournament_id,old.tournament_id));
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create or replace function private.trigger_recalculate_substitutes_from_team_player()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_old_tournament uuid;
  v_new_tournament uuid;
begin
  if tg_op<>'INSERT' then
    select tournament_id into v_old_tournament from public.teams where id=old.team_id;
  end if;
  if tg_op<>'DELETE' then
    select tournament_id into v_new_tournament from public.teams where id=new.team_id;
  end if;
  if v_old_tournament is not null then
    perform private.recalculate_tournament_substitute_flags(v_old_tournament);
  end if;
  if v_new_tournament is not null and v_new_tournament is distinct from v_old_tournament then
    perform private.recalculate_tournament_substitute_flags(v_new_tournament);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

revoke all on function private.trigger_recalculate_substitutes_from_registration() from public,anon,authenticated;
revoke all on function private.trigger_recalculate_substitutes_from_team_player() from public,anon,authenticated;

drop trigger if exists tournament_players_recalculate_substitutes_write on public.tournament_players;
create trigger tournament_players_recalculate_substitutes_write
after insert or delete on public.tournament_players
for each row execute function private.trigger_recalculate_substitutes_from_registration();

drop trigger if exists tournament_players_recalculate_substitutes_update on public.tournament_players;
create trigger tournament_players_recalculate_substitutes_update
after update of present,registration_status,registered_at,player_id on public.tournament_players
for each row execute function private.trigger_recalculate_substitutes_from_registration();

drop trigger if exists team_players_recalculate_substitutes_write on public.team_players;
create trigger team_players_recalculate_substitutes_write
after insert or delete on public.team_players
for each row execute function private.trigger_recalculate_substitutes_from_team_player();

drop trigger if exists team_players_recalculate_substitutes_update on public.team_players;
create trigger team_players_recalculate_substitutes_update
after update of team_id,player_id on public.team_players
for each row execute function private.trigger_recalculate_substitutes_from_team_player();

drop trigger if exists teams_recalculate_substitutes_write on public.teams;
create trigger teams_recalculate_substitutes_write
after insert or delete on public.teams
for each row execute function private.trigger_recalculate_substitutes_from_registration();

drop trigger if exists teams_recalculate_substitutes_update on public.teams;
create trigger teams_recalculate_substitutes_update
after update of tournament_id on public.teams
for each row execute function private.trigger_recalculate_substitutes_from_registration();

create or replace function public.sync_tournament_substitutes(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  t public.tournaments%rowtype;
  v_capacity integer:=0;
  v_assigned integer:=0;
  v_free integer:=0;
  v_substitutes integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id and status<>'finished' for update;
  if not found then raise exception 'Tournoi indisponible'; end if;
  if (select auth.uid()) is null or not (private.is_workspace_admin(t.workspace_id) or private.coorganizer_has_permission(t.workspace_id,'generate_teams')) then
    raise exception 'Autorisation refusée pour gérer les compositions';
  end if;

  v_substitutes:=private.recalculate_tournament_substitute_flags(t.id);
  select count(*)*greatest(2,least(11,coalesce(t.team_size,5))) into v_capacity
  from public.teams tm where tm.tournament_id=t.id;
  select count(distinct tp.player_id) into v_assigned
  from public.team_players tp
  join public.teams tm on tm.id=tp.team_id
  join public.tournament_players tr on tr.tournament_id=t.id and tr.player_id=tp.player_id
  where tm.tournament_id=t.id and tr.present and coalesce(tr.registration_status,'confirmed')<>'waitlist';
  v_free:=greatest(0,v_capacity-v_assigned);

  delete from public.match_player_assignments a using public.matches m
  where a.match_id=m.id and m.tournament_id=t.id and m.status='scheduled';
  insert into public.match_player_assignments(match_id,player_id,team_id)
  select m.id,tp.player_id,tm.id
  from public.matches m
  join public.teams tm on tm.id in (m.home_team_id,m.away_team_id)
  join public.team_players tp on tp.team_id=tm.id
  where m.tournament_id=t.id and m.status='scheduled'
  on conflict(match_id,player_id) do update set team_id=excluded.team_id;

  return jsonb_build_object('capacity',v_capacity,'assigned',v_assigned,'free_slots',v_free,'substitute_count',v_substitutes);
end $$;

revoke all on function public.sync_tournament_substitutes(uuid) from public,anon,authenticated;
grant execute on function public.sync_tournament_substitutes(uuid) to authenticated;

-- Repair every active roster once so late additions already present are corrected immediately.
do $$
declare r record;
begin
  for r in
    select distinct t.id
    from public.tournaments t
    join public.teams tm on tm.tournament_id=t.id
    where t.status<>'finished'
  loop
    perform private.recalculate_tournament_substitute_flags(r.id);
  end loop;
end $$;

notify pgrst,'reload schema';
