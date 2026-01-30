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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Keep-Alive: Starting health check...');

    // 1. Ping database - simple query to keep connection alive
    const { data: dbPing, error: dbError } = await supabase
      .from('system_counters')
      .select('id')
      .limit(1);
    
    if (dbError) {
      console.error('❌ Database ping failed:', dbError);
    } else {
      console.log('✅ Database ping successful');
    }

    // 2. Check storage buckets
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();
    
    if (storageError) {
      console.error('❌ Storage check failed:', storageError);
    } else {
      console.log('✅ Storage buckets active:', buckets?.length || 0);
    }

    // 3. Check auth service
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (authError) {
      console.error('❌ Auth service check failed:', authError);
    } else {
      console.log('✅ Auth service active');
    }

    // 4. Update a counter to ensure write operations work
    const { error: updateError } = await supabase
      .from('system_counters')
      .upsert({
        counter_type: 'keep_alive_ping',
        count: 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'counter_type'
      });

    if (updateError) {
      console.error('❌ Write operation failed:', updateError);
    } else {
      console.log('✅ Write operation successful');
    }

    // 5. Log the keep-alive activity
    await supabase
      .from('system_logs')
      .insert({
        action_type: 'KEEP_ALIVE',
        entity_type: 'system',
        details: {
          timestamp: new Date().toISOString(),
          database_status: dbError ? 'error' : 'healthy',
          storage_status: storageError ? 'error' : 'healthy',
          auth_status: authError ? 'error' : 'healthy',
          buckets_count: buckets?.length || 0
        }
      });

    const healthStatus = {
      success: true,
      timestamp: new Date().toISOString(),
      services: {
        database: !dbError,
        storage: !storageError,
        auth: !authError
      },
      message: 'Keep-alive ping completed successfully'
    };

    console.log('🎉 Keep-Alive completed:', JSON.stringify(healthStatus));

    return new Response(
      JSON.stringify(healthStatus),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Keep-Alive error:', error);
    
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
