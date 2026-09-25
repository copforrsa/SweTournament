-- The tournament trigger must create the associated third-half fund internally.
-- Direct API access to third_half_funds is intentionally denied by RLS.
create or replace function public.ensure_third_half_fund_for_tournament()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.third_half_active, false) then
    insert into public.third_half_funds (
      tournament_id, workspace_id, status, suggested_amount_cents,
      logistics_assignments, share_enabled, updated_at, updated_by
    ) values (
      new.id, new.workspace_id, 'draft',
      least(500, greatest(0, coalesce(new.cooler_suggested_cents, 0))),
      '{}'::jsonb, false, now(), auth.uid()
    )
    on conflict (tournament_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_third_half_fund_for_tournament() from public, anon, authenticated;
