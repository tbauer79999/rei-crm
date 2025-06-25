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

  // Helper function to apply tenant filter
  const applyTenantFilter = (query: any) => {
    if (role !== 'global_admin') {
      return query.eq('tenant_id', tenant_id);
    }
    return query;
  };

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

      // DETAILED ANALYTICS ENDPOINTS
      case '/details/total-leads':
        const totalPeriod = parseInt(url.searchParams.get('period') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - totalPeriod);

        // Get all leads for the period
        let totalLeadsDetailQuery = applyTenantFilter(
          supabaseAdmin
            .from('leads')
            .select('id, name, email, status, created_at, campaign')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
        );

        const { data: totalLeadsData, error: totalLeadsError } = await totalLeadsDetailQuery;
        if (totalLeadsError) throw totalLeadsError;

        // Generate trend data
        const trendData: { date: string; count: number }[] = [];
        const dateMap = new Map<string, number>();

        totalLeadsData.forEach((lead: any) => {
          const date = new Date(lead.created_at).toISOString().split('T')[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        });

        // Fill in missing dates with 0
        for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          trendData.push({
            date: dateStr,
            count: dateMap.get(dateStr) || 0
          });
        }

        // Campaign/source distribution
        const campaignCounts = new Map<string, number>();
        totalLeadsData.forEach((lead: any) => {
          const campaign = lead.campaign || 'Direct';
          campaignCounts.set(campaign, (campaignCounts.get(campaign) || 0) + 1);
        });

        const sourceData = Array.from(campaignCounts.entries())
          .map(([source, count]) => ({
            source,
            count,
            color: getColorForSource(source)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Recent signups
        const recentSignups = totalLeadsData.slice(0, 10).map((lead: any) => ({
          id: lead.id,
          name: lead.name || 'Anonymous',
          email: lead.email || 'No email',
          signupDate: new Date(lead.created_at).toISOString().split('T')[0],
          source: lead.campaign || 'Direct'
        }));

        return new Response(JSON.stringify({
          trendData,
          sourceData,
          recentSignups,
          totalCount: totalLeadsData.length,
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/details/weekly-leads':
        const weeks = parseInt(url.searchParams.get('weeks') || '8');
        const weeklyStartDate = new Date();
        weeklyStartDate.setDate(weeklyStartDate.getDate() - (weeks * 7));

        let weeklyLeadsQuery = applyTenantFilter(
          supabaseAdmin
            .from('leads')
            .select('id, created_at, status, campaign')
            .gte('created_at', weeklyStartDate.toISOString())
        );

        const { data: weeklyLeadsData, error: weeklyError } = await weeklyLeadsQuery;
        if (weeklyError) throw weeklyError;

        // Group by week
        const weeklyData: any[] = [];
        const weekMap = new Map<string, any>();

        weeklyLeadsData.forEach((lead: any) => {
          const date = new Date(lead.created_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
              weekStartDate: weekKey,
              leads: [],
              sources: new Map<string, number>()
            });
          }

          const week = weekMap.get(weekKey);
          week.leads.push(lead);
          const source = lead.campaign || 'Direct';
          week.sources.set(source, (week.sources.get(source) || 0) + 1);
        });

        // Convert to array and calculate metrics
        const sortedWeeks = Array.from(weekMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-weeks);

        const weeklyTrendData = sortedWeeks.map(([weekKey, weekData], index) => {
          const currentWeekLeads = weekData.leads.length;
          const previousWeekLeads = index > 0 ? sortedWeeks[index - 1][1].leads.length : currentWeekLeads;
          const growthPercentage = previousWeekLeads > 0 
            ? Math.round(((currentWeekLeads - previousWeekLeads) / previousWeekLeads) * 100)
            : 0;

          return {
            weekStartDate: weekKey,
            currentWeekLeads,
            previousWeekLeads: index > 0 ? previousWeekLeads : null,
            growthPercentage
          };
        });

        // Source breakdown by week
        const weeklySourceData = sortedWeeks.map(([weekKey, weekData]) => ({
          weekStartDate: weekKey,
          sources: Array.from(weekData.sources.entries()).map(([name, count]) => ({
            name,
            count
          }))
        }));

        // Calculate hot lead correlation
        const hotLeadsInPeriod = weeklyLeadsData.filter((l: any) => l.status === 'Hot Lead').length;
        const avgHotRate = weeklyLeadsData.length > 0 
          ? ((hotLeadsInPeriod / weeklyLeadsData.length) * 100).toFixed(1)
          : '0';

        return new Response(JSON.stringify({
          weeklyTrendData,
          weeklySourceData,
          avgHotRate,
          totalHotLeads: hotLeadsInPeriod,
          bestWeek: weeklyTrendData.reduce((best, week) => 
            week.currentWeekLeads > (best?.currentWeekLeads || 0) ? week : best
          )?.weekStartDate || 'N/A',
          weeklyInsights: generateWeeklyInsights(weeklyTrendData),
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/details/hot-lead-rate':
        const hotPeriod = parseInt(url.searchParams.get('period') || '30');
        const hotStartDate = new Date();
        hotStartDate.setDate(hotStartDate.getDate() - hotPeriod);

        let hotLeadsDetailQuery = applyTenantFilter(
          supabaseAdmin
            .from('leads')
            .select('id, status, created_at, marked_hot_at, campaign, status_history')
            .gte('created_at', hotStartDate.toISOString())
        );

        const { data: hotLeadsData, error: hotError } = await hotLeadsDetailQuery;
        if (hotError) throw hotError;

        // Calculate hot rate trend
        const hotRateTrendData: { date: string; hotRate: number }[] = [];
        const dailyStats = new Map<string, { total: number; hot: number }>();

        hotLeadsData.forEach((lead: any) => {
          const date = new Date(lead.created_at).toISOString().split('T')[0];
          const stats = dailyStats.get(date) || { total: 0, hot: 0 };
          stats.total++;
          if (lead.status === 'Hot Lead') stats.hot++;
          dailyStats.set(date, stats);
        });

        for (let d = new Date(hotStartDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const stats = dailyStats.get(dateStr) || { total: 0, hot: 0 };
          hotRateTrendData.push({
            date: dateStr,
            hotRate: stats.total > 0 ? (stats.hot / stats.total) * 100 : 0
          });
        }

        // Hot rate by channel
        const channelStats = new Map<string, { total: number; hot: number }>();
        hotLeadsData.forEach((lead: any) => {
          const channel = lead.campaign || 'Direct';
          const stats = channelStats.get(channel) || { total: 0, hot: 0 };
          stats.total++;
          if (lead.status === 'Hot Lead') stats.hot++;
          channelStats.set(channel, stats);
        });

        const hotRateByChannelData = Array.from(channelStats.entries())
          .map(([channel, stats]) => ({
            channel,
            hotRate: stats.total > 0 ? stats.hot / stats.total : 0
          }))
          .sort((a, b) => b.hotRate - a.hotRate);

        // Time to hot conversion
        const conversionTimes: number[] = [];
        hotLeadsData.forEach((lead: any) => {
          if (lead.status === 'Hot Lead' && lead.marked_hot_at) {
            const createdTime = new Date(lead.created_at).getTime();
            const hotTime = new Date(lead.marked_hot_at).getTime();
            const minutes = (hotTime - createdTime) / (1000 * 60);
            if (minutes > 0) conversionTimes.push(minutes);
          }
        });

        const timeToHotData = {
          avgMinutes: conversionTimes.length > 0 
            ? Math.round(conversionTimes.reduce((a, b) => a + b) / conversionTimes.length)
            : 0,
          medianMinutes: conversionTimes.length > 0
            ? Math.round(conversionTimes.sort((a, b) => a - b)[Math.floor(conversionTimes.length / 2)])
            : 0,
          distribution: calculateTimeDistribution(conversionTimes)
        };

        // Funnel data
        const funnelData = [
          { 
            stage: 'Initial Contact', 
            count: hotLeadsData.length,
            conversionToNext: hotLeadsData.filter((l: any) => 
              ['Warm Lead', 'Engaging', 'Responding', 'Hot Lead'].includes(l.status)
            ).length / hotLeadsData.length * 100
          },
          { 
            stage: 'Qualified Response', 
            count: hotLeadsData.filter((l: any) => 
              ['Warm Lead', 'Engaging', 'Responding', 'Hot Lead'].includes(l.status)
            ).length,
            conversionToNext: hotLeadsData.filter((l: any) => 
              ['Engaging', 'Responding', 'Hot Lead'].includes(l.status)
            ).length / hotLeadsData.filter((l: any) => 
              ['Warm Lead', 'Engaging', 'Responding', 'Hot Lead'].includes(l.status)
            ).length * 100
          },
          { 
            stage: 'Strong Interest', 
            count: hotLeadsData.filter((l: any) => 
              ['Engaging', 'Responding', 'Hot Lead'].includes(l.status)
            ).length,
            conversionToNext: hotLeadsData.filter((l: any) => l.status === 'Hot Lead').length / 
              hotLeadsData.filter((l: any) => ['Engaging', 'Responding', 'Hot Lead'].includes(l.status)).length * 100
          },
          { 
            stage: 'Hot Lead', 
            count: hotLeadsData.filter((l: any) => l.status === 'Hot Lead').length
          }
        ];

        return new Response(JSON.stringify({
          hotRateTrendData,
          targetHotRate: 15,
          hotRateByChannelData,
          timeToHotData,
          funnelData,
          optimizationTips: generateOptimizationTips(hotRateByChannelData, timeToHotData),
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/details/active-leads':
        let activeLeadsQuery = applyTenantFilter(
          supabaseAdmin
            .from('leads')
            .select('id, status, created_at, campaign')
            .in('status', ['New Lead', 'Cold Lead', 'Warm Lead', 'Engaging', 'Responding'])
        );

        const { data: activeLeadsData, error: activeError } = await activeLeadsQuery;
        if (activeError) throw activeError;

        // Trend data (last 30 days)
        const activeTrendData: { date: string; count: number }[] = [];
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        for (let d = new Date(last30Days); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const count = activeLeadsData.filter((lead: any) => 
            new Date(lead.created_at) <= d
          ).length;
          activeTrendData.push({ date: dateStr, count });
        }

        // Stage distribution
        const stageColors: { [key: string]: string } = {
          'New Lead': '#3B82F6',
          'Cold Lead': '#6B7280',
          'Warm Lead': '#F59E0B',
          'Engaging': '#10B981',
          'Responding': '#8B5CF6'
        };

        const stageCounts = new Map<string, number>();
        activeLeadsData.forEach((lead: any) => {
          stageCounts.set(lead.status, (stageCounts.get(lead.status) || 0) + 1);
        });

        const stageData = Array.from(stageCounts.entries()).map(([source, count]) => ({
          source,
          count,
          color: stageColors[source] || '#6B7280'
        }));

        // For now, simulate owner distribution (since we don't have owner data)
        const ownerData = [
          { source: 'AI Bot', count: Math.floor(activeLeadsData.length * 0.6), color: '#3B82F6' },
          { source: 'Unassigned', count: Math.floor(activeLeadsData.length * 0.4), color: '#6B7280' }
        ];

        // Identify stagnant leads (no activity in 7+ days)
        // Since we don't have last_interaction, we'll use created_at as proxy
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stagnantLeads = activeLeadsData
          .filter((lead: any) => new Date(lead.created_at) < sevenDaysAgo)
          .slice(0, 10)
          .map((lead: any) => ({
            leadId: lead.id,
            name: lead.name || 'Anonymous Lead',
            currentStatus: lead.status,
            assignedTo: 'AI Bot',
            lastInteraction: new Date(lead.created_at).toISOString().split('T')[0],
            daysStagnant: Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
          }));

        return new Response(JSON.stringify({
          trendData: activeTrendData,
          stageData,
          ownerData,
          stagnantLeads,
          totalActive: activeLeadsData.length,
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/details/completed-leads':
        const completedPeriod = parseInt(url.searchParams.get('period') || '30');
        const completedStartDate = new Date();
        completedStartDate.setDate(completedStartDate.getDate() - completedPeriod);

        let completedLeadsQuery = applyTenantFilter(
          supabaseAdmin
            .from('leads')
            .select('id, status, created_at, marked_hot_at, opt_out_reason')
            .in('status', ['Hot Lead', 'Opted Out', 'Unsubscribed', 'Disqualified'])
            .gte('created_at', completedStartDate.toISOString())
        );

        const { data: completedLeadsData, error: completedError } = await completedLeadsQuery;
        if (completedError) throw completedError;

        // Trend data
        const completedTrendData: { date: string; count: number }[] = [];
        const completedDateMap = new Map<string, number>();

        completedLeadsData.forEach((lead: any) => {
          const date = new Date(lead.created_at).toISOString().split('T')[0];
          completedDateMap.set(date, (completedDateMap.get(date) || 0) + 1);
        });

        for (let d = new Date(completedStartDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          completedTrendData.push({
            date: dateStr,
            count: completedDateMap.get(dateStr) || 0
          });
        }

        // Outcome distribution
        const outcomeCounts = new Map<string, number>();
        completedLeadsData.forEach((lead: any) => {
          const status = lead.status === 'Hot Lead' ? 'Converted to Customer' : lead.status;
          outcomeCounts.set(status, (outcomeCounts.get(status) || 0) + 1);
        });

        const outcomeData = Array.from(outcomeCounts.entries()).map(([status, count]) => ({
          status,
          count
        }));

        // Disqualification reasons (from opt_out_reason field)
        const reasonCounts = new Map<string, number>();
        completedLeadsData
          .filter((lead: any) => lead.opt_out_reason)
          .forEach((lead: any) => {
            reasonCounts.set(lead.opt_out_reason, (reasonCounts.get(lead.opt_out_reason) || 0) + 1);
          });

        const disqualificationReasons = Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Average completion time
        const completionTimes: number[] = [];
        completedLeadsData.forEach((lead: any) => {
          if (lead.marked_hot_at) {
            const days = Math.floor(
              (new Date(lead.marked_hot_at).getTime() - new Date(lead.created_at).getTime()) / 
              (1000 * 60 * 60 * 24)
            );
            if (days > 0) completionTimes.push(days);
          }
        });

        const avgCompletionTime = completionTimes.length > 0
          ? (completionTimes.reduce((a, b) => a + b) / completionTimes.length).toFixed(1)
          : '0';

        return new Response(JSON.stringify({
          trendData: completedTrendData,
          outcomeData,
          disqualificationReasons,
          avgCompletionTime,
          totalCompleted: completedLeadsData.length,
          meta: { role, tenant_id }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case '/details/messages':
        const messageType = url.searchParams.get('type') || 'sent';
        const messagePeriod = parseInt(url.searchParams.get('period') || '30');
        const messageStartDate = new Date();
        messageStartDate.setDate(messageStartDate.getDate() - messagePeriod);

        let messagesDetailQuery = applyTenantFilter(
          supabaseAdmin
            .from('messages')
            .select('id, direction, timestamp, lead_id, message_body')
            .gte('timestamp', messageStartDate.toISOString())
        );

        if (messageType === 'sent') {
          messagesDetailQuery = messagesDetailQuery.eq('direction', 'outbound');
        } else {
          messagesDetailQuery = messagesDetailQuery.eq('direction', 'inbound');
        }

        const { data: messagesData, error: messagesError } = await messagesDetailQuery;
        if (messagesError) throw messagesError;

        // Trend data
        const messageTrendData: { date: string; count: number }[] = [];
        const messageDateMap = new Map<string, number>();

        messagesData.forEach((msg: any) => {
          const date = new Date(msg.timestamp).toISOString().split('T')[0];
          messageDateMap.set(date, (messageDateMap.get(date) || 0) + 1);
        });

        for (let d = new Date(messageStartDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          messageTrendData.push({
            date: dateStr,
            count: messageDateMap.get(dateStr) || 0
          });
        }

        if (messageType === 'sent') {
          // For sent messages, simulate message type distribution
          const messageTypeData = [
            { source: 'Initial Outreach', count: Math.floor(messagesData.length * 0.4), color: '#3B82F6' },
            { source: 'Follow-up', count: Math.floor(messagesData.length * 0.3), color: '#10B981' },
            { source: 'Qualification', count: Math.floor(messagesData.length * 0.2), color: '#F59E0B' },
            { source: 'Nurture', count: Math.floor(messagesData.length * 0.1), color: '#8B5CF6' }
          ];

          // Simulate delivery stats
          const deliveryStats = [
            { label: 'Total Sent', value: messagesData.length.toString() },
            { label: 'Delivered', value: Math.floor(messagesData.length * 0.96).toString(), percentage: 96 },
            { label: 'Failed', value: Math.floor(messagesData.length * 0.04).toString(), percentage: 4 },
            { label: 'Opened', value: Math.floor(messagesData.length * 0.40).toString(), percentage: 40 }
          ];

          // Simulate engagement data
          const engagementData = [
            { type: 'Initial Outreach', rate: 0.35 },
            { type: 'Follow-up', rate: 0.42 },
            { type: 'Qualification', rate: 0.58 },
            { type: 'Nurture', rate: 0.28 }
          ];

          return new Response(JSON.stringify({
            trendData: messageTrendData,
            messageTypeData,
            deliveryStats,
            engagementData,
            totalCount: messagesData.length,
            meta: { role, tenant_id }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // For received messages
          const sourceData = [
            { source: 'Web Chat', count: Math.floor(messagesData.length * 0.4), color: '#3B82F6' },
            { source: 'Email', count: Math.floor(messagesData.length * 0.3), color: '#10B981' },
            { source: 'SMS', count: Math.floor(messagesData.length * 0.2), color: '#F59E0B' },
            { source: 'Phone', count: Math.floor(messagesData.length * 0.1), color: '#8B5CF6' }
          ];

          // Simulate top intents
          const topIntents = [
            { intent: 'Pricing Inquiry', count: Math.floor(messagesData.length * 0.25) },
            { intent: 'Demo Request', count: Math.floor(messagesData.length * 0.20) },
            { intent: 'Technical Support', count: Math.floor(messagesData.length * 0.15) },
            { intent: 'Feature Question', count: Math.floor(messagesData.length * 0.10) },
            { intent: 'General Info', count: Math.floor(messagesData.length * 0.08) }
          ];

          // Simulate sentiment
          const sentimentData = [
            { sentiment: 'Positive', count: Math.floor(messagesData.length * 0.55) },
            { sentiment: 'Neutral', count: Math.floor(messagesData.length * 0.37) },
            { sentiment: 'Negative', count: Math.floor(messagesData.length * 0.08) }
          ];

          // Simulate unhandled messages
          const unhandledMessages = messagesData.slice(0, 3).map((msg: any) => ({
            messageId: msg.id,
            content: (msg.message_body || '').substring(0, 50),
            date: new Date(msg.timestamp).toISOString().split('T')[0],
            confidence: Math.random() * 0.5
          }));

          return new Response(JSON.stringify({
            trendData: messageTrendData,
            sourceData,
            topIntents,
            sentimentData,
            unhandledMessages,
            totalCount: messagesData.length,
            meta: { role, tenant_id }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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

// Helper functions
function getColorForSource(source: string): string {
  const colors: { [key: string]: string } = {
    'Website': '#3B82F6',
    'Paid Ads': '#10B981',
    'Referral': '#F59E0B',
    'Cold Outreach': '#8B5CF6',
    'Social Media': '#EF4444',
    'Direct': '#6B7280'
  };
  return colors[source] || '#6B7280';
}

function calculateTimeDistribution(times: number[]): any[] {
  if (times.length === 0) return [];
  
  const ranges = [
    { range: '< 1 hour', min: 0, max: 60 },
    { range: '1-2 hours', min: 60, max: 120 },
    { range: '2-4 hours', min: 120, max: 240 },
    { range: '> 4 hours', min: 240, max: Infinity }
  ];

  return ranges.map(r => ({
    range: r.range,
    percentage: Math.round((times.filter(t => t >= r.min && t < r.max).length / times.length) * 100)
  }));
}

function generateWeeklyInsights(weeklyData: any[]): string {
  if (weeklyData.length < 2) return "Not enough data for insights.";
  
  const lastWeek = weeklyData[weeklyData.length - 1];
  const prevWeek = weeklyData[weeklyData.length - 2];
  
  if (lastWeek.growthPercentage > 10) {
    return `Strong momentum! Last week saw a ${lastWeek.growthPercentage}% increase in leads. Keep pushing on current strategies.`;
  } else if (lastWeek.growthPercentage < -10) {
    return `Lead generation dropped ${Math.abs(lastWeek.growthPercentage)}% last week. Consider reviewing campaign performance and adjusting strategies.`;
  } else {
    return `Steady performance with ${lastWeek.currentWeekLeads} leads last week. Consider testing new channels for growth.`;
  }
}

function generateOptimizationTips(channelData: any[], timeData: any): string[] {
  const tips: string[] = [];
  
  // Find underperforming channels
  const avgHotRate = channelData.reduce((sum, ch) => sum + ch.hotRate, 0) / channelData.length;
  const underperforming = channelData.filter(ch => ch.hotRate < avgHotRate * 0.5);
  
  if (underperforming.length > 0) {
    tips.push(`${underperforming[0].channel} channel shows ${Math.round(underperforming[0].hotRate * 100)}% hot rate - consider campaign optimization`);
  }
  
  if (timeData.avgMinutes > 240) {
    tips.push("Average time to hot lead exceeds 4 hours - consider more aggressive follow-up sequences");
  }
  
  if (channelData.length > 0) {
    const bestChannel = channelData[0];
    tips.push(`${bestChannel.channel} is your best performing channel at ${Math.round(bestChannel.hotRate * 100)}% - consider increasing investment`);
  }
  
  return tips.slice(0, 3);
}