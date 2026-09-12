-- Public lookup is limited to one selected player in one shared tournament.
alter table public.workspaces add column if not exists rating_group_name text
 check (rating_group_name is null or (rating_group_name=btrim(rating_group_name) and char_length(rating_group_name) between 1 and 120));

create or replace function private.read_public_registration_rating(p_token uuid,p_tournament_id uuid,p_player_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
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
 return jsonb_build_object('player_id',p_player_id,'rating_group_name',v_name,'avg_rating',v_rating);
end $$;
revoke all on function private.read_public_registration_rating(uuid,uuid,uuid) from public;

create or replace function public.get_public_registration_player_rating(p_token uuid,p_tournament_id uuid,p_player_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select private.read_public_registration_rating(p_token,p_tournament_id,p_player_id);
$$;
revoke all on function public.get_public_registration_player_rating(uuid,uuid,uuid) from public;
grant execute on function public.get_public_registration_player_rating(uuid,uuid,uuid) to anon,authenticated;

