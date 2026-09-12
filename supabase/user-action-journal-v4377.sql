-- Extend the existing immutable security log; never copy tokens, payment references or private text.
create index security_audit_global_time_idx on public.security_audit_log(occurred_at desc,id desc);
create index audit_logs_global_time_idx on public.audit_logs(created_at desc,id desc);
create function private.journal_safe_values(j jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(coalesce(j,'{}'::jsonb)) where key=any(array['name','title','status','role','active','present','registration_status','is_substitute','home_score','away_score','scorer_player_id','assister_player_id','team_id','rating','cardio','dribble','collectif','frappe','decision','registration_open','tournament_date','start_time','format','team_size','max_players','amount_cents','quantity','subscription_plan','can_enter_scores','can_generate_teams','can_create_tournaments','can_invite_coorganizers','can_add_members','can_delete_members','can_view_players','player_ratings_enabled','top_player_enabled','match_ratings_enabled','team_review_status']);
$$;
revoke all on function private.journal_safe_values(jsonb) from public,anon,authenticated;
create function private.journal_business_change() returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb:='{}'; after_row jsonb:='{}'; row_data jsonb; w uuid; tournament uuid; fields jsonb; who uuid:=auth.uid(); target text; wname text;
begin
 if tg_op<>'INSERT' then before_row:=to_jsonb(old);end if;
 if tg_op<>'DELETE' then after_row:=to_jsonb(new);end if;
 row_data:=case when tg_op='DELETE' then before_row else after_row end;
 select coalesce(jsonb_agg(k order by k),'[]') into fields from (select key k from jsonb_object_keys(before_row||after_row) key where before_row->key is distinct from after_row->key and key not in ('updated_at','last_seen_at')) keys;
 if tg_op='UPDATE' and fields='[]'::jsonb then return new;end if;
 w:=nullif(row_data->>'workspace_id','')::uuid;
 if tg_table_name='workspaces' then w:=(row_data->>'id')::uuid;end if;
 tournament:=nullif(row_data->>'tournament_id','')::uuid;
 if w is null and tournament is not null then select workspace_id into w from public.tournaments where id=tournament;end if;
 if w is null and row_data->>'match_id' is not null then select t.workspace_id into w from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=(row_data->>'match_id')::uuid;end if;
 if w is null and row_data->>'team_id' is not null then select t.workspace_id into w from public.teams tm join public.tournaments t on t.id=tm.tournament_id where tm.id=(row_data->>'team_id')::uuid;end if;
 if w is null and row_data->>'player_id' is not null then select workspace_id into w from public.players where id=(row_data->>'player_id')::uuid;end if;
 if w is null and row_data->>'league_id' is not null then select workspace_id into w from public.leagues where id=(row_data->>'league_id')::uuid;end if;
 select name into wname from public.workspaces where id=w;
 if not found then w:=null;end if;
 target:=coalesce(row_data->>'id',concat_ws(':',row_data->>'tournament_id',row_data->>'match_id',row_data->>'team_id',row_data->>'player_id',row_data->>'user_id',row_data->>'global_player_id',row_data->>'swe_id',row_data->>'workspace_id'));
 insert into public.security_audit_log(workspace_id,actor_user_id,actor_type,action,target_type,target_id,metadata)
 values(w,who,case when who is not null then 'authenticated' when auth.jwt()->>'role'='anon' then 'public' else 'system' end,'data.'||tg_table_name||'.'||lower(tg_op),tg_table_name,target,jsonb_strip_nulls(jsonb_build_object('source','journal','workspace_name',wname,'target_name',coalesce(row_data->>'name',row_data->>'title',row_data->>'display_name'),'changed_fields',fields,'before',private.journal_safe_values(before_row),'after',private.journal_safe_values(after_row))));
 return coalesce(new,old);
end $$;
revoke all on function private.journal_business_change() from public,anon,authenticated;
-- Existing goals_audit already records every goal mutation. Do not duplicate it.
do $$ declare r record;begin
 for r in select tablename from pg_tables where schemaname='public' and tablename not in ('audit_logs','security_audit_log','security_rate_limits','public_registration_page_views','season_page_views','stripe_webhook_events','goals') loop
 execute format('create trigger swe_business_journal after insert or update or delete on public.%I for each row execute function private.journal_business_change()',r.tablename);
 end loop;
end $$;

-- Recover only evidence with an actual stored date. No guessed author.
insert into public.security_audit_log(occurred_at,workspace_id,actor_user_id,actor_type,action,target_type,target_id,request_id,metadata)
select h.created_at,h.workspace_id,h.evaluator_user_id,'recorded','history.rating_recorded','player_skill_ratings',h.player_id::text,'rating-history:'||h.id,
jsonb_build_object('source','rating_history','before',private.journal_safe_values(h.old_values),'after',private.journal_safe_values(h.new_values))
from public.player_skill_rating_history h where not exists(select 1 from public.security_audit_log a where a.request_id='rating-history:'||h.id);
insert into public.security_audit_log(occurred_at,workspace_id,actor_user_id,actor_type,action,target_type,target_id,request_id,metadata)
select t.created_at,t.workspace_id,t.created_by,'recorded','history.created','tournaments',t.id::text,'recovered-tournament:'||t.id,jsonb_build_object('source','reconstructed','target_name',t.name,'evidence','Date de création conservée dans le tournoi') from public.tournaments t where not exists(select 1 from public.security_audit_log a where a.request_id='recovered-tournament:'||t.id);
insert into public.security_audit_log(occurred_at,workspace_id,actor_user_id,actor_type,action,target_type,target_id,request_id,metadata)
select p.registered_at,t.workspace_id,null,'unknown','history.registration_recorded','tournament_players',p.tournament_id||':'||p.player_id,'recovered-registration:'||p.tournament_id||':'||p.player_id,
jsonb_build_object('source','reconstructed','target_name',pl.name,'evidence','Date d’inscription conservée ; auteur non authentifié ou inconnu') from public.tournament_players p join public.tournaments t on t.id=p.tournament_id join public.players pl on pl.id=p.player_id where p.registered_at is not null and not exists(select 1 from public.security_audit_log a where a.request_id='recovered-registration:'||p.tournament_id||':'||p.player_id);

create function private.read_user_journal(p_search text,p_from timestamptz,p_to timestamptz,p_before timestamptz,p_key text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis';end if;
 with events as (
 select 'security:'||lpad(a.id::text,20,'0') as key,a.occurred_at as at,a.workspace_id,a.actor_user_id as actor_id,a.actor_type,a.action,a.target_type,a.target_id,
 jsonb_strip_nulls(jsonb_build_object('source',coalesce(a.metadata->>'source','security_audit'),'target_name',a.metadata->>'target_name','workspace_name',a.metadata->>'workspace_name','changed_fields',a.metadata->'changed_fields','before',a.metadata->'before','after',a.metadata->'after','evidence',a.metadata->>'evidence','quantity',a.metadata->'quantity','amount_cents',a.metadata->'amount_cents')) as details
 from public.security_audit_log a
 union all
 select 'audit:'||lpad(a.id::text,20,'0'),a.created_at,a.workspace_id,a.user_id,case when a.user_id is null then 'unknown' else 'recorded' end,a.action,a.entity_type,a.entity_id::text,jsonb_build_object('source','audit_logs','match_id',a.details->'match_id') from public.audit_logs a
 ), labelled as (
 select e.*,coalesce(nullif(g.display_name,''),u.email,case when e.actor_id is not null then e.actor_id::text when e.actor_type='public' then 'Visiteur non connecté' when e.actor_type='system' then 'Système / auteur non identifié' else 'Auteur inconnu' end) as actor_name,coalesce(w.name,e.details->>'workspace_name','—') as workspace_name
 from events e left join auth.users u on u.id=e.actor_id left join public.global_player_profiles g on g.user_id=e.actor_id left join public.workspaces w on w.id=e.workspace_id
 ), page as (
 select * from labelled e where (p_from is null or e.at>=p_from) and (p_to is null or e.at<=p_to) and (p_before is null or (e.at,e.key)<(p_before,coalesce(p_key,'')))
 and (nullif(btrim(p_search),'') is null or concat_ws(' ',e.actor_name,e.workspace_name,e.action,e.target_type,e.details->>'target_name') ilike '%'||left(p_search,200)||'%') order by e.at desc,e.key desc limit 51
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(x order by x.at desc,x.key desc) from (select * from page order by at desc,key desc limit 50)x),'[]'::jsonb),'has_more',(select count(*)>50 from page)) into result;
 return result;
end $$;
revoke all on function private.read_user_journal(text,timestamptz,timestamptz,timestamptz,text) from public,anon;
grant execute on function private.read_user_journal(text,timestamptz,timestamptz,timestamptz,text) to authenticated;
create function public.super_admin_get_user_journal(p_search text default '',p_from timestamptz default null,p_to timestamptz default null,p_before timestamptz default null,p_key text default null) returns jsonb language sql security invoker set search_path='' as $$select private.read_user_journal(p_search,p_from,p_to,p_before,p_key);$$;
revoke all on function public.super_admin_get_user_journal(text,timestamptz,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.super_admin_get_user_journal(text,timestamptz,timestamptz,timestamptz,text) to authenticated;

create unique index security_audit_session_visit_idx on public.security_audit_log(actor_user_id,request_id) where action='app.session_open';
create function private.record_app_visit(p_visit uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_visit is null then raise exception 'Connexion requise';end if;
 insert into public.security_audit_log(actor_user_id,actor_type,action,target_type,request_id,metadata) values(auth.uid(),'authenticated','app.session_open','application',p_visit::text,'{"source":"journal"}') on conflict(actor_user_id,request_id) where action='app.session_open' do nothing;
end $$;
revoke all on function private.record_app_visit(uuid) from public,anon;
grant execute on function private.record_app_visit(uuid) to authenticated;
create function public.record_my_app_visit(p_visit uuid) returns void language sql security invoker set search_path='' as $$select private.record_app_visit(p_visit);$$;
revoke all on function public.record_my_app_visit(uuid) from public,anon;
grant execute on function public.record_my_app_visit(uuid) to authenticated;
create trigger swe_business_journal after insert or update or delete on private.match_test_runs for each row execute function private.journal_business_change();
create trigger swe_business_journal after insert or update or delete on private.tournament_test_runs for each row execute function private.journal_business_change();
create trigger swe_business_journal after insert or update or delete on private.king_format_rules for each row execute function private.journal_business_change();
