CREATE OR REPLACE FUNCTION public.conquest_generate_championship_v1(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.tournaments%rowtype; ids uuid[]; i integer; j integer; n integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_operational_admin(t.workspace_id) then raise exception 'Seul le pro peut générer le championnat'; end if;
  if lower(coalesce(t.name,'')||' '||coalesce(t.format,'')) not like '%conqu%' then raise exception 'Ce mode est réservé à Conquête'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_role in ('championship','conquest')) then raise exception 'Les matchs Conquête existent déjà'; end if;
  select array_agg(id order by created_at,id) into ids from public.teams where tournament_id=t.id;
  if coalesce(array_length(ids,1),0)<4 then raise exception 'Il faut au moins quatre équipes pour Conquête'; end if;
  if t.id='6abc6e0c-0bc0-4057-8c54-01c517877f46'::uuid then
    select array_agg(tm.id order by wanted.position) into ids
    from unnest(array['Team Mika','FC RAY','L''équipe du Dimanche','Bleus','Blancs','Noirs']) with ordinality wanted(name,position)
    join public.teams tm on tm.tournament_id=t.id and tm.name=wanted.name;
    if array_length(ids,1) is distinct from 6 then raise exception 'Les six équipes du calendrier sont requises'; end if;
    for i,j,n in select a,b,ord::integer from (values
      (1,5,1),(2,4,2),(3,6,3),
      (1,4,4),(5,6,5),(2,3,6),
      (4,3,7),(5,2,8),(1,6,9),
      (6,2,10),(1,3,11),(4,5,12),
      (3,5,13),(6,4,14),(1,2,15)
    ) schedule(a,b,ord) order by ord loop
      insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated)
      values(t.id,ids[i],ids[j],n,'scheduled','Tour '||((n-1)/3+1)||' · '||
        (array['Carrefour','Mercedes','Boulogne'])[(n-1)%3+1],'championship',true);
    end loop;
  else
  for i in 1..array_length(ids,1)-1 loop
    for j in i+1..array_length(ids,1) loop
      n:=n+1;
      insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated)
      values(t.id,ids[i],ids[j],n,'scheduled','Championnat','championship',true);
    end loop;
  end loop;
  end if;
  update public.tournaments set rotation_mode='conquest',rotation_state=jsonb_build_object('phase','championship','championship_matches',n) where id=t.id;
  return jsonb_build_object('phase','championship','created_matches',n);
end;
$function$;
