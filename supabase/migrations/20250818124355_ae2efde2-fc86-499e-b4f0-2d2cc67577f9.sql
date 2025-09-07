-- Add password reset functions for admin
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_email text,
  new_password text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can reset passwords';
  END IF;
  
  -- Log the password reset activity
  INSERT INTO system_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    'PASSWORD_RESET',
    'user',
    target_email,
    jsonb_build_object(
      'reset_by', 'admin',
      'target_email', target_email,
      'timestamp', now()
    )
  );
END;
$$;