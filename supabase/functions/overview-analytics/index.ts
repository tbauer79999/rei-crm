// supabase/functions/overview-analytics/index.ts
import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';

// Supabase Client Initialization for Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey); // Public client for auth
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { // Admin client for RLS bypass (if needed)
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Define CORS headers
// IMPORTANT: For development, 'http://localhost:3000' is fine.
// For production, change '*' to your actual frontend domain (e.g., 'https://your-app.com').
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000', 
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Allow GET and POST, and OPTIONS for preflight
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Required headers
};

// Helper to fetch user profile (adapted from authMiddleware)
interface UserProfileData {
  tenant_id: string | null;
  role: string;
  email: string;
}

async function getUserProfile(userId: string): Promise<UserProfileData> {
  const { data, error } = await supabaseAdmin
    .from('users_profile')
    .select('tenant_id, role, email')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error?.message || 'No data');
    throw new Error('Unable to fetch user profile');
  }
  return data;
}

serve(async (req: Request) => {
  // Handle preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // --- End of CORS preflight handling ---

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
    });
  }

  let user: { id: string; email: string; role: string; tenant_id: string | null } | null = null;
  const authHeader = req.headers.get('Authorization');

  try {
    // Integrate addUserProfile logic (authentication)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ No auth token provided');
      return new Response(JSON.stringify({
        error: 'Authentication required',
        hint: 'Include a valid Supabase token in Authorization header'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); // Include CORS headers
    }

    const token = authHeader.slice(7);
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !supabaseUser) {
      console.warn('❌ Invalid Supabase token:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
      });
    }

    const profile = await getUserProfile(supabaseUser.id);

    user = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: profile.role,
      tenant_id: profile.tenant_id
    };
    console.log(`✅ Authenticated user: ${user.email} (${user.role})`);

    // Security Check (from authMiddleware.js and analyticsRoutes.js)
    if (!user.tenant_id && user.role !== 'global_admin') {
      return new Response(JSON.stringify({ error: 'No tenant access configured' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
      });
    }

  } catch (error: any) {
    console.error('🚨 Auth integration error:', error.message);
    return new Response(JSON.stringify({
      error: 'Authentication failed',
      details: error.message
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); // Include CORS headers
  }

  // --- User is authenticated and authorized ---

  const url = new URL(req.url);
  let fullPath = url.pathname;

  const functionName = 'overview-analytics'; 
  const basePathRegex = new RegExp(`^(\/functions\/v1)?\/${functionName}`);
  const path = fullPath.replace(basePathRegex, '');

  console.log(`Incoming fullPath: ${fullPath}, Derived path: ${path}`);

  const { role, tenant_id } = user; // Destructure user for convenience

  try {
    switch (path) {
      case '/': 
      case '':  
        console.log('Serving /api/overview/');
        
        let leadsQuery = supabaseAdmin
          .from('leads')
          .select('id, status, created_at');

        if (role !== 'global_admin') {
          leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
        }

        console.log('Querying leads with tenant filtering applied');
        const { data: leads, error: leadError } = await leadsQuery;

        console.log('Leads query result:');
        console.log('- Error:', leadError);
        console.log('- Data count:', leads ? leads.length : 0);

        if (leadError) {
          console.error('Lead query error details:', leadError);
          throw leadError;
        }

        let messagesQuery = supabaseAdmin
          .from('messages')
          .select('direction, lead_id');

        if (role !== 'global_admin') {
          messagesQuery = messagesQuery.eq('tenant_id', tenant_id);
        }

        console.log('Querying messages with tenant filtering applied');
        const { data: messages, error: msgError } = await messagesQuery;

        console.log('Messages query result:');
        console.log('- Error:', msgError);
        console.log('- Data count:', messages ? messages.length : 0);

        if (msgError) {
          console.error('Message query error details:', msgError);
          throw msgError;
        }

        const now = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);

        const totalLeads = leads.length;
        const weeklyLeads = leads.filter((l: any) => new Date(l.created_at) > weekAgo).length;
        const hotLeads = leads.filter((l: any) => l.status === 'Hot Lead').length;
        const activeLeads = leads.filter((l: any) => ['Engaging', 'Responding'].includes(l.status)).length;
        const completedLeads = leads.filter((l: any) =>
          ['Hot Lead', 'Opted Out', 'Unsubscribed', 'Disqualified'].includes(l.status)
        ).length;

        let messagesSent = 0;
        let messagesReceived = 0;
        const repliedLeadIds = new Set();

        messages.forEach((msg: any) => {
          if (msg.direction === 'outbound') messagesSent++;
          if (msg.direction === 'inbound') {
            messagesReceived++;
            if (msg.lead_id) repliedLeadIds.add(msg.lead_id);
          }
        });

        const replyRate = totalLeads > 0 ? (repliedLeadIds.size / totalLeads) * 100 : 0;
        const hotLeadRate = totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0;

        const result = {
          totalLeads,
          weeklyLeads,
          hotLeadRate: Number(hotLeadRate.toFixed(1)),
          replyRate: Number(replyRate.toFixed(1)),
          activeLeads,
          completedLeads,
          messagesSent,
          messagesReceived,
          meta: { role, tenant_id }
        };

        console.log('Final /api/overview result:', result);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        });

      case '/analytics-trend-cost':
        console.log('Serving /api/overview/analytics-trend-cost');
        
        const nowTrend = new Date();
        const thisWeekStart = new Date(nowTrend);
        thisWeekStart.setDate(nowTrend.getDate() - 7);
        const lastWeekStart = new Date(nowTrend);
        lastWeekStart.setDate(nowTrend.getDate() - 14);

        console.log('Date ranges:');
        console.log('- Now:', nowTrend);
        console.log('- This week start:', thisWeekStart);
        console.log('- Last week start:', lastWeekStart);

        let leadsTrendQuery = supabaseAdmin
          .from('leads')
          .select('id, created_at, status');

        if (role !== 'global_admin') {
          leadsTrendQuery = leadsTrendQuery.eq('tenant_id', tenant_id);
        }

        const { data: leadsTrend, error: leadTrendError } = await leadsTrendQuery;

        console.log('Analytics leads query:');
        console.log('- Error:', leadTrendError);
        console.log('- Data count:', leadsTrend ? leadsTrend.length : 0);

        if (leadTrendError) throw leadTrendError;

        const grouped: { [key: string]: { total: number; hot: number } } = {};
        let totalHotLeads = 0;
        let previousHotLeads = 0;

        (leadsTrend || []).forEach((lead: any) => {
          const created = new Date(lead.created_at);
          const dateKey = created.toISOString().slice(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = { total: 0, hot: 0 };
          grouped[dateKey].total++;
          if (lead.status === 'Hot Lead') {
            grouped[dateKey].hot++;
            totalHotLeads++;
            if (created > lastWeekStart && created <= thisWeekStart) {
              previousHotLeads++;
            }
          }
        });

        const trend = Object.entries(grouped).map(([date, data]) => ({
          date,
          hotRate: data.total ? ((data.hot / data.total) * 100).toFixed(1) : 0,
        }));

        let messagesTrendQuery = supabaseAdmin
          .from('messages')
          .select('timestamp, direction');

        if (role !== 'global_admin') {
          messagesTrendQuery = messagesTrendQuery.eq('tenant_id', tenant_id);
        }

        const { data: messagesTrend, error: msgTrendError } = await messagesTrendQuery;

        console.log('Analytics messages query:');
        console.log('- Error:', msgTrendError);
        console.log('- Data count:', messagesTrend ? messagesTrend.length : 0);

        if (msgTrendError) throw msgTrendError;

        let totalMessagesSent = 0;
        let previousMessagesSent = 0;

        (messagesTrend || []).forEach((msg: any) => {
          const ts = new Date(msg.timestamp);
          if (msg.direction === 'outbound') {
            totalMessagesSent++;
            if (ts > lastWeekStart && ts <= thisWeekStart) {
              previousMessagesSent++;
            }
          }
        });

        const trendResult = {
          trend,
          totalMessagesSent,
          totalHotLeads,
          previousMessagesSent,
          previousHotLeads,
          meta: { role, tenant_id }
        };

        console.log('Analytics trend result:', trendResult);
        return new Response(JSON.stringify(trendResult), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        });

      case '/debug-data':
        console.log('Serving /api/overview/debug-data');
        
        console.log('=== SECURE DEBUGGING ENDPOINT ===');
        console.log('User role:', role);
        console.log('User tenant_id:', tenant_id);

        let leadsDebugQuery = supabaseAdmin
          .from('leads')
          .select('tenant_id, id, status, created_at')
          .limit(20);

        if (role !== 'global_admin') {
          leadsDebugQuery = leadsDebugQuery.eq('tenant_id', tenant_id);
        }

        const { data: allLeadsDebug, error: allLeadsDebugError } = await leadsDebugQuery;

        console.log('Debug leads query:');
        console.log('- Error:', allLeadsDebugError);
        console.log('- Count:', allLeadsDebug ? allLeadsDebug.length : 0);

        let messagesDebugQuery = supabaseAdmin
          .from('messages')
          .select('tenant_id, id, direction')
          .limit(20);

        if (role !== 'global_admin') {
          messagesDebugQuery = messagesDebugQuery.eq('tenant_id', tenant_id);
        }

        const { data: allMessagesDebug, error: allMsgDebugError } = await messagesDebugQuery;

        console.log('Debug messages query:');
        console.log('- Error:', allMsgDebugError);
        console.log('- Count:', allMessagesDebug ? allMessagesDebug.length : 0);

        const debugResult = {
          userRole: role,
          userTenantId: tenant_id,
          leadsFound: allLeadsDebug ? allLeadsDebug.length : 0,
          messagesFound: allMessagesDebug ? allMessagesDebug.length : 0,
          sampleLeads: allLeadsDebug ? allLeadsDebug.slice(0, 3) : [],
          sampleMessages: allMessagesDebug ? allMessagesDebug.slice(0, 3) : [],
          meta: { role, tenant_id }
        };

        return new Response(JSON.stringify(debugResult), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        });

      default:
        console.warn('Unknown path:', path);
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        });
    }
  } catch (err: any) {
    console.error('🚨 Error in overview-analytics Edge Function route:', err.message);
    return new Response(JSON.stringify({
      error: 'Server error',
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
    });
  }
});