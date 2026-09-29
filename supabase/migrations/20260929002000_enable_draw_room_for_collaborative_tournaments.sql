-- The creation flow stores the collaborative choice in team_review_requested.
-- The current salon reads draw_room_first_enabled instead. Keep the two in sync
-- before the first draw, regardless of which creation path inserts the tourney.
create or replace function private.enable_collaborative_draw_room()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.team_review_requested
     and new.format <> 'league'
     and new.team_review_status in ('not_started', 'cancelled')
     and new.status <> 'finished'
     and (tg_op = 'INSERT' or not exists (
       select 1 from public.teams where tournament_id = new.id
     )) then
    new.draw_room_first_enabled := true;
  end if;
  return new;
end;
$function$;

drop trigger if exists enable_collaborative_draw_room on public.tournaments;
create trigger enable_collaborative_draw_room
before insert or update of team_review_requested on public.tournaments
for each row execute function private.enable_collaborative_draw_room();

update public.tournaments t
set draw_room_first_enabled = true
where t.team_review_requested
  and not t.draw_room_first_enabled
  and t.format <> 'league'
  and t.status <> 'finished'
  and t.team_review_status in ('not_started', 'cancelled')
  and not exists (select 1 from public.teams tm where tm.tournament_id = t.id)
  and not exists (select 1 from public.matches m where m.tournament_id = t.id);
