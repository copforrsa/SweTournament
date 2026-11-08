-- Suppress provisional team assignments while collaborative draw is unapproved.
-- Final team validation has its own 'teams_approved' event.
create or replace function private.swe_notify_team_assignment_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
 v_team uuid;
 v_player uuid;
 v_workspace uuid;
 v_tname text;
 v_name text;
 v_tour uuid;
 v_action text;
 v_draw_first boolean;
 v_review text;
begin
 v_team:=coalesce(new.team_id,old.team_id);
 v_player:=coalesce(new.player_id,old.player_id);
 select t.workspace_id,t.name,te.name,t.id,t.draw_room_first_enabled,t.team_review_status
 into v_workspace,v_tname,v_name,v_tour,v_draw_first,v_review
 from public.teams te
 join public.tournaments t on t.id=te.tournament_id
 where te.id=v_team;
 if v_workspace is null then return null; end if;

 -- Before publication, team draw proposals are ephemeral and can be regenerated.
 -- Do not notify every provisional insert/delete as if the squad were final.
 if coalesce(v_draw_first,false) and v_review is distinct from 'approved' then
   return null;
 end if;

 v_action:=case when TG_OP='DELETE' then 'retiré de' else 'affecté à' end;
 insert into public.swe_organizer_notifications_v54(
   recipient_user_id,workspace_id,tournament_id,event_type,title,body
 )
 select distinct wm.user_id,v_workspace,v_tour,
        'team_assignment','⚽ Mon équipe · '||coalesce(v_tname,'SWÉ'),
        'Tu es '||v_action||' l’équipe '||coalesce(v_name,'')||'.'
 from public.workspace_members wm
 where wm.workspace_id=v_workspace
   and wm.linked_player_id=v_player and wm.active=true;
 return null;
end
$function$;
