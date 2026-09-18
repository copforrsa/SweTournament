-- Weighted appreciation totals; one denominator per tournament, including abstentions.
CREATE OR REPLACE FUNCTION public.get_public_workspace_snapshot(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w public.workspaces%rowtype;
begin
  select * into w from public.workspaces where public_token=p_token and public_enabled=true;
  if not found then return null; end if;
  return jsonb_build_object(
    'workspace',jsonb_build_object('id',w.id,'name',w.name),
    'features',coalesce((select jsonb_build_object('rankings_enabled',coalesce(e.rankings_enabled,true),'player_ratings_enabled',coalesce(e.player_ratings_enabled,false)) from public.workspace_entitlements e where e.workspace_id=w.id),jsonb_build_object('rankings_enabled',true,'player_ratings_enabled',false)),
    'players',coalesce((select jsonb_agg(to_jsonb(p)-'workspace_id'-'skill_level') from public.players p where p.workspace_id=w.id),'[]'::jsonb),
    'tournament_group_levels',coalesce((select jsonb_agg(jsonb_build_object('tournament_id',g.tournament_id,'avg_rating',g.avg_rating)) from (select q.tournament_id,round(avg(q.player_avg)::numeric,1) avg_rating from (select distinct tp.tournament_id,tp.player_id,pr.player_avg from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id and t.workspace_id=w.id join (select r.player_id,avg(r.rating)::numeric player_avg from public.player_skill_ratings r where r.workspace_id=w.id and r.rating is not null group by r.player_id) pr on pr.player_id=tp.player_id where coalesce(tp.present,false)=true and coalesce(tp.registration_status,'')<>'waitlist') q group by q.tournament_id) g),'[]'::jsonb),
    'seasons',coalesce((select jsonb_agg(to_jsonb(s)-'workspace_id') from public.seasons s where s.workspace_id=w.id),'[]'::jsonb),
    'leagues',coalesce((select jsonb_agg(to_jsonb(l)-'workspace_id'-'created_by') from public.leagues l where l.workspace_id=w.id),'[]'::jsonb),
    'league_players',coalesce((select jsonb_agg(to_jsonb(lp)) from public.league_players lp join public.leagues l on l.id=lp.league_id where l.workspace_id=w.id),'[]'::jsonb),
    'tournaments',coalesce((select jsonb_agg((to_jsonb(t)-'workspace_id'-'created_by'-'venue_address'-'venue_latitude'-'venue_longitude') || case when coalesce(t.share_location,false) then jsonb_build_object('venue_address',t.venue_address,'venue_latitude',t.venue_latitude,'venue_longitude',t.venue_longitude,'share_location',true) else jsonb_build_object('share_location',false) end) from public.tournaments t where t.workspace_id=w.id),'[]'::jsonb),
    'tournament_players',coalesce((select jsonb_agg(to_jsonb(tp)) from public.tournament_players tp join public.tournaments t on t.id=tp.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(tm)) from public.teams tm join public.tournaments t on t.id=tm.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'team_players',coalesce((select jsonb_agg(to_jsonb(tp)-'rating_at_join') from public.team_players tp join public.teams tm on tm.id=tp.team_id join public.tournaments t on t.id=tm.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'team_player_invitations',coalesce((select jsonb_agg(to_jsonb(i)) from public.team_player_invitations i join public.tournaments t on t.id=i.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'matches',coalesce((select jsonb_agg(to_jsonb(m)) from public.matches m join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'goals',coalesce((select jsonb_agg(to_jsonb(g)-'created_by') from public.goals g join public.matches m on m.id=g.match_id join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'match_player_assignments',coalesce((select jsonb_agg(to_jsonb(a)-'updated_by') from public.match_player_assignments a join public.matches m on m.id=a.match_id join public.tournaments t on t.id=m.tournament_id where t.workspace_id=w.id),'[]'::jsonb),
    'sports_complexes',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name) from public.sports_complexes c where c.active=true),'[]'::jsonb),
    'sports_pitches',coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order,p.name) from public.sports_pitches p where p.active=true),'[]'::jsonb)
  );
end $function$;
-- Existing team ratings are captured before changing the calculation.
alter table public.team_players add column if not exists rating_at_join numeric;
update public.team_players set rating_at_join=public.get_effective_player_rating(player_id) where rating_at_join is null;

create or replace function private.player_rating_breakdown_v4462(p_player_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
with target as (
 select coalesce(global_player_id,id) identity_id from public.players where id=p_player_id
), linked as (
 select p.id from public.players p join target t on coalesce(p.global_player_id,p.id)=t.identity_id
), base as (
 select avg(r.rating)::numeric value from public.player_skill_ratings r join linked l on l.id=r.player_id
), denominators as (
 select tournament_id,count(distinct evaluator_user_id)::numeric n from public.tournament_rating_evaluators group by tournament_id
), adjustments as (
 select o.tournament_id,sum(o.rating_delta)/d.n delta,
 (s.status='closed' or s.closes_at<=now()) finalized
 from public.player_post_match_observations o join linked l on l.id=o.player_id
 join denominators d on d.tournament_id=o.tournament_id and d.n>0
 join public.tournament_rating_sessions s on s.tournament_id=o.tournament_id
 where exists(select 1 from public.tournament_rating_evaluators e where e.tournament_id=o.tournament_id and e.evaluator_user_id=o.evaluator_user_id)
 group by o.tournament_id,d.n,s.status,s.closes_at
), totals as (
 select coalesce(sum(delta) filter(where finalized),0) delta,
 coalesce(sum(delta) filter(where not finalized),0) pending_delta,
 count(*) filter(where not finalized) pending_count from adjustments
)
select jsonb_build_object('base_rating',round(b.value,2),'rating_delta',round(t.delta,2),
 'pending_delta',round(t.pending_delta,2),'has_pending',t.pending_count>0,
 'avg_rating',case when b.value is null then null else round(least(5::numeric,greatest(1::numeric,b.value+t.delta)),2) end)
from base b cross join totals t;
$$;
revoke all on function private.player_rating_breakdown_v4462(uuid) from public;

create or replace function private.swe_effective_player_rating_v4400(p_player_id uuid)
returns numeric language sql stable security invoker set search_path='' as $$
 select (private.player_rating_breakdown_v4462(p_player_id)->>'avg_rating')::numeric;
$$;

-- Existing authorized team writes invoke this trigger under their own privileges.
-- Never accept a client-supplied snapshot or rewrite one on an ordinary update.
create or replace function private.capture_team_player_rating_v4462()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.player_id=old.player_id and new.team_id=old.team_id then
   new.rating_at_join:=old.rating_at_join;
 else
   new.rating_at_join:=public.get_effective_player_rating(new.player_id);
 end if;
 return new;
end $$;
revoke all on function private.capture_team_player_rating_v4462() from public;
drop trigger if exists capture_team_player_rating_v4462 on public.team_players;
create trigger capture_team_player_rating_v4462 before insert or update on public.team_players for each row execute function private.capture_team_player_rating_v4462();

-- Internal aggregate lookup: identities, votes and individual assessments stay private.
create or replace function private.workspace_player_progress_v4462(p_workspace_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare linked_player uuid; result jsonb;
begin
 if auth.uid() is null or not (private.is_workspace_admin(p_workspace_id) or private.is_workspace_coorganizer(p_workspace_id)) then raise exception 'Accès refusé'; end if;
 select linked_player_id into linked_player from public.workspace_members where workspace_id=p_workspace_id and user_id=auth.uid() and active limit 1;
 with games as (
 select m.* from public.matches m join public.tournaments t on t.id=m.tournament_id where t.workspace_id=p_workspace_id and m.status='finished'
 ), appearances as (
 select g.id match_id,a.player_id,a.team_id from games g join public.match_player_assignments a on a.match_id=g.id where a.team_id is not null
 union
 select g.id,tp.player_id,tp.team_id from games g join public.team_players tp on tp.team_id in(g.home_team_id,g.away_team_id)
 where not exists(select 1 from public.match_player_assignments a where a.match_id=g.id)
 union
 select g.id,(s->>'out_id')::uuid,(s->>'team_id')::uuid from games g cross join lateral jsonb_array_elements(coalesce(g.substitutions,'[]')) s
 union
 select g.id,(s->>'in_id')::uuid,(s->>'team_id')::uuid from games g cross join lateral jsonb_array_elements(coalesce(g.substitutions,'[]')) s
 ), relations as (
 select other.player_id,bool_or(other.team_id=me.team_id) played_with,bool_or(other.team_id<>me.team_id) played_against
 from appearances me join appearances other on other.match_id=me.match_id and other.player_id<>me.player_id where me.player_id=linked_player group by other.player_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'played_with',coalesce(r.played_with,false),'played_against',coalesce(r.played_against,false),
 'rating',case when coalesce(e.player_ratings_enabled,false) then private.player_rating_breakdown_v4462(p.id) else null end)),'[]') into result
 from public.players p left join relations r on r.player_id=p.id left join public.workspace_entitlements e on e.workspace_id=p.workspace_id where p.workspace_id=p_workspace_id;
 return jsonb_build_object('profile_linked',linked_player is not null,'players',result);
end $$;
revoke all on function private.workspace_player_progress_v4462(uuid) from public,anon;
grant execute on function private.workspace_player_progress_v4462(uuid) to authenticated;
create or replace function public.get_workspace_player_progress_v4462(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.workspace_player_progress_v4462(p_workspace_id);
$$;
revoke all on function public.get_workspace_player_progress_v4462(uuid) from public,anon;
grant execute on function public.get_workspace_player_progress_v4462(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.get_player_skill_aggregates(p_workspace_id uuid)
 RETURNS TABLE(player_id uuid, voter_count bigint, avg_rating numeric, avg_cardio numeric, avg_dribble numeric, avg_collectif numeric, avg_frappe numeric, top_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if not coalesce((select e.player_ratings_enabled from public.workspace_entitlements e where e.workspace_id=p_workspace_id),false) then return; end if;
  if not (private.is_workspace_admin(p_workspace_id) or private.is_workspace_coorganizer(p_workspace_id)) then raise exception 'Accès refusé'; end if;
  return query
  with linked as (
    select p.id local_player_id,coalesce(p.global_player_id,p.id) identity_id
    from public.players p where p.workspace_id=p_workspace_id
  ), ratings as (
    select l.local_player_id,r.rating,r.cardio,r.dribble,r.collectif,r.frappe,r.preferred_role
    from linked l join public.players px on coalesce(px.global_player_id,px.id)=l.identity_id
    join public.player_skill_ratings r on r.player_id=px.id
  ), base as (
    select r.local_player_id,count(*)::bigint voter_count,avg(r.rating)::numeric avg_rating,
      round(avg(r.cardio)::numeric,1) avg_cardio,round(avg(r.dribble)::numeric,1) avg_dribble,
      round(avg(r.collectif)::numeric,1) avg_collectif,round(avg(r.frappe)::numeric,1) avg_frappe
    from ratings r group by r.local_player_id
  ), adjustments as (
    select l.local_player_id,coalesce(sum(o.rating_delta),0)::numeric delta
    from linked l join public.players px on coalesce(px.global_player_id,px.id)=l.identity_id
    left join public.player_post_match_observations o on o.player_id=px.id
    group by l.local_player_id
  ), roles as (
    select r.local_player_id,r.preferred_role,count(*) cnt,
      row_number() over(partition by r.local_player_id order by count(*) desc,r.preferred_role) rn
    from ratings r where r.preferred_role is not null group by r.local_player_id,r.preferred_role
  )
  select b.local_player_id,b.voter_count,
    round(private.swe_effective_player_rating_v4400(b.local_player_id),2),
    b.avg_cardio,b.avg_dribble,b.avg_collectif,b.avg_frappe,
    (select rr.preferred_role from roles rr where rr.local_player_id=b.local_player_id and rr.rn=1 limit 1)
  from base b left join adjustments a on a.local_player_id=b.local_player_id;
end;
$function$;

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
 v_progress:=private.player_rating_breakdown_v4462(p_player_id);
 select tp.rating_at_join into v_saved from public.team_players tp join public.teams tm on tm.id=tp.team_id where tm.tournament_id=p_tournament_id and tp.player_id=p_player_id limit 1;
 v_rating:=coalesce(v_saved,(v_progress->>'avg_rating')::numeric);
 return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',v_rating,'rating_delta',case when v_saved is null then (v_progress->>'rating_delta')::numeric else null end,'base_rating',v_progress->'base_rating','pending_delta',v_progress->'pending_delta','has_pending',v_progress->'has_pending','rating_frozen',v_saved is not null,'is_coorganizer',exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.linked_player_id=p_player_id and wm.active and wm.role='coorganizer'));
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
         round(coalesce(avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id))),0),2),
         case when count(tp.player_id)=0 then 'À composer'
           when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=4.25 then 'Excellent'
           when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=3.50 then 'Très solide'
           when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.75 then 'Solide'
           when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.00 then 'Équilibrée' else 'À renforcer' end::text,
         count(tp.player_id) filter(where tp.player_id=tm.created_by_player_id or exists(select 1 from public.team_player_invitations i where i.tournament_id=p_tournament_id and i.team_id=tm.id and i.player_id=tp.player_id and i.status='accepted') or exists(select 1 from public.players creator where creator.id=tm.created_by_player_id and p.guest_of_player_id=creator.id))::integer,
         greatest(0,5-count(tp.player_id))::integer
  from public.teams tm left join public.team_players tp on tp.team_id=tm.id left join public.players p on p.id=tp.player_id
  where tm.tournament_id=p_tournament_id group by tm.id,tm.name order by tm.created_at,tm.id;
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
      select tm.*,round(coalesce(avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id))),0),2) team_score,
        case when count(tp.player_id)=0 then 'À composer'
          when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=4.25 then 'Excellent'
          when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=3.50 then 'Très solide'
          when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.75 then 'Solide'
          when avg(coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)))>=2.00 then 'Équilibrée' else 'À renforcer' end mention,
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
