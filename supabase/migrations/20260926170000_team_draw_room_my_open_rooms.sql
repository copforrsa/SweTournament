-- Retourne les salons de composition ouverts pour le compte connecté.
-- La PWA ne doit pas dépendre du dernier tournoi sélectionné localement.
create or replace function public.team_draw_room_my_open_rooms_v2()
returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,
    'name',coalesce(t.name,'Tournoi'),
    'format',t.format,
    'team_review_status',t.team_review_status,
    'draw_room_first_enabled',t.draw_room_first_enabled,
    'deadline',t.team_review_deadline,
    'can_admin',private.is_workspace_admin(t.workspace_id)
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
          on wm.workspace_id=t.workspace_id
         and wm.user_id=rv.user_id
         and wm.role='coorganizer'
         and coalesce(wm.active,true)
        where rv.tournament_id=t.id
          and rv.user_id=auth.uid()
          and rv.selected
      )
    );
  return v_result;
end;
$$;

revoke all on function public.team_draw_room_my_open_rooms_v2() from public, anon;
grant execute on function public.team_draw_room_my_open_rooms_v2() to authenticated;
