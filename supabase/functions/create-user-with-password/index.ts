import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email length
    if (email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Email too long (max 255 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (password.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Password too long (max 100 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!/[A-Z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain at least one uppercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!/[a-z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain at least one lowercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!/[0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain at least one number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate name length
    const name = userData.name || userData.contact_person || '';
    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Name too long (max 100 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone format if provided (allow numbers starting with 0 for local numbers)
    if (userData.phone) {
      const cleanPhone = userData.phone.replace(/[\s\-\(\)]/g, '');
      // Allow numbers starting with + or 0, followed by digits (length 8-15)
      if (!/^(\+?[1-9]\d{7,14}|0\d{7,14})$/.test(cleanPhone)) {
        console.log('Phone validation failed for:', cleanPhone);
        return new Response(
          JSON.stringify({ error: 'Invalid phone number format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Creating user:', { email, userType })

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
        console.error('Error creating user:', userError)
        return new Response(
          JSON.stringify({ error: ue?.message || 'Failed to create user' }),
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
          console.error('Error listing users:', listErr);
          return new Response(
            JSON.stringify({ error: 'Email exists but could not resolve user id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const existing = usersList?.users?.find((u: any) => (u.email || '').toLowerCase() === (email || '').toLowerCase());
        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'User with this email exists but not found in admin list' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userId = existing.id;
      }
    } else {
      userId = user.user!.id;
      console.log('User created successfully:', userId)
    }

    // Ensure profile exists and update basic info
    // Companies and drivers created by admin should be active immediately
    const profilePayload: any = {
      user_id: userId!,
      email: email,
      full_name: userData.name || userData.contact_person,
      phone: userData.phone,
      role: userType === 'company' ? userData.type : 'driver',
      is_active: true, // Set to active immediately for admin-created accounts
    };

    // If driver and transport company provided, link it
    if (userType === 'driver' && userData.transport_company_id) {
      profilePayload.company_id = userData.transport_company_id;
    }

    const { error: upsertProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });

    if (upsertProfileError) {
      console.error('Error upserting profile:', upsertProfileError);
      // continue; do not fail the whole operation
    }

    if (userType === 'company') {
      // Create company record - active immediately when created by admin
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          ...userData,
          is_active: true,  // Set to active immediately for admin-created companies
          status: 'active'  // Set status to active
        })
        .select();

      if (companyError) {
        console.error('Error creating company:', companyError)
        return new Response(
          JSON.stringify({ error: companyError.message }),
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
      // Upsert driver record (handle existing email/user)
      const driverPayload: any = { ...userData, user_id: userId!, email };
      delete driverPayload.password;
      delete driverPayload.full_name; // Remove full_name as it doesn't exist in drivers table
      delete driverPayload.username;  // Remove username as it doesn't exist in drivers table

      const { data: existingDriver, error: findDriverError } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .maybeSingle();

      if (findDriverError) {
        console.error('Error querying driver:', findDriverError);
      }

      if (existingDriver?.id) {
        const { error: updateDriverError } = await supabaseAdmin
          .from('drivers')
          .update(driverPayload)
          .eq('id', existingDriver.id);
        if (updateDriverError) {
          console.error('Error updating driver:', updateDriverError);
          return new Response(
            JSON.stringify({ error: updateDriverError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        const { error: insertDriverError } = await supabaseAdmin
          .from('drivers')
          .insert(driverPayload);
        if (insertDriverError) {
          console.error('Error creating driver:', insertDriverError)
          return new Response(
            JSON.stringify({ error: insertDriverError.message }),
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
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})