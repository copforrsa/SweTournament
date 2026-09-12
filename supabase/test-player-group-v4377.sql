-- Provenance survives the deletion of a test tournament. Never classify by name alone.
create table private.test_player_registry(player_id uuid primary key references public.players(id) on delete cascade,workspace_id uuid references public.workspaces(id) on delete set null,origin text not null,marked_at timestamptz not null default now());
alter table private.test_player_registry enable row level security;
revoke all on private.test_player_registry from public,anon,authenticated;
create function private.register_fixture_players() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='tournament_test_runs' then
  insert into private.test_player_registry(player_id,workspace_id,origin) select p.id,p.workspace_id,'tournament_fixture' from public.players p where p.workspace_id=new.workspace_id and p.created_at=new.created_at and p.global_player_id is null on conflict do nothing;
 else
  insert into private.test_player_registry(player_id,workspace_id,origin) select p.id,p.workspace_id,'match_fixture' from jsonb_array_elements(new.participants) x join public.players p on p.id=(x->>'player_id')::uuid where p.workspace_id=new.workspace_id and p.global_player_id is null on conflict do nothing;
 end if;return new;
end $$;
revoke all on function private.register_fixture_players() from public,anon,authenticated;
create trigger register_tournament_fixture_players after insert on private.tournament_test_runs for each row execute function private.register_fixture_players();
create trigger register_match_fixture_players after insert or update of participants on private.match_test_runs for each row execute function private.register_fixture_players();
insert into private.test_player_registry(player_id,workspace_id,origin) select p.id,p.workspace_id,'match_fixture' from private.match_test_runs r cross join lateral jsonb_array_elements(r.participants) x join public.players p on p.id=(x->>'player_id')::uuid and p.workspace_id=r.workspace_id where p.global_player_id is null on conflict do nothing;
insert into private.test_player_registry(player_id,workspace_id,origin) select p.id,p.workspace_id,'tournament_fixture' from private.tournament_test_runs r join public.players p on p.workspace_id=r.workspace_id and p.created_at=r.created_at where p.global_player_id is null on conflict do nothing;
-- These three historical fixture workspaces were inspected: 30 generated rows in the same transaction,
-- matching test season and Super Admin owner, with no linked identity. Their tournament registry was deleted by cascade.
insert into private.test_player_registry(player_id,workspace_id,origin)
select p.id,p.workspace_id,'verified_historical_fixture' from public.players p join public.workspaces w on w.id=p.workspace_id
where w.id in ('6dcccb44-dcb5-46f6-b8b3-f0d5900f77f9','9b0d0911-3d81-4056-ae28-7d92deef02d6','20a0479c-bc0e-4813-82fd-007ee8dfc2a6')
and p.created_at=w.created_at and p.global_player_id is null and p.name~'^Joueur test [0-9]{2}$'
and exists(select 1 from public.platform_super_admins s where s.user_id=w.owner_user_id)
and exists(select 1 from public.seasons s where s.workspace_id=w.id and s.name='Saison de test' and s.created_at=w.created_at) on conflict do nothing;

create function private.list_test_players() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('player_id',p.id,'name',p.name,'workspace_name',w.name,'origin',r.origin,'protected',p.global_player_id is not null or p.workspace_id is distinct from r.workspace_id or exists(select 1 from public.workspace_members m where m.linked_player_id=p.id)) order by w.name,p.name) from private.test_player_registry r join public.players p on p.id=r.player_id join public.workspaces w on w.id=p.workspace_id),'[]'::jsonb);
end $$;
revoke all on function private.list_test_players() from public,anon;
grant execute on function private.list_test_players() to authenticated;
create function public.super_admin_get_test_players() returns jsonb language sql security invoker set search_path='' as $$ select private.list_test_players();$$;
revoke all on function public.super_admin_get_test_players() from public,anon;
grant execute on function public.super_admin_get_test_players() to authenticated;

create function private.delete_test_players(p_player_ids uuid[]) returns integer language plpgsql security definer set search_path='' as $$
declare removed integer; ids uuid[];
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis';end if;
 if coalesce(cardinality(p_player_ids),0)=0 then return 0;end if;
 -- Delete only the reviewed list; concurrent new fixtures are never implicitly included.
 perform p.id from public.players p where p.id=any(p_player_ids) for update;
 if exists(select 1 from public.players p where p.id=any(p_player_ids) and (p.global_player_id is not null or not exists(select 1 from private.test_player_registry r where r.player_id=p.id and r.workspace_id=p.workspace_id) or exists(select 1 from public.workspace_members m where m.linked_player_id=p.id))) then raise exception 'La sélection contient un joueur réel ou lié à un compte';end if;
 select array_agg(p.id) into ids from public.players p join private.test_player_registry r on r.player_id=p.id where p.id=any(p_player_ids);
 if ids is null then return 0;end if;
 if exists(select 1 from public.tournament_players tp join public.players p on p.id=tp.player_id join public.tournaments t on t.id=tp.tournament_id where p.id=any(ids) and p.workspace_id<>t.workspace_id)
 or exists(select 1 from public.goals g join public.matches m on m.id=g.match_id join public.tournaments t on t.id=m.tournament_id join public.players p on p.id=g.scorer_player_id or p.id=g.assister_player_id where p.id=any(ids) and p.workspace_id<>t.workspace_id)
 or exists(select 1 from public.team_players tp join public.players p on p.id=tp.player_id join public.teams tm on tm.id=tp.team_id join public.tournaments t on t.id=tm.tournament_id where p.id=any(ids) and p.workspace_id<>t.workspace_id)
 or exists(select 1 from public.match_player_assignments a join public.players p on p.id=a.player_id join public.matches m on m.id=a.match_id join public.tournaments t on t.id=m.tournament_id where p.id=any(ids) and p.workspace_id<>t.workspace_id)
 or exists(select 1 from public.stripe_payments where player_id=any(ids)) then raise exception 'Joueur utilisé hors de son groupe de test : suppression refusée';end if;
 delete from public.goals where scorer_player_id=any(ids) or assister_player_id=any(ids);
 update private.match_test_runs r set participants=coalesce((select jsonb_agg(x) from jsonb_array_elements(r.participants) x where not ((x->>'player_id')::uuid=any(ids))),'[]'::jsonb) where exists(select 1 from jsonb_array_elements(r.participants) x where (x->>'player_id')::uuid=any(ids));
 delete from public.players where id=any(ids);get diagnostics removed=row_count;
 insert into public.security_audit_log(actor_user_id,actor_type,action,target_type,metadata) values(auth.uid(),'authenticated','test_players.bulk_delete','players',jsonb_build_object('source','journal','quantity',removed));
 return removed;
end $$;
revoke all on function private.delete_test_players(uuid[]) from public,anon;
grant execute on function private.delete_test_players(uuid[]) to authenticated;
create function public.super_admin_delete_test_players(p_player_ids uuid[]) returns integer language sql security invoker set search_path='' as $$select private.delete_test_players(p_player_ids);$$;
revoke all on function public.super_admin_delete_test_players(uuid[]) from public,anon;
grant execute on function public.super_admin_delete_test_players(uuid[]) to authenticated;
