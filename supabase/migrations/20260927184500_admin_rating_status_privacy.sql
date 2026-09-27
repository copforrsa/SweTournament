-- Include the administrator in rating sessions and expose a privacy-safe admin report.
create or replace function public.admin_get_tournament_rating_report_v2(p_tournament_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare v_workspace uuid; v_tournament_name text; v_tournament_date date; v_session_status text; v_closes_at timestamptz;
begin
  select workspace_id, coalesce(name,'Swé du '||to_char(tournament_date,'DD/MM/YYYY')), tournament_date into v_workspace,v_tournament_name,v_tournament_date from public.tournaments where id=p_tournament_id;
  if v_workspace is null then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Accès administrateur requis'; end if;
  select status,closes_at into v_session_status,v_closes_at from public.tournament_rating_sessions where tournament_id=p_tournament_id;
  return jsonb_build_object(
    'tournament_id',p_tournament_id, 'tournament_name',v_tournament_name, 'tournament_date',v_tournament_date,
    'status',coalesce(v_session_status,'closed'), 'closes_at',v_closes_at, 'expired',coalesce(v_closes_at<=now(),true),
    'evaluators',coalesce((
      select jsonb_agg(jsonb_build_object('user_id',e.evaluator_user_id,'display_name',coalesce(p.name,nullif(split_part(u.email,'@',1),''),'Membre'),'role',case when wm.role='admin' then 'Administrateur' else 'Co-gestionnaire' end,'completed_at',e.completed_at,'has_voted',e.completed_at is not null) order by case when wm.role='admin' then 0 else 1 end, lower(coalesce(p.name,u.email,'')))
      from public.tournament_rating_evaluators e left join public.workspace_members wm on wm.workspace_id=v_workspace and wm.user_id=e.evaluator_user_id left join public.players p on p.id=wm.linked_player_id left join auth.users u on u.id=e.evaluator_user_id where e.tournament_id=p_tournament_id
    ),'[]'::jsonb),
    'player_addons',coalesce((
      with latest as (select distinct on (h.evaluator_user_id,h.player_id) h.evaluator_user_id,h.player_id from public.player_skill_rating_history h where h.tournament_id=p_tournament_id order by h.evaluator_user_id,h.player_id,h.created_at desc)
      select jsonb_agg(jsonb_build_object('player_id',x.player_id,'player_name',x.player_name,'voters',x.voters,'addon_label','Profil SWÉ enrichi','addon_description','Évaluation prise en compte pour les prochains tirages équilibrés.') order by lower(x.player_name))
      from (select p.id player_id,p.name player_name,count(*)::integer voters from latest l join public.players p on p.id=l.player_id group by p.id,p.name) x
    ),'[]'::jsonb)
  );
end $function$;

revoke all on function public.admin_get_tournament_rating_report_v2(uuid) from public, anon;
grant execute on function public.admin_get_tournament_rating_report_v2(uuid) to authenticated;

-- Backfill administrators for any active rating session without changing completed votes.
insert into public.tournament_rating_evaluators(tournament_id,evaluator_user_id)
select s.tournament_id, wm.user_id from public.tournament_rating_sessions s
join public.tournaments t on t.id=s.tournament_id
join public.workspace_members wm on wm.workspace_id=t.workspace_id
where s.status='open' and wm.role='admin' and coalesce(wm.active,true)
on conflict(tournament_id,evaluator_user_id) do nothing;

-- Future sessions are also created with the active administrator.  This is a
-- targeted replacement of the evaluator enrollment statement in the function.
create or replace function public.finish_tournament_with_payment_report(p_tournament_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare v_t public.tournaments%rowtype; v_report jsonb; v_paid_count integer; v_unpaid_count integer; v_walkin_count integer; v_total_cents integer;
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found then raise exception 'Tournoi introuvable'; end if;
  if not private.is_workspace_admin(v_t.workspace_id) then raise exception 'Accès administrateur requis'; end if;
  select count(*) filter(where tp.manual_paid_at is not null),count(*) filter(where tp.manual_paid_at is null) into v_paid_count,v_unpaid_count from public.tournament_players tp where tp.tournament_id=v_t.id and coalesce(tp.present,false)=true and coalesce(tp.registration_status,'')<>'waitlist' and coalesce(tp.is_substitute,false)=false;
  select count(*),coalesce(sum(w.amount_cents),0) into v_walkin_count,v_total_cents from public.tournament_payment_walkins w where w.tournament_id=v_t.id;
  v_total_cents:=v_total_cents+coalesce(v_paid_count,0)*coalesce(v_t.entry_fee_cents,0);
  v_report:=jsonb_build_object('tournament_id',v_t.id,'tournament_name',v_t.name,'tournament_date',v_t.tournament_date,'entry_fee_cents',coalesce(v_t.entry_fee_cents,0),'paid_count',coalesce(v_paid_count,0),'unpaid_count',coalesce(v_unpaid_count,0),'walkin_count',coalesce(v_walkin_count,0),'total_collected_cents',coalesce(v_total_cents,0),'players',coalesce((select jsonb_agg(jsonb_build_object('player_name',p.name,'paid',tp.manual_paid_at is not null,'paid_at',tp.manual_paid_at,'collector_name',tp.manual_paid_collector_name,'amount_cents',coalesce(v_t.entry_fee_cents,0)) order by lower(p.name)) from public.tournament_players tp join public.players p on p.id=tp.player_id where tp.tournament_id=v_t.id and coalesce(tp.present,false)=true and coalesce(tp.registration_status,'')<>'waitlist' and coalesce(tp.is_substitute,false)=false),'[]'::jsonb),'walkins',coalesce((select jsonb_agg(jsonb_build_object('player_name',w.player_name,'paid',true,'paid_at',w.paid_at,'collector_name',w.collector_name,'amount_cents',w.amount_cents,'walkin',true) order by w.paid_at) from public.tournament_payment_walkins w where w.tournament_id=v_t.id),'[]'::jsonb));
  insert into public.tournament_payment_reports(tournament_id,workspace_id,report_data,created_by,created_at) values(v_t.id,v_t.workspace_id,v_report,auth.uid(),now()) on conflict(tournament_id) do update set report_data=excluded.report_data,created_by=excluded.created_by,created_at=now();
  update public.tournaments set status='finished',registration_open=false where id=v_t.id;
  insert into public.tournament_rating_sessions(tournament_id,workspace_id,opened_at,closes_at,status,opened_by) values(v_t.id,v_t.workspace_id,now(),now()+interval '48 hours','open',auth.uid()) on conflict(tournament_id) do update set opened_at=now(),closes_at=now()+interval '48 hours',status='open',opened_by=auth.uid();
  insert into public.tournament_rating_evaluators(tournament_id,evaluator_user_id) select v_t.id,wm.user_id from public.workspace_members wm where wm.workspace_id=v_t.workspace_id and wm.role in ('admin','coorganizer') and coalesce(wm.active,true) on conflict(tournament_id,evaluator_user_id) do update set completed_at=null;
  return v_report||jsonb_build_object('rating_session_open',true,'rating_closes_at',now()+interval '48 hours');
end $function$;

revoke all on function public.finish_tournament_with_payment_report(uuid) from public, anon;
grant execute on function public.finish_tournament_with_payment_report(uuid) to authenticated;
revoke all on function public.admin_get_tournament_rating_report(uuid) from public, anon, authenticated;
