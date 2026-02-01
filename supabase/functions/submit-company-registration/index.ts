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
      const companyData = await req.json()
      
      // Validate required fields
      if (!companyData.name || !companyData.type || !companyData.email || !companyData.phone || !companyData.password) {
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
      if (!emailRegex.test(companyData.email) || companyData.email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate password with enhanced requirements
      const passwordValidation = validatePassword(companyData.password);
      if (!passwordValidation.valid) {
        return new Response(
          JSON.stringify({ error: passwordValidation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate company name length
      if (companyData.name.trim().length === 0 || companyData.name.length > 200) {
        return new Response(
          JSON.stringify({ error: 'اسم الشركة غير صالح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate phone format
      const cleanPhone = companyData.phone.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?[1-9]\d{7,14}|0\d{7,14})$/.test(cleanPhone)) {
        console.error('Phone validation failed');
        return new Response(
          JSON.stringify({ error: 'رقم الهاتف غير صالح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user account
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: companyData.email,
        password: companyData.password,
        email_confirm: true,
        user_metadata: {
          full_name: companyData.contact_person || companyData.name,
          role: companyData.type,
          is_active: true
        }
      })

      if (authError) {
        console.error('Auth error:', authError.message)
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

      console.log('User created successfully')

      // Insert company data
      const { data, error } = await supabaseAdmin
        .from('companies')
        .insert([{
          name: companyData.name,
          type: companyData.type,
          email: companyData.email,
          phone: companyData.phone,
          fax: companyData.fax || null,
          address: companyData.address || null,
          contact_person: companyData.contact_person || null,
          license_no: companyData.license_no || null,
          commercial_reg_no: companyData.commercial_reg_no || null,
          tax_id: companyData.tax_id || null,
          environmental_approval_no: companyData.environmental_approval_no || null,
          operating_license_no: companyData.operating_license_no || null,
          registered_activity: companyData.registered_activity || null,
          facility_reg_no: companyData.facility_reg_no || null,
          status: 'active',
          is_active: true
        }])
        .select()

      if (error) {
        console.error('Database error');
        // Delete user on company creation failure
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Company created successfully')

      // Create or update user profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .single()

      if (existingProfile) {
        console.log('Profile exists, updating...')
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            company_id: data[0].id,
            phone: companyData.phone,
            is_active: true,
            full_name: companyData.contact_person || companyData.name,
            role: companyData.type
          })
          .eq('user_id', authData.user.id)
        
        if (updateError) {
          console.error('Profile update error');
        } else {
          console.log('Profile updated successfully')
        }
      } else {
        console.log('Profile does not exist, creating...')
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: companyData.email,
            full_name: companyData.contact_person || companyData.name,
            phone: companyData.phone,
            role: companyData.type,
            company_id: data[0].id,
            is_active: true
          })
        
        if (insertError) {
          console.error('Profile insert error');
        } else {
          console.log('Profile created successfully')
        }
      }

      console.log('Company registered successfully');

      return new Response(
        JSON.stringify({ 
          data, 
          message: 'تم تسجيل الشركة بنجاح! يمكنك الآن تسجيل الدخول إلى النظام' 
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
