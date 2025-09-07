import { supabase } from '@/integrations/supabase/client';

export const createFixedAdminUser = async () => {
  const adminEmail = 'admin@wastemanagement.com';
  const adminPassword = 'admin123';
  const adminName = 'System Administrator';

  try {
    // Try to create admin user with email confirmation bypassed
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: adminName,
          role: 'admin'
        },
        // Skip email confirmation for admin user
        captchaToken: undefined
      }
    });

    // If user already exists, that's fine - they might already be set up
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.warn('Admin signup warning:', signUpError);
    }

    // Try to set up the profile directly
    if (signUpData?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: signUpData.user.id,
          email: adminEmail,
          full_name: adminName,
          role: 'admin',
          is_active: true, // Ensure admin is always active
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('Profile setup warning:', profileError);
      } else {
        console.log('Admin profile created successfully');
      }
    }

    console.log('Admin user setup completed');
    return { success: true };
  } catch (error) {
    console.error('Error setting up admin user:', error);
    return { success: false, error };
  }
};

// Call this function during app initialization
export const initializeAdminUser = () => {
  // Only try to create admin user once per session
  if (!sessionStorage.getItem('admin-setup-attempted')) {
    sessionStorage.setItem('admin-setup-attempted', 'true');
    createFixedAdminUser();
  }
};

export const createAdminAccount = createFixedAdminUser; // Legacy compatibility

export const promoteToAdmin = async (email: string) => {
  try {
    const { error } = await supabase.rpc('promote_user_to_admin', {
      target_email: email
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return { success: false, error };
  }
};