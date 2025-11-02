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
      const companyData = await req.json()
      
      // التحقق من البيانات المطلوبة
      if (!companyData.name || !companyData.type || !companyData.email || !companyData.phone || !companyData.password) {
        return new Response(
          JSON.stringify({ error: 'المطلوب: اسم الجهة، نوع الجهة، البريد الإلكتروني، الهاتف، وكلمة المرور' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // التحقق من صحة البريد الإلكتروني
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(companyData.email)) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate email length
      if (companyData.email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني طويل جداً (الحد الأقصى 255 حرف)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate password strength
      if (companyData.password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (companyData.password.length > 100) {
        return new Response(
          JSON.stringify({ error: 'كلمة المرور طويلة جداً (الحد الأقصى 100 حرف)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[A-Z]/.test(companyData.password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[a-z]/.test(companyData.password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!/[0-9]/.test(companyData.password)) {
        return new Response(
          JSON.stringify({ error: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate company name length
      if (companyData.name.trim().length === 0 || companyData.name.length > 200) {
        return new Response(
          JSON.stringify({ error: 'اسم الشركة يجب أن يكون بين 1 و 200 حرف' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate phone format (allow numbers starting with 0 for local numbers)
      const cleanPhone = companyData.phone.replace(/[\s\-\(\)]/g, '');
      // Allow numbers starting with + or 0, followed by digits (length 8-15)
      if (!/^(\+?[1-9]\d{7,14}|0\d{7,14})$/.test(cleanPhone)) {
        console.log('Phone validation failed for:', cleanPhone);
        return new Response(
          JSON.stringify({ error: 'تنسيق رقم الهاتف غير صالح. يجب أن يكون رقم هاتف صحيح' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // إنشاء حساب المستخدم أولاً
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: companyData.email,
        password: companyData.password,
        email_confirm: true,
        user_metadata: {
          full_name: companyData.contact_person || companyData.name,
          role: companyData.type
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

      // إدراج بيانات الشركة
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
          status: 'pending', // في انتظار موافقة المدير
          is_active: false
        }])
        .select()

      if (error) {
        console.error('Database error:', error)
        // حذف المستخدم في حالة فشل إنشاء الشركة
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: `خطأ في قاعدة البيانات: ${error.message}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // إنشاء ملف المستخدم
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: companyData.email,
          full_name: companyData.contact_person || companyData.name,
          phone: companyData.phone,
          role: companyData.type,
          company_id: data[0].id,
          is_active: true // تفعيل الحساب تلقائياً
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        // قد يكون trigger أنشأه - نحدث بدلاً من ذلك
        await supabaseAdmin
          .from('profiles')
          .update({
            company_id: data[0].id,
            is_active: true // تفعيل الحساب تلقائياً
          })
          .eq('user_id', authData.user.id)
      }

      // لا نحتاج إلى إرسال إشعار في الوقت الحالي - تركيز على عمل النظام
      console.log('Company registered successfully with ID:', data[0].id);

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