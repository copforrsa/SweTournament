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
    delete from public.team_players tp using public.teams tm where tm.id=tp.team_id and tm.tournament_id=v_t.id and tm.is_preformed and not private.is_locked_team_player_v4465(tp.team_id,tp.player_id);
    delete from public.teams where tournament_id=v_t.id and coalesce(is_preformed,false)=false;
    for v_team in select * from jsonb_to_recordset(coalesce(v_snapshot->'teams','[]'::jsonb)) as x(team_id uuid,name text,color text,is_preformed boolean,players jsonb) loop
      if coalesce(v_team.is_preformed,false) then
        select id into v_team_id from public.teams where tournament_id=v_t.id and is_preformed and (id=v_team.team_id or (v_team.team_id is null and name=v_team.name)) limit 1;
        if v_team_id is null then raise exception 'Équipe préconstituée modifiée : relance le tirage'; end if;
        if exists(select 1 from public.team_players tp where tp.team_id=v_team_id and private.is_locked_team_player_v4465(tp.team_id,tp.player_id) and not exists(select 1 from jsonb_array_elements(v_team.players) p where p->>'id'=tp.player_id::text)) then raise exception 'Les membres confirmés ont changé : relance le tirage'; end if;
        delete from public.team_players where team_id=v_team_id and not private.is_locked_team_player_v4465(team_id,player_id);
      else
      insert into public.teams(tournament_id,name,color,is_preformed) values(v_t.id,coalesce(v_team.name,'Équipe'),v_team.color,false) returning id into v_team_id;
      end if;
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
  update public.team_draw_room_proposals set is_current=false where tournament_id=v_t.id and is_current;
  update public.team_draw_room_proposals set is_current=true,published_at=now() where tournament_id=v_t.id and id=p_proposal_id;
  update public.tournaments set team_review_status='approved',team_review_deadline=null where id=v_t.id;
  return jsonb_build_object('published',true,'proposal_id',p_proposal_id);
end;
$function$;
