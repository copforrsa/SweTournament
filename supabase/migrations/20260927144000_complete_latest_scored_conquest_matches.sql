-- Backfill the scores entered after the first repair of the active Conquête.
-- This is intentionally limited to the identified tournament and to
-- qualification matches that already contain a non-zero score.
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
