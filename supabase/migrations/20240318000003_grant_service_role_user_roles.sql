-- Grant service_role full access to user_roles (required for create-users script)
GRANT ALL ON public.user_roles TO service_role;
