-- SWÉ v50.72 — présence dans le salon de composition et suivi réservé à l'administrateur.

create table if not exists public.team_draw_room_presence_v2 (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

alter table public.team_draw_room_presence_v2 enable row level security;

create or replace function public.team_draw_room_state_v2(p_tournament_id uuid)
returns jsonb
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare
  v_t public.tournaments%rowtype; v_admin boolean:=false; v_can_vote boolean:=false;
  v_voter_count integer:=0; v_proposal_count integer:=0; v_current_id uuid;
  v_current_redraws integer:=0; v_proposals jsonb:='[]'::jsonb; v_voters jsonb:='[]'::jsonb;
  v_my_feedback text; v_my_final_choice uuid; v_leader uuid; v_expired boolean:=false;
begin
  select * into v_t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not coalesce(v_t.draw_room_first_enabled,false) or v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon n’est pas ouvert'; end if;

  v_admin:=private.is_workspace_admin(v_t.workspace_id);
  select exists(
    select 1 from public.team_draw_room_voters_v2 rv
    join public.workspace_members wm on wm.workspace_id=v_t.workspace_id and wm.user_id=rv.user_id and wm.role='coorganizer' and coalesce(wm.active,true)
    where rv.tournament_id=v_t.id and rv.selected and rv.user_id=auth.uid()
  ) into v_can_vote;
  if not (v_admin or v_can_vote) then raise exception 'Salon réservé à l’administrateur et aux co-gestionnaires votants'; end if;

  -- Chaque ouverture/actualisation du salon crée une présence. « connecté » signifie
  -- une activité observée au cours des 45 dernières secondes.
  insert into public.team_draw_room_presence_v2(tournament_id,user_id,first_seen_at,last_seen_at)
  values(v_t.id,auth.uid(),now(),now())
  on conflict(tournament_id,user_id) do update set last_seen_at=excluded.last_seen_at;

  select count(*) into v_voter_count from public.team_draw_room_voters_v2 rv
  join public.workspace_members wm on wm.workspace_id=v_t.workspace_id and wm.user_id=rv.user_id and wm.role='coorganizer' and coalesce(wm.active,true)
  where rv.tournament_id=v_t.id and rv.selected;

  select count(*) into v_proposal_count from public.team_draw_room_proposals where tournament_id=v_t.id;
  select id into v_current_id from public.team_draw_room_proposals where tournament_id=v_t.id and is_current order by sequence desc limit 1;
  if v_current_id is null then select id into v_current_id from public.team_draw_room_proposals where tournament_id=v_t.id order by sequence desc limit 1; end if;
  select count(*) into v_current_redraws from public.team_draw_room_feedback_votes_v2 where tournament_id=v_t.id and proposal_id=v_current_id and decision='redraw';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pr.id,'sequence',pr.sequence,'snapshot',pr.snapshot,'is_current',pr.is_current,'created_at',pr.created_at,
    'keep_votes',(select count(*) from public.team_draw_room_feedback_votes_v2 fv where fv.tournament_id=v_t.id and fv.proposal_id=pr.id and fv.decision='keep'),
    'redraw_votes',(select count(*) from public.team_draw_room_feedback_votes_v2 fv where fv.tournament_id=v_t.id and fv.proposal_id=pr.id and fv.decision='redraw'),
    'final_votes',(select count(*) from public.team_draw_room_final_votes_v2 ff where ff.tournament_id=v_t.id and ff.proposal_id=pr.id)
  ) order by pr.sequence),'[]'::jsonb) into v_proposals from public.team_draw_room_proposals pr where pr.tournament_id=v_t.id;
  select decision into v_my_feedback from public.team_draw_room_feedback_votes_v2 where tournament_id=v_t.id and proposal_id=v_current_id and user_id=auth.uid();
  select proposal_id into v_my_final_choice from public.team_draw_room_final_votes_v2 where tournament_id=v_t.id and user_id=auth.uid();
  if v_proposal_count>=5 then select proposal_id into v_leader from public.team_draw_room_final_votes_v2 where tournament_id=v_t.id group by proposal_id order by count(*) desc,min(updated_at),proposal_id limit 1; end if;

  if v_admin then
    select coalesce(jsonb_agg(jsonb_build_object(
      'name',coalesce(p.name,'Co-gestionnaire'),
      'connected',coalesce(prs.last_seen_at is not null,false),
      'online',coalesce(prs.last_seen_at>=now()-interval '45 seconds',false),
      'last_seen_at',prs.last_seen_at,
      'feedback',(select fv.decision from public.team_draw_room_feedback_votes_v2 fv where fv.tournament_id=v_t.id and fv.proposal_id=v_current_id and fv.user_id=rv.user_id),
      'final_choice',(select ff.proposal_id from public.team_draw_room_final_votes_v2 ff where ff.tournament_id=v_t.id and ff.user_id=rv.user_id)
    ) order by coalesce(p.name,'Co-gestionnaire')),'[]'::jsonb) into v_voters
    from public.team_draw_room_voters_v2 rv
    join public.workspace_members wm on wm.workspace_id=v_t.workspace_id and wm.user_id=rv.user_id and wm.role='coorganizer' and coalesce(wm.active,true)
    left join public.players p on p.id=wm.linked_player_id
    left join public.team_draw_room_presence_v2 prs on prs.tournament_id=rv.tournament_id and prs.user_id=rv.user_id
    where rv.tournament_id=v_t.id and rv.selected;
  end if;

  v_expired:=v_t.team_review_deadline is not null and now()>=v_t.team_review_deadline;
  return jsonb_build_object(
    'tournament_id',v_t.id,'tournament_name',coalesce(v_t.name,'Tournoi'),'deadline',v_t.team_review_deadline,'expired',v_expired,
    'can_admin',v_admin,'can_vote',v_can_vote,'voter_count',v_voter_count,'first_draw_pending',v_proposal_count=0,
    'proposal_count',v_proposal_count,'max_proposals',5,'current_proposal_id',v_current_id,'proposals',v_proposals,
    'my_feedback',v_my_feedback,'my_final_choice',v_my_final_choice,'final_vote_leader_id',v_leader,
    'room_phase',case when v_voter_count=0 then 'solo' when v_proposal_count>=5 then 'final_choice' else 'feedback' end,
    'can_generate',v_admin and not v_expired and v_proposal_count<5 and (v_voter_count=0 or v_proposal_count=0 or v_current_redraws>0),
    'can_publish',v_admin and (v_voter_count=0 or v_expired),'voters',v_voters
  );
end;
$$;

revoke all on table public.team_draw_room_presence_v2 from public, anon, authenticated;
revoke all on function public.team_draw_room_state_v2(uuid) from public, anon;
grant execute on function public.team_draw_room_state_v2(uuid) to authenticated;
