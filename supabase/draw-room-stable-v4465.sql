create or replace function private.is_locked_team_player_v4465(p_team_id uuid,p_player_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
select exists(select 1 from public.teams tm join public.players p on p.id=p_player_id where tm.id=p_team_id and tm.is_preformed and (
p.id=tm.created_by_player_id or p.guest_of_player_id=tm.created_by_player_id or exists(select 1 from public.team_player_invitations i where i.team_id=tm.id and i.player_id=p.id and i.status='accepted')));
$$;
revoke all on function private.is_locked_team_player_v4465(uuid,uuid) from public;
create or replace function private.latest_room_votes_v4465(p_tournament_id uuid)
returns table(user_id uuid,proposal_id uuid,decision text,updated_at timestamptz)
language sql stable security invoker set search_path='' as $$
select distinct on (v.user_id) v.user_id,v.proposal_id,v.decision,v.updated_at
from public.team_draw_room_votes v join public.team_draw_room_proposals p on p.id=v.proposal_id
where p.tournament_id=p_tournament_id order by v.user_id,v.updated_at desc,p.sequence desc;
$$;
revoke all on function private.latest_room_votes_v4465(uuid) from public;
CREATE OR REPLACE FUNCTION public.generate_swe_tournament_teams(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  t public.tournaments%rowtype; v_can boolean; v_count integer; v_team_count integer; v_preformed_count integer; v_core_limit integer; v_pitch_count integer; v_sub_count integer; v_per integer;
  v_team_ids uuid[]:='{}'::uuid[]; v_names text[]:=array['Noirs','Bleus','Blancs','Rouges','Verts','Jaunes','Oranges','Violets']; v_colors text[]:=array['#111827','#2563eb','#f8fafc','#dc2626','#16a34a','#eab308','#f97316','#7c3aed'];
  v_team_id uuid; v_rec record; v_i integer:=0; v_idx integer; v_pitch_ids uuid[]; v_name text; v_roster_count integer; v_scores jsonb;
begin
  select * into t from public.tournaments where id=p_tournament_id and status<>'finished' for update;
  if not found then raise exception 'Tournoi indisponible'; end if;
  if t.draw_room_first_enabled and current_setting('swe.draw_room_tournament',true) is distinct from t.id::text then raise exception 'Ouvre le salon pour lancer le tirage'; end if;
  if t.format='league' then raise exception 'Cette génération automatique est réservée aux tournois'; end if;
  v_can:=private.is_workspace_admin(t.workspace_id) or private.coorganizer_has_permission(t.workspace_id,'generate_teams');
  if not v_can then raise exception 'Autorisation refusée pour générer les équipes'; end if;
  v_per:=greatest(2,least(11,coalesce(t.team_size,5)));
  select count(*) into v_count from public.tournament_players where tournament_id=t.id and present=true and coalesce(registration_status,'confirmed')<>'waitlist';
  if v_count<(v_per*2) then raise exception 'Il faut au moins % joueurs confirmés pour créer 2 équipes de %',v_per*2,v_per; end if;
  if v_count>coalesce(t.max_players,100) then raise exception 'Le nombre de joueurs dépasse la capacité du tournoi'; end if;
  v_team_count:=floor(v_count::numeric/v_per)::integer;
  v_core_limit:=v_team_count*v_per;
  v_sub_count:=greatest(0,v_count-v_core_limit);
  if v_team_count<=3 then v_pitch_count:=1; elsif v_team_count<=5 then v_pitch_count:=2; else v_pitch_count:=3; end if;
  delete from public.matches where tournament_id=t.id;
  update public.team_player_invitations set status='expired',responded_at=now() where tournament_id=t.id and status='pending';
  for v_rec in select id,created_by_player_id from public.teams where tournament_id=t.id and is_preformed=true order by created_at,id loop
    select count(*) into v_roster_count from public.team_players where team_id=v_rec.id;
    if v_roster_count>v_per then raise exception 'Une équipe préinscrite contient plus de % joueurs',v_per; end if;
      delete from public.team_players tp using public.players p
      where tp.team_id=v_rec.id and p.id=tp.player_id
        and tp.player_id<>coalesce(v_rec.created_by_player_id,'00000000-0000-0000-0000-000000000000'::uuid)
        and not exists(select 1 from public.team_player_invitations i where i.tournament_id=t.id and i.team_id=v_rec.id and i.player_id=tp.player_id and i.status='accepted')
        and not exists(select 1 from public.players creator where creator.id=v_rec.created_by_player_id and p.guest_of_player_id=creator.id);
  end loop;
  delete from public.teams where tournament_id=t.id and coalesce(is_preformed,false)=false;
  select count(*) into v_preformed_count from public.teams where tournament_id=t.id and is_preformed=true;
  if v_preformed_count>v_team_count then raise exception 'Il faut au moins % joueurs pour conserver et compléter les % équipes déjà inscrites',v_preformed_count*v_per,v_preformed_count; end if;
  update public.tournament_players set is_substitute=false where tournament_id=t.id;
  if v_sub_count>0 then
    update public.tournament_players tp set is_substitute=true
    where tp.tournament_id=t.id and tp.player_id in (
      select x.player_id from public.tournament_players x
      where x.tournament_id=t.id and x.present=true and coalesce(x.registration_status,'confirmed')<>'waitlist'
        and not exists(select 1 from public.team_players z join public.teams tm on tm.id=z.team_id where tm.tournament_id=t.id and z.player_id=x.player_id)
      order by x.registered_at desc nulls last,x.player_id limit v_sub_count
    );
  end if;
  v_i:=0;
  while v_i<(v_team_count-v_preformed_count) loop
    v_idx:=1;
    loop
      v_name:=coalesce(v_names[v_idx],'Équipe '||(v_i+1));
      exit when not exists(select 1 from public.teams where tournament_id=t.id and lower(name)=lower(v_name));
      v_idx:=v_idx+1;
      if v_idx>array_length(v_names,1) then v_name:='Équipe auto '||(v_i+1); exit; end if;
    end loop;
    insert into public.teams(tournament_id,name,color,is_preformed) values(t.id,v_name,v_colors[(v_i % array_length(v_colors,1))+1],false) returning id into v_team_id;
    v_team_ids:=array_append(v_team_ids,v_team_id); v_i:=v_i+1;
  end loop;
  for v_rec in
    select tp.player_id,public.get_effective_player_rating(tp.player_id) skill_level,random() rnd
    from public.tournament_players tp join public.players p on p.id=tp.player_id
    where tp.tournament_id=t.id and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist' and coalesce(tp.is_substitute,false)=false
      and not exists(select 1 from public.team_players z join public.teams tm on tm.id=z.team_id where tm.tournament_id=t.id and z.player_id=tp.player_id)
    order by public.get_effective_player_rating(tp.player_id) desc,rnd
  loop
    select tm.id into v_team_id from public.teams tm where tm.tournament_id=t.id and (select count(*) from public.team_players z where z.team_id=tm.id)<v_per
    order by (select coalesce(sum(case when p2.is_group_member=false then 2.5 else coalesce(z2.rating_at_join,public.get_effective_player_rating(p2.id)) end),0) from public.team_players z2 join public.players p2 on p2.id=z2.player_id where z2.team_id=tm.id) asc,
      (select count(*) from public.team_players z3 where z3.team_id=tm.id) asc,random() limit 1;
    if v_team_id is null then exit; end if;
    insert into public.team_players(team_id,player_id) values(v_team_id,v_rec.player_id); v_team_id:=null;
  end loop;
  if t.complex_id is not null then
    select coalesce(array_agg(id order by sort_order,name),'{}'::uuid[]) into v_pitch_ids from (select id,sort_order,name from public.sports_pitches where complex_id=t.complex_id and active=true order by sort_order,name limit v_pitch_count)s;
  else v_pitch_ids:=coalesce(t.reserved_pitch_ids,'{}'::uuid[]); end if;
  update public.tournaments set generated_team_count=v_team_count,recommended_pitch_count=v_pitch_count,reserved_pitch_ids=case when coalesce(array_length(v_pitch_ids,1),0)>0 then v_pitch_ids else reserved_pitch_ids end,match_duration_minutes=10,odd_team_rotation_rule=(v_team_count%2=1) where id=t.id;
  select coalesce(jsonb_agg(jsonb_build_object('team_id',q.id,'team_name',q.name,'player_count',q.player_count,'score',q.score,'mention',q.mention) order by q.created_at),'[]'::jsonb) into v_scores
  from (select tm.id,tm.name,tm.created_at,count(tp.player_id)::integer player_count,round(coalesce(avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end),0),2) score,
    case when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=4.25 then 'Excellent' when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=3.50 then 'Très solide' when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.75 then 'Solide' when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.00 then 'Équilibrée' else 'À renforcer' end mention
    from public.teams tm left join public.team_players tp on tp.team_id=tm.id left join public.players p on p.id=tp.player_id where tm.tournament_id=t.id group by tm.id,tm.name,tm.created_at)q;
  return jsonb_build_object('team_count',v_team_count,'player_count',v_count,'team_size',v_per,'core_player_count',v_core_limit,'substitute_count',v_sub_count,'pitch_count',v_pitch_count,'preformed_team_count',v_preformed_count,'odd_team_rule',(v_team_count%2=1),'match_duration_minutes',10,'team_scores',v_scores);
end $function$;
CREATE OR REPLACE FUNCTION public.get_effective_player_rating(p_player_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  select case when (select p.is_group_member=false from public.players p where p.id=p_player_id) then 2.5::numeric else coalesce(private.swe_effective_player_rating_v4400(p_player_id),
                  (select p.skill_level::numeric from public.players p where p.id=p_player_id),2::numeric) end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_capture_current_v1(p_tournament_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_snapshot jsonb;
  v_id uuid;
  v_sequence integer;
begin
  select jsonb_build_object(
    'teams', coalesce(jsonb_agg(jsonb_build_object(
      'team_id',tm.id,
      'average_rating',(select round(avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end),2) from public.team_players tp join public.players p on p.id=tp.player_id where tp.team_id=tm.id),
      'name', tm.name,
      'color', tm.color,
      'is_preformed', coalesce(tm.is_preformed, false),
      'players', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name,'balancing_rating',case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end,'rating_is_estimate',p.is_group_member=false,'locked',private.is_locked_team_player_v4465(tm.id,p.id)) order by p.name)
        from public.team_players tp
        join public.players p on p.id = tp.player_id
        where tp.team_id = tm.id
      ), '[]'::jsonb)
    ) order by tm.created_at, tm.id), '[]'::jsonb),
    'substitute_player_ids', coalesce((
      select jsonb_agg(tp.player_id order by tp.player_id)
      from public.tournament_players tp
      where tp.tournament_id = p_tournament_id and coalesce(tp.is_substitute, false)
    ), '[]'::jsonb)
  ) into v_snapshot
  from public.teams tm
  where tm.tournament_id = p_tournament_id;

  if jsonb_array_length(coalesce(v_snapshot->'teams','[]'::jsonb)) = 0 then
    raise exception 'Aucune composition à proposer';
  end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.team_draw_room_proposals where tournament_id = p_tournament_id;
  update public.team_draw_room_proposals set is_current = false where tournament_id = p_tournament_id and is_current;
  insert into public.team_draw_room_proposals(tournament_id, sequence, snapshot, created_by, is_current)
  values(p_tournament_id, v_sequence, v_snapshot, auth.uid(), true)
  returning id into v_id;
  return v_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_publish_v1(p_tournament_id uuid, p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype; v_snapshot jsonb; v_team record; v_player record; v_team_id uuid;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut publier la composition'; end if;
  if v_t.status='finished' or v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon est fermé'; end if;
  if exists(select 1 from public.matches where tournament_id=v_t.id) then raise exception 'Impossible de modifier les équipes après la création des matchs'; end if;
  select snapshot into v_snapshot from public.team_draw_room_proposals where id=p_proposal_id and tournament_id=v_t.id;
  if v_snapshot is null then raise exception 'Proposition introuvable'; end if;
  if not exists(select 1 from public.team_draw_room_proposals where id=p_proposal_id and is_current) then
    delete from public.team_players tp using public.teams tm where tm.id=tp.team_id and tm.tournament_id=v_t.id and tm.is_preformed and not private.is_locked_team_player_v4465(tp.team_id,tp.player_id);
    delete from public.teams where tournament_id=v_t.id and coalesce(is_preformed,false)=false;
    for v_team in select * from jsonb_to_recordset(coalesce(v_snapshot->'teams','[]'::jsonb)) as x(team_id uuid,name text,color text,is_preformed boolean,players jsonb) loop
      if coalesce(v_team.is_preformed,false) then
        select id into v_team_id from public.teams where tournament_id=v_t.id and is_preformed and (id=v_team.team_id or (v_team.team_id is null and name=v_team.name)) limit 1;
        if v_team_id is null then raise exception 'Équipe préconstituée modifiée : relance le tirage'; end if;
        if exists(select 1 from public.team_players tp where tp.team_id=v_team_id and private.is_locked_team_player_v4465(tp.team_id,tp.player_id) and not exists(select 1 from jsonb_array_elements(v_team.players) p where p->>'id'=tp.player_id::text)) then raise exception 'Les membres confirmés ont changé : relance le tirage'; end if;
        delete from public.team_players where team_id=v_team_id and not private.is_locked_team_player_v4465(team_id,player_id);
      else
      insert into public.teams(tournament_id,name,color,is_preformed) values(v_t.id,coalesce(v_team.name,'Équipe'),v_team.color,false) returning id into v_team_id;
      end if;
      for v_player in select * from jsonb_to_recordset(coalesce(v_team.players,'[]'::jsonb)) as y(id uuid,name text) loop
        if exists(select 1 from public.tournament_players tp where tp.tournament_id=v_t.id and tp.player_id=v_player.id and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist') then
          insert into public.team_players(team_id,player_id) values(v_team_id,v_player.id) on conflict do nothing;
        end if;
      end loop;
    end loop;
    update public.tournament_players set is_substitute=false where tournament_id=v_t.id;
    update public.tournament_players set is_substitute=true where tournament_id=v_t.id and player_id in (
      select value::uuid from jsonb_array_elements_text(coalesce(v_snapshot->'substitute_player_ids','[]'::jsonb)) value
    );
  end if;
  update public.team_draw_room_proposals set is_current=false where tournament_id=v_t.id and is_current;
  update public.team_draw_room_proposals set is_current=true,published_at=now() where tournament_id=v_t.id and id=p_proposal_id;
  update public.tournaments set team_review_status='approved',team_review_deadline=null where id=v_t.id;
  return jsonb_build_object('published',true,'proposal_id',p_proposal_id);
end;
$function$;
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
CREATE OR REPLACE FUNCTION public.team_draw_room_vote_v1(p_tournament_id uuid, p_proposal_id uuid, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype; v_ok boolean := false;
begin
  if p_decision not in ('keep','redraw') then raise exception 'Avis invalide'; end if;
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found or v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon est fermé'; end if;
  select exists(
    select 1 from public.workspace_members wm join public.tournament_players tp on tp.tournament_id=v_t.id and tp.player_id=wm.linked_player_id
    where wm.workspace_id=v_t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true)
      and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist'
  ) into v_ok;
  if not v_ok then raise exception 'Avis réservé aux co-gestionnaires inscrits à ce tournoi'; end if;
  if not exists(select 1 from public.team_draw_room_proposals where id=p_proposal_id and tournament_id=v_t.id) then raise exception 'Proposition introuvable'; end if;
  -- One final selection per voter and tournament; the tournament lock serializes clicks.
  delete from public.team_draw_room_votes v using public.team_draw_room_proposals p
  where v.proposal_id=p.id and p.tournament_id=v_t.id and v.user_id=auth.uid() and v.proposal_id<>p_proposal_id;
  insert into public.team_draw_room_votes(proposal_id,user_id,decision,updated_at) values(p_proposal_id,auth.uid(),p_decision,now())
  on conflict(proposal_id,user_id) do update set decision=excluded.decision,updated_at=excluded.updated_at;
  return public.team_draw_room_state_v1(v_t.id);
end;
$function$;
CREATE OR REPLACE FUNCTION public.get_public_workspace_snapshot_v2(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_base jsonb; v_workspace_id uuid; v_third boolean; v_top boolean; v_match boolean; v_review boolean; r record;
begin
  v_base:=public.get_public_workspace_snapshot(p_token);
  if v_base is null then return null; end if;
  select w.id into v_workspace_id from public.workspaces w where w.public_token=p_token and w.public_enabled=true;
  select coalesce(e.third_half_enabled,false),coalesce(e.top_player_enabled,false),coalesce(e.match_ratings_enabled,false)
    into v_third,v_top,v_match from public.workspace_entitlements e where e.workspace_id=v_workspace_id;
  v_third:=coalesce(v_third,false);v_top:=coalesce(v_top,false);v_match:=coalesce(v_match,false);
  v_review:=public.team_review_entitled(v_workspace_id);

  if v_review then
    for r in select id from public.tournaments where workspace_id=v_workspace_id and team_review_status='pending' loop
      perform public.finalize_tournament_team_review(r.id);
    end loop;
  end if;

  v_base:=jsonb_set(v_base,'{teams}',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at)
    from (
      select tm.*,round(coalesce(avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end),0),2) team_score,
        case when count(tp.player_id)=0 then 'À composer'
          when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=4.25 then 'Excellent'
          when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=3.50 then 'Très solide'
          when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.75 then 'Solide'
          when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.00 then 'Équilibrée' else 'À renforcer' end mention,
        nullif(private.team_coorganizer_rating_summary(tm.id)->>'score','')::numeric coorg_team_score,
        coalesce((private.team_coorganizer_rating_summary(tm.id)->>'rating_count')::bigint,0) coorg_rating_count
      from public.teams tm
      join public.tournaments t on t.id=tm.tournament_id
      left join public.team_players tp on tp.team_id=tm.id
      left join public.players p on p.id=tp.player_id
      where t.workspace_id=v_workspace_id
        and (coalesce(tm.is_preformed,false)=true or not v_review or coalesce(t.generated_team_count,0)=0 or t.team_review_status='approved')
      group by tm.id
    ) x
  ),'[]'::jsonb),true);

  v_base:=jsonb_set(v_base,'{team_players}',coalesce((
    select jsonb_agg(to_jsonb(tp)-'rating_at_join')
    from public.team_players tp
    join public.teams tm on tm.id=tp.team_id
    join public.tournaments t on t.id=tm.tournament_id
    where t.workspace_id=v_workspace_id
      and (coalesce(tm.is_preformed,false)=true or not v_review or coalesce(t.generated_team_count,0)=0 or t.team_review_status='approved')
  ),'[]'::jsonb),true);

  v_base:=jsonb_set(v_base,'{team_review_states}',coalesce((
    select jsonb_agg(jsonb_build_object('tournament_id',t.id,'status',t.team_review_status,'deadline',t.team_review_deadline))
    from public.tournaments t where t.workspace_id=v_workspace_id
  ),'[]'::jsonb),true);

  return jsonb_set(
    jsonb_set(v_base,'{features}',coalesce(v_base->'features','{}'::jsonb)||jsonb_build_object(
      'third_half_enabled',v_third,'top_player_enabled',v_top,'match_ratings_enabled',v_match,'team_review_enabled',v_review
    ),true),
    '{workspace}',coalesce(v_base->'workspace','{}'::jsonb)||jsonb_build_object('third_half_enabled',v_third,'top_player_enabled',v_top),true
  );
end $function$;
CREATE OR REPLACE FUNCTION public.get_tournament_team_balance_scores(p_tournament_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, player_count integer, team_score numeric, mention text, locked_players integer, free_slots integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Compétition introuvable'; end if;
  if not private.is_workspace_member(v_workspace) then raise exception 'Accès refusé'; end if;
  return query
  select tm.id,tm.name::text,count(tp.player_id)::integer,
         round(coalesce(avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end),0),2),
         case when count(tp.player_id)=0 then 'À composer'
           when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=4.25 then 'Excellent'
           when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=3.50 then 'Très solide'
           when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.75 then 'Solide'
           when avg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end)>=2.00 then 'Équilibrée' else 'À renforcer' end::text,
         count(tp.player_id) filter(where tp.player_id=tm.created_by_player_id or exists(select 1 from public.team_player_invitations i where i.tournament_id=p_tournament_id and i.team_id=tm.id and i.player_id=tp.player_id and i.status='accepted') or exists(select 1 from public.players creator where creator.id=tm.created_by_player_id and p.guest_of_player_id=creator.id))::integer,
         greatest(0,5-count(tp.player_id))::integer
  from public.teams tm left join public.team_players tp on tp.team_id=tm.id left join public.players p on p.id=tp.player_id
  where tm.tournament_id=p_tournament_id group by tm.id,tm.name order by tm.created_at,tm.id;
end $function$;
CREATE OR REPLACE FUNCTION private.read_public_registration_rating(p_token uuid, p_tournament_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_workspace uuid; v_name text; v_rating numeric; v_progress jsonb; v_saved numeric;
begin
 select w.id,w.rating_group_name into v_workspace,v_name from public.workspaces w
 join public.tournaments t on t.workspace_id=w.id and t.id=p_tournament_id
 where w.public_token=p_token and w.public_enabled=true;
 if v_workspace is null or not exists(select 1 from public.players p where p.id=p_player_id and p.workspace_id=v_workspace
   and (coalesce(p.is_group_member,true) or exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p.id))) then
   return null;
 end if;
 if exists(select 1 from public.players where id=p_player_id and is_group_member=false) then
   return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',null,'rating_is_estimate',true,'balancing_estimate',2.5);
 end if;
 v_progress:=private.player_rating_breakdown_v4462(p_player_id);
 select tp.rating_at_join into v_saved from public.team_players tp join public.teams tm on tm.id=tp.team_id where tm.tournament_id=p_tournament_id and tp.player_id=p_player_id limit 1;
 v_rating:=coalesce(v_saved,(v_progress->>'avg_rating')::numeric);
 return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',v_rating,'rating_delta',case when v_saved is null then (v_progress->>'rating_delta')::numeric else null end,'base_rating',v_progress->'base_rating','pending_delta',v_progress->'pending_delta','has_pending',v_progress->'has_pending','rating_frozen',v_saved is not null,'is_coorganizer',exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.linked_player_id=p_player_id and wm.active and wm.role='coorganizer'));
end $function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_open_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut ouvrir le salon'; end if;
  if v_t.status = 'finished' or v_t.format = 'league' then raise exception 'Salon indisponible pour ce tournoi'; end if;
  if v_t.draw_room_first_enabled then
    if v_t.team_review_status='approved' and exists(select 1 from public.team_draw_room_proposals where tournament_id=v_t.id and published_at is not null) then raise exception 'Cette composition est déjà publiée'; end if;
    update public.tournaments set team_review_requested=true,team_review_status='pending' where id=v_t.id and (not team_review_requested or team_review_status not in ('pending','redraw_requested'));
    return public.team_draw_room_state_v1(v_t.id);
  end if;
  if not coalesce(v_t.team_review_requested, false) or v_t.team_review_status not in ('pending','redraw_requested') then
    raise exception 'Le salon est disponible uniquement pendant la validation du tirage';
  end if;
  if not exists(select 1 from public.team_draw_room_proposals where tournament_id=v_t.id and is_current) then
    perform public.team_draw_room_capture_current_v1(v_t.id);
  end if;
  return public.team_draw_room_state_v1(v_t.id);
end;
$function$;
