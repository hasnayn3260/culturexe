-- Supabase may apply a role-specific default EXECUTE grant to newly created
-- functions, so revoke both PUBLIC and anon explicitly.
revoke all on function public.list_my_culture_score_history() from public;
revoke all on function public.list_my_culture_score_history() from anon;
grant execute on function public.list_my_culture_score_history() to authenticated;
