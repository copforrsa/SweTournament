-- Always attach the composition already generated to the private review room.
create or replace function public.team_draw_room_join_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_t public.tournaments%rowtype;
  v_admin boolean := false;
  v_eligible boolean := false;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  v_admin := private.is_workspace_admin(v_t.workspace_id);
  select exists(
    select 1 from public.workspace_members wm
    join public.tournament_players tp on tp.tournament_id=v_t.id and tp.player_id=wm.linked_player_id
    where wm.workspace_id=v_t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer'
      and coalesce(wm.active,true) and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist'
  ) into v_eligible;
  if not (v_admin or v_eligible) then raise exception 'Salon réservé aux co-gestionnaires inscrits et à l’administrateur'; end if;
  if not coalesce(v_t.team_review_requested,false) or v_t.team_review_status not in ('pending','redraw_requested') then
    raise exception 'Le salon est fermé';
  end if;
  if exists(select 1 from public.teams tm where tm.tournament_id=v_t.id)
     and not exists(select 1 from public.team_draw_room_proposals pr where pr.tournament_id=v_t.id and pr.is_current) then
    perform public.team_draw_room_capture_current_v1(v_t.id);
  end if;
  return public.team_draw_room_state_v1(v_t.id);
end;
$$;

create or replace function public.team_draw_room_capture_on_review_start_v1()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.team_review_status='pending' and coalesce(new.team_review_requested,false)
     and exists(select 1 from public.teams tm where tm.tournament_id=new.id)
     and not exists(select 1 from public.team_draw_room_proposals pr where pr.tournament_id=new.id and pr.is_current) then
    perform public.team_draw_room_capture_current_v1(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists team_draw_room_capture_on_review_start on public.tournaments;
create trigger team_draw_room_capture_on_review_start
after update of team_review_status, team_review_requested on public.tournaments
for each row execute function public.team_draw_room_capture_on_review_start_v1();

revoke all on function public.team_draw_room_join_v1(uuid) from public, anon;
grant execute on function public.team_draw_room_join_v1(uuid) to authenticated;
revoke all on function public.team_draw_room_capture_on_review_start_v1() from public, anon, authenticated;
