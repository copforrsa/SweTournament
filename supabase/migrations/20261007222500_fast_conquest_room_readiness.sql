create or replace function public.fast_conquest_inbox(p_workspace_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $f$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'vote_open',coalesce(s.vote_open,false),'notes_open',coalesce(s.notes_open,false),'composition_ready',t.status='draft' and t.fast_team_mode='collaborative' and not coalesce(s.locked,false) and s.state is null))
 from public.tournaments t left join private.fast_conquest_sessions s on s.tournament_id=t.id
 where t.workspace_id=p_workspace_id and t.format='fast_conquest' and private.swe_workspace_full_access(t.workspace_id)
 and (private.fast_admin(t.workspace_id) or private.fast_designated(t.id))
 and (s.vote_open or s.notes_open and (private.fast_admin(t.workspace_id) or private.fast_present(t.id))
 or t.status='draft' and t.fast_team_mode='collaborative' and not coalesce(s.locked,false) and s.state is null
 and (not t.registration_open or t.registration_deadline<=now() or (select count(*) from public.tournament_players p where p.tournament_id=t.id and p.present)>=t.max_players))),'[]'::jsonb);
end;$f$;
