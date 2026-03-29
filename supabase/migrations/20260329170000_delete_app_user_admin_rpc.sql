-- Delete app_users row with admin verification (cannot delete own account).

CREATE OR REPLACE FUNCTION public.delete_app_user_admin(
    p_admin_username text,
    p_admin_password text,
    p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    admin_row public.app_users%ROWTYPE;
    admin_hash text;
BEGIN
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

    IF admin_row.id = p_target_user_id THEN
        RAISE EXCEPTION 'cannot delete own account';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = p_target_user_id) THEN
        RAISE EXCEPTION 'user not found';
    END IF;

    DELETE FROM public.app_users WHERE id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_app_user_admin(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_app_user_admin(text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_app_user_admin(text, text, uuid) TO authenticated;
