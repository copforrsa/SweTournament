create unique index security_legacy_audit_id_idx on public.security_audit_log(request_id) where metadata->>'source'='audit_logs';
create function private.preserve_legacy_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.security_audit_log(occurred_at,workspace_id,actor_user_id,actor_type,action,target_type,target_id,request_id,metadata)
 values(new.created_at,new.workspace_id,new.user_id,case when new.user_id is null then 'unknown' else 'recorded' end,new.action,new.entity_type,new.entity_id::text,'legacy-audit:'||new.id,jsonb_strip_nulls(jsonb_build_object('source','audit_logs','workspace_name',(select name from public.workspaces where id=new.workspace_id),'match_id',new.details->'match_id')))
 on conflict(request_id) where metadata->>'source'='audit_logs' do nothing;return new;
end $$;
revoke all on function private.preserve_legacy_audit() from public,anon,authenticated;
create trigger preserve_platform_journal after insert on public.audit_logs for each row execute function private.preserve_legacy_audit();
insert into public.security_audit_log(occurred_at,workspace_id,actor_user_id,actor_type,action,target_type,target_id,request_id,metadata)
select a.created_at,a.workspace_id,a.user_id,case when a.user_id is null then 'unknown' else 'recorded' end,a.action,a.entity_type,a.entity_id::text,'legacy-audit:'||a.id,jsonb_strip_nulls(jsonb_build_object('source','audit_logs','workspace_name',w.name,'match_id',a.details->'match_id')) from public.audit_logs a left join public.workspaces w on w.id=a.workspace_id
on conflict(request_id) where metadata->>'source'='audit_logs' do nothing;
update public.security_audit_log a set metadata=a.metadata||jsonb_build_object('workspace_name',w.name) from public.workspaces w where w.id=a.workspace_id and a.metadata->>'workspace_name' is null;

create or replace function private.read_user_journal(p_search text,p_from timestamptz,p_to timestamptz,p_before timestamptz,p_key text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis';end if;
 with events as (
 select 'security:'||lpad(a.id::text,20,'0') as key,a.occurred_at as at,a.workspace_id,a.actor_user_id as actor_id,a.actor_type,a.action,a.target_type,a.target_id,
 jsonb_strip_nulls(jsonb_build_object('source',coalesce(a.metadata->>'source','security_audit'),'target_name',a.metadata->>'target_name','workspace_name',a.metadata->>'workspace_name','changed_fields',a.metadata->'changed_fields','before',private.journal_safe_values(a.metadata->'before'),'after',private.journal_safe_values(a.metadata->'after'),'evidence',a.metadata->>'evidence','quantity',a.metadata->'quantity','amount_cents',a.metadata->'amount_cents')) as details
 from public.security_audit_log a
 union all
 select 'audit:'||lpad(a.id::text,20,'0'),a.created_at,a.workspace_id,a.user_id,case when a.user_id is null then 'unknown' else 'recorded' end,a.action,a.entity_type,a.entity_id::text,jsonb_build_object('source','audit_logs','match_id',a.details->'match_id') from public.audit_logs a where not exists(select 1 from public.security_audit_log archived where archived.request_id='legacy-audit:'||a.id and archived.metadata->>'source'='audit_logs')
 ), labelled as (
 select e.*,coalesce(nullif(g.display_name,''),u.email,case when e.actor_id is not null then e.actor_id::text when e.actor_type='public' then 'Visiteur non connecté' when e.actor_type='system' then 'Système / auteur non identifié' else 'Auteur inconnu' end) as actor_name,coalesce(w.name,e.details->>'workspace_name','—') as workspace_name
 from events e left join auth.users u on u.id=e.actor_id left join public.global_player_profiles g on g.user_id=e.actor_id left join public.workspaces w on w.id=e.workspace_id
 ), page as (
 select * from labelled e where (p_from is null or e.at>=p_from) and (p_to is null or e.at<=p_to) and (p_before is null or (e.at,e.key)<(p_before,coalesce(p_key,'')))
 and (nullif(btrim(p_search),'') is null or concat_ws(' ',e.actor_name,e.workspace_name,e.action,e.target_type,e.details->>'target_name') ilike '%'||left(p_search,200)||'%') order by e.at desc,e.key desc limit 51
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(x order by x.at desc,x.key desc) from (select * from page order by at desc,key desc limit 50)x),'[]'::jsonb),'has_more',(select count(*)>50 from page)) into result;
 return result;
end $$;
