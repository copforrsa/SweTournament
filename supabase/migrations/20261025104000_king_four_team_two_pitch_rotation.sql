-- Roi du Terrain : format 4 équipes / 2 terrains.
-- Pas de reprise d'historique silencieuse : initialisation via RPC authentifiée de l'organisateur.
create or replace function private.swe_king_advance_four_v1(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  t public.tournaments%rowtype;
  r integer;
  n integer;
  completed integer;
  m public.matches%rowtype;
  king_win uuid;
  king_lose uuid;
  lower_win uuid;
  lower_lose uuid;
  winner uuid;
  loser uuid;
  king_name text;
  lower_name text;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.format<>'king_of_pitch' or t.rotation_mode<>'king_of_pitch'
    or coalesce((t.rotation_state->>'initialized')::boolean,false)=false
    or coalesce((t.rotation_state->>'version')::integer,0)<>3
    or coalesce((t.rotation_state->>'matches_per_round')::integer,0)<>2
    then return jsonb_build_object('generated',false,'reason','inactive'); end if;
  r:=coalesce((t.rotation_state->>'round')::integer,1);
  if r<1 or r>=1000 then raise exception 'Nombre maximal de tours atteint'; end if;
  select count(*),count(*) filter(where status='finished')
    into n,completed from public.matches
    where tournament_id=p_tournament_id and rotation_generated
    and match_order between (2*r-1) and (2*r);
  if n<>2 or completed<>2 then
    return jsonb_build_object('generated',false,'reason','waiting','round',r,'finished',completed,'total',n);
  end if;
  if coalesce((t.rotation_state->>'stop_after_round')::boolean,false) then
    return jsonb_build_object('generated',false,'reason','paused','round',r);
  end if;
  if exists(select 1 from public.matches where tournament_id=p_tournament_id and match_order>2*r) then
    return jsonb_build_object('generated',false,'reason','future_matches_exist','round',r);
  end if;
  for m in select * from public.matches where tournament_id=p_tournament_id
    and rotation_generated and match_order between (2*r-1) and (2*r)
    order by match_order
  loop
    if m.home_score>m.away_score then winner:=m.home_team_id; loser:=m.away_team_id;
    elsif m.away_score>m.home_score then winner:=m.away_team_id; loser:=m.home_team_id;
    else
      if m.tie_break_winner_team_id is null
         or m.tie_break_winner_team_id not in(m.home_team_id,m.away_team_id)
        then raise exception 'Match % nul : départage requis',m.match_order; end if;
      winner:=m.tie_break_winner_team_id;
      loser:=case when winner=m.home_team_id then m.away_team_id else m.home_team_id end;
    end if;
    if m.rotation_role='king' then king_win:=winner;king_lose:=loser;
    elsif m.rotation_role='stream' then lower_win:=winner;lower_lose:=loser;
    else raise exception 'Rôle inattendu pour le match %',m.match_order; end if;
  end loop;
  if king_win is null or king_lose is null or lower_win is null or lower_lose is null
    or (select count(distinct team_id) from unnest(array[king_win,king_lose,lower_win,lower_lose]) as u(team_id))<>4
    then raise exception 'Quatre équipes différentes sont requises pour la rotation'; end if;
  select name into king_name from public.sports_pitches where id=t.king_pitch_id;
  select name into lower_name from public.sports_pitches where id=t.stream_pitch_id;
  if king_name is null or lower_name is null then raise exception 'Terrains du tournoi non configurés'; end if;
  insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,pitch,status,round_label,rotation_role,rotation_generated)
  values
    (p_tournament_id,king_win,lower_win,2*r+1,king_name,'scheduled','Roi du terrain · Tour '||(r+1),'king',true),
    (p_tournament_id,lower_lose,king_lose,2*r+2,lower_name,'scheduled','Roi du terrain · Tour '||(r+1),'stream',true);
  update public.tournaments
  set rotation_state=jsonb_set(
      jsonb_set(rotation_state,'{round}',to_jsonb(r+1),true),
      '{king_holder_team_id}',to_jsonb(king_win),true)
  where id=p_tournament_id;
  return jsonb_build_object('generated',true,'round',r+1,'matches',2);
end $$;

-- Sécurisation : ces fonctions internes ne sont pas directement accessibles via l'API.
revoke all on function private.swe_king_advance_four_v1(uuid) from public,anon,authenticated;

create or replace function public.swe_king_start_four_v1(
  p_tournament_id uuid,
  p_king_pitch_id uuid,
  p_stream_pitch_id uuid,
  p_tie_break_method text default 'shifumi_1')
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
 t public.tournaments%rowtype;
 v_king_name text;
 v_lower_name text;
 m public.matches%rowtype;
 participants integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise' using errcode='42501'; end if;
 select * into t from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'Tournoi introuvable';end if;
 if not (private.is_workspace_operational_admin(t.workspace_id) or private.is_platform_super_admin())
    then raise exception 'Droits organisateur requis' using errcode='42501';end if;
 if t.format<>'king_of_pitch' or t.rotation_mode<>'standard' or t.status='finished'
    or coalesce((t.rotation_state->>'initialized')::boolean,false) then
    raise exception 'Tournoi Roi du terrain indisponible pour la reprise'; end if;
 if p_tie_break_method not in ('shifumi_1','shifumi_3','penalties') then raise exception 'Départage non valide';end if;
 if p_king_pitch_id is null or p_stream_pitch_id is null or p_king_pitch_id=p_stream_pitch_id
    or not(p_king_pitch_id=any(t.reserved_pitch_ids) and p_stream_pitch_id=any(t.reserved_pitch_ids))
    or coalesce(array_length(t.reserved_pitch_ids,1),0)<>2 then
    raise exception 'Deux terrains réservés distincts sont nécessaires';end if;
 select name into v_king_name from public.sports_pitches where id=p_king_pitch_id and active;
 select name into v_lower_name from public.sports_pitches where id=p_stream_pitch_id and active;
 if v_king_name is null or v_lower_name is null then raise exception 'Terrain indisponible';end if;
 if (select count(*) from public.teams where tournament_id=p_tournament_id)<>4 then
    raise exception 'Il faut exactement 4 équipes';end if;
 if (select count(*) from public.matches where tournament_id=p_tournament_id)<>2 then
    raise exception 'Il faut exactement les 2 premiers matchs du tournoi';end if;
 select count(distinct team_id) into participants
 from (select home_team_id team_id from public.matches where tournament_id=p_tournament_id
       union all select away_team_id from public.matches where tournament_id=p_tournament_id) x;
 if participants<>4 then raise exception 'Les 4 équipes doivent avoir joué une fois';end if;
 for m in select * from public.matches where tournament_id=p_tournament_id order by match_order for update loop
   if m.match_order not in (1,2) then raise exception 'Ordres de matchs initiaux invalides';end if;
   if (m.match_order=1 and lower(trim(m.pitch))<>lower(trim(v_king_name)))
      or (m.match_order=2 and lower(trim(m.pitch))<>lower(trim(v_lower_name))) then
      raise exception 'Les matchs 1 et 2 doivent être joués sur les terrains réservés';end if;
   if m.status='finished' and m.home_score=m.away_score then
      if m.tie_break_winner_team_id not in(m.home_team_id,m.away_team_id) then
        raise exception 'Match % : vainqueur du départage manquant',m.match_order;end if;
      if (m.match_order=1 and m.tie_break_method_used is distinct from 'penalties_3')
         or (m.match_order=2 and m.tie_break_method_used is distinct from p_tie_break_method) then
        raise exception 'Match % : départage incohérent',m.match_order;end if;
   end if;
 end loop;
 update public.matches set rotation_generated=true,rotation_role=case when match_order=1 then 'king' else 'stream' end,
    round_label=coalesce(round_label,'Roi du terrain · Tour 1')
    where tournament_id=p_tournament_id;
 update public.tournaments set
    rotation_mode='king_of_pitch',king_pitch_id=p_king_pitch_id,middle_pitch_id=null,stream_pitch_id=p_stream_pitch_id,
    tie_break_method=p_tie_break_method,
    rotation_state=jsonb_build_object('initialized',true,'version',3,'matches_per_round',2,'round',1,
      'stop_after_round',false,'started_at',now())
    where id=p_tournament_id;
 return private.swe_king_advance_four_v1(p_tournament_id);
end $$;

revoke all on function public.swe_king_start_four_v1(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.swe_king_start_four_v1(uuid,uuid,uuid,text) to authenticated;

create or replace function private.swe_king_four_after_finish_v1()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 if old.status is distinct from 'finished' and new.status='finished' then
   perform private.swe_king_advance_four_v1(new.tournament_id);
 end if;
 return new;
end $$;
drop trigger if exists swe_king_four_after_match_finish_v1 on public.matches;
create trigger swe_king_four_after_match_finish_v1
 after update of status on public.matches
 for each row execute function private.swe_king_four_after_finish_v1();
revoke all on function private.swe_king_four_after_finish_v1() from public,anon,authenticated;
