-- Chaque fin de tour Conquête ouvre automatiquement le tour suivant.
create or replace function private.conquest_auto_advance_v1()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare t public.tournaments%rowtype; ranks uuid[]; n integer; ord integer; a uuid; b uuid; c uuid; d uuid;
begin
  if new.status<>'finished' or old.status='finished' then return new; end if;
  select * into t from public.tournaments where id=new.tournament_id for update;
  if not found or t.rotation_mode<>'conquest' then return new; end if;
  select array_agg(value::uuid order by ordinality) into ranks from jsonb_array_elements_text(coalesce(t.rotation_state->'ranking','[]'::jsonb)) with ordinality;
  n:=coalesce(array_length(ranks,1),0);
  ord:=(select coalesce(max(match_order),0) from public.matches where tournament_id=t.id);
  if exists(select 1 from public.matches where tournament_id=t.id and rotation_role='conquest' and round_label='Conquête · Finale') then return new; end if;
  if n=5 and not exists(select 1 from public.matches where tournament_id=t.id and rotation_role='conquest' and round_label like 'Conquête · Demi%')
     and (select count(*) from public.matches where tournament_id=t.id and round_label='Conquête · Barrage' and status='finished')=1 then
    select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id end into a from public.matches where tournament_id=t.id and round_label='Conquête · Barrage';
    if a is null then return new; end if;
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values
      (t.id,ranks[1],a,ord+1,'scheduled','Conquête · Demi-finale 1','conquest',true),(t.id,ranks[2],ranks[3],ord+2,'scheduled','Conquête · Demi-finale 2','conquest',true);
  elsif n>=6 and not exists(select 1 from public.matches where tournament_id=t.id and rotation_role='conquest' and round_label like 'Conquête · Demi%')
     and (select count(*) from public.matches where tournament_id=t.id and round_label like 'Conquête · Barrage%' and status='finished')=2 then
    select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id end into a from public.matches where tournament_id=t.id and round_label='Conquête · Barrage 1';
    select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id end into b from public.matches where tournament_id=t.id and round_label='Conquête · Barrage 2';
    if a is null or b is null then return new; end if;
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values
      (t.id,ranks[1],b,ord+1,'scheduled','Conquête · Demi-finale 1','conquest',true),(t.id,ranks[2],a,ord+2,'scheduled','Conquête · Demi-finale 2','conquest',true);
  end if;
  if not exists(select 1 from public.matches where tournament_id=t.id and rotation_role='conquest' and round_label='Conquête · Finale')
     and (select count(*) from public.matches where tournament_id=t.id and round_label like 'Conquête · Demi%' and status='finished')=2 then
    select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id end into c from public.matches where tournament_id=t.id and round_label='Conquête · Demi-finale 1';
    select case when home_score>away_score then home_team_id when away_score>home_score then away_team_id end into d from public.matches where tournament_id=t.id and round_label='Conquête · Demi-finale 2';
    if c is null or d is null then return new; end if;
    insert into public.matches(tournament_id,home_team_id,away_team_id,match_order,status,round_label,rotation_role,rotation_generated) values(t.id,c,d,ord+1,'scheduled','Conquête · Finale','conquest',true);
  end if;
  return new;
end;
$function$;

drop trigger if exists conquest_auto_advance_after_score_v1 on public.matches;
create trigger conquest_auto_advance_after_score_v1 after update of status on public.matches for each row execute function private.conquest_auto_advance_v1();
