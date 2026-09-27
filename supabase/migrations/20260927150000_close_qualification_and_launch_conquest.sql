-- Explicit organiser action: close all remaining qualification fixtures and
-- start the Conquête bracket through the existing server-side state machine.
begin;

select set_config('request.jwt.claim.sub','8e47c5b5-831b-48a5-811e-67659574a125', true);

alter table public.matches disable trigger conquest_advance_after_match_v2;

update public.matches
set status = 'finished',
    finished_at = coalesce(finished_at, now())
where tournament_id = '3c78c03e-f34e-4403-bc99-d3e1089e8001'
  and competition_type = 'championship_qualification'
  and status <> 'finished';

alter table public.matches enable trigger conquest_advance_after_match_v2;

select public.conquest_refresh_v2('3c78c03e-f34e-4403-bc99-d3e1089e8001'::uuid);
select public.conquest_start_playoffs_v2('3c78c03e-f34e-4403-bc99-d3e1089e8001'::uuid);

commit;
