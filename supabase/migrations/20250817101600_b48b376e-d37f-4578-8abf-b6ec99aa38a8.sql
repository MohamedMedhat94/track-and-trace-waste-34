-- Create admin user in auth.users if not exists
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'abdullah1@gmail.com';
    
    IF admin_user_id IS NULL THEN
        -- Insert admin user directly into auth.users with confirmed email
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated', 
            'abdullah1@gmail.com',
            crypt('abdullah123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"full_name": "Administrator", "role": "admin"}'::jsonb,
            '',
            '',
            '',
            ''
        );
        
        -- Get the newly created user ID
        SELECT id INTO admin_user_id FROM auth.users WHERE email = 'abdullah1@gmail.com';
        
        -- Update or insert the profile with the correct user_id
        INSERT INTO public.profiles (
            user_id,
            email,
            full_name,
            role,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            'abdullah1@gmail.com',
            'Administrator',
            'admin',
            true,
            now(),
            now()
        ) ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = now();
            
        RAISE NOTICE 'Admin user created successfully with ID: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
    END IF;
END $$;