-- V50.65.1 — Internal workflow helpers must not be callable through PostgREST.
revoke all on function public.conquest_ranked_teams_v2(uuid) from public, anon, authenticated;
revoke all on function public.conquest_guard_finished_match_v2() from public, anon, authenticated;
revoke all on function public.conquest_advance_after_match_v2() from public, anon, authenticated;
notify pgrst,'reload schema';
