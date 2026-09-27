-- One-time repair for the active Conquête tournament: scores had been saved
-- without transitioning their qualification matches to the finished state.
-- The workflow trigger is disabled only during this backfill because this
-- migration runs without a browser authentication context.
begin;

alter table public.matches disable trigger conquest_advance_after_match_v2;

update public.matches
set status = 'finished',
    finished_at = coalesce(finished_at, now())
where tournament_id = '3c78c03e-f34e-4403-bc99-d3e1089e8001'
  and status <> 'finished'
  and competition_type = 'championship_qualification'
  and (coalesce(home_score, 0) <> 0 or coalesce(away_score, 0) <> 0);

alter table public.matches enable trigger conquest_advance_after_match_v2;

commit;
