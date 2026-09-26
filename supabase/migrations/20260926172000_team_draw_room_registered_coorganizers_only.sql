-- Le salon est réservé aux co-gestionnaires actifs, inscrits et confirmés au tournoi.

create or replace function public.team_draw_room_save_voters_v2(
  p_tournament_id uuid,
  p_voter_user_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare
  v_t public.tournaments%rowtype;
  v_ids uuid[] := coalesce(p_voter_user_ids, '{}'::uuid[]);
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut choisir les votants'; end if;
  perform public.team_draw_room_setup_v2(v_t.id);

  if exists (
    select 1 from unnest(v_ids) chosen(user_id)
    where not exists (
      select 1
      from public.workspace_members wm
      join public.tournament_players tp
        on tp.tournament_id=v_t.id
       and tp.player_id=wm.linked_player_id
       and tp.present
       and coalesce(tp.registration_status,'confirmed') <> 'waitlist'
      where wm.workspace_id=v_t.workspace_id
        and wm.user_id=chosen.user_id
        and wm.role='coorganizer'
        and coalesce(wm.active,true)
    )
  ) then
    raise exception 'Un votant doit être un co-gestionnaire inscrit et confirmé à ce tournoi';
  end if;

  update public.team_draw_room_voters_v2
  set selected=user_id=any(v_ids), selected_by=auth.uid(), selected_at=now()
  where tournament_id=v_t.id;
  return public.team_draw_room_setup_v2(v_t.id);
end;
$$;

-- Les anciennes sélections d’exception restent historisées, mais ne donnent plus accès.
update public.team_draw_room_voters_v2 rv
set selected=false, selected_at=now()
from public.tournaments t
where t.id=rv.tournament_id
  and rv.selected
  and not exists (
    select 1
    from public.workspace_members wm
    join public.tournament_players tp
      on tp.tournament_id=t.id
     and tp.player_id=wm.linked_player_id
     and tp.present
     and coalesce(tp.registration_status,'confirmed') <> 'waitlist'
    where wm.workspace_id=t.workspace_id
      and wm.user_id=rv.user_id
      and wm.role='coorganizer'
      and coalesce(wm.active,true)
  );

create or replace function public.team_draw_room_my_open_rooms_v2()
returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'name',coalesce(t.name,'Tournoi'),'format',t.format,
    'team_review_status',t.team_review_status,'draw_room_first_enabled',t.draw_room_first_enabled,
    'deadline',t.team_review_deadline,'can_admin',private.is_workspace_admin(t.workspace_id)
  ) order by t.team_review_deadline nulls last, t.created_at desc),'[]'::jsonb)
  into v_result
  from public.tournaments t
  where coalesce(t.draw_room_first_enabled,false)
    and t.team_review_status in ('pending','redraw_requested')
    and (
      private.is_workspace_admin(t.workspace_id)
      or exists(
        select 1
        from public.team_draw_room_voters_v2 rv
        join public.workspace_members wm
          on wm.workspace_id=t.workspace_id and wm.user_id=rv.user_id
         and wm.role='coorganizer' and coalesce(wm.active,true)
        join public.tournament_players tp
          on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id
         and tp.present and coalesce(tp.registration_status,'confirmed') <> 'waitlist'
        where rv.tournament_id=t.id and rv.user_id=auth.uid() and rv.selected
      )
    );
  return v_result;
end;
$$;

revoke all on function public.team_draw_room_save_voters_v2(uuid,uuid[]) from public,anon;
revoke all on function public.team_draw_room_my_open_rooms_v2() from public,anon;
grant execute on function public.team_draw_room_save_voters_v2(uuid,uuid[]) to authenticated;
grant execute on function public.team_draw_room_my_open_rooms_v2() to authenticated;
