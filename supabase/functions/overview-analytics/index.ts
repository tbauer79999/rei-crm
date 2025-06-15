// supabase/functions/overview-analytics/index.ts
import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Supabase Client Initialization for Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let user: { id: string; email: string; role: string; tenant_id: string | null } | null = null;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        hint: 'Include a valid Supabase token in Authorization header'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.slice(7);
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !supabaseUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = await getUserProfile(supabaseUser.id);

    user = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: profile.role,
      tenant_id: profile.tenant_id
    };

    if (!user.tenant_id && user.role !== 'global_admin') {
      return new Response(JSON.stringify({ error: 'No tenant access configured' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Authentication failed',
      details: error.message
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = new URL(req.url);
  const fullPath = url.pathname;
  const functionName = 'overview-analytics';
  const basePathRegex = new RegExp(`^(\/functions\/v1)?\/${functionName}`);
  const path = fullPath.replace(basePathRegex, '');
  const { role, tenant_id } = user;

  try {
    switch (path) {
      case '/':
      case '':
        let leadsQuery = supabaseAdmin
          .from('leads')
          .select('id, status, created_at');

        if (role !== 'global_admin') {
          leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
        }

        const { data: leads, error: leadError } = await leadsQuery;

        if (leadError) throw leadError;

        let messagesQuery = supabaseAdmin
          .from('messages')
          .select('direction, lead_id');

        if (role !== 'global_admin') {
          messagesQuery = messagesQuery.eq('tenant_id', tenant_id);
        }

        const { data: messages, error: msgError } = await messagesQuery;

        if (msgError) throw msgError;

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

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/analytics-trend-cost':
        const nowTrend = new Date();
        const thisWeekStart = new Date(nowTrend);
        thisWeekStart.setDate(nowTrend.getDate() - 7);
        const lastWeekStart = new Date(nowTrend);
        lastWeekStart.setDate(nowTrend.getDate() - 14);

        let leadsTrendQuery = supabaseAdmin
          .from('leads')
          .select('id, created_at, status');

        if (role !== 'global_admin') {
          leadsTrendQuery = leadsTrendQuery.eq('tenant_id', tenant_id);
        }

        const { data: leadsTrend, error: leadTrendError } = await leadsTrendQuery;

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

        return new Response(JSON.stringify(trendResult), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/debug-data':
        let leadsDebugQuery = supabaseAdmin
          .from('leads')
          .select('tenant_id, id, status, created_at')
          .limit(20);

        if (role !== 'global_admin') {
          leadsDebugQuery = leadsDebugQuery.eq('tenant_id', tenant_id);
        }

        const { data: allLeadsDebug, error: allLeadsDebugError } = await leadsDebugQuery;

        let messagesDebugQuery = supabaseAdmin
          .from('messages')
          .select('tenant_id, id, direction')
          .limit(20);

        if (role !== 'global_admin') {
          messagesDebugQuery = messagesDebugQuery.eq('tenant_id', tenant_id);
        }

        const { data: allMessagesDebug, error: allMsgDebugError } = await messagesDebugQuery;

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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
