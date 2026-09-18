revoke all on function public.admin_save_third_half_admin_contribution_v1(uuid,text,integer,text) from public;
revoke all on function public.admin_save_third_half_admin_contribution_v1(uuid,text,integer,text) from anon;
grant execute on function public.admin_save_third_half_admin_contribution_v1(uuid,text,integer,text) to authenticated;