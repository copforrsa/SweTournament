begin;
do $$
declare tid uuid; uid uuid; token uuid; before_mode text; before_url text; r jsonb; snap jsonb;
begin
 select t.id,t.composition_display_mode,t.composition_image_url,wm.user_id,w.public_token into tid,before_mode,before_url,uid,token
 from public.tournaments t join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.role='admin' and wm.active join public.workspaces w on w.id=t.workspace_id
 where t.name='TEST Glacière — 16/09/2026' limit 1;
 if tid is null then raise exception 'Missing test tournament';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);execute 'set local role authenticated';
 r:=public.admin_set_tournament_composition_visual_v1(tid,'upload','https://example.test/admin-visual.png');
 if r->>'mode'<>before_mode or r->>'image_url'<>'https://example.test/admin-visual.png' then raise exception 'Upload changed selection or did not save';end if;
 r:=public.admin_set_tournament_composition_visual_v1(tid,'image',null);
 if r->>'mode'<>'image' or r->>'image_url'<>'https://example.test/admin-visual.png' then raise exception 'Custom image selection failed';end if;
 execute 'reset role';execute 'set local role anon';
 snap:=public.get_public_workspace_snapshot_v2(token);
 if not exists(select 1 from jsonb_array_elements(snap->'tournaments') t where t->>'id'=tid::text and t->>'composition_display_mode'='image' and t->>'composition_image_url'='https://example.test/admin-visual.png') then raise exception 'Registration snapshot does not expose image choice';end if;
 execute 'reset role';execute 'set local role authenticated';
 r:=public.admin_set_tournament_composition_visual_v1(tid,'site',null);
 if r->>'mode'<>'site' or r->>'image_url'<>'https://example.test/admin-visual.png' then raise exception 'Site selection lost saved image';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: upload preserves current choice; admin can select custom image or site visual; saved image remains reusable; test data rolled back' result;
