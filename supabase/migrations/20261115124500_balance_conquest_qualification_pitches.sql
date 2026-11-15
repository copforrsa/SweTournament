-- Six teams play five simultaneous qualification pools on three pitches.
-- This assignment makes every team use Carrefour, Mercedes and Boulogne,
-- with no team using any pitch more than twice.
create or replace function public.conquest_create_qualification_v2(p_tournament_id uuid, p_recreate boolean default false)
returns jsonb
language plpgsql security definer set search_path='public','private'
as $$
declare
  t public.tournaments%rowtype;
  v_teams uuid[];
  v_rotation uuid[];
  v_count integer;
  v_slots integer;
  v_round integer;
  v_pair integer;
  v_index integer;
  v_created integer:=0;
  v_last uuid;
  v_home uuid;
  v_away uuid;
  v_pitch_slot integer;
  v_pitch_name text;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.format<>'conquest' then raise exception 'Ce parcours est réservé à Conquête'; end if;
  perform public.conquest_assert_operator_v2(t.workspace_id,t.id);

  select array_agg(id order by created_at,id) into v_teams from public.teams where tournament_id=t.id;
  v_count:=coalesce(array_length(v_teams,1),0);
  if v_count not between 4 and 6 then raise exception 'Conquête nécessite 4, 5 ou 6 équipes validées'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_generated
    and (competition_type in ('championship_qualification','conquest_playoff','classification') or rotation_role in ('conquest','conquest_league','championship','conquest_v2'))
    and status='finished') then
    raise exception 'Recréation verrouillée : un résultat est déjà enregistré';
  end if;
  if exists(select 1 from public.tournament_format_workflows where tournament_id=t.id) and not p_recreate then
    raise exception 'Le workflow existe déjà. Utilise la recréation avant le premier résultat.';
  end if;
  if p_recreate then
    delete from public.goals g using public.matches m where g.match_id=m.id and m.tournament_id=t.id and m.rotation_generated
      and (m.competition_type in ('championship_qualification','conquest_playoff','classification') or m.rotation_role in ('conquest','conquest_league','championship','conquest_v2'));
    delete from public.matches where tournament_id=t.id and rotation_generated
      and (competition_type in ('championship_qualification','conquest_playoff','classification') or rotation_role in ('conquest','conquest_league','championship','conquest_v2'));
    delete from public.tournament_format_workflows where tournament_id=t.id;
  end if;

  insert into public.tournament_format_workflows(tournament_id,format,phase,config,state)
    values(t.id,'conquest','qualification',jsonb_build_object('team_count',v_count,'mercy_goal_difference',mod(v_count,2)=1),jsonb_build_object('created_at',now()))
    on conflict(tournament_id) do update set format='conquest',phase='qualification',config=excluded.config,state=excluded.state,version=2,updated_at=now();

  v_slots:=case when mod(v_count,2)=0 then v_count else v_count+1 end;
  v_rotation:=v_teams;
  if v_slots>v_count then v_rotation:=array_append(v_rotation,null::uuid); end if;
  for v_round in 1..v_slots-1 loop
    for v_pair in 1..v_slots/2 loop
      v_home:=v_rotation[v_pair];
      v_away:=v_rotation[v_slots-v_pair+1];
      if v_home is not null and v_away is not null then
        v_created:=v_created+1;
        perform public.conquest_add_match_v2(t.id,v_home,v_away,'championship_qualification','qualification','qualification_'||v_round||'_'||v_pair,'Poule '||v_round);

        -- With six teams and the three reserved pitches, this is the fairest
        -- possible distribution: every team visits all three pitches (1/2/2).
        if v_count=6 and coalesce(cardinality(t.reserved_pitch_ids),0)>=3 then
          v_pitch_slot:=case v_round
            when 1 then v_pair
            when 2 then case v_pair when 1 then 3 when 2 then 2 else 1 end
            when 3 then v_pair
            when 4 then case v_pair when 1 then 2 when 2 then 3 else 1 end
            when 5 then case v_pair when 1 then 2 when 2 then 3 else 1 end
          end;
          select name into v_pitch_name
          from public.sports_pitches
          where id=t.reserved_pitch_ids[v_pitch_slot] and active;
          if v_pitch_name is null then raise exception 'Un terrain réservé est introuvable ou inactif'; end if;
          update public.matches
          set pitch=v_pitch_name
          where tournament_id=t.id
            and competition_type='championship_qualification'
            and format_slot='qualification_'||v_round||'_'||v_pair;
        end if;
      end if;
    end loop;
    v_last:=v_rotation[v_slots];
    for v_index in reverse 3..v_slots loop v_rotation[v_index]:=v_rotation[v_index-1]; end loop;
    v_rotation[2]:=v_last;
  end loop;

  update public.tournaments set rotation_mode='conquest', rotation_state=coalesce(rotation_state,'{}'::jsonb)||jsonb_build_object('format_workflow',jsonb_build_object('format','conquest','phase','qualification','team_count',v_count,'round_count',v_slots-1,'mercy_goal_difference',mod(v_count,2)=1,'version',2)) where id=t.id;
  return jsonb_build_object('phase','qualification','created_matches',v_created,'team_count',v_count,'pool_count',v_slots-1,'mercy_goal_difference',mod(v_count,2)=1);
end;
$$;

notify pgrst,'reload schema';
