-- Additive Fast Conquête storage. Legacy formats pass through every guard unchanged.
alter table public.tournaments add column if not exists fast_team_mode text;
alter table public.tournaments drop constraint if exists tournaments_format_check;
alter table public.tournaments add constraint tournaments_format_check check(format in ('classic','king_of_pitch','league','conquest','fast_conquest'));
alter table public.tournaments add constraint tournaments_fast_team_mode_check check(format<>'fast_conquest' or fast_team_mode in ('admin','collaborative') and fast_team_mode is not null);
create table private.fast_conquest_sessions(
 tournament_id uuid primary key references public.tournaments(id) on delete cascade,
 state jsonb, version integer not null default 0, locked boolean not null default false,
 vote_open boolean not null default false, vote_revision integer not null default 0,
 proposal jsonb, notes_open boolean not null default false, notes_closed boolean not null default false
);
create table private.fast_conquest_evaluators(tournament_id uuid references public.tournaments(id) on delete cascade,user_id uuid references auth.users(id),primary key(tournament_id,user_id));
create table private.fast_conquest_votes(tournament_id uuid references public.tournaments(id) on delete cascade,user_id uuid references auth.users(id),revision integer not null,decision text not null check(decision in ('approve','modify','swap')),player_a uuid references public.players(id),player_b uuid references public.players(id),comment text not null default '' check(length(comment)<=1000),primary key(tournament_id,user_id,revision));
create table private.fast_conquest_notes(tournament_id uuid references public.tournaments(id) on delete cascade,user_id uuid references auth.users(id),player_id uuid references public.players(id),appreciation_code smallint not null check(appreciation_code between 1 and 6),comment text not null default '' check(length(comment)<=1000),updated_at timestamptz not null default now(),primary key(tournament_id,user_id,player_id));
create table private.fast_conquest_captains(tournament_id uuid references public.tournaments(id) on delete cascade,team_id uuid references public.teams(id) on delete cascade,user_id uuid references auth.users(id),primary key(tournament_id,team_id));
create table private.fast_conquest_confirmations(match_id uuid references public.matches(id) on delete cascade,team_id uuid references public.teams(id) on delete cascade,digest text not null,user_id uuid references auth.users(id),primary key(match_id,team_id));
create table private.fast_conquest_sub_refusals(tournament_id uuid references public.tournaments(id) on delete cascade,team_id uuid references public.teams(id) on delete cascade,player_id uuid references public.players(id),primary key(tournament_id,team_id,player_id));
do $$ declare r record; begin for r in select tablename from pg_tables where schemaname='private' and tablename like 'fast_conquest_%' loop execute format('alter table private.%I enable row level security',r.tablename); execute format('revoke all on private.%I from public,anon,authenticated',r.tablename); end loop; end $$;

create function private.fast_admin(w uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and (private.is_platform_super_admin() or private.is_workspace_operational_admin(w)) $$;
create function private.fast_designated(t uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from private.fast_conquest_evaluators e join public.tournaments x on x.id=e.tournament_id join public.workspace_members m on m.workspace_id=x.workspace_id and m.user_id=e.user_id where e.tournament_id=t and e.user_id=auth.uid() and m.active and m.role='coorganizer') $$;
create function private.fast_present(t uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.fast_designated(t) and exists(select 1 from public.tournament_players p join public.tournaments x on x.id=p.tournament_id join public.workspace_members m on m.workspace_id=x.workspace_id and m.linked_player_id=p.player_id where p.tournament_id=t and m.user_id=auth.uid() and p.present and p.registration_status<>'waitlist') $$;
create function private.fast_digest(m uuid) returns text language sql stable security definer set search_path='' as $$ select md5(jsonb_build_array(x.home_score,x.away_score,coalesce((select jsonb_agg(to_jsonb(g) order by g.id) from public.goals g where g.match_id=x.id),'[]'::jsonb))::text) from public.matches x where x.id=m $$;

create function public.fast_conquest_context(p_tournament_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype; a boolean; d boolean; c boolean; e boolean; begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest'; if not found then raise exception 'Fast Conquête introuvable'; end if;
 a:=private.fast_admin(t.workspace_id); d:=private.fast_designated(t.id);e:=private.swe_workspace_full_access(t.workspace_id);
 c:=exists(select 1 from private.fast_conquest_captains where tournament_id=t.id and user_id=auth.uid());
 if not (a or d or c) then raise exception 'Accès réservé aux gestionnaires désignés et capitaines'; end if;
 select * into s from private.fast_conquest_sessions where tournament_id=t.id;
 return jsonb_build_object('tournament',to_jsonb(t),'entitled',e,'admin',a,'can_score',e and (a or d and private.coorganizer_can_edit_tournament(t.id)),'can_note',e and private.fast_present(t.id),'version',coalesce(s.version,0),'state',s.state,'locked',coalesce(s.locked,false),'mode',t.fast_team_mode,'pitch_count',coalesce(cardinality(t.reserved_pitch_ids),0),'vote_open',coalesce(s.vote_open,false),'vote_revision',coalesce(s.vote_revision,0),'notes_open',coalesce(s.notes_open,false),'notes_closed',coalesce(s.notes_closed,false),
 'teams',coalesce((select jsonb_agg(id order by created_at,id) from public.teams where tournament_id=t.id),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('scoring_digest',private.fast_digest(m.id),'captains_confirmed',(select count(*)=2 from private.fast_conquest_confirmations f where f.match_id=m.id and f.digest=private.fast_digest(m.id)),'can_confirm',exists(select 1 from private.fast_conquest_captains k where k.tournament_id=t.id and k.user_id=auth.uid() and k.team_id in (m.home_team_id,m.away_team_id)))) from public.matches m where m.tournament_id=t.id),'[]'::jsonb),
 'evaluators',case when a or d then coalesce((select jsonb_agg(e.user_id) from private.fast_conquest_evaluators e where tournament_id=t.id),'[]'::jsonb) else '[]'::jsonb end,
 'votes',case when a or d then coalesce((select jsonb_agg(v) from private.fast_conquest_votes v where tournament_id=t.id and revision=s.vote_revision),'[]'::jsonb) else '[]'::jsonb end,
 'my_notes',case when d then coalesce((select jsonb_agg(n) from private.fast_conquest_notes n where tournament_id=t.id and user_id=auth.uid()),'[]'::jsonb) else '[]'::jsonb end,
 'note_summary',case when a then coalesce((select jsonb_agg(z) from (select player_id,count(*) voters,avg(appreciation_code) average,jsonb_agg(comment) filter(where comment<>'') observations from private.fast_conquest_notes where tournament_id=t.id group by player_id) z),'[]'::jsonb) else '[]'::jsonb end,
 'participants',coalesce((select jsonb_agg(z.player_id) from (select distinct a.player_id from public.match_player_assignments a join public.matches m on m.id=a.match_id where m.tournament_id=t.id and m.status='finished') z),'[]'::jsonb),
 'captain_candidates',coalesce((select jsonb_agg(jsonb_build_object('team_id',tp.team_id,'player_id',tp.player_id,'user_id',g.user_id)) from public.team_players tp join public.teams x on x.id=tp.team_id join public.players p on p.id=tp.player_id join public.global_player_profiles g on g.id=p.global_player_id where x.tournament_id=t.id and g.user_id is not null),'[]'::jsonb),
 'captains',coalesce((select jsonb_agg(k) from private.fast_conquest_captains k where tournament_id=t.id),'[]'::jsonb));
end $$;
revoke all on function public.fast_conquest_context(uuid) from public,anon; grant execute on function public.fast_conquest_context(uuid) to authenticated;

create function public.fast_conquest_manage(p_tournament_id uuid,p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype; a boolean; uid uuid; tid uuid; pid uuid; mid uuid; begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text,5100));
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update; if not found then raise exception 'Fast Conquête introuvable'; end if;
 if not private.swe_workspace_full_access(t.workspace_id) then raise exception 'Abonnement Organisateur actif requis'; end if;
 a:=private.fast_admin(t.workspace_id);
 if not (a or private.fast_designated(t.id) or p_action='confirm' and exists(select 1 from private.fast_conquest_captains where tournament_id=t.id and user_id=auth.uid())) then raise exception 'Accès refusé'; end if;
 insert into private.fast_conquest_sessions(tournament_id) values(t.id) on conflict do nothing;
 select * into s from private.fast_conquest_sessions where tournament_id=t.id for update;
 if p_action in ('designate','captain','open_vote','lock','unlock','close_notes','refuse_sub','apply_swap','close_vote') and not a then raise exception 'Action organisateur requise'; end if;
 if p_action='designate' then
  if s.locked or s.state is not null then raise exception 'Déverrouille les équipes avant de modifier les gestionnaires'; end if;
  for uid in select value::uuid from jsonb_array_elements_text(p_payload->'users') loop
   if not exists(select 1 from public.workspace_members where workspace_id=t.workspace_id and user_id=uid and active and role='coorganizer') then raise exception 'Co-gestionnaire actif du groupe requis'; end if;
  end loop;
  delete from private.fast_conquest_evaluators where tournament_id=t.id;
  insert into private.fast_conquest_evaluators select t.id,value::uuid from jsonb_array_elements_text(p_payload->'users');
 elsif p_action='captain' then
  tid:=(p_payload->>'teamId')::uuid; uid:=(p_payload->>'userId')::uuid;
  if not exists(select 1 from public.teams x join public.team_players tp on tp.team_id=x.id join public.players p on p.id=tp.player_id join public.global_player_profiles g on g.id=p.global_player_id where x.tournament_id=t.id and x.id=tid and g.user_id=uid) then raise exception 'Le capitaine doit être un joueur connecté de cette équipe'; end if;
  insert into private.fast_conquest_captains values(t.id,tid,uid) on conflict(tournament_id,team_id) do update set user_id=excluded.user_id;
  delete from private.fast_conquest_confirmations f using public.matches m where f.match_id=m.id and m.tournament_id=t.id and f.team_id=tid;
 elsif p_action='open_vote' then
  if s.locked or s.state is not null then raise exception 'Déverrouille les équipes avant le vote'; end if;
  if t.fast_team_mode<>'collaborative' then raise exception 'Mode collégial requis'; end if;
  if (select count(*) from public.teams where tournament_id=t.id)<>6 then raise exception 'Six équipes requises'; end if;
  update private.fast_conquest_sessions set vote_open=true,vote_revision=vote_revision+1,proposal=(select jsonb_agg(tp order by tp.team_id,tp.player_id) from public.team_players tp join public.teams x on x.id=tp.team_id where x.tournament_id=t.id) where tournament_id=t.id;
 elsif p_action='vote' then
  if not private.fast_designated(t.id) or not s.vote_open or s.locked then raise exception 'Vote fermé ou accès refusé'; end if;
  if p_payload->>'decision'='swap' then
   if p_payload->>'playerA'=p_payload->>'playerB' or not exists(select 1 from public.team_players x join public.team_players y on x.team_id<>y.team_id join public.teams a on a.id=x.team_id join public.teams b on b.id=y.team_id where a.tournament_id=t.id and b.tournament_id=t.id and x.player_id=(p_payload->>'playerA')::uuid and y.player_id=(p_payload->>'playerB')::uuid) then raise exception 'Deux joueurs de deux équipes différentes requis'; end if;
  end if;
  insert into private.fast_conquest_votes values(t.id,auth.uid(),s.vote_revision,p_payload->>'decision',(p_payload->>'playerA')::uuid,(p_payload->>'playerB')::uuid,coalesce(p_payload->>'comment','')) on conflict(tournament_id,user_id,revision) do update set decision=excluded.decision,player_a=excluded.player_a,player_b=excluded.player_b,comment=excluded.comment;
 elsif p_action='close_vote' then
  update private.fast_conquest_sessions set vote_open=false where tournament_id=t.id;
 elsif p_action='apply_swap' then
  if s.locked or s.state is not null then raise exception 'Déverrouille les équipes avant un échange'; end if;
  pid:=(p_payload->>'playerA')::uuid; uid:=(p_payload->>'playerB')::uuid;
  select x.team_id,y.team_id into tid,mid from public.team_players x join public.team_players y on x.team_id<>y.team_id join public.teams a on a.id=x.team_id join public.teams b on b.id=y.team_id where a.tournament_id=t.id and b.tournament_id=t.id and x.player_id=pid and y.player_id=uid;
  if not found then raise exception 'Échange invalide'; end if;
  update private.fast_conquest_sessions set vote_open=false where tournament_id=t.id;
  update public.team_players set team_id=case when player_id=pid then mid else tid end where player_id in (pid,uid) and team_id in (tid,mid);
 elsif p_action='lock' then
  if (select count(*) from public.teams where tournament_id=t.id)<>6 then raise exception 'Exactement six équipes sont requises'; end if;
  update private.fast_conquest_sessions set locked=true,vote_open=false where tournament_id=t.id;
 elsif p_action='unlock' then
  if s.state is not null then raise exception 'Les équipes ne peuvent plus changer après le lancement'; end if;
  update private.fast_conquest_sessions set locked=false,vote_open=false where tournament_id=t.id;
 elsif p_action='confirm' then
  mid:=(p_payload->>'matchId')::uuid;
  for tid in select k.team_id from private.fast_conquest_captains k join public.matches m on m.tournament_id=k.tournament_id and k.team_id in (m.home_team_id,m.away_team_id) where m.id=mid and m.tournament_id=t.id and k.user_id=auth.uid() and m.status<>'finished' and m.pitch is not null loop
   insert into private.fast_conquest_confirmations values(mid,tid,private.fast_digest(mid),auth.uid()) on conflict(match_id,team_id) do update set digest=excluded.digest,user_id=excluded.user_id;
  end loop;
  if not found then raise exception 'Validation réservée au capitaine de ce match'; end if;
 elsif p_action='note' then
  if not private.fast_present(t.id) or not s.notes_open or s.notes_closed then raise exception 'Notes fermées ou présence non validée'; end if;
  pid:=(p_payload->>'playerId')::uuid;
  if not exists(select 1 from public.match_player_assignments x join public.matches m on m.id=x.match_id where m.tournament_id=t.id and m.status='finished' and x.player_id=pid) then raise exception 'Seuls les joueurs ayant participé peuvent être notés'; end if;
  insert into private.fast_conquest_notes values(t.id,auth.uid(),pid,(p_payload->>'code')::smallint,coalesce(p_payload->>'comment',''),now()) on conflict(tournament_id,user_id,player_id) do update set appreciation_code=excluded.appreciation_code,comment=excluded.comment,updated_at=now();
 elsif p_action='close_notes' then
  if not s.notes_open or s.notes_closed then raise exception 'Notes déjà clôturées'; end if;
  insert into public.player_post_match_observations(workspace_id,tournament_id,player_id,evaluator_user_id,appreciation_code,rating_delta)
   select t.workspace_id,t.id,player_id,user_id,appreciation_code,case appreciation_code when 1 then -.2 when 2 then -.1 when 3 then 0 when 4 then .1 when 5 then .2 when 6 then .3 end from private.fast_conquest_notes where tournament_id=t.id on conflict(tournament_id,player_id,evaluator_user_id) do nothing;
  update private.fast_conquest_sessions set notes_open=false,notes_closed=true where tournament_id=t.id;
 elsif p_action='refuse_sub' then
  tid:=(p_payload->>'teamId')::uuid;pid:=(p_payload->>'playerId')::uuid;
  if not exists(select 1 from public.teams where id=tid and tournament_id=t.id) or not exists(select 1 from public.tournament_players where tournament_id=t.id and player_id=pid and present) then raise exception 'Équipe et remplaçant présents requis'; end if;
  if coalesce((p_payload->>'refused')::boolean,true) then insert into private.fast_conquest_sub_refusals values(t.id,tid,pid) on conflict do nothing; else delete from private.fast_conquest_sub_refusals where tournament_id=t.id and team_id=tid and player_id=pid; end if;
 else raise exception 'Action inconnue'; end if;
 update private.fast_conquest_sessions set version=version+1 where tournament_id=t.id;
 return public.fast_conquest_context(t.id);
end $$;
revoke all on function public.fast_conquest_manage(uuid,text,jsonb) from public,anon; grant execute on function public.fast_conquest_manage(uuid,text,jsonb) to authenticated;

-- Only the Edge Function service principal can persist engine states.
create function public.fast_conquest_commit(p_tournament_id uuid,p_actor uuid,p_version integer,p_state jsonb,p_action text,p_match_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype; c jsonb; m jsonb; mid uuid; round2 boolean; active boolean; begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text,5100));
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update;
 if not found then raise exception 'Fast Conquête introuvable'; end if;
 c:=public.fast_conquest_context(t.id);
 if not coalesce((c->>'entitled')::boolean,false) or (p_action in ('start','draw','validate_draw','correct','delete_match','repair','reset') and not (c->>'admin')::boolean) or (p_action='finish' and not (c->>'can_score')::boolean) or p_action not in ('start','draw','validate_draw','correct','delete_match','repair','reset','finish') then raise exception 'Action non autorisée'; end if;
 insert into private.fast_conquest_sessions(tournament_id) values(t.id) on conflict do nothing;
 select * into s from private.fast_conquest_sessions where tournament_id=t.id for update;
 if s.version<>p_version then raise exception 'VERSION_CONFLICT: actualise avant de réessayer'; end if;
 if not s.locked then raise exception 'Équipes non verrouillées'; end if;
 if p_action='finish' and not exists(select 1 from jsonb_array_elements(c->'matches') r where r->>'format_slot'='fast:'||p_match_id and (r->>'captains_confirmed')::boolean) then raise exception 'Validation des deux capitaines requise'; end if;
 perform set_config('swe.fast_commit','on',true);
 if p_action in ('correct','delete_match','reset') then
  delete from public.matches x where x.tournament_id=t.id and x.competition_type='fast_conquest' and not exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and (r->>'home')::uuid=x.home_team_id and (r->>'away')::uuid=x.away_team_id and coalesce((r->>'deleted')::boolean,false)=false);
  delete from public.goals g using public.matches x where g.match_id=x.id and x.tournament_id=t.id and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
  delete from public.match_player_assignments a using public.matches x where a.match_id=x.id and x.tournament_id=t.id and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
  -- Reset generated descendants whose slots survive but whose results no longer do.
  update public.matches x set pitch=null,status='scheduled',home_score=0,away_score=0,tie_break_winner_team_id=null,finished_at=null where x.tournament_id=t.id and x.competition_type='fast_conquest' and exists(select 1 from jsonb_array_elements(p_state->'matches') r where 'fast:'||(r->>'id')=x.format_slot and r->>'status'='scheduled');
 end if;
 -- Release completed matches before allocating the next round to its terrains.
 for m in select value from jsonb_array_elements(p_state->'matches') where value->>'status'='finished' loop
  update public.matches set status='finished',home_score=(m->>'homeScore')::integer,away_score=(m->>'awayScore')::integer,finished_at=coalesce(finished_at,now()),tie_break_winner_team_id=case when m->>'homeScore'=m->>'awayScore' then (m->>'winner')::uuid else null end,tie_break_method_used=case when m->>'penalties' is not null then 'penalties_3' else null end where tournament_id=t.id and format_slot='fast:'||(m->>'id');
 end loop;
 round2:=not exists(select 1 from jsonb_array_elements(p_state->'matches') r where r->>'label'='Qualification 1' and r->>'status'<>'finished');
 for m in select value from jsonb_array_elements(p_state->'matches') where coalesce((value->>'deleted')::boolean,false)=false loop
  active:=m->>'phase'=p_state->>'phase' and m->>'status'<>'finished' and (m->>'phase'<>'qualification' or m->>'label'=case when round2 then 'Qualification 2' else 'Qualification 1' end);
  if exists(select 1 from public.matches where tournament_id=t.id and format_slot='fast:'||(m->>'id')) then
   update public.matches set pitch=case when status='finished' then pitch when active then m->>'pitch' else null end where tournament_id=t.id and format_slot='fast:'||(m->>'id');
  else
  insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,pitch,round_label,rotation_role,rotation_generated,competition_type,format_stage,format_slot,workflow_version)
  values(t.id,(m->>'home')::uuid,(m->>'away')::uuid,(m->>'order')::integer,m->>'status',case when active then m->>'pitch' else null end,(m->>'label')||' · '||(m->>'pitch'),'fast_conquest',true,'fast_conquest',m->>'phase','fast:'||(m->>'id'),1)
;
  end if;
  insert into public.match_player_assignments(match_id,team_id,player_id) select x.id,tp.team_id,tp.player_id from public.matches x join public.team_players tp on tp.team_id in (x.home_team_id,x.away_team_id) where x.tournament_id=t.id and x.format_slot='fast:'||(m->>'id') and m->>'status'='scheduled' and not exists(select 1 from public.match_player_assignments a where a.match_id=x.id) on conflict(match_id,player_id) do nothing;
 end loop;
 update private.fast_conquest_sessions set state=p_state,version=version+1,notes_open=p_state->>'phase'='finished' and not notes_closed where tournament_id=t.id;
 update public.tournaments set status=case when p_state->>'phase'='finished' then 'finished' else 'live' end,registration_open=false,rotation_mode='fast_conquest',rotation_state=jsonb_build_object('initialized',true,'fast_conquest',p_state) where id=t.id;
 perform set_config('swe.fast_commit','off',true);
 return public.fast_conquest_context(t.id);
end $$;
revoke all on function public.fast_conquest_commit(uuid,uuid,integer,jsonb,text,text) from public,anon,authenticated; grant execute on function public.fast_conquest_commit(uuid,uuid,integer,jsonb,text,text) to service_role;

create function private.fast_conquest_match_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; begin
 if tg_op='UPDATE' and new.tournament_id<>old.tournament_id and exists(select 1 from public.tournaments where id=old.tournament_id and format='fast_conquest') then raise exception 'Réaffectation Fast Conquête interdite'; end if;
 select * into t from public.tournaments where id=case when tg_op='DELETE' then old.tournament_id else new.tournament_id end;
 if not found or t.format<>'fast_conquest' or current_setting('swe.fast_commit',true)='on' then return case when tg_op='DELETE' then old else new end; end if;
 if tg_op='DELETE' then
  if not private.fast_admin(t.workspace_id) then raise exception 'Suppression réservée à l’administrateur'; end if;
  raise exception 'La suppression isolée invaliderait le tableau : supprime le tournoi ou corrige le résultat via Fast Conquête';
 end if;
 if tg_op='INSERT' then raise exception 'Utilise le générateur Fast Conquête'; end if;
 if new.tournament_id is distinct from old.tournament_id or new.home_team_id is distinct from old.home_team_id or new.away_team_id is distinct from old.away_team_id or new.format_slot is distinct from old.format_slot or new.competition_type is distinct from old.competition_type then raise exception 'Composition de match protégée'; end if;
 if not private.swe_workspace_full_access(t.workspace_id) or not (private.fast_admin(t.workspace_id) or private.fast_designated(t.id) and private.coorganizer_can_edit_tournament(t.id)) then raise exception 'Droit de saisie requis'; end if;
 if old.status='finished' or old.pitch is null or new.status='finished' or new.pitch is distinct from old.pitch or new.rotation_role is distinct from old.rotation_role then raise exception 'Utilise les commandes Fast Conquête pour terminer ou corriger ce match'; end if;
 return new;
end $$;
create trigger fast_conquest_match_guard before insert or update or delete on public.matches for each row execute function private.fast_conquest_match_guard();
create function private.fast_conquest_team_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid; t public.tournaments%rowtype; begin
 if tg_op='UPDATE' and tg_table_name='team_players' then
  if exists(select 1 from public.teams x join public.tournaments y on y.id=x.tournament_id join private.fast_conquest_sessions s on s.tournament_id=y.id where x.id=old.team_id and y.format='fast_conquest' and (s.locked or s.state is not null or s.vote_open)) then raise exception 'Équipe source verrouillée'; end if;
 end if;
 if tg_table_name='teams' then tid:=case when tg_op='DELETE' then old.tournament_id else new.tournament_id end; else select tournament_id into tid from public.teams where id=case when tg_op='DELETE' then old.team_id else new.team_id end; end if;
 select * into t from public.tournaments where id=tid;
 if t.format='fast_conquest' then
  if not private.fast_admin(t.workspace_id) then raise exception 'Composition réservée à l’organisateur'; end if;
  if exists(select 1 from private.fast_conquest_sessions where tournament_id=tid and (locked or state is not null or vote_open)) then raise exception 'Équipes verrouillées ou vote ouvert'; end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger fast_conquest_team_guard before insert or update or delete on public.teams for each row execute function private.fast_conquest_team_guard();
create trigger fast_conquest_team_player_guard before insert or update or delete on public.team_players for each row execute function private.fast_conquest_team_guard();
-- Restrict private helpers; authenticated callers use the checked public RPCs only.
revoke all on function private.fast_admin(uuid),private.fast_designated(uuid),private.fast_present(uuid),private.fast_digest(uuid) from public,anon,authenticated;
create function public.fast_conquest_generate_teams(p_tournament_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; ids uuid[]:='{}'; generated_id uuid; names text[]:=array['Noirs','Bleus','Blancs','Rouges','Verts','Jaunes']; colors text[]:=array['#111827','#2563eb','#f8fafc','#dc2626','#16a34a','#eab308']; i integer; n integer; pos integer:=0; ix integer; r record; begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text,5100));
 select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update;
 if not found or not private.fast_admin(t.workspace_id) or not private.swe_workspace_full_access(t.workspace_id) then raise exception 'Organisateur autorisé requis'; end if;
 if exists(select 1 from private.fast_conquest_sessions where tournament_id=t.id and (locked or state is not null or vote_open)) then raise exception 'Déverrouille les compositions avant un nouveau tirage'; end if;
 select count(*) into n from public.tournament_players where tournament_id=t.id and present and registration_status<>'waitlist' and not is_substitute;
 if n<12 then raise exception 'Douze joueurs minimum sont requis pour six équipes'; end if;
 delete from public.teams where tournament_id=t.id;
 for i in 1..6 loop insert into public.teams(tournament_id,name,color) values(t.id,names[i],colors[i]) returning id into generated_id; ids:=array_append(ids,generated_id); end loop;
 for r in select p.player_id,public.get_effective_player_rating(p.player_id) rating from public.tournament_players p where p.tournament_id=t.id and p.present and p.registration_status<>'waitlist' and not p.is_substitute order by rating desc,random() loop
  ix:=case when (pos/6)%2=0 then pos%6+1 else 6-pos%6 end;
  insert into public.team_players(team_id,player_id) values(ids[ix],r.player_id);pos:=pos+1;
 end loop;
 return jsonb_build_object('team_count',6,'player_count',n);
end $$;
revoke all on function public.fast_conquest_generate_teams(uuid) from public,anon; grant execute on function public.fast_conquest_generate_teams(uuid) to authenticated;

create function private.fast_conquest_event_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.matches%rowtype; t public.tournaments%rowtype; begin
 if tg_op='UPDATE' and new.match_id<>old.match_id and exists(select 1 from public.matches x join public.tournaments y on y.id=x.tournament_id where x.id=old.match_id and y.format='fast_conquest') then raise exception 'Réaffectation Fast Conquête interdite'; end if;
 select * into m from public.matches where id=case when tg_op='DELETE' then old.match_id else new.match_id end;
 if not found then return case when tg_op='DELETE' then old else new end; end if;
 select * into t from public.tournaments where id=m.tournament_id;
 if t.format<>'fast_conquest' or current_setting('swe.fast_commit',true)='on' then return case when tg_op='DELETE' then old else new end; end if;
 if not private.swe_workspace_full_access(t.workspace_id) or not (private.fast_admin(t.workspace_id) or private.fast_designated(t.id) and private.coorganizer_can_edit_tournament(t.id)) then raise exception 'Droit de saisie requis'; end if;
 if m.pitch is null or m.status='finished' then raise exception 'Match à venir ou déjà terminé'; end if;
 if tg_op='UPDATE' and new.match_id is distinct from old.match_id then raise exception 'Réaffectation interdite'; end if;
 if tg_table_name='match_player_assignments' and tg_op<>'DELETE' and exists(select 1 from private.fast_conquest_sub_refusals where tournament_id=t.id and team_id=new.team_id and player_id=new.player_id) then raise exception 'Cette équipe refuse ce remplaçant'; end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger fast_conquest_goal_guard before insert or update or delete on public.goals for each row execute function private.fast_conquest_event_guard();
create trigger fast_conquest_assignment_guard before insert or update or delete on public.match_player_assignments for each row execute function private.fast_conquest_event_guard();

create function private.fast_conquest_tournament_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.format='fast_conquest' and not private.fast_admin(old.workspace_id) then raise exception 'Suppression réservée à l’administrateur autorisé'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.format='fast_conquest' and (new.format<>old.format or new.workspace_id<>old.workspace_id or new.fast_team_mode<>old.fast_team_mode) and exists(select 1 from private.fast_conquest_sessions where tournament_id=old.id and (locked or state is not null)) then raise exception 'Format et mode verrouillés'; end if;
 if new.format='fast_conquest' then
  if (current_setting('swe.fast_commit',true) is distinct from 'on' and not private.fast_admin(new.workspace_id)) or not private.swe_workspace_full_access(new.workspace_id) then raise exception 'Abonnement Organisateur actif et droit de création requis'; end if;
  if cardinality(new.reserved_pitch_ids)<>3 then raise exception 'Sélectionne exactement trois terrains pour Fast Conquête'; end if;
  if tg_op='UPDATE' and current_setting('swe.fast_commit',true) is distinct from 'on' and (new.rotation_state is distinct from old.rotation_state or new.rotation_mode is distinct from old.rotation_mode or new.status is distinct from old.status) then raise exception 'Utilise les commandes Fast Conquête pour lancer ou terminer le tournoi'; end if;
 end if;
 return new;
end $$;
create trigger fast_conquest_tournament_guard before insert or update or delete on public.tournaments for each row execute function private.fast_conquest_tournament_guard();
create function public.fast_conquest_inbox(p_workspace_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'vote_open',s.vote_open,'notes_open',s.notes_open)) from public.tournaments t join private.fast_conquest_sessions s on s.tournament_id=t.id where t.workspace_id=p_workspace_id and private.swe_workspace_full_access(t.workspace_id) and (private.fast_admin(t.workspace_id) or private.fast_designated(t.id)) and (s.vote_open or s.notes_open and (private.fast_admin(t.workspace_id) or private.fast_present(t.id)))),'[]'::jsonb);
end $$;
revoke all on function public.fast_conquest_inbox(uuid) from public,anon; grant execute on function public.fast_conquest_inbox(uuid) to authenticated;
