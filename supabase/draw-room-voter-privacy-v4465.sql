CREATE OR REPLACE FUNCTION public.team_draw_room_state_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_t public.tournaments%rowtype;
  v_admin boolean := false;
  v_eligible boolean := false;
  v_current uuid;
  v_proposals jsonb;
  v_voters jsonb;
begin
  select * into v_t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;
  v_admin := private.is_workspace_admin(v_t.workspace_id);
  select exists(
    select 1 from public.workspace_members wm
    join public.tournament_players tp on tp.tournament_id=v_t.id and tp.player_id=wm.linked_player_id
    where wm.workspace_id=v_t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer'
      and coalesce(wm.active,true) and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist'
  ) into v_eligible;
  if not (v_admin or v_eligible) then raise exception 'Salon réservé aux co-gestionnaires inscrits et à l’administrateur'; end if;

  select id into v_current from public.team_draw_room_proposals where tournament_id=v_t.id and is_current;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', pr.id, 'sequence', pr.sequence, 'snapshot', pr.snapshot, 'is_current', pr.is_current,
    'created_at', pr.created_at, 'published_at', pr.published_at,
    'keep_votes', (select count(*) from private.latest_room_votes_v4465(v_t.id) vo where vo.proposal_id=pr.id and vo.decision='keep'),
    'redraw_votes', (select count(*) from private.latest_room_votes_v4465(v_t.id) vo where vo.proposal_id=pr.id and vo.decision='redraw')
  ) order by pr.sequence desc), '[]'::jsonb) into v_proposals
  from public.team_draw_room_proposals pr where pr.tournament_id=v_t.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.name, 'decision', vo.decision, 'updated_at', vo.updated_at,'proposal_id',vo.proposal_id,'proposal_sequence',(select sequence from public.team_draw_room_proposals where id=vo.proposal_id)
  ) order by p.name), '[]'::jsonb) into v_voters
  from public.workspace_members wm
  join public.tournament_players tp on tp.tournament_id=v_t.id and tp.player_id=wm.linked_player_id
  join public.players p on p.id=wm.linked_player_id
  left join private.latest_room_votes_v4465(v_t.id) vo on vo.user_id=wm.user_id
  where wm.workspace_id=v_t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)
    and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist';
  return jsonb_build_object(
    'tournament_id', v_t.id, 'tournament_name', v_t.name, 'status', v_t.team_review_status,
    'deadline', v_t.team_review_deadline, 'can_admin', v_admin, 'can_vote', v_eligible,
    'first_draw_pending', v_t.draw_room_first_enabled and v_current is null,
    'my_final_choice',(select jsonb_build_object('proposal_id',v.proposal_id,'decision',v.decision,'sequence',p.sequence) from private.latest_room_votes_v4465(v_t.id) v join public.team_draw_room_proposals p on p.id=v.proposal_id where v.user_id=auth.uid()),
    'current_proposal_id', v_current, 'max_redraws', v_t.max_team_redraws,
    'redraws_used', v_t.team_redraws_used, 'proposals', v_proposals, 'voter_count',jsonb_array_length(v_voters), 'voters', case when v_admin then v_voters else '[]'::jsonb end
  );
end;
$function$;
