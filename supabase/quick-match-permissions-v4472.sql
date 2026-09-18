-- Finished-match corrections are restricted to the workspace admin.
-- Platform super admins remain unrestricted, including after tournament closure.
create or replace function public.quick_match_action_v1(p_match_id uuid,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.matches%rowtype; t public.tournaments%rowtype; g public.goals%rowtype;
  tid uuid; scorer uuid; assister uuid; outgoing uuid; incoming uuid; hs integer; aws integer; row_count integer;
  is_super boolean; is_operational_admin boolean;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into m from public.matches where id=p_match_id;
  if not found then raise exception 'Match introuvable'; end if;
  -- Serialize actions across the tournament, including substitute availability.
  perform pg_advisory_xact_lock(hashtextextended(m.tournament_id::text,4460));
  select * into t from public.tournaments where id=m.tournament_id;
  if not found then raise exception 'Tournoi inaccessible'; end if;
  select private.is_platform_super_admin(),private.is_workspace_operational_admin(t.workspace_id) into is_super,is_operational_admin;
  if t.status='finished' and not is_super then raise exception 'Tournoi terminé : résultats verrouillés'; end if;
  if not (is_super or is_operational_admin or private.coorganizer_can_edit_tournament(t.id)) then raise exception 'Droit de saisie des scores requis'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if m.status='finished' and not (is_super or is_operational_admin) then raise exception 'Match terminé : correction réservée à l’administrateur'; end if;
  hs:=coalesce(m.home_score,0); aws:=coalesce(m.away_score,0);
  if p_action in ('add','attach','edit','delete') then
    if p_action in ('edit','delete') then
      select * into g from public.goals where id=(p_payload->>'goal_id')::uuid and match_id=m.id for update;
      if not found then raise exception 'But introuvable, actualise le match'; end if;
      tid:=g.team_id;
    else tid:=(p_payload->>'team_id')::uuid; end if;
    if tid is null or tid not in (m.home_team_id,m.away_team_id) then raise exception 'Équipe invalide'; end if;
    if p_action<>'delete' then
      scorer:=(p_payload->>'scorer_id')::uuid; assister:=nullif(p_payload->>'assister_id','')::uuid;
      if scorer is null or scorer=assister then raise exception 'Buteur et passeur doivent être différents'; end if;
      -- Include replaced players: historical attribution must remain editable.
      if exists(select 1 from unnest(array[scorer,assister]) pid where pid is not null and not (
        exists(select 1 from public.match_player_assignments a where a.match_id=m.id and a.team_id=tid and a.player_id=pid)
        or exists(select 1 from public.team_players a where a.team_id=tid and a.player_id=pid)
        or exists(select 1 from jsonb_array_elements(m.substitutions) s where (s->>'team_id')::uuid=tid and pid in ((s->>'out_id')::uuid,(s->>'in_id')::uuid))
      )) then raise exception 'Joueur absent de cette équipe pour ce match'; end if;
    end if;
    if p_action in ('add','attach') then
      if p_action='attach' and (select count(*) from public.goals where match_id=m.id and team_id=tid)>=(case when tid=m.home_team_id then hs else aws end) then raise exception 'Tous les buts du score ont déjà un buteur'; end if;
      insert into public.goals(match_id,team_id,scorer_player_id,assister_player_id,assist_decided)
      values(m.id,tid,scorer,assister,coalesce((p_payload->>'assist_decided')::boolean,false)) returning * into g;
      if p_action='add' then if tid=m.home_team_id then hs:=hs+1; else aws:=aws+1; end if; end if;
    elsif p_action='edit' then
      update public.goals set scorer_player_id=scorer,assister_player_id=assister,assist_decided=true where id=g.id returning * into g;
    else
      delete from public.goals where id=g.id;
      if tid=m.home_team_id then hs:=greatest(0,hs-1); else aws:=greatest(0,aws-1); end if;
    end if;
    -- The legacy goals trigger recounts attributed goals. Restore the full score,
    -- including goals whose scorer has not been supplied yet.
    update public.matches set home_score=hs,away_score=aws where id=m.id;
  elsif p_action='score' then
    hs:=(p_payload->>'home')::integer; aws:=(p_payload->>'away')::integer;
    if hs is null or aws is null or hs<0 or aws<0 then raise exception 'Score entier positif ou nul requis'; end if;
    if hs<(select count(*) from public.goals where match_id=m.id and team_id=m.home_team_id) or aws<(select count(*) from public.goals where match_id=m.id and team_id=m.away_team_id) then raise exception 'Annule d’abord les buts en trop dans l’historique'; end if;
    update public.matches set home_score=hs,away_score=aws where id=m.id;
  elsif p_action='substitute' then
    outgoing:=(p_payload->>'out_id')::uuid; incoming:=(p_payload->>'in_id')::uuid;
    if incoming is null or outgoing is null or incoming=outgoing then raise exception 'Choisis deux joueurs différents'; end if;
    if not exists(select 1 from public.tournament_players where tournament_id=t.id and player_id=incoming and present and is_substitute and coalesce(registration_status,'confirmed')<>'waitlist') then raise exception 'Choisis un remplaçant déclaré et présent'; end if;
    if not exists(select 1 from public.match_player_assignments where match_id=m.id) then
      insert into public.match_player_assignments(match_id,player_id,team_id) select m.id,player_id,team_id from public.team_players where team_id in (m.home_team_id,m.away_team_id);
    end if;
    select team_id into tid from public.match_player_assignments where match_id=m.id and player_id=outgoing;
    if tid is null then raise exception 'Joueur sortant introuvable'; end if;
    if exists(select 1 from public.match_player_assignments a join public.matches x on x.id=a.match_id where a.player_id=incoming and a.team_id is not null and x.tournament_id=t.id and (x.id=m.id or (m.status<>'finished' and x.status<>'finished'))) then raise exception 'Ce remplaçant joue déjà dans un match en cours'; end if;
    update public.match_player_assignments set team_id=null where match_id=m.id and player_id=outgoing;
    insert into public.match_player_assignments(match_id,player_id,team_id) values(m.id,incoming,tid) on conflict(match_id,player_id) do update set team_id=excluded.team_id;
    update public.matches set substitutions=substitutions||jsonb_build_array(jsonb_build_object('out_id',outgoing,'in_id',incoming,'team_id',tid,'at',now(),'by',auth.uid())) where id=m.id;
  else raise exception 'Action inconnue'; end if;
  select * into m from public.matches where id=p_match_id;
  return jsonb_build_object('match',to_jsonb(m),'goals',coalesce((select jsonb_agg(x order by x.created_at,x.id) from public.goals x where match_id=m.id),'[]'::jsonb),'assignments',coalesce((select jsonb_agg(x) from public.match_player_assignments x where match_id=m.id),'[]'::jsonb));
end $$;
revoke all on function public.quick_match_action_v1(uuid,text,jsonb) from public,anon;
grant execute on function public.quick_match_action_v1(uuid,text,jsonb) to authenticated;

