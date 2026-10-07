create or replace function public.public_reactivate_inactive_member(p_token uuid,p_tournament_id uuid,p_player_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $f$
declare wid uuid;t public.tournaments%rowtype;
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte joueur pour réactiver ton profil';end if;
 select id into wid from public.workspaces where public_token=p_token and public_enabled;
 select * into t from public.tournaments where id=p_tournament_id and workspace_id=wid;
 if not found or t.status<>'draft' or not t.registration_open or t.registration_deadline<=now() then raise exception 'Les inscriptions sont fermées';end if;
 if p_player_id is null then
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.players where workspace_id=wid and is_group_member and not active and activity_status_source='automatic_missed_4' and (private.fast_admin(wid) or exists(select 1 from public.global_player_profiles g where g.id=players.global_player_id and g.user_id=auth.uid()))),'[]'::jsonb);
 end if;
 update public.players set active=true,activity_status_source='manual',activity_status_updated_at=now(),activity_tracking_from=now(),inactivity_reason=null where id=p_player_id and workspace_id=wid and is_group_member and not active and activity_status_source='automatic_missed_4' and (private.fast_admin(wid) or exists(select 1 from public.global_player_profiles g where g.id=players.global_player_id and g.user_id=auth.uid()));
 if not found then raise exception 'Ce joueur n’est pas réactivable depuis ce lien';end if;
 return jsonb_build_object('reactivated',true,'player_id',p_player_id);
end;$f$;
revoke all on function public.public_reactivate_inactive_member(uuid,uuid,uuid) from public;
grant execute on function public.public_reactivate_inactive_member(uuid,uuid,uuid) to authenticated;
revoke all on function public.public_reactivate_inactive_member(uuid,uuid,uuid) from anon;
