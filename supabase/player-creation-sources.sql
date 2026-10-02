create or replace function public.admin_get_player_creation_sources_v1(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (private.is_platform_super_admin() or private.is_workspace_operational_admin(p_workspace_id)) then raise exception 'Accès administrateur requis'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('player_id',p.id,'added_at',coalesce(a.occurred_at,p.created_at),'added_by',case when a.id is null then 'Auteur non enregistré' when a.actor_user_id is null then 'Inscription publique / système' else coalesce(actor.name,gp.display_name,'Compte identifié') end))
 from public.players p
 left join lateral(select l.id,l.actor_user_id,l.occurred_at from public.security_audit_log l where l.workspace_id=p_workspace_id and l.target_type='players' and l.target_id=p.id::text and l.action='data.players.insert' order by l.occurred_at,l.id limit 1)a on true
 left join public.global_player_profiles gp on gp.user_id=a.actor_user_id
 left join lateral(select ap.name from public.players ap where ap.global_player_id=gp.id and ap.workspace_id=p_workspace_id order by ap.created_at limit 1)actor on true
 where p.workspace_id=p_workspace_id),'[]'::jsonb);
end $$;
revoke all on function public.admin_get_player_creation_sources_v1(uuid) from public,anon;
grant execute on function public.admin_get_player_creation_sources_v1(uuid) to authenticated;
