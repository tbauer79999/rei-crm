// supabase/functions/get-lead-analytics/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Standard Deno HTTP server
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Supabase JS client
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
    console.log('=== LEAD ANALYTICS EDGE FUNCTION ===');
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
    const { pathname, searchParams } = url;
    const days = parseInt(searchParams.get('days') || '30'); // Default to 30 days

    // --- Lead Journey Funnel Logic (from funnel-analytics.js) ---
    if (pathname.includes('/funnel-analytics')) {
      console.log('Handling /funnel-analytics request for days:', days);

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, status_history, created_at, campaign');

      // Apply tenant filtering based on role
      if (role === 'global_admin') {
        console.log('Global admin - fetching all leads for funnel');
      } else if (role === 'enterprise_admin' || role === 'business_admin') {
        leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
        console.log('Filtered funnel query for tenant:', tenant_id);
      } else {
        return new Response(JSON.stringify({ error: 'Insufficient permissions for funnel analytics' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: leads, error: leadsError } = await leadsQuery;

      if (leadsError) {
        console.error('Error fetching leads for funnel:', leadsError);
        throw new Error('Failed to fetch lead data for funnel');
      }

      console.log('Found leads for funnel:', leads?.length || 0);

      if (!leads || leads.length === 0) {
        return new Response(JSON.stringify({
          statusDistribution: [],
          funnelData: [],
          transitionData: [],
          totalLeads: 0,
          meta: { role, tenant_id, leads_count: 0 }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Calculate status distribution
      const statusCounts: { [key: string]: number } = {};
      leads.forEach(lead => {
        const status = lead.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
      }));

      // 2. Calculate funnel progression
      const funnelStages = [
        { key: 'uploaded', name: 'Uploaded', statuses: ['New Lead', 'Cold Lead', 'Warm Lead', 'Engaging', 'Responding', 'Hot Lead'] },
        { key: 'engaged', name: 'Engaged', statuses: ['Engaging', 'Responding', 'Hot Lead'] },
        { key: 'responding', name: 'Responding', statuses: ['Responding', 'Hot Lead'] },
        { key: 'hot', name: 'Hot', statuses: ['Hot Lead'] }
      ];

      const funnelData = funnelStages.map(stage => {
        const count = leads.filter(lead =>
          stage.statuses.includes(lead.status)
        ).length;

        return {
          stage: stage.name,
          count
        };
      });

      // 3. Parse status transitions from status_history
      const transitions: { [key: string]: number } = {};

      leads.forEach(lead => {
        if (lead.status_history) {
          // Replace escaped newlines with actual newlines
          const historyLines = lead.status_history.split('\\n').filter(line => line.trim());

          for (let i = 0; i < historyLines.length - 1; i++) {
            const currentLine = historyLines[i].trim();
            const nextLine = historyLines[i + 1].trim();

            const currentStatus = currentLine.split(': ')[1];
            const nextStatus = nextLine.split(': ')[1];

            if (currentStatus && nextStatus) {
              const transitionKey = `${currentStatus} → ${nextStatus}`;
              transitions[transitionKey] = (transitions[transitionKey] || 0) + 1;
            }
          }
        }
      });

      const transitionData = Object.entries(transitions)
        .map(([transition, count]) => {
          const totalLeads = leads.length; // Use total leads from the fetched data
          const percent = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
          return {
            transition,
            count,
            percent: `${percent}%`
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      console.log('Status distribution:', statusDistribution);
      console.log('Funnel data:', funnelData);
      console.log('Transition data:', transitionData);

      return new Response(JSON.stringify({
        statusDistribution,
        funnelData,
        transitionData,
        totalLeads: leads.length,
        meta: { role, tenant_id, leads_count: leads.length }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    }
    // --- Lead Trends Logic (from lead-trends.js) ---
    else if (pathname.includes('/lead-trends')) {
      console.log('Handling /lead-trends request for days:', days);

      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let trendsQuery = supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', daysAgo)
        .order('created_at', { ascending: true });

      // Apply tenant filtering
      if (role !== 'global_admin') {
        trendsQuery = trendsQuery.eq('tenant_id', tenant_id);
      }

      const { data: trendData, error: trendError } = await trendsQuery;

      if (trendError) {
        console.error('Error fetching trend data:', trendError);
        throw new Error('Failed to fetch lead trends data');
      }

      console.log('Found leads for trends:', trendData?.length || 0);

      const dateGroups: { [key: string]: number } = {};
      (trendData || []).forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      });

      const trends = [];
      const startDate = new Date(daysAgo);
      const endDate = new Date();

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trends.push({
          date: dateStr,
          leads: dateGroups[dateStr] || 0
        });
      }

      console.log('Trend data points:', trends.length);

      return new Response(JSON.stringify({
        trends,
        totalPeriod: (trendData || []).length,
        periodDays: days,
        meta: { role, tenant_id, leads_count: (trendData || []).length }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // If neither path matches
      return new Response(JSON.stringify({ error: 'Not Found: Invalid analytics endpoint' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) { // Use 'any' for err type or refine based on expected errors
    console.error('Lead Analytics Edge Function general error:', err.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch lead analytics data', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});