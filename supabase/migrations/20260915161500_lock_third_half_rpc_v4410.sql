-- Explicitly remove inherited direct grants left by older database defaults.
revoke all on function public.get_admin_third_half_setup_v2(uuid) from anon;
revoke all on function public.admin_save_third_half_setup_v2(uuid,text,text,text,integer,integer,integer,text,boolean,uuid[],uuid) from anon;
revoke all on function public.save_my_third_half_payment_link_v1(uuid,uuid,text,text,integer) from anon;

grant execute on function public.get_admin_third_half_setup_v2(uuid) to authenticated;
grant execute on function public.admin_save_third_half_setup_v2(uuid,text,text,text,integer,integer,integer,text,boolean,uuid[],uuid) to authenticated;
grant execute on function public.save_my_third_half_payment_link_v1(uuid,uuid,text,text,integer) to authenticated;
