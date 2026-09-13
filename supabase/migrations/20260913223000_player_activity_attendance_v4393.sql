-- V43.93 — suivi d'activité des joueurs et feuille de présence tournoi.

alter table public.players
  add column if not exists activity_status_source text not null default 'manual',
  add column if not exists activity_status_updated_at timestamptz not null default now(),
  add column if not exists activity_tracking_from timestamptz,
  add column if not exists inactivity_reason text;

update public.players
set activity_tracking_from=coalesce(joined_group_at,created_at,now())
where activity_tracking_from is null;

alter table public.players
  alter column activity_tracking_from set default now(),
  alter column activity_tracking_from set not null;

do $$ begin
  alter table public.players add constraint players_activity_status_source_check
    check (activity_status_source in ('manual','automatic_missed_4'));
exception when duplicate_object then null; end $$;

alter table public.tournament_players
  add column if not exists attendance_status text not null default 'expected',
  add column if not exists delay_minutes integer not null default 0,
  add column if not exists attendance_note text,
  add column if not exists attendance_updated_at timestamptz,
  add column if not exists attendance_updated_by uuid references auth.users(id);

do $$ begin
  alter table public.tournament_players add constraint tournament_players_attendance_status_check
    check (attendance_status in ('expected','on_time','late','absent','late_withdrawal'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tournament_players add constraint tournament_players_delay_minutes_check
    check (delay_minutes between 0 and 240);
exception when duplicate_object then null; end $$;

create or replace function private.refresh_workspace_player_activity(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare v_changed integer:=0;
begin
  update public.players p
  set active=false,
      activity_status_source='automatic_missed_4',
      activity_status_updated_at=now(),
      inactivity_reason='4 tournois consécutifs manqués'
  where p.workspace_id=p_workspace_id
    and p.is_group_member is not false
    and p.active=true
    and (
      select count(*)=4
             and count(*) filter (where exists (
               select 1
               from public.tournament_players tp
               where tp.tournament_id=recent.id
                 and tp.player_id=p.id
                 and tp.present=true
                 and coalesce(tp.registration_status,'confirmed') not in ('waitlist','cancelled','late_withdrawal')
                 and coalesce(tp.attendance_status,'expected') not in ('absent','late_withdrawal')
             ))=0
      from (
        select t.id
        from public.tournaments t
        where t.workspace_id=p_workspace_id
          and t.status='finished'
          and t.format<>'league'
          and t.tournament_date>=p.activity_tracking_from::date
        order by t.tournament_date desc,t.created_at desc
        limit 4
      ) recent
    );
  get diagnostics v_changed=row_count;
  return v_changed;
end $$;

revoke all on function private.refresh_workspace_player_activity(uuid) from public,anon,authenticated;

create or replace function public.admin_set_player_active(p_player_id uuid,p_active boolean)
returns boolean
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.players where id=p_player_id;
  if v_workspace is null then raise exception 'Joueur introuvable'; end if;
  if (select auth.uid()) is null or not private.is_workspace_admin(v_workspace) then
    raise exception 'Seul l’administrateur peut modifier le statut du joueur';
  end if;
  update public.players
  set active=p_active,
      activity_status_source='manual',
      activity_status_updated_at=now(),
      activity_tracking_from=case when p_active then now() else activity_tracking_from end,
      inactivity_reason=case when p_active then null else 'Désactivé manuellement par l’administrateur' end
  where id=p_player_id;
  return true;
end $$;

revoke all on function public.admin_set_player_active(uuid,boolean) from public,anon;
grant execute on function public.admin_set_player_active(uuid,boolean) to authenticated;

create or replace function public.admin_set_tournament_attendance_v1(
  p_tournament_id uuid,
  p_player_id uuid,
  p_status text,
  p_delay_minutes integer default 0,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare t public.tournaments%rowtype; v_status text:=lower(trim(coalesce(p_status,''))); v_delay integer:=greatest(0,least(240,coalesce(p_delay_minutes,0))); v_row public.tournament_players%rowtype;
begin
  select * into t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if (select auth.uid()) is null or not private.is_workspace_admin(t.workspace_id) then
    raise exception 'Seul l’administrateur peut confirmer les présences';
  end if;
  if v_status not in ('expected','on_time','late','absent','late_withdrawal') then raise exception 'Statut de présence invalide'; end if;
  if not exists(select 1 from public.players where id=p_player_id and workspace_id=t.workspace_id) then raise exception 'Joueur hors de ce groupe'; end if;

  update public.tournament_players
  set attendance_status=v_status,
      delay_minutes=case when v_status='late' then v_delay else 0 end,
      attendance_note=nullif(left(trim(coalesce(p_note,'')),240),''),
      attendance_updated_at=now(),
      attendance_updated_by=(select auth.uid()),
      present=case when v_status in ('absent','late_withdrawal') then false else true end,
      registration_status=case when v_status='late_withdrawal' then 'late_withdrawal'
                               when registration_status in ('cancelled','late_withdrawal') then 'confirmed'
                               else registration_status end,
      deregistered_at=case when v_status='late_withdrawal' then coalesce(deregistered_at,now())
                           when v_status in ('expected','on_time','late') then null else deregistered_at end
  where tournament_id=p_tournament_id and player_id=p_player_id
  returning * into v_row;
  if not found then raise exception 'Ce joueur n’est pas inscrit à ce tournoi'; end if;
  perform private.recalculate_tournament_substitute_flags(p_tournament_id);
  return to_jsonb(v_row);
end $$;

revoke all on function public.admin_set_tournament_attendance_v1(uuid,uuid,text,integer,text) from public,anon;
grant execute on function public.admin_set_tournament_attendance_v1(uuid,uuid,text,integer,text) to authenticated;

create or replace function private.refresh_player_activity_when_tournament_finishes()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if new.status='finished' and old.status is distinct from new.status then
    perform private.refresh_workspace_player_activity(new.workspace_id);
  end if;
  return new;
end $$;

drop trigger if exists swe_refresh_player_activity_after_tournament on public.tournaments;
create trigger swe_refresh_player_activity_after_tournament
after update of status on public.tournaments
for each row execute function private.refresh_player_activity_when_tournament_finishes();

comment on column public.players.activity_status_source is 'manual ou automatic_missed_4';
comment on column public.players.activity_tracking_from is 'Début de la fenêtre utilisée pour calculer quatre tournois consécutifs manqués.';
comment on column public.tournament_players.attendance_status is 'Feuille de présence administrateur : expected, on_time, late, absent, late_withdrawal.';
