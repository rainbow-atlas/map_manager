-- Update app_users row with admin verification (same pattern as create_app_user_admin).

CREATE OR REPLACE FUNCTION public.update_app_user_admin(
    p_admin_username text,
    p_admin_password text,
    p_target_user_id uuid,
    p_new_username text,
    p_new_role text,
    p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    admin_row public.app_users%ROWTYPE;
    admin_hash text;
    target public.app_users%ROWTYPE;
    new_hash text;
    final_username text;
    result jsonb;
BEGIN
    IF p_new_role NOT IN ('admin', 'editor', 'viewer', 'guest') THEN
        RAISE EXCEPTION 'invalid role';
    END IF;

    final_username := trim(p_new_username);
    IF length(final_username) < 1 THEN
        RAISE EXCEPTION 'invalid username';
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

    SELECT * INTO target FROM public.app_users WHERE id = p_target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'user not found';
    END IF;

    IF final_username IS DISTINCT FROM target.username AND EXISTS (
        SELECT 1 FROM public.app_users
        WHERE username = final_username AND id IS DISTINCT FROM p_target_user_id
    ) THEN
        RAISE EXCEPTION 'username already exists';
    END IF;

    IF final_username IS DISTINCT FROM target.username AND length(trim(coalesce(p_new_password, ''))) < 1 THEN
        RAISE EXCEPTION 'password required when changing username';
    END IF;

    IF length(trim(coalesce(p_new_password, ''))) > 0 THEN
        new_hash := encode(
            digest(final_username || ':' || trim(p_new_password) || ':map-manager-v1', 'sha256'),
            'hex'
        );
    ELSE
        new_hash := target.password_hash;
    END IF;

    UPDATE public.app_users
    SET
        username = final_username,
        role = p_new_role,
        password_hash = new_hash
    WHERE id = p_target_user_id
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

REVOKE ALL ON FUNCTION public.update_app_user_admin(text, text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_app_user_admin(text, text, uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_app_user_admin(text, text, uuid, text, text, text) TO authenticated;
