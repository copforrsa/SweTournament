-- Allow platform Super Admins to correct historical goal records across workspaces.
-- Keep existing workspace-admin and co-organizer permissions unchanged.
DROP POLICY IF EXISTS goals_update_admin_coorg_open ON public.goals;
CREATE POLICY goals_update_admin_coorg_open
ON public.goals
FOR UPDATE
TO authenticated
USING (
  private.is_platform_super_admin()
  OR private.is_workspace_admin((
    SELECT t.workspace_id
    FROM public.matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
    WHERE m.id = goals.match_id
  ))
  OR private.coorganizer_can_edit_match(match_id)
)
WITH CHECK (
  private.is_platform_super_admin()
  OR private.is_workspace_admin((
    SELECT t.workspace_id
    FROM public.matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
    WHERE m.id = goals.match_id
  ))
  OR private.coorganizer_can_edit_match(match_id)
);

DROP POLICY IF EXISTS goals_delete_admin_coorg_open ON public.goals;
CREATE POLICY goals_delete_admin_coorg_open
ON public.goals
FOR DELETE
TO authenticated
USING (
  private.is_platform_super_admin()
  OR private.is_workspace_admin((
    SELECT t.workspace_id
    FROM public.matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
    WHERE m.id = goals.match_id
  ))
  OR private.coorganizer_can_edit_match(match_id)
);
