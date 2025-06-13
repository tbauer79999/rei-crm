// supabase/functions/get-hot-leads/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts'; // Your shared auth utility

// Initialize Supabase client globally for the function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role key for backend operations
);

serve(async (req) => {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // IMPORTANT: Change '*' to your frontend's exact domain in production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight CORS request (OPTIONS method)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate and Authorize the request using the shared utility
  const authResult = await authenticateAndAuthorize(req);
  if (authResult.error) {
    console.error('Authentication/Authorization error:', authResult.error);
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status || 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { role, tenant_id } = authResult;

  try {
    console.log('=== HOT LEADS EDGE FUNCTION ===');
    console.log('User Role:', role);
    console.log('User Tenant ID:', tenant_id);

    // Security check - ensure tenant_id is available unless global_admin
    if (!tenant_id && role !== 'global_admin') {
      return new Response(JSON.stringify({ error: 'No tenant access configured' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const { pathname } = url;

    // --- Hot Leads List Logic (from hot.js) ---
    // This handles requests like /get-hot-leads/hot
    if (pathname.endsWith('/hot')) {
      console.log('Handling /hot request (list of hot leads)');

      let query = supabase
        .from('leads')
        .select(`
          id,
          name,
          status,
          marked_hot_at,
          call_logged,
          created_at,
          campaign
        `)
        .eq('status', 'Hot Lead')
        .order('marked_hot_at', { ascending: false });

      if (role !== 'global_admin') {
        query = query.eq('tenant_id', tenant_id);
      }

      const { data: hotLeads, error: leadsError } = await query;

      if (leadsError) {
        console.error('Error fetching hot leads:', leadsError);
        throw new Error('Failed to fetch hot leads data');
      }

      console.log('Found hot leads:', hotLeads?.length || 0);

      const leadsWithMessages = await Promise.all(
        (hotLeads || []).map(async (lead) => {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('message_body, timestamp')
            .eq('lead_id', lead.id)
            .order('timestamp', { ascending: false })
            .limit(1);

          const latestMessage = messages?.[0];

          let marked_hot_time_ago = '—';
          if (lead.marked_hot_at) {
            const markedTime = new Date(lead.marked_hot_at);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - markedTime.getTime()) / (1000 * 60));

            if (diffMinutes < 60) {
              marked_hot_time_ago = `${diffMinutes}m ago`;
            } else if (diffMinutes < 1440) {
              marked_hot_time_ago = `${Math.floor(diffMinutes / 60)}h ago`;
            } else {
              marked_hot_time_ago = `${Math.floor(diffMinutes / 1440)}d ago`;
            }
          }

          return {
            id: lead.id,
            name: lead.name || 'Unnamed Lead',
            marked_hot_time_ago,
            snippet: latestMessage?.message_body?.slice(0, 80) + '...' || 'No recent messages',
            call_logged: lead.call_logged || false,
            campaign: lead.campaign
          };
        })
      );

      console.log('Hot leads with messages:', leadsWithMessages.length);

      return new Response(JSON.stringify({ hotLeads: leadsWithMessages, meta: { role, tenant_id, leads_count: leadsWithMessages.length } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Hot Summary and Sub-routes Logic (from hot-summary.js) ---
    // This handles requests like /get-hot-leads/hot-summary and its sub-paths
    else if (pathname.startsWith('/functions/v1/get-hot-leads/hot-summary')) { // Using startsWith for broader match
      // Base /hot-summary route (e.g., /get-hot-leads/hot-summary)
      if (pathname.endsWith('/hot-summary')) {
        console.log('Handling /hot-summary request (summary stats)');
        
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        let query = supabase
          .from('leads')
          .select('id, name, status, marked_hot_at, call_logged, created_at, first_call_at')
          .eq('status', 'Hot Lead')
          .gte('marked_hot_at', fortyEightHoursAgo);

        if (role !== 'global_admin') {
          query = query.eq('tenant_id', tenant_id);
        }

        const { data: hotLeads, error: leadsError } = await query;

        if (leadsError) {
          console.error('Error fetching hot leads summary:', leadsError);
          throw new Error('Failed to fetch hot lead summary');
        }

        console.log('Hot leads for summary:', hotLeads?.length || 0);

        const leadsWithResponseTimes: number[] = [];
        for (const lead of hotLeads || []) {
          if (lead.marked_hot_at && lead.first_call_at) {
            const markedTime = new Date(lead.marked_hot_at);
            const callTime = new Date(lead.first_call_at);
            const responseTimeMinutes = (callTime.getTime() - markedTime.getTime()) / (1000 * 60);
            leadsWithResponseTimes.push(responseTimeMinutes);
          }
        }

        let avg_response = '—';
        let fastest_response = '—';
        let slowest_response = '—';

        if (leadsWithResponseTimes.length > 0) {
          const avgMinutes = leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length;
          const fastestMinutes = Math.min(...leadsWithResponseTimes);
          const slowestMinutes = Math.max(...leadsWithResponseTimes);

          const formatTime = (minutes: number) => {
            if (minutes < 60) return `${Math.round(minutes)}m`;
            return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
          };

          avg_response = formatTime(avgMinutes);
          fastest_response = formatTime(fastestMinutes);
          slowest_response = formatTime(slowestMinutes);
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        let outcomesQuery = supabase
          .from('leads')
          .select('id, call_logged, call_outcome, first_call_at')
          .not('call_outcome', 'is', null)
          .gte('first_call_at', sevenDaysAgo);

        if (role !== 'global_admin') {
          outcomesQuery = outcomesQuery.eq('tenant_id', tenant_id);
        }

        const { data: recentLeads, error: outcomesError } = await outcomesQuery;

        if (outcomesError) {
          console.error('Error fetching call outcomes:', outcomesError);
          // Don't throw, just log and continue with partial data
        }

        const outcomes = {
          connected: 0,
          voicemail: 0,
          no_answer: 0,
          not_fit: 0,
          qualified: 0,
          interested: 0
        };

        (recentLeads || []).forEach(lead => {
          if (lead.call_outcome && outcomes.hasOwnProperty(lead.call_outcome)) {
            outcomes[lead.call_outcome as keyof typeof outcomes]++;
          }
        });

        const stats = {
          avg_response,
          fastest_response,
          slowest_response,
          connected: outcomes.connected,
          voicemail: outcomes.voicemail,
          no_answer: outcomes.no_answer,
          not_fit: outcomes.not_fit,
          qualified: outcomes.qualified,
          interested: outcomes.interested
        };

        return new Response(JSON.stringify({
          ...stats,
          meta: { role, tenant_id, hot_leads_count: hotLeads?.length || 0 }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // /hot-summary/metrics
      else if (pathname.endsWith('/hot-summary/metrics')) {
        console.log('Handling /hot-summary/metrics request');

        let query = supabase
          .from('leads')
          .select('id, created_at, marked_hot_at, status_history')
          .eq('status', 'Hot Lead')
          .not('marked_hot_at', 'is', null);

        if (role !== 'global_admin') {
          query = query.eq('tenant_id', tenant_id);
        }

        const { data: hotLeads, error: leadsError } = await query;

        if (leadsError) {
          console.error('Error fetching hot leads for metrics:', leadsError);
          return new Response(JSON.stringify({ error: 'Failed to fetch hot leads for metrics' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (hotLeads.length === 0) {
          return new Response(JSON.stringify({
            avgMessages: 0,
            avgTimeHours: 0,
            fastestMessages: 0,
            fastestTimeMinutes: 0,
            totalHotLeads: 0,
            meta: { role, tenant_id }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const leadIds = hotLeads.map(lead => lead.id);
        const { data: messageCounts, error: messagesError } = await supabase
          .from('messages')
          .select('lead_id')
          .in('lead_id', leadIds)
          .not('message_body', 'is', null)
          .neq('message_body', '');

        if (messagesError) {
          console.error('Error fetching message counts:', messagesError);
          return new Response(JSON.stringify({ error: 'Failed to fetch message counts' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageCountsByLead: { [key: string]: number } = {};
        (messageCounts || []).forEach(msg => {
          messageCountsByLead[msg.lead_id] = (messageCountsByLead[msg.lead_id] || 0) + 1;
        });

        let totalMessages = 0;
        let totalTimeHours = 0;
        let fastestMessages = Infinity;
        let fastestTimeMinutes = Infinity;

        hotLeads.forEach(lead => {
          const messageCount = messageCountsByLead[lead.id] || 0;
          totalMessages += messageCount;

          const createdTime = new Date(lead.created_at);
          const hotTime = new Date(lead.marked_hot_at);
          const timeHours = (hotTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          totalTimeHours += timeHours;

          if (messageCount > 0 && messageCount < fastestMessages) {
            fastestMessages = messageCount;
            fastestTimeMinutes = Math.round(timeHours * 60);
          }
        });

        const avgMessages = totalMessages > 0 ? Math.round((totalMessages / hotLeads.length) * 10) / 10 : 0;
        const avgTimeHours = Math.round((totalTimeHours / hotLeads.length) * 10) / 10;

        return new Response(JSON.stringify({
          avgMessages,
          avgTimeHours,
          fastestMessages: fastestMessages === Infinity ? 0 : fastestMessages,
          fastestTimeMinutes: fastestTimeMinutes === Infinity ? 0 : fastestTimeMinutes,
          totalHotLeads: hotLeads.length,
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // /hot-summary/trigger-phrases
      else if (pathname.endsWith('/hot-summary/trigger-phrases')) {
        console.log('Handling /hot-summary/trigger-phrases request');
        const phrases = [
          "Let's talk",
          "I'm ready to",
          "Can we schedule",
          "Call me today",
          "What's your timeline",
          "I'm interested in"
        ];
        return new Response(JSON.stringify({
          phrases,
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // /hot-summary/opt-out-reasons
      else if (pathname.endsWith('/hot-summary/opt-out-reasons')) {
        console.log('Handling /hot-summary/opt-out-reasons request');
        let query = supabase
          .from('leads')
          .select('opt_out_reason')
          .not('opt_out_reason', 'is', null)
          .neq('opt_out_reason', '');

        if (role !== 'global_admin') {
          query = query.eq('tenant_id', tenant_id);
        }

        const { data: optOuts, error } = await query;

        if (error) {
          console.error('Error fetching opt-out reasons:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch opt-out reasons' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const reasonCounts: { [key: string]: number } = {};
        (optOuts || []).forEach(lead => {
          const reason = lead.opt_out_reason;
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        const reasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);

        return new Response(JSON.stringify({
          reasons,
          meta: { role, tenant_id, total_opt_outs: optOuts?.length || 0 }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // /hot-summary/handoff-health
      else if (pathname.endsWith('/hot-summary/handoff-health')) {
        console.log('Handling /hot-summary/handoff-health request');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        let query = supabase
          .from('leads')
          .select('id, marked_hot_at, first_call_at')
          .eq('status', 'Hot Lead')
          .not('marked_hot_at', 'is', null)
          .gte('marked_hot_at', sevenDaysAgo);

        if (role !== 'global_admin') {
          query = query.eq('tenant_id', tenant_id);
        }

        const { data: hotLeads, error } = await query;

        if (error) {
          console.error('Error fetching handoff health:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch handoff health data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const leadsWithResponseTimes: number[] = [];
        for (const lead of hotLeads || []) {
          if (lead.marked_hot_at && lead.first_call_at) {
            const markedTime = new Date(lead.marked_hot_at);
            const callTime = new Date(lead.first_call_at);
            const responseTimeMinutes = (callTime.getTime() - markedTime.getTime()) / (1000 * 60);
            leadsWithResponseTimes.push(responseTimeMinutes);
          }
        }

        let status, message;

        if (leadsWithResponseTimes.length === 0) {
          status = 'attention';
          message = 'No call data available';
        } else {
          const avgResponseMinutes = leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length;

          if (avgResponseMinutes <= 10) {
            status = 'healthy';
            message = `Avg response: ${Math.round(avgResponseMinutes)}m`;
          } else if (avgResponseMinutes <= 30) {
            status = 'review';
            message = `Avg response: ${Math.round(avgResponseMinutes)}m`;
          } else {
            status = 'attention';
            message = `Avg response: ${Math.round(avgResponseMinutes)}m - needs improvement`;
          }
        }

        return new Response(JSON.stringify({
          status,
          message,
          metrics: {
            totalHotLeads: hotLeads.length,
            leadsWithCalls: leadsWithResponseTimes.length,
            avgResponseMinutes: leadsWithResponseTimes.length > 0 ?
              Math.round(leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length) : 0
          },
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If neither path matches for /get-hot-leads
    return new Response(JSON.stringify({ error: 'Not Found: Invalid hot leads analytics endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) { // Use 'any' for err type or refine based on expected errors
    console.error('Hot Leads Edge Function general error:', err.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch hot leads analytics data', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});