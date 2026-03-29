-- User roles for Supabase Auth integration
-- Maps auth.users.id to app roles (admin, editor, viewer, guest)

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'guest'))
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all (for migration script)
CREATE POLICY "Service role full access" ON public.user_roles
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant authenticated users access to read their role
GRANT SELECT ON public.user_roles TO authenticated;

-- Grant service_role full access (for create-users script via Admin API)
GRANT ALL ON public.user_roles TO service_role;
