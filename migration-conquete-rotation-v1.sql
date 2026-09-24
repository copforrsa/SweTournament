-- Conquête : championnat complet puis tableau éliminatoire.
create or replace function public.conquest_generate_championship_v1(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare t public.tournaments%rowtype; ids uuid[]; i integer; j integer; n integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_operational_admin(t.workspace_id) then raise exception 'Seul le pro peut générer le championnat'; end if;
  if lower(coalesce(t.name,'')||' '||coalesce(t.format,'')) not like '%conqu%' then raise exception 'Ce mode est réservé à Conquête'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_role in ('championship','conquest')) then raise exception 'Les matchs Conquête existent déjà'; end if;
  select array_agg(id order by created_at,id) into ids from public.teams where tournament_id=t.id;
  if coalesce(array_length(ids,1),0)<4 then raise exception 'Il faut au moins quatre équipes pour Conquête'; end if;
  for i in 1..array_length(ids,1)-1 loop
    for j in i+1..array_length(ids,1) loop
      n:=n+1;
      insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated)
      values(t.id,ids[i],ids[j],n,'scheduled','Championnat','championship',true);
    end loop;
  end loop;
  update public.tournaments set rotation_mode='conquest',rotation_state=jsonb_build_object('phase','championship','championship_matches',n) where id=t.id;
  return jsonb_build_object('phase','championship','created_matches',n);
end;
$function$;

create or replace function public.conquest_start_v1(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare t public.tournaments%rowtype; ranks uuid[]; n integer; ord integer; created integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_operational_admin(t.workspace_id) then raise exception 'Seul le pro peut lancer Conquête'; end if;
  if not exists(select 1 from public.matches where tournament_id=t.id and rotation_role='championship') then raise exception 'Génère d’abord le championnat'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_role='championship' and status<>'finished') then raise exception 'Termine tous les matchs du championnat avant Conquête'; end if;
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_role='conquest') then raise exception 'La phase Conquête est déjà lancée'; end if;
  select array_agg(team_id order by pts desc,diff desc,goals_for desc,team_id) into ranks from (
    select x.team_id, sum(x.pts) pts, sum(x.gf-x.ga) diff, sum(x.gf) goals_for
    from (
      select home_team_id team_id, case when home_score>away_score then 3 when home_score=away_score then 1 else 0 end pts,home_score gf,away_score ga from public.matches where tournament_id=t.id and rotation_role='championship'
      union all
      select away_team_id, case when away_score>home_score then 3 when away_score=home_score then 1 else 0 end,away_score,home_score from public.matches where tournament_id=t.id and rotation_role='championship'
    ) x group by x.team_id
  ) standings;
  n:=coalesce(array_length(ranks,1),0); ord:=(select coalesce(max(match_order),0) from public.matches where tournament_id=t.id);
  if n=4 then
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values
      (t.id,ranks[1],ranks[3],ord+1,'scheduled','Conquête · Demi-finale 1','conquest',true),
      (t.id,ranks[2],ranks[4],ord+2,'scheduled','Conquête · Demi-finale 2','conquest',true); created:=2;
  elsif n=5 then
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values(t.id,ranks[4],ranks[5],ord+1,'scheduled','Conquête · Barrage','conquest',true); created:=1;
  elsif n>=6 then
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values
      (t.id,ranks[3],ranks[6],ord+1,'scheduled','Conquête · Barrage 1','conquest',true),
      (t.id,ranks[4],ranks[5],ord+2,'scheduled','Conquête · Barrage 2','conquest',true); created:=2;
  else raise exception 'Conquête nécessite au moins quatre équipes'; end if;
  update public.tournaments set rotation_mode='conquest',rotation_state=jsonb_build_object('phase','conquest','ranking',to_jsonb(ranks),'round','opening') where id=t.id;
  return jsonb_build_object('phase','conquest','created_matches',created);
end;
$function$;

revoke all on function public.conquest_generate_championship_v1(uuid) from public;
revoke all on function public.conquest_start_v1(uuid) from public;
grant execute on function public.conquest_generate_championship_v1(uuid) to authenticated;
grant execute on function public.conquest_start_v1(uuid) to authenticated;
