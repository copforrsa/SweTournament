-- V43.71: public message/flags, protected by the existing tournament RLS.
-- No existing snapshot, registration, review or match function is modified.
SET lock_timeout='5s';
ALTER TABLE public.tournaments ADD COLUMN registration_briefing jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(registration_briefing)='object' AND octet_length(registration_briefing::text)<=8000);
COMMENT ON COLUMN public.tournaments.registration_briefing IS 'Public signup instructions: general text and observe/evening/rating flags. Empty means no card. These flags grant no permissions. Existing tournament RLS governs writes.';
CREATE FUNCTION private.read_my_tournament_presentation_v1(p_tournament_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT jsonb_build_object('my_player_id',wm.linked_player_id,'is_coorganizer',wm.role='coorganizer',
 'tournament_rating_windows',coalesce((SELECT jsonb_agg(jsonb_build_object('tournament_id',rs.tournament_id,'opened_at',rs.opened_at,'closes_at',rs.closes_at,'status',rs.status)) FROM public.tournament_rating_sessions rs WHERE rs.tournament_id=t.id),'[]'::jsonb))
 FROM public.tournaments t JOIN public.workspace_members wm ON wm.workspace_id=t.workspace_id
 WHERE t.id=p_tournament_id AND wm.user_id=(select auth.uid()) AND (select auth.uid()) IS NOT NULL AND wm.active AND wm.role IN ('admin','coorganizer');
$fn$;
REVOKE ALL ON FUNCTION private.read_my_tournament_presentation_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.read_my_tournament_presentation_v1(uuid) TO authenticated;
CREATE FUNCTION public.get_my_tournament_presentation_v1(p_tournament_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.read_my_tournament_presentation_v1(p_tournament_id);
$fn$;
REVOKE ALL ON FUNCTION public.get_my_tournament_presentation_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_tournament_presentation_v1(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
