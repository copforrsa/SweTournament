-- Sensitive tables are accessed only through reviewed RPC functions.
-- Direct anon/authenticated Data API access is intentionally denied.
alter table public.platform_settings enable row level security;
alter table public.third_half_funds enable row level security;
alter table public.user_onboarding_profiles enable row level security;
alter table public.player_withdrawal_events enable row level security;
alter table public.workspace_module_credits enable row level security;

drop policy if exists platform_settings_no_direct_api_access on public.platform_settings;
create policy platform_settings_no_direct_api_access on public.platform_settings
for all to anon, authenticated using (false) with check (false);

drop policy if exists third_half_funds_no_direct_api_access on public.third_half_funds;
create policy third_half_funds_no_direct_api_access on public.third_half_funds
for all to anon, authenticated using (false) with check (false);

drop policy if exists user_onboarding_profiles_no_direct_api_access on public.user_onboarding_profiles;
create policy user_onboarding_profiles_no_direct_api_access on public.user_onboarding_profiles
for all to anon, authenticated using (false) with check (false);

drop policy if exists player_withdrawal_events_no_direct_api_access on public.player_withdrawal_events;
create policy player_withdrawal_events_no_direct_api_access on public.player_withdrawal_events
for all to anon, authenticated using (false) with check (false);

drop policy if exists workspace_module_credits_no_direct_api_access on public.workspace_module_credits;
create policy workspace_module_credits_no_direct_api_access on public.workspace_module_credits
for all to anon, authenticated using (false) with check (false);

-- Legacy wrapper delegates to the checked v2 function; it must not need direct RLS reads.
alter function public.admin_save_third_half_assignments_v1(uuid, uuid, uuid) security definer;
revoke execute on function public.admin_save_third_half_assignments_v1(uuid, uuid, uuid) from anon;
grant execute on function public.admin_save_third_half_assignments_v1(uuid, uuid, uuid) to authenticated;
