-- A preformed team may reserve places while its members still have to accept.
-- Do not turn unrelated registered players into substitutes until every created
-- roster is complete with accepted/direct members.

create or replace function private.recalculate_tournament_substitute_flags(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_team_size integer:=5;
  v_capacity integer:=0;
  v_assigned integer:=0;
  v_free integer:=0;
  v_substitutes integer:=0;
  v_has_incomplete_team boolean:=false;
begin
  select greatest(2,least(11,coalesce(team_size,5)))
    into v_team_size
  from public.tournaments
  where id=p_tournament_id;

  if v_team_size is null then return 0; end if;

  select exists(
    select 1
    from public.teams tm
    where tm.tournament_id=p_tournament_id
      and (
        select count(distinct tp.player_id)
        from public.team_players tp
        join public.tournament_players tr
          on tr.tournament_id=p_tournament_id and tr.player_id=tp.player_id
        where tp.team_id=tm.id
          and tr.present
          and coalesce(tr.registration_status,'confirmed')<>'waitlist'
      ) < v_team_size
  ) into v_has_incomplete_team;

  update public.tournament_players
  set is_substitute=false
  where tournament_id=p_tournament_id and is_substitute is distinct from false;

  -- An unfinished manual/preformed team is only a proposal. It must not change
  -- the status of the other attendees; the final draw will recalculate later.
  if v_has_incomplete_team then return 0; end if;

  select count(tm.id)*v_team_size
  into v_capacity
  from public.teams tm
  where tm.tournament_id=p_tournament_id;

  if coalesce(v_capacity,0)=0 then return 0; end if;

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

-- Repair all active tournaments immediately. Pending invitations remain visible
-- as proposals, but they never occupy a confirmed team place.
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
