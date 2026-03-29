-- Allow admins to create app_users from the client by verifying admin credentials in one RPC.
-- (Anon key cannot INSERT app_users; this runs with definer rights after credential checks.)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_app_user_admin(
    p_admin_username text,
    p_admin_password text,
    p_new_username text,
    p_new_password text,
    p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    admin_row public.app_users%ROWTYPE;
    admin_hash text;
    new_hash text;
    result jsonb;
BEGIN
    IF p_new_role NOT IN ('admin', 'editor', 'viewer', 'guest') THEN
        RAISE EXCEPTION 'invalid role';
    END IF;

    IF length(trim(p_new_username)) < 1 OR length(p_new_password) < 1 THEN
        RAISE EXCEPTION 'invalid new user fields';
    END IF;

    SELECT * INTO admin_row FROM public.app_users WHERE username = p_admin_username;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid credentials';
    END IF;

    admin_hash := encode(
        digest(p_admin_username || ':' || p_admin_password || ':map-manager-v1', 'sha256'),
        'hex'
    );

    IF admin_row.password_hash IS DISTINCT FROM admin_hash THEN
        RAISE EXCEPTION 'invalid credentials';
    END IF;

    IF admin_row.role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    IF EXISTS (SELECT 1 FROM public.app_users WHERE username = p_new_username) THEN
        RAISE EXCEPTION 'username already exists';
    END IF;

    new_hash := encode(
        digest(p_new_username || ':' || p_new_password || ':map-manager-v1', 'sha256'),
        'hex'
    );

    INSERT INTO public.app_users (username, password_hash, role)
    VALUES (trim(p_new_username), new_hash, p_new_role)
    RETURNING jsonb_build_object(
        'id', id,
        'username', username,
        'role', role,
        'created_at', created_at
    )
    INTO result;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_app_user_admin(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_user_admin(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_app_user_admin(text, text, text, text, text) TO authenticated;
