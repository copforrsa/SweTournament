-- Payment sheets and completion reports must never be exposed as editable
-- Data API tables. Their application flows use scoped SECURITY DEFINER RPCs.
alter table public.tournament_payment_reports enable row level security;
alter table public.tournament_payment_walkins enable row level security;

revoke all on table public.tournament_payment_reports from anon, authenticated;
revoke all on table public.tournament_payment_walkins from anon, authenticated;

notify pgrst,'reload schema';
