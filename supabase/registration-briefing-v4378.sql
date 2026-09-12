-- Extend the existing selected-player public lookup. No management rights are granted.
CREATE OR REPLACE FUNCTION private.read_public_registration_rating(p_token uuid, p_tournament_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_workspace uuid; v_name text; v_rating numeric;
begin
 select w.id,w.rating_group_name into v_workspace,v_name from public.workspaces w
 join public.tournaments t on t.workspace_id=w.id and t.id=p_tournament_id
 where w.public_token=p_token and w.public_enabled=true;
 if v_workspace is null or not exists(select 1 from public.players p where p.id=p_player_id and p.workspace_id=v_workspace
   and (coalesce(p.is_group_member,true) or exists(select 1 from public.tournament_players tp where tp.tournament_id=p_tournament_id and tp.player_id=p.id))) then
   return null;
 end if;
 select round(avg(r.rating)::numeric,1) into v_rating from public.player_skill_ratings r
 where r.workspace_id=v_workspace and r.player_id=p_player_id and r.rating is not null;
 return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',v_rating,'is_coorganizer',exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.linked_player_id=p_player_id and wm.active and wm.role='coorganizer'));
end $function$
