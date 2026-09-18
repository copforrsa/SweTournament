alter table public.tournaments add column if not exists draw_room_first_enabled boolean not null default false;
CREATE OR REPLACE FUNCTION public.team_draw_room_capture_on_review_start_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if not new.draw_room_first_enabled and new.team_review_status='pending' and coalesce(new.team_review_requested,false)
     and exists(select 1 from public.teams tm where tm.tournament_id=new.id)
     and not exists(select 1 from public.team_draw_room_proposals pr where pr.tournament_id=new.id and pr.is_current) then
    perform public.team_draw_room_capture_current_v1(new.id);
  end if;
  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_join_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
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
  if not v_t.draw_room_first_enabled and exists(select 1 from public.teams tm where tm.tournament_id=v_t.id)
     and not exists(select 1 from public.team_draw_room_proposals pr where pr.tournament_id=v_t.id and pr.is_current) then
    perform public.team_draw_room_capture_current_v1(v_t.id);
  end if;
  return public.team_draw_room_state_v1(v_t.id);
end;
$function$;
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
    update public.tournaments set team_review_requested=true,team_review_status='pending' where id=v_t.id;
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
    delete from public.teams where tournament_id=v_t.id and coalesce(is_preformed,false)=false;
    for v_team in select * from jsonb_to_recordset(coalesce(v_snapshot->'teams','[]'::jsonb)) as x(name text,color text,is_preformed boolean,players jsonb) loop
      if coalesce(v_team.is_preformed,false) then continue; end if;
      insert into public.teams(tournament_id,name,color,is_preformed) values(v_t.id,coalesce(v_team.name,'Équipe'),v_team.color,false) returning id into v_team_id;
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
  update public.team_draw_room_proposals set is_current=(id=p_proposal_id),published_at=case when id=p_proposal_id then now() else published_at end where tournament_id=v_t.id;
  update public.tournaments set team_review_status='approved',team_review_deadline=null where id=v_t.id;
  return jsonb_build_object('published',true,'proposal_id',p_proposal_id);
end;
$function$;
CREATE OR REPLACE FUNCTION public.team_draw_room_redraw_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_t public.tournaments%rowtype; v_result jsonb; v_first boolean;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut lancer un nouveau tirage'; end if;
  if v_t.status='finished' then raise exception 'Tournoi terminé'; end if;
  v_first:=not exists(select 1 from public.team_draw_room_proposals where tournament_id=v_t.id);
  if v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon est fermé'; end if;
  if exists(select 1 from public.matches where tournament_id=v_t.id) then raise exception 'Impossible de refaire le tirage après la création des matchs'; end if;
  if not v_first and coalesce(v_t.team_redraws_used,0) >= coalesce(v_t.max_team_redraws,0) then raise exception 'Limite de nouveaux tirages atteinte'; end if;
  perform set_config('swe.draw_room_tournament',v_t.id::text,true);
  select public.generate_swe_tournament_teams(v_t.id) into v_result;
  update public.tournaments set team_review_status='pending',team_review_started_at=now(),
    team_review_deadline=now()+make_interval(mins=>coalesce(v_t.team_review_duration_minutes,30)),
    team_redraws_used=coalesce(v_t.team_redraws_used,0)+case when v_first then 0 else 1 end where id=v_t.id;
  delete from public.tournament_team_reviews where tournament_id=v_t.id;
  perform public.team_draw_room_capture_current_v1(v_t.id);
  return public.team_draw_room_state_v1(v_t.id);
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
    'keep_votes', (select count(*) from public.team_draw_room_votes vo where vo.proposal_id=pr.id and vo.decision='keep'),
    'redraw_votes', (select count(*) from public.team_draw_room_votes vo where vo.proposal_id=pr.id and vo.decision='redraw')
  ) order by pr.sequence desc), '[]'::jsonb) into v_proposals
  from public.team_draw_room_proposals pr where pr.tournament_id=v_t.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.name, 'decision', vo.decision, 'updated_at', vo.updated_at
  ) order by p.name), '[]'::jsonb) into v_voters
  from public.workspace_members wm
  join public.tournament_players tp on tp.tournament_id=v_t.id and tp.player_id=wm.linked_player_id
  join public.players p on p.id=wm.linked_player_id
  left join public.team_draw_room_votes vo on vo.proposal_id=v_current and vo.user_id=wm.user_id
  where wm.workspace_id=v_t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)
    and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist';
  return jsonb_build_object(
    'tournament_id', v_t.id, 'tournament_name', v_t.name, 'status', v_t.team_review_status,
    'deadline', v_t.team_review_deadline, 'can_admin', v_admin, 'can_vote', v_eligible,
    'first_draw_pending', v_t.draw_room_first_enabled and v_current is null,
    'current_proposal_id', v_current, 'max_redraws', v_t.max_team_redraws,
    'redraws_used', v_t.team_redraws_used, 'proposals', v_proposals, 'voters', v_voters
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.finalize_tournament_team_review(p_tournament_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  t public.tournaments%rowtype;
  v_eligible integer:=0;
  v_validate integer:=0;
  v_redraw integer:=0;
  v_voted integer:=0;
  v_status text;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then return null; end if;
  if t.draw_room_first_enabled then return t.team_review_status; end if;
  if t.team_review_status<>'pending' then return t.team_review_status; end if;

  select count(*) into v_eligible
  from public.workspace_members wm
  join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id
  where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true
    and wm.linked_player_id is not null and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist';

  select count(*) filter(where r.decision='validate'),
         count(*) filter(where r.decision='redraw'),
         count(*)
    into v_validate,v_redraw,v_voted
  from public.tournament_team_reviews r
  join public.workspace_members wm on wm.user_id=r.user_id and wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true)=true
  join public.tournament_players tp on tp.tournament_id=t.id and tp.player_id=wm.linked_player_id and tp.present=true and coalesce(tp.registration_status,'confirmed')<>'waitlist'
  where r.tournament_id=t.id;

  if v_eligible=0 then
    v_status:='approved';
  elsif v_voted>=v_eligible or (t.team_review_deadline is not null and now()>=t.team_review_deadline) then
    if v_redraw>v_validate and coalesce(t.team_redraws_used,0)<coalesce(t.max_team_redraws,0) then v_status:='redraw_requested';
    else v_status:='approved'; end if;
  else
    v_status:='pending';
  end if;

  if v_status<>t.team_review_status then
    update public.tournaments set team_review_status=v_status where id=t.id;
  end if;
  return v_status;
end $function$;
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
    if v_roster_count<v_per then
      delete from public.team_players tp using public.players p
      where tp.team_id=v_rec.id and p.id=tp.player_id
        and tp.player_id<>coalesce(v_rec.created_by_player_id,'00000000-0000-0000-0000-000000000000'::uuid)
        and not exists(select 1 from public.team_player_invitations i where i.tournament_id=t.id and i.team_id=v_rec.id and i.player_id=tp.player_id and i.status='accepted')
        and not exists(select 1 from public.players creator where creator.id=v_rec.created_by_player_id and p.guest_of_player_id=creator.id);
    end if;
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
    order by (select coalesce(sum(coalesce(z2.rating_at_join,public.get_effective_player_rating(p2.id))),0) from public.team_players z2 join public.players p2 on p2.id=z2.player_id where z2.team_id=tm.id) asc,
      (select count(*) from public.team_players z3 where z3.team_id=tm.id) asc,random() limit 1;
    if v_team_id is null then exit; end if;
    insert into public.team_players(team_id,player_id) values(v_team_id,v_rec.player_id); v_team_id:=null;
  end loop;
  if t.complex_id is not null then
    select coalesce(array_agg(id order by sort_order,name),'{}'::uuid[]) into v_pitch_ids from (select id,sort_order,name from public.sports_pitches where complex_id=t.complex_id and active=true order by sort_order,name limit v_pitch_count)s;
  else v_pitch_ids:=coalesce(t.reserved_pitch_ids,'{}'::uuid[]); end if;
  update public.tournaments set generated_team_count=v_team_count,recommended_pitch_count=v_pitch_count,reserved_pitch_ids=case when coalesce(array_length(v_pitch_ids,1),0)>0 then v_pitch_ids else reserved_pitch_ids end,match_duration_minutes=10,odd_team_rotation_rule=(v_team_count%2=1) where id=t.id;
  select coalesce(jsonb_agg(jsonb_build_object('team_id',q.id,'team_name',q.name,'player_count',q.player_count,'score',q.score,'mention',q.mention) order by q.created_at),'[]'::jsonb) into v_scores
  from (select tm.id,tm.name,tm.created_at,count(tp.player_id)::integer player_count,round(coalesce(avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id))),0),2) score,
    case when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=4.25 then 'Excellent' when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=3.50 then 'Très solide' when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.75 then 'Solide' when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.00 then 'Équilibrée' else 'À renforcer' end mention
    from public.teams tm left join public.team_players tp on tp.team_id=tm.id left join public.players p on p.id=tp.player_id where tm.tournament_id=t.id group by tm.id,tm.name,tm.created_at)q;
  return jsonb_build_object('team_count',v_team_count,'player_count',v_count,'team_size',v_per,'core_player_count',v_core_limit,'substitute_count',v_sub_count,'pitch_count',v_pitch_count,'preformed_team_count',v_preformed_count,'odd_team_rule',(v_team_count%2=1),'match_duration_minutes',10,'team_scores',v_scores);
end $function$;
create table if not exists private.test_tournament_reset_backups(
 id uuid primary key default gen_random_uuid(),tournament_id uuid not null,saved_at timestamptz not null default now(),snapshot jsonb not null);
alter table private.test_tournament_reset_backups enable row level security;
revoke all on private.test_tournament_reset_backups from public,anon,authenticated;
