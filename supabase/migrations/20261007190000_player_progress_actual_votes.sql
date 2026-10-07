-- Display stays on ten; internal five-point scale preserves balancing compatibility.
create or replace function private.player_rating_breakdown_v4462(p_player_id uuid)
returns jsonb language sql stable set search_path='' as $function$
with target as (
 select coalesce(global_player_id,id) identity_id from public.players where id=p_player_id
), linked as (
 select p.id from public.players p join target t on coalesce(p.global_player_id,p.id)=t.identity_id
), base as (
 select avg(r.rating)::numeric value from public.player_skill_ratings r join linked l on l.id=r.player_id
), votes as (
 select distinct on(o.tournament_id,o.evaluator_user_id) o.tournament_id,o.evaluator_user_id,o.appreciation_code,o.rating_delta,o.created_at,
 coalesce(fs.notes_closed,s.status='closed' or s.closes_at<=now(),false) finalized
 from public.player_post_match_observations o join linked l on l.id=o.player_id
 left join public.tournament_rating_sessions s on s.tournament_id=o.tournament_id
 left join private.fast_conquest_sessions fs on fs.tournament_id=o.tournament_id
 where exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=o.tournament_id and e.evaluator_user_id=o.evaluator_user_id)
 or exists(select 1 from private.fast_conquest_evaluators e where e.tournament_id=o.tournament_id and e.user_id=o.evaluator_user_id)
 order by o.tournament_id,o.evaluator_user_id,o.created_at desc,o.player_id
), adjustments as (
 select tournament_id,avg(rating_delta) filter(where appreciation_code<>1) delta,
 bool_and(finalized) finalized,max(created_at) rated_at
 from votes group by tournament_id
), totals as (
 select coalesce(sum(delta) filter(where finalized),0) delta,
 coalesce(sum(delta) filter(where not finalized),0) pending_delta,
 count(*) filter(where not finalized and delta is not null) pending_count from adjustments
), latest as (
 select tournament_id,delta from adjustments where finalized and delta is not null order by rated_at desc,tournament_id limit 1
)
select jsonb_build_object('base_rating',round(b.value,2),'rating_delta',round(t.delta,2),
 'pending_delta',round(t.pending_delta,2),'has_pending',t.pending_count>0,
 'last_tournament_delta',(select round(delta,2) from latest),
 'last_tournament_id',(select tournament_id from latest),
 'avg_rating',case when b.value is null then null else round(least(5::numeric,greatest(1::numeric,b.value+t.delta)),2) end)
from base b cross join totals t;
$function$;

CREATE OR REPLACE FUNCTION public.fast_conquest_manage(p_tournament_id uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
as $function$
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
   select t.workspace_id,t.id,player_id,user_id,appreciation_code,case appreciation_code when 1 then 0 when 2 then -.2 when 3 then -.1 when 4 then .1 when 5 then .2 when 6 then .3 end from private.fast_conquest_notes where tournament_id=t.id on conflict(tournament_id,player_id,evaluator_user_id) do nothing;
  update private.fast_conquest_sessions set notes_open=false,notes_closed=true where tournament_id=t.id;
 elsif p_action='refuse_sub' then
  tid:=(p_payload->>'teamId')::uuid;pid:=(p_payload->>'playerId')::uuid;
  if not exists(select 1 from public.teams where id=tid and tournament_id=t.id) or not exists(select 1 from public.tournament_players where tournament_id=t.id and player_id=pid and present) then raise exception 'Équipe et remplaçant présents requis'; end if;
  if coalesce((p_payload->>'refused')::boolean,true) then insert into private.fast_conquest_sub_refusals values(t.id,tid,pid) on conflict do nothing; else delete from private.fast_conquest_sub_refusals where tournament_id=t.id and team_id=tid and player_id=pid; end if;
 else raise exception 'Action inconnue'; end if;
 update private.fast_conquest_sessions set version=version+1 where tournament_id=t.id;
 return public.fast_conquest_context(t.id);
end $function$;

CREATE OR REPLACE FUNCTION private.read_public_registration_rating(p_token uuid, p_tournament_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
as $function$
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
 return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',v_rating,'rating_delta',case when v_saved is null then (v_progress->>'rating_delta')::numeric else null end,'last_tournament_delta',case when v_saved is null then v_progress->'last_tournament_delta' else null end,'last_tournament_id',v_progress->'last_tournament_id','base_rating',v_progress->'base_rating','pending_delta',v_progress->'pending_delta','has_pending',v_progress->'has_pending','rating_frozen',v_saved is not null,'is_coorganizer',exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.linked_player_id=p_player_id and wm.active and wm.role='coorganizer'));
end $function$;
