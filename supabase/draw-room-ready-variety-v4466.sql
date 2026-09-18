create table if not exists private.draw_room_readiness (
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 ready boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(tournament_id,user_id)
);
alter table private.draw_room_readiness enable row level security;
revoke all on private.draw_room_readiness from public,anon,authenticated;

create or replace function private.draw_room_ready_v4466(p_tournament_id uuid,p_ready boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; admin boolean; eligible boolean; result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select * into t from public.tournaments where id=p_tournament_id;
 if not found then raise exception 'Tournoi introuvable';end if;
 admin:=private.is_workspace_admin(t.workspace_id);
 select exists(select 1 from public.workspace_members wm join public.tournament_players tp on tp.player_id=wm.linked_player_id and tp.tournament_id=t.id
 where wm.workspace_id=t.workspace_id and wm.user_id=auth.uid() and wm.role='coorganizer' and coalesce(wm.active,true) and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist') into eligible;
 if not (admin or eligible) then raise exception 'Accès au salon refusé';end if;
 if p_ready is not null then
  if p_ready and (t.status='finished' or t.team_review_status not in ('pending','redraw_requested')) then raise exception 'Le salon est fermé';end if;
  insert into private.draw_room_readiness(tournament_id,user_id,ready,updated_at) values(t.id,auth.uid(),p_ready,now())
  on conflict(tournament_id,user_id) do update set ready=excluded.ready,updated_at=excluded.updated_at;
 end if;
 select jsonb_build_object(
 'mine',coalesce((select r.ready and r.updated_at>now()-interval '60 seconds' from private.draw_room_readiness r where r.tournament_id=t.id and r.user_id=auth.uid()),false),
 'admin_ready',exists(select 1 from public.workspace_members wm join private.draw_room_readiness r on r.user_id=wm.user_id and r.tournament_id=t.id where wm.workspace_id=t.workspace_id and wm.role='admin' and coalesce(wm.active,true) and r.ready and r.updated_at>now()-interval '60 seconds'),
 'participants',case when admin then (
 select coalesce(jsonb_agg(jsonb_build_object('name',p.name,'ready',coalesce(r.ready and r.updated_at>now()-interval '60 seconds',false)) order by p.name),'[]'::jsonb)
 from public.workspace_members wm join public.tournament_players tp on tp.player_id=wm.linked_player_id and tp.tournament_id=t.id
 join public.players p on p.id=wm.linked_player_id
 left join private.draw_room_readiness r on r.user_id=wm.user_id and r.tournament_id=t.id
 where wm.workspace_id=t.workspace_id and wm.role='coorganizer' and coalesce(wm.active,true) and tp.present and coalesce(tp.registration_status,'confirmed')<>'waitlist'
 ) else '[]'::jsonb end) into result;
 return result;
end $$;
revoke all on function private.draw_room_ready_v4466(uuid,boolean) from public,anon;
grant execute on function private.draw_room_ready_v4466(uuid,boolean) to authenticated;
create or replace function public.team_draw_room_ready_v1(p_tournament_id uuid,p_ready boolean default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.draw_room_ready_v4466(p_tournament_id,p_ready);
$$;
revoke all on function public.team_draw_room_ready_v1(uuid,boolean) from public,anon;
grant execute on function public.team_draw_room_ready_v1(uuid,boolean) to authenticated;

-- Canonical roster signature ignores team names/colors and ordering.
create or replace function private.draw_roster_signature_v4466(p_snapshot jsonb)
returns text language sql immutable security invoker set search_path='' as $$
 select string_agg(roster,'|' order by roster) from (
 select (select string_agg(p->>'id',',' order by p->>'id') from jsonb_array_elements(t->'players') p) roster
 from jsonb_array_elements(p_snapshot->'teams') t
 ) s;
$$;
revoke all on function private.draw_roster_signature_v4466(jsonb) from public;

create or replace function private.diversify_draw_v4466(p_tournament_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare
 ids uuid[]; slots uuid[]; initial_slots uuid[]; best_slots uuid[]; ratings numeric[]; movable integer[];
 signatures text[]; signature text; snap jsonb; base_spread numeric; spread numeric; best_spread numeric:=1000;
 i integer; j integer; a integer; b integer; tmp uuid; n integer; attempt integer;
begin
 select array_agg(tp.player_id order by tp.player_id),array_agg(tp.team_id order by tp.player_id),
 array_agg(case when p.is_group_member=false then 2.5 else coalesce(tp.rating_at_join,public.get_effective_player_rating(p.id)) end order by tp.player_id)
 into ids,initial_slots,ratings from public.team_players tp join public.teams tm on tm.id=tp.team_id join public.players p on p.id=tp.player_id where tm.tournament_id=p_tournament_id;
 n:=coalesce(array_length(ids,1),0); if n=0 then return;end if;
 select array_agg(g.idx) into movable from generate_series(1,n) g(idx) where not private.is_locked_team_player_v4465(initial_slots[g.idx],ids[g.idx]);
 select array_agg(private.draw_roster_signature_v4466(snapshot)) into signatures from public.team_draw_room_proposals where tournament_id=p_tournament_id;
 select max(avg_rating)-min(avg_rating) into base_spread from (select avg(ratings[g.idx]) avg_rating from generate_series(1,n) g(idx) group by initial_slots[g.idx]) s;
 -- Evaluate alternatives in memory; only the chosen roster is written.
 for attempt in 0..180 loop
  slots:=initial_slots;
  if attempt>0 and coalesce(array_length(movable,1),0)>1 then
   for j in 1..(1+(attempt % 8)) loop
    a:=movable[1+floor(random()*array_length(movable,1))::int];
    b:=movable[1+floor(random()*array_length(movable,1))::int];
    tmp:=slots[a];slots[a]:=slots[b];slots[b]:=tmp;
   end loop;
  end if;
  select max(avg_rating)-min(avg_rating) into spread from (select avg(ratings[g.idx]) avg_rating from generate_series(1,n) g(idx) group by slots[g.idx]) s;
  if spread>greatest(base_spread,0.20)+0.05 or spread>best_spread then continue;end if;
  select jsonb_build_object('teams',jsonb_agg(jsonb_build_object('players',players))) into snap from (
   select jsonb_agg(jsonb_build_object('id',ids[g.idx])) players from generate_series(1,n) g(idx) group by slots[g.idx]
  ) s;
  signature:=private.draw_roster_signature_v4466(snap);
  if signature=any(coalesce(signatures,'{}'::text[])) then continue;end if;
  if best_slots is null or spread<best_spread or random()<0.2 then best_slots:=slots;best_spread:=spread;end if;
 end loop;
 if best_slots is null then raise exception 'Aucune nouvelle composition suffisamment équilibrée trouvée. Les joueurs confirmés restent fixes ; aucun tirage supplémentaire n’a été décompté.';end if;
 for i in 1..n loop
  if best_slots[i]<>initial_slots[i] then delete from public.team_players where team_id=initial_slots[i] and player_id=ids[i];end if;
 end loop;
 for i in 1..n loop
  if best_slots[i]<>initial_slots[i] then insert into public.team_players(team_id,player_id) values(best_slots[i],ids[i]);end if;
 end loop;
end $$;
revoke all on function private.diversify_draw_v4466(uuid) from public;
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
  perform private.diversify_draw_v4466(t.id);
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
