-- V50.58 — adds the Conquête du terrain format without opening new data surfaces.
alter table public.tournaments
  drop constraint if exists tournaments_format_check;

alter table public.tournaments
  add constraint tournaments_format_check
  check (format = any (array['classic'::text, 'king_of_pitch'::text, 'league'::text, 'conquest'::text]));
