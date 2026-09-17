-- Venue catalogues and partner reservations are accessed through scoped RPCs.
-- Keep public discovery in get_sports_venues/get_public_workspace_snapshot,
-- without exposing unrestricted tables through the Data API.
alter table public.sports_complexes enable row level security;
alter table public.sports_pitches enable row level security;
alter table public.sports_complex_tournament_reservations enable row level security;

revoke all on table public.sports_complexes from anon, authenticated;
revoke all on table public.sports_pitches from anon, authenticated;
revoke all on table public.sports_complex_tournament_reservations from anon, authenticated;

notify pgrst,'reload schema';
