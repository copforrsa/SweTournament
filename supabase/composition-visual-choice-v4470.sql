create or replace function public.admin_set_tournament_composition_visual_v1(
  p_tournament_id uuid,p_mode text,p_image_url text default null
) returns jsonb language plpgsql security definer
set search_path='public','private','auth','pg_temp' as $$
declare v_t public.tournaments%rowtype; v_mode text:=lower(coalesce(p_mode,''));
begin
  select * into v_t from public.tournaments where id=p_tournament_id for update;
  if not found or auth.uid() is null or not private.is_workspace_admin(v_t.workspace_id) then
    raise exception 'Accès administrateur requis';
  end if;
  if v_mode not in ('site','image','upload') then raise exception 'Mode de composition invalide'; end if;
  if v_mode in ('image','upload') and v_mode='upload' and coalesce(trim(p_image_url),'')='' then raise exception 'Image requise'; end if;
  if v_mode='image' and coalesce(trim(p_image_url),trim(v_t.composition_image_url),'')='' then
    raise exception 'Importe d’abord ton image JPG ou PNG';
  end if;

  update public.tournaments
  set composition_display_mode=case when v_mode='upload' then composition_display_mode else v_mode end,
      composition_image_url=case when v_mode='upload' then trim(p_image_url)
                                 when v_mode='image' and coalesce(trim(p_image_url),'')<>'' then trim(p_image_url)
                                 else composition_image_url end
  where id=p_tournament_id
  returning * into v_t;

  return jsonb_build_object('ok',true,'mode',v_t.composition_display_mode,'image_url',v_t.composition_image_url);
end $$;
revoke all on function public.admin_set_tournament_composition_visual_v1(uuid,text,text) from public,anon;
grant execute on function public.admin_set_tournament_composition_visual_v1(uuid,text,text) to authenticated;
