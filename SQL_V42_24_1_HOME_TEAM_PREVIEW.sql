-- V42.24.1 — afficher les compositions dans les notifications d'accueil.
create or replace function public.get_home_team_review_notifications(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private'
as $$
declare v_is_admin boolean;v_result jsonb;
begin
  if not private.is_workspace_member(p_workspace_id) then raise exception 'Accès refusé'; end if;
  v_is_admin:=private.is_workspace_admin(p_workspace_id);
  perform public.finalize_tournament_team_review(t.id)
    from public.tournaments t
    where t.workspace_id=p_workspace_id and t.team_review_status='pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'tournament_id',t.id,'tournament_name',coalesce(t.name,'Tournoi'),'tournament_date',t.tournament_date,
    'status',t.team_review_status,'deadline',t.team_review_deadline,'duration_minutes',t.team_review_duration_minutes,
    'max_redraws',t.max_team_redraws,'redraws_used',t.team_redraws_used,'is_admin',v_is_admin,
    'eligible_count',(select count(*) from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true and wm.linked_player_id is not null and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'),
    'validate_votes',(select count(*) from public.tournament_team_reviews r where r.tournament_id=t.id and r.decision='validate'),
    'redraw_votes',(select count(*) from public.tournament_team_reviews r where r.tournament_id=t.id and r.decision='redraw'),
    'my_vote',(select r.decision from public.tournament_team_reviews r where r.tournament_id=t.id and r.user_id=auth.uid()),
    'my_eligible',exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'),
    'teams',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',te.id,'name',te.name,
      'players',(select coalesce(jsonb_agg(p.name order by p.name),'[]'::jsonb) from public.team_players tep join public.players p on p.id=tep.player_id where tep.team_id=te.id)
    ) order by te.created_at),'[]'::jsonb) from public.teams te where te.tournament_id=t.id)
  ) order by t.team_review_deadline nulls last,t.tournament_date),'[]'::jsonb) into v_result
  from public.tournaments t
  where t.workspace_id=p_workspace_id and t.status<>'finished' and coalesce(t.team_review_requested,false)=true
    and t.team_review_status in ('pending','redraw_requested')
    and (v_is_admin or exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)=true and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'));
  return v_result;
end $$;

revoke all on function public.get_home_team_review_notifications(uuid) from public,anon;
grant execute on function public.get_home_team_review_notifications(uuid) to authenticated;
notify pgrst,'reload schema';
