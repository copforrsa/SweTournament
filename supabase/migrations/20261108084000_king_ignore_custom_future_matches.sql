-- Manually added friendly games cannot block the next official 3-pitch round.
CREATE OR REPLACE FUNCTION private.swe_king_advance_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_t public.tournaments%rowtype;
  v_round int;
  v_count int:=0;
  v_finished int:=0;
  v_m public.matches%rowtype;
  v_winner uuid;
  v_loser uuid;
  v_kw uuid; v_kl uuid; v_mw uuid; v_ml uuid; v_sw uuid; v_sl uuid;
  v_king_pitch text;v_middle_pitch text;v_stream_pitch text;
  v_new_round int;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found or v_t.format<>'king_of_pitch'
     or v_t.rotation_mode<>'king_of_pitch'
     or coalesce((v_t.rotation_state->>'initialized')::boolean,false)=false
     or coalesce((v_t.rotation_state->>'version')::integer,0)<2
  then return jsonb_build_object('generated',false,'reason','inactive'); end if;
  v_round:=coalesce((v_t.rotation_state->>'round')::int,1);
  if v_round<1 or v_round>=1000 then
    raise exception 'Nombre maximal de tours atteint';
  end if;
  select count(*),count(*) filter(where status='finished')
    into v_count,v_finished
    from public.matches
    where tournament_id=p_tournament_id
      and rotation_generated=true
      and match_order between 3*v_round-2 and 3*v_round;
  if v_count<>3 or v_finished<>3 then
    return jsonb_build_object('generated',false,'reason','waiting','round',v_round,'finished',v_finished,'total',v_count);
  end if;
  if coalesce((v_t.rotation_state->>'stop_after_round')::boolean,false) then
    return jsonb_build_object('generated',false,'reason','paused','round',v_round);
  end if;
  if exists(select 1 from public.matches where tournament_id=p_tournament_id and rotation_generated=true and match_order>3*v_round) then
    raise exception 'Des rencontres existent déjà après le tour %',v_round;
  end if;

  for v_m in
    select * from public.matches
    where tournament_id=p_tournament_id
      and rotation_generated=true
      and match_order between 3*v_round-2 and 3*v_round
    order by match_order
  loop
    if v_m.home_score>v_m.away_score then
      v_winner:=v_m.home_team_id;v_loser:=v_m.away_team_id;
    elsif v_m.away_score>v_m.home_score then
      v_winner:=v_m.away_team_id;v_loser:=v_m.home_team_id;
    else
      if v_m.tie_break_winner_team_id is null
        or v_m.tie_break_winner_team_id not in (v_m.home_team_id,v_m.away_team_id) then
        raise exception 'Match % à égalité : départage requis avant la rotation',v_m.match_order;
      end if;
      v_winner:=v_m.tie_break_winner_team_id;
      v_loser:=case when v_winner=v_m.home_team_id then v_m.away_team_id else v_m.home_team_id end;
    end if;
    if v_m.rotation_role='king' then
      v_kw:=v_winner;v_kl:=v_loser;
    elsif v_m.rotation_role='middle' then
      v_mw:=v_winner;v_ml:=v_loser;
    elsif v_m.rotation_role='stream' then
      v_sw:=v_winner;v_sl:=v_loser;
    else
      raise exception 'Rôle de terrain absent pour le match %',v_m.match_order;
    end if;
  end loop;
  if v_kw is null or v_kl is null or v_mw is null or v_ml is null or v_sw is null or v_sl is null then
    raise exception 'Trois rôles de terrain sont requis pour la rotation';
  end if;
  if (select count(distinct team_id) from unnest(array[v_kw,v_kl,v_mw,v_ml,v_sw,v_sl]) as ids(team_id))<>6 then
    raise exception 'Six équipes différentes sont requises pour la rotation';
  end if;
  select name into v_king_pitch from public.sports_pitches where id=v_t.king_pitch_id;
  select name into v_middle_pitch from public.sports_pitches where id=v_t.middle_pitch_id;
  select name into v_stream_pitch from public.sports_pitches where id=v_t.stream_pitch_id;
  if v_king_pitch is null or v_middle_pitch is null or v_stream_pitch is null then
    raise exception 'Rôles des terrains incomplets';
  end if;

  v_new_round:=v_round+1;
  insert into public.matches(
    tournament_id,home_team_id,away_team_id,match_order,pitch,
    status,round_label,rotation_role,rotation_generated
  ) values
    (p_tournament_id,v_kw,v_mw,3*v_round+1,v_king_pitch,'scheduled','Roi du terrain · Tour '||v_new_round,'king',true),
    (p_tournament_id,v_kl,v_sw,3*v_round+2,v_middle_pitch,'scheduled','Roi du terrain · Tour '||v_new_round,'middle',true),
    (p_tournament_id,v_ml,v_sl,3*v_round+3,v_stream_pitch,'scheduled','Roi du terrain · Tour '||v_new_round,'stream',true);

  update public.tournaments set rotation_state =
    jsonb_set(
      jsonb_set(rotation_state,'{round}',to_jsonb(v_new_round),true),
      '{king_holder_team_id}',to_jsonb(v_kw),true
    )
    where id=p_tournament_id;
  return jsonb_build_object('generated',true,'round',v_new_round,'matches',3);
end;
$function$

