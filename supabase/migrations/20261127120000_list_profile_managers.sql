create or replace function public.list_my_profile_managers()
returns table (
  id uuid,
  label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    manager.id,
    coalesce(nullif(trim(manager.full_name), ''), manager.email, 'Manager')
      || ' — ' || manager.position as label
  from public.profiles as current_profile
  join public.profiles as manager
    on manager.org_id = current_profile.org_id
  where current_profile.id = auth.uid()
    and manager.id <> current_profile.id
    and manager.active is not false
    and manager.position in ('Manager', 'Senior Manager')
  order by label;
$$;

revoke all on function public.list_my_profile_managers() from public;
grant execute on function public.list_my_profile_managers() to authenticated;

