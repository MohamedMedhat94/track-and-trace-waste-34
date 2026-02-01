import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Common password blacklist
const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'qwerty123', 'admin', 'admin123', 'letmein', 'welcome', 'welcome1',
  'abc123', 'monkey', '123123', 'dragon', 'master', 'login', 'admin1234'
];

// Generic error messages (hide internal details)
const GENERIC_ERRORS = {
  AUTH_FAILED: 'فشل في إنشاء الحساب',
  VALIDATION_FAILED: 'البيانات المدخلة غير صالحة',
  SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى',
  DUPLICATE_EMAIL: 'هذا البريد الإلكتروني مستخدم بالفعل'
};

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' };
  }
  if (password.length > 100) {
    return { valid: false, error: 'كلمة المرور طويلة جداً' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$%^&*)' };
  }
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    return { valid: false, error: 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى' };
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    )

    const { method } = req

    if (method === 'POST') {
      const { email, password, fullName, role } = await req.json()
      
      // Validate required fields
      if (!email || !password || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.VALIDATION_FAILED }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate password with enhanced requirements
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return new Response(
          JSON.stringify({ error: passwordValidation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate fullName length
      if (fullName.trim().length === 0 || fullName.length > 100) {
        return new Response(
          JSON.stringify({ error: 'الاسم غير صالح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role
        }
      })

      if (authError) {
        console.error('Auth error:', authError.message)
        // Check for duplicate email without revealing details
        if (authError.message.includes('already') || authError.message.includes('registered')) {
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.DUPLICATE_EMAIL }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.AUTH_FAILED }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()

      let profileData;
      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: fullName,
            email: email,
            role: role,
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', authData.user.id)
          .select()

        if (updateError) {
          console.error('Profile update error');
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        profileData = updatedProfile;
      } else {
        // Create new profile
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            full_name: fullName,
            email: email,
            role: role,
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()

        if (profileError) {
          console.error('Profile error');
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        profileData = newProfile;
      }

      // Log auth event (non-blocking)
      try {
        await supabaseAdmin.rpc('log_auth_event', {
          user_id_param: authData.user.id,
          email_param: email,
          action_param: 'signup'
        });
      } catch (e) {
        console.warn('Failed to log auth event');
      }

      return new Response(
        JSON.stringify({ 
          user: authData.user,
          profile: profileData?.[0],
          message: 'تم إنشاء الحساب بنجاح' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error.message)
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
