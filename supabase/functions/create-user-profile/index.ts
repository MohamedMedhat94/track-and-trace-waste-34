import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // إنشاء client باستخدام service role key للتحكم الكامل
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
      
      // التحقق من البيانات المطلوبة
      if (!email || !password || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: 'المطلوب: البريد الإلكتروني، كلمة المرور، الاسم الكامل، والدور' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // التحقق من صحة البريد الإلكتروني
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate email length
      if (email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني طويل جداً (الحد الأقصى 255 حرف)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate password strength
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (password.length > 100) {
        return new Response(
          JSON.stringify({ error: 'كلمة المرور طويلة جداً (الحد الأقصى 100 حرف)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[A-Z]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[a-z]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[0-9]/.test(password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate fullName length
      if (fullName.trim().length === 0 || fullName.length > 100) {
        return new Response(
          JSON.stringify({ error: 'الاسم الكامل يجب أن يكون بين 1 و 100 حرف' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // إنشاء المستخدم
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // تأكيد البريد الإلكتروني مباشرة
        user_metadata: {
          full_name: fullName,
          role: role
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        return new Response(
          JSON.stringify({ error: `خطأ في إنشاء المستخدم: ${authError.message}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // التحقق أولاً من وجود الملف الشخصي (قد يكون trigger أنشأه)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()

      let profileData;
      if (existingProfile) {
        // تحديث الملف الموجود
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
          console.error('Profile update error:', updateError)
          return new Response(
            JSON.stringify({ error: `خطأ في تحديث الملف الشخصي: ${updateError.message}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        profileData = updatedProfile;
      } else {
        // إنشاء ملف شخصي جديد
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
          console.error('Profile error:', profileError)
          return new Response(
            JSON.stringify({ error: `خطأ في إنشاء الملف الشخصي: ${profileError.message}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        profileData = newProfile;
      }

      // تسجيل الحدث
      try {
        await supabaseAdmin.rpc('log_auth_event', {
          user_id_param: authData.user.id,
          email_param: email,
          action_param: 'signup'
        });
      } catch (e) {
        console.warn('Failed to log auth event:', e);
      }

      return new Response(
        JSON.stringify({ 
          user: authData.user,
          profile: profileData[0],
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
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: `خطأ في الخادم: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})