-- Private, reversible proposal room for tournament team draws.
create table if not exists public.team_draw_room_proposals (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  sequence integer not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  is_current boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, sequence)
);

create unique index if not exists team_draw_room_one_current
  on public.team_draw_room_proposals(tournament_id) where is_current;

create table if not exists public.team_draw_room_votes (
  proposal_id uuid not null references public.team_draw_room_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('keep','redraw')),
  updated_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

alter table public.team_draw_room_proposals enable row level security;
alter table public.team_draw_room_votes enable row level security;
revoke all on public.team_draw_room_proposals, public.team_draw_room_votes from anon, authenticated;

create or replace function public.team_draw_room_capture_current_v1(p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_id uuid;
  v_sequence integer;
begin
  select jsonb_build_object(
    'teams', coalesce(jsonb_agg(jsonb_build_object(
      'name', tm.name,
      'color', tm.color,
      'is_preformed', coalesce(tm.is_preformed, false),
      'players', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
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
$$;

-- Forward declaration so the opener can return the fully assembled state.
create or replace function public.team_draw_room_state_v1(p_tournament_id uuid)
returns jsonb
language sql
security definer
set search_path = public, private, pg_temp
as $$ select '{}'::jsonb; $$;

create or replace function public.team_draw_room_open_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_t public.tournaments%rowtype;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut ouvrir le salon'; end if;
  if v_t.status = 'finished' or v_t.format = 'league' then raise exception 'Salon indisponible pour ce tournoi'; end if;
  if not coalesce(v_t.team_review_requested, false) or v_t.team_review_status not in ('pending','redraw_requested') then
    raise exception 'Le salon est disponible uniquement pendant la validation du tirage';
  end if;
  if not exists(select 1 from public.team_draw_room_proposals where tournament_id=v_t.id and is_current) then
    perform public.team_draw_room_capture_current_v1(v_t.id);
  end if;
  return public.team_draw_room_state_v1(v_t.id);
end;
$$;

create or replace function public.team_draw_room_state_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
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
    'current_proposal_id', v_current, 'max_redraws', v_t.max_team_redraws,
    'redraws_used', v_t.team_redraws_used, 'proposals', v_proposals, 'voters', v_voters
  );
end;
$$;

create or replace function public.team_draw_room_vote_v1(p_tournament_id uuid, p_proposal_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
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
  insert into public.team_draw_room_votes(proposal_id,user_id,decision,updated_at) values(p_proposal_id,auth.uid(),p_decision,now())
  on conflict(proposal_id,user_id) do update set decision=excluded.decision,updated_at=excluded.updated_at;
  return public.team_draw_room_state_v1(v_t.id);
end;
$$;

create or replace function public.team_draw_room_redraw_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_t public.tournaments%rowtype; v_result jsonb;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut lancer un nouveau tirage'; end if;
  if v_t.team_review_status not in ('pending','redraw_requested') then raise exception 'Le salon est fermé'; end if;
  if exists(select 1 from public.matches where tournament_id=v_t.id) then raise exception 'Impossible de refaire le tirage après la création des matchs'; end if;
  if coalesce(v_t.team_redraws_used,0) >= coalesce(v_t.max_team_redraws,0) then raise exception 'Limite de nouveaux tirages atteinte'; end if;
  select public.generate_swe_tournament_teams(v_t.id) into v_result;
  update public.tournaments set team_review_status='pending',team_review_started_at=now(),
    team_review_deadline=now()+make_interval(mins=>coalesce(v_t.team_review_duration_minutes,30)),
    team_redraws_used=coalesce(v_t.team_redraws_used,0)+1 where id=v_t.id;
  delete from public.tournament_team_reviews where tournament_id=v_t.id;
  perform public.team_draw_room_capture_current_v1(v_t.id);
  return public.team_draw_room_state_v1(v_t.id);
end;
$$;

create or replace function public.team_draw_room_publish_v1(p_tournament_id uuid, p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare v_t public.tournaments%rowtype; v_snapshot jsonb; v_team record; v_player record; v_team_id uuid;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Seul l’administrateur peut publier la composition'; end if;
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
$$;

revoke all on function public.team_draw_room_capture_current_v1(uuid) from public, anon, authenticated;
revoke all on function public.team_draw_room_open_v1(uuid) from public, anon;
revoke all on function public.team_draw_room_state_v1(uuid) from public, anon;
revoke all on function public.team_draw_room_vote_v1(uuid,uuid,text) from public, anon;
revoke all on function public.team_draw_room_redraw_v1(uuid) from public, anon;
revoke all on function public.team_draw_room_publish_v1(uuid,uuid) from public, anon;
grant execute on function public.team_draw_room_open_v1(uuid) to authenticated;
grant execute on function public.team_draw_room_state_v1(uuid) to authenticated;
grant execute on function public.team_draw_room_vote_v1(uuid,uuid,text) to authenticated;
grant execute on function public.team_draw_room_redraw_v1(uuid) to authenticated;
grant execute on function public.team_draw_room_publish_v1(uuid,uuid) to authenticated;
