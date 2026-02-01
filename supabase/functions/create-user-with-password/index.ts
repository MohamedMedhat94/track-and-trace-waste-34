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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, userData, userType } = await req.json()

    // Validate required fields
    if (!email || !password || !userData || !userType) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION_FAILED }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Validate name length
    const name = userData.name || userData.contact_person || '';
    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'الاسم طويل جداً' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone format if provided
    if (userData.phone) {
      const cleanPhone = userData.phone.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?[1-9]\d{7,14}|0\d{7,14})$/.test(cleanPhone)) {
        console.error('Phone validation failed');
        return new Response(
          JSON.stringify({ error: 'رقم الهاتف غير صالح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Creating user with type:', userType)

    // Try to create a new auth user; if email exists, link to existing user
    let userId: string | null = null;

    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.name || userData.contact_person,
        role: userType === 'company' ? userData.type : 'driver',
        user_type: userType
      }
    })

    if (userError) {
      const ue: any = userError as any;
      const isEmailExists = ue?.status === 422 || ue?.code === 'email_exists' || (ue?.message || '').includes('already been registered');
      if (!isEmailExists) {
        console.error('Error creating user:', userError.message)
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.AUTH_FAILED }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Email already exists, linking to existing user');
      // Try to resolve user id from profiles first
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile?.user_id) {
        userId = existingProfile.user_id;
      } else {
        // Fallback: list users and find by email
        const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) {
          console.error('Error listing users');
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.DUPLICATE_EMAIL }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const existing = usersList?.users?.find((u: any) => (u.email || '').toLowerCase() === (email || '').toLowerCase());
        if (!existing) {
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.DUPLICATE_EMAIL }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userId = existing.id;
      }
    } else {
      userId = user.user!.id;
      console.log('User created successfully')
    }

    // Ensure profile exists and update basic info
    const profilePayload: any = {
      user_id: userId!,
      email: email,
      full_name: userData.name || userData.contact_person,
      phone: userData.phone,
      role: userType === 'company' ? userData.type : 'driver',
      is_active: true,
    };

    // If driver and transport company provided, link it
    if (userType === 'driver' && userData.transport_company_id) {
      profilePayload.company_id = userData.transport_company_id;
    }

    const { error: upsertProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });

    if (upsertProfileError) {
      console.error('Error upserting profile');
    }

    if (userType === 'company') {
      // Create company record
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          ...userData,
          is_active: true,
          status: 'active'
        })
        .select();

      if (companyError) {
        console.error('Error creating company');
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (company && company.length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update({ company_id: company[0].id })
          .eq('user_id', userId!);
      }
    } else if (userType === 'driver') {
      // Upsert driver record
      const driverPayload: any = { ...userData, user_id: userId!, email };
      delete driverPayload.password;
      delete driverPayload.full_name;
      delete driverPayload.username;

      const { data: existingDriver } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .maybeSingle();

      if (existingDriver?.id) {
        const { error: updateDriverError } = await supabaseAdmin
          .from('drivers')
          .update(driverPayload)
          .eq('id', existingDriver.id);
        if (updateDriverError) {
          console.error('Error updating driver');
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        const { error: insertDriverError } = await supabaseAdmin
          .from('drivers')
          .insert(driverPayload);
        if (insertDriverError) {
          console.error('Error creating driver');
          return new Response(
            JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId!,
        email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error.message)
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER_ERROR }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
