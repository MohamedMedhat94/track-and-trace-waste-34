import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to verify the caller
    const authHeader = req.headers.get('Authorization');
    
    // Check if this is a service role call (from cron/scheduled job) or admin user
    const isServiceRoleCall = authHeader?.includes(supabaseServiceKey);
    
    // If not service role, verify the caller is an admin
    if (!isServiceRoleCall && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Invalid authentication' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Check if user is admin using service role client
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (adminError || !isAdmin) {
        console.error('Access denied: User is not admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    } else if (!isServiceRoleCall && !authHeader) {
      // No auth header and not service role - reject
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting auto-approval process (authorized caller)...');

    // Call the auto_approve_expired_shipments function
    const { error: approvalError } = await supabase.rpc('auto_approve_expired_shipments');
    
    if (approvalError) {
      console.error('Error in auto approval:', approvalError);
      throw approvalError;
    }

    console.log('Auto-approval process completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auto-approval process completed successfully',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in auto-approve-shipments function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});