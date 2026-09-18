alter table public.tournaments
  add column if not exists admin_payment_provider text,
  add column if not exists admin_payment_link text,
  add column if not exists admin_payment_link_enabled boolean not null default false;

alter table public.tournaments
  drop constraint if exists tournaments_admin_payment_link_https;

alter table public.tournaments
  add constraint tournaments_admin_payment_link_https check (
    admin_payment_link is null
    or (lower(trim(admin_payment_link)) ~ '^https://[^[:space:]]+$' and char_length(admin_payment_link) <= 500)
  );

alter table public.tournaments
  drop constraint if exists tournaments_admin_payment_link_enabled_requires_link;

alter table public.tournaments
  add constraint tournaments_admin_payment_link_enabled_requires_link check (
    not admin_payment_link_enabled or admin_payment_link is not null
  );
