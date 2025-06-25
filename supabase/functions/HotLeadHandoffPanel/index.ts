import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create authenticated Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get user profile to determine role and tenant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('users_profile')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { role, tenant_id } = profile

    // Security check for non-global admins
    if (!tenant_id && role !== 'global_admin') {
      return new Response(
        JSON.stringify({ error: 'No tenant access configured' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const method = req.method
    const url = new URL(req.url)
    const pathname = url.pathname
    const action = url.searchParams.get('action') || 'default'

    // Handle path-based routing for modal endpoints
    if (pathname.endsWith('/awaiting-action')) {
      return await handleAwaitingAction(supabaseClient, role, tenant_id)
    } else if (pathname.endsWith('/time-lag')) {
      const period = url.searchParams.get('period') || '7days'
      return await handleTimeLag(supabaseClient, role, tenant_id, period)
    } else if (pathname.endsWith('/sales-outcomes')) {
      const period = url.searchParams.get('period') || '7days'
      return await handleSalesOutcomes(supabaseClient, role, tenant_id, period)
    }

    // Handle action-based routing for existing functionality
    switch (action) {
      case 'log-call':
        return await handleLogCall(req, supabaseClient, role, tenant_id)
      
      case 'update-outcome':
        return await handleUpdateOutcome(req, supabaseClient, role, tenant_id)
      
      default:
        return await handleDefaultData(supabaseClient, role, tenant_id)
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

// UPDATED: Handle awaiting action modal data - now includes critical leads
async function handleAwaitingAction(supabaseClient: any, role: string, tenant_id: string) {
  try {
    // Get all uncalled leads with lead_scores
    let query = supabaseClient
      .from('leads')
      .select(`
        id,
        name,
        status,
        marked_hot_at,
        call_logged,
        first_call_at,
        last_call_at,
        created_at,
        campaign,
        lead_scores (
          hot_score,
          requires_immediate_attention,
          alert_priority
        )
      `)
      .eq('call_logged', false)
      .order('created_at', { ascending: true }) // Oldest first

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: allUncalledLeads, error } = await query

    if (error) throw error

    // Filter to get only hot OR critical leads
    const awaitingLeads = (allUncalledLeads || []).filter(lead => 
      lead.status === 'Hot Lead' || 
      lead.lead_scores?.requires_immediate_attention === true
    ).sort((a, b) => {
      // Critical leads first
      const aCritical = a.lead_scores?.requires_immediate_attention || false
      const bCritical = b.lead_scores?.requires_immediate_attention || false
      
      if (aCritical && !bCritical) return -1
      if (!aCritical && bCritical) return 1
      
      // Then by marked_hot_at or created_at (oldest first)
      const aTime = new Date(a.marked_hot_at || a.created_at).getTime()
      const bTime = new Date(b.marked_hot_at || b.created_at).getTime()
      return aTime - bTime
    })

    const now = new Date()

    // Process leads to calculate queue metrics
    let totalAwaiting = 0
    let criticalLeads = 0
    let totalQueueTime = 0
    let longestWaitMinutes = 0
    const awaitingList = []

    for (const lead of awaitingLeads) {
      totalAwaiting++
      
      const referenceTime = new Date(lead.marked_hot_at || lead.created_at)
      const queueMinutes = (now.getTime() - referenceTime.getTime()) / (1000 * 60)
      totalQueueTime += queueMinutes
      
      if (queueMinutes > longestWaitMinutes) {
        longestWaitMinutes = queueMinutes
      }
      
      // Count as critical if requires_immediate_attention OR waiting > 2 hours
      if (lead.lead_scores?.requires_immediate_attention || queueMinutes > 120) {
        criticalLeads++
      }

      const formatQueueTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = Math.floor(minutes % 60)
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      }

      awaitingList.push({
        leadId: lead.id,
        name: lead.name || 'Unnamed Lead',
        status: lead.lead_scores?.requires_immediate_attention ? 'CRITICAL - Awaiting Call' : 'Awaiting First Call',
        timeInQueue: formatQueueTime(queueMinutes),
        lastAttempt: lead.last_call_at ? new Date(lead.last_call_at).toLocaleString() : 'Never called',
        assignedTo: 'Unassigned',
        isCritical: lead.lead_scores?.requires_immediate_attention || false,
        hotScore: lead.lead_scores?.hot_score || 0
      })
    }

    const avgQueueMinutes = totalAwaiting > 0 ? totalQueueTime / totalAwaiting : 0
    
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = Math.floor(minutes % 60)
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    // Calculate queue distribution
    const queueDistribution = [
      { type: 'Critical', count: awaitingList.filter(l => l.isCritical).length },
      { type: 'Hot', count: awaitingList.filter(l => !l.isCritical).length },
      { type: 'Pending Acceptance', count: 0 }
    ]

    const responseData = {
      queueOverview: {
        totalAwaiting,
        avgTimeInQueue: formatTime(avgQueueMinutes),
        longestWaiting: formatTime(longestWaitMinutes),
        criticalLeads
      },
      awaitingList: awaitingList.slice(0, 20), // Limit to 20 for performance
      queueDistribution,
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in awaiting action:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch awaiting action data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// UPDATED: Handle time lag modal data - now includes critical leads
async function handleTimeLag(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Calculate date range
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get ALL leads with lead_scores to check for hot OR critical
    let query = supabaseClient
      .from('leads')
      .select(`
        id,
        name,
        marked_hot_at,
        first_call_at,
        call_logged,
        status,
        created_at,
        lead_scores (
          hot_score,
          requires_immediate_attention
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: allLeads, error } = await query

    if (error) throw error

    // Filter to get hot OR critical leads that have been called
    const leads = (allLeads || []).filter(lead => 
      (lead.status === 'Hot Lead' || lead.lead_scores?.requires_immediate_attention === true) &&
      lead.first_call_at
    )

    // Calculate response time metrics
    const responseTimeTrend = []
    const timeDistribution = [
      { bin: '0-5 min', count: 0 },
      { bin: '5-15 min', count: 0 },
      { bin: '15-30 min', count: 0 },
      { bin: '30+ min', count: 0 }
    ]
    
    let totalHandoffs = 0
    let slaSatisfied = 0 // Within 15 minutes for hot, 5 minutes for critical
    let slaViolated = 0
    let criticalSlaViolations = 0

    // Group by date for trend
    const dateGroups = new Map()

    for (const lead of leads) {
      const referenceTime = lead.marked_hot_at || lead.created_at
      if (referenceTime && lead.first_call_at) {
        totalHandoffs++
        
        const markedTime = new Date(referenceTime)
        const callTime = new Date(lead.first_call_at)
        const responseMinutes = (callTime.getTime() - markedTime.getTime()) / (1000 * 60)
        
        // Different SLA for critical vs hot leads
        const slaThreshold = lead.lead_scores?.requires_immediate_attention ? 5 : 15
        
        if (responseMinutes <= slaThreshold) {
          slaSatisfied++
        } else {
          slaViolated++
          if (lead.lead_scores?.requires_immediate_attention) {
            criticalSlaViolations++
          }
        }
        
        // Time distribution
        if (responseMinutes <= 5) {
          timeDistribution[0].count++
        } else if (responseMinutes <= 15) {
          timeDistribution[1].count++
        } else if (responseMinutes <= 30) {
          timeDistribution[2].count++
        } else {
          timeDistribution[3].count++
        }
        
        // Group by date for trend
        const dateKey = markedTime.toISOString().split('T')[0]
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, { total: 0, sum: 0, critical: 0, criticalSum: 0 })
        }
        const group = dateGroups.get(dateKey)
        group.total++
        group.sum += responseMinutes
        
        if (lead.lead_scores?.requires_immediate_attention) {
          group.critical++
          group.criticalSum += responseMinutes
        }
      }
    }

    // Build trend data
    for (const [date, data] of dateGroups.entries()) {
      responseTimeTrend.push({
        date,
        avgResponseMinutes: Math.round(data.sum / data.total),
        criticalAvgMinutes: data.critical > 0 ? Math.round(data.criticalSum / data.critical) : null
      })
    }

    // Sort by date
    responseTimeTrend.sort((a, b) => a.date.localeCompare(b.date))

    // Mock performance by rep data (since we don't have assignments)
    const performanceByRep = [
      { name: 'Sarah Johnson', avgResponseMinutes: 8, leadsHandled: 15, slaCompliance: 95, criticalHandled: 3 },
      { name: 'Mike Chen', avgResponseMinutes: 12, leadsHandled: 12, slaCompliance: 85, criticalHandled: 2 },
      { name: 'Emily Davis', avgResponseMinutes: 18, leadsHandled: 8, slaCompliance: 72, criticalHandled: 1 }
    ]

    const responseData = {
      responseTimeTrend,
      performanceByRep,
      timeDistribution,
      totalCount: totalHandoffs,
      slaCompliance: {
        totalHandoffs,
        slaSatisfied,
        slaViolated,
        criticalSlaViolations
      },
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in time lag:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch time lag data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// UPDATED: Handle sales outcomes modal data - now includes critical leads
async function handleSalesOutcomes(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Calculate date range
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get ALL leads with lead_scores to include critical leads
    let query = supabaseClient
      .from('leads')
      .select(`
        id,
        name,
        status,
        call_outcome,
        marked_hot_at,
        first_call_at,
        created_at,
        lead_scores (
          hot_score,
          requires_immediate_attention
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: allLeads, error } = await query

    if (error) throw error

    // Filter to get hot OR critical leads
    const leads = (allLeads || []).filter(lead => 
      lead.status === 'Hot Lead' || 
      lead.lead_scores?.requires_immediate_attention === true
    )

    // Process outcomes
    const outcomesTrend = []
    const outcomeGroups = new Map()
    let totalHotAndCriticalLeads = leads.length
    let closedWonDeals = 0
    let criticalClosedWon = 0
    
    const disqualificationReasons = [
      { reason: 'Not decision maker', count: 0 },
      { reason: 'No budget', count: 0 },
      { reason: 'Wrong timing', count: 0 },
      { reason: 'Competitor chosen', count: 0 }
    ]

    // Process each lead
    for (const lead of leads) {
      if (lead.call_outcome) {
        // Count outcomes
        const dateKey = new Date(lead.first_call_at || lead.marked_hot_at || lead.created_at).toISOString().split('T')[0]
        
        if (!outcomeGroups.has(dateKey)) {
          outcomeGroups.set(dateKey, {
            'Closed Won': 0,
            'Disqualified': 0,
            'Nurture': 0,
            'Critical Closed': 0
          })
        }
        
        const outcomes = outcomeGroups.get(dateKey)
        
        if (lead.call_outcome === 'qualified' || lead.call_outcome === 'interested') {
          outcomes['Closed Won']++
          closedWonDeals++
          
          if (lead.lead_scores?.requires_immediate_attention) {
            outcomes['Critical Closed']++
            criticalClosedWon++
          }
        } else if (lead.call_outcome === 'not_fit') {
          outcomes['Disqualified']++
          // Randomly assign disqualification reason for demo
          const reasonIndex = Math.floor(Math.random() * 4)
          disqualificationReasons[reasonIndex].count++
        } else {
          outcomes['Nurture']++
        }
      }
    }

    // Build trend data
    const sortedDates = Array.from(outcomeGroups.keys()).sort()
    for (const date of sortedDates.slice(-7)) { // Last 7 days for display
      outcomesTrend.push({
        date,
        outcomes: outcomeGroups.get(date) || { 'Closed Won': 0, 'Disqualified': 0, 'Nurture': 0, 'Critical Closed': 0 }
      })
    }

    // Mock performance by rep with critical leads
    const performanceByRep = [
      { name: 'Sarah Johnson', totalHandled: 28, closedWon: 12, disqualified: 8, conversionRate: 42.9, criticalHandled: 5 },
      { name: 'Mike Chen', totalHandled: 24, closedWon: 8, disqualified: 10, conversionRate: 33.3, criticalHandled: 3 },
      { name: 'Emily Davis', totalHandled: 22, closedWon: 5, disqualified: 12, conversionRate: 22.7, criticalHandled: 2 }
    ]

    const conversionRate = totalHotAndCriticalLeads > 0 ? (closedWonDeals / totalHotAndCriticalLeads) * 100 : 0
    const criticalConversionRate = leads.filter(l => l.lead_scores?.requires_immediate_attention).length > 0
      ? (criticalClosedWon / leads.filter(l => l.lead_scores?.requires_immediate_attention).length) * 100
      : 0

    const responseData = {
      outcomesTrend,
      performanceByRep,
      disqualificationReasons: disqualificationReasons.filter(r => r.count > 0),
      conversionRate,
      criticalConversionRate,
      totalHotLeads: totalHotAndCriticalLeads,
      closedWonDeals,
      criticalClosedWon,
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in sales outcomes:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch sales outcomes data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// UPDATED: Handle default data fetch - now includes critical leads
async function handleDefaultData(supabaseClient: any, role: string, tenant_id: string) {
  const responseData: any = {
    hotLeads: [],
    hotSummary: {
      avg_response: '—',
      fastest_response: '—',
      slowest_response: '—',
      connected: 0,
      voicemail: 0,
      no_answer: 0,
      not_fit: 0,
      qualified: 0,
      interested: 0
    },
    meta: { role, tenant_id }
  }

  try {
    // 1. FETCH HOT AND CRITICAL LEADS
    // Get all leads with their lead_scores
    let allLeadsQuery = supabaseClient
      .from('leads')
      .select(`
        id,
        name,
        status,
        marked_hot_at,
        call_logged,
        created_at,
        campaign,
        lead_scores (
          hot_score,
          requires_immediate_attention,
          alert_priority
        )
      `)
      .order('created_at', { ascending: false })

    if (role !== 'global_admin') {
      allLeadsQuery = allLeadsQuery.eq('tenant_id', tenant_id)
    }

    const { data: allLeads, error: leadsError } = await allLeadsQuery

    if (!leadsError && allLeads) {
      // Filter to get hot OR critical leads
      const hotAndCriticalLeads = allLeads.filter(lead => 
        lead.status === 'Hot Lead' || 
        lead.lead_scores?.requires_immediate_attention === true
      ).sort((a, b) => {
        // Sort critical leads first
        const aCritical = a.lead_scores?.requires_immediate_attention || false
        const bCritical = b.lead_scores?.requires_immediate_attention || false
        
        if (aCritical && !bCritical) return -1
        if (!aCritical && bCritical) return 1
        
        // Then by hot score
        const aScore = a.lead_scores?.hot_score || 0
        const bScore = b.lead_scores?.hot_score || 0
        if (aScore !== bScore) return bScore - aScore
        
        // Finally by marked_hot_at or created_at
        const aTime = new Date(a.marked_hot_at || a.created_at).getTime()
        const bTime = new Date(b.marked_hot_at || b.created_at).getTime()
        return bTime - aTime // Most recent first
      })

      // For each hot/critical lead, get their latest message for context
      const leadsWithMessages = await Promise.all(
        hotAndCriticalLeads.map(async (lead) => {
          // Get latest message for this lead
          const { data: messages } = await supabaseClient
            .from('messages')
            .select('message_body, timestamp')
            .eq('lead_id', lead.id)
            .order('timestamp', { ascending: false })
            .limit(1)

          const latestMessage = messages?.[0]

          // Calculate time since marked hot or became critical
          let marked_hot_time_ago = '—'
          if (lead.marked_hot_at) {
            const markedTime = new Date(lead.marked_hot_at)
            const now = new Date()
            const diffMinutes = Math.floor((now.getTime() - markedTime.getTime()) / (1000 * 60))
            
            if (diffMinutes < 60) {
              marked_hot_time_ago = `${diffMinutes}m ago`
            } else if (diffMinutes < 1440) {
              marked_hot_time_ago = `${Math.floor(diffMinutes / 60)}h ago`
            } else {
              marked_hot_time_ago = `${Math.floor(diffMinutes / 1440)}d ago`
            }
          } else if (lead.lead_scores?.requires_immediate_attention) {
            // If no marked_hot_at but is critical, show as critical
            marked_hot_time_ago = 'Critical - Immediate'
          }

          return {
            id: lead.id,
            name: lead.name || 'Unnamed Lead',
            marked_hot_time_ago,
            snippet: latestMessage?.message_body?.slice(0, 80) + '...' || 'No recent messages',
            call_logged: lead.call_logged || false,
            campaign: lead.campaign,
            // Include critical lead indicators
            requires_immediate_attention: lead.lead_scores?.requires_immediate_attention || false,
            hot_score: lead.lead_scores?.hot_score || 0,
            alert_priority: lead.lead_scores?.alert_priority || 'none'
          }
        })
      )

      responseData.hotLeads = leadsWithMessages
      
      // Update meta to include counts
      const criticalCount = leadsWithMessages.filter(l => l.requires_immediate_attention).length
      const hotCount = leadsWithMessages.filter(l => !l.requires_immediate_attention).length
      
      responseData.meta = {
        ...responseData.meta,
        total_count: leadsWithMessages.length,
        critical_leads_count: criticalCount,
        hot_leads_count: hotCount
      }
    }

    // 2. FETCH HOT SUMMARY STATS - INCLUDING CRITICAL LEADS
    // Get hot AND critical leads from last 48 hours for summary
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    
    // Get ALL leads with lead_scores to check for critical
    let summaryQuery = supabaseClient
      .from('leads')
      .select(`
        id, 
        name, 
        status, 
        marked_hot_at, 
        call_logged, 
        created_at, 
        first_call_at,
        lead_scores (
          hot_score,
          requires_immediate_attention
        )
      `)
      .gte('created_at', fortyEightHoursAgo)

    if (role !== 'global_admin') {
      summaryQuery = summaryQuery.eq('tenant_id', tenant_id)
    }

    const { data: allRecentLeads, error: summaryError } = await summaryQuery

    if (!summaryError && allRecentLeads) {
      // Filter to get hot OR critical leads
      const summaryLeads = allRecentLeads.filter(lead =>
        lead.status === 'Hot Lead' || 
        lead.lead_scores?.requires_immediate_attention === true
      )

      // Calculate response time stats
      const leadsWithResponseTimes = []
      const criticalResponseTimes = []
      const hotResponseTimes = []
      
      for (const lead of summaryLeads) {
        // Use marked_hot_at OR created_at as the reference time
        const referenceTime = lead.marked_hot_at || lead.created_at
        
        if (referenceTime && lead.first_call_at) {
          const markedTime = new Date(referenceTime)
          const callTime = new Date(lead.first_call_at)
          const responseTimeMinutes = (callTime.getTime() - markedTime.getTime()) / (1000 * 60)
          
          leadsWithResponseTimes.push(responseTimeMinutes)
          
          // Separate critical vs hot for potential separate tracking
          if (lead.lead_scores?.requires_immediate_attention) {
            criticalResponseTimes.push(responseTimeMinutes)
          } else {
            hotResponseTimes.push(responseTimeMinutes)
          }
        }
      }

      if (leadsWithResponseTimes.length > 0) {
        const avgMinutes = leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length
        const fastestMinutes = Math.min(...leadsWithResponseTimes)
        const slowestMinutes = Math.max(...leadsWithResponseTimes)

        const formatTime = (minutes: number) => {
          if (minutes < 60) return `${Math.round(minutes)}m`
          return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`
        }

        responseData.hotSummary.avg_response = formatTime(avgMinutes)
        responseData.hotSummary.fastest_response = formatTime(fastestMinutes)
        responseData.hotSummary.slowest_response = formatTime(slowestMinutes)
        
        // Add critical-specific metrics if you want
        if (criticalResponseTimes.length > 0) {
          const criticalAvg = criticalResponseTimes.reduce((a, b) => a + b) / criticalResponseTimes.length
          console.log(`Critical leads avg response: ${formatTime(criticalAvg)} (${criticalResponseTimes.length} leads)`)
        }
      }
    }

    // 3. FETCH CALL OUTCOMES (Last 7 days) - INCLUDING CRITICAL LEADS
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    // Get ALL leads to check for critical
    let outcomesQuery = supabaseClient
      .from('leads')
      .select(`
        id, 
        call_logged, 
        call_outcome, 
        first_call_at,
        status,
        lead_scores (
          requires_immediate_attention
        )
      `)
      .not('call_outcome', 'is', null)
      .gte('first_call_at', sevenDaysAgo)

    if (role !== 'global_admin') {
      outcomesQuery = outcomesQuery.eq('tenant_id', tenant_id)
    }

    const { data: allOutcomeLeads, error: outcomesError } = await outcomesQuery

    if (!outcomesError && allOutcomeLeads) {
      // Filter to only include hot or critical leads
      const recentLeads = allOutcomeLeads.filter(lead =>
        lead.status === 'Hot Lead' || 
        lead.lead_scores?.requires_immediate_attention === true
      )

      const outcomes = {
        connected: 0,
        voicemail: 0,
        no_answer: 0,
        not_fit: 0,
        qualified: 0,
        interested: 0
      }

      recentLeads.forEach(lead => {
        if (lead.call_outcome && outcomes.hasOwnProperty(lead.call_outcome)) {
          outcomes[lead.call_outcome]++
        }
      })

      responseData.hotSummary = { ...responseData.hotSummary, ...outcomes }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error fetching default data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch hot lead data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// Handle call logging
async function handleLogCall(req: Request, supabaseClient: any, role: string, tenant_id: string) {
  try {
    const { lead_id } = await req.json()

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const now = new Date().toISOString()

    // Get current lead data to check if this is first call
    let leadQuery = supabaseClient
      .from('leads')
      .select('id, call_logged, first_call_at, total_call_attempts')
      .eq('id', lead_id)

    if (role !== 'global_admin') {
      leadQuery = leadQuery.eq('tenant_id', tenant_id)
    }

    const { data: currentLead, error: fetchError } = await leadQuery.single()

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Lead not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Prepare update data
    const updateData: any = {
      call_logged: true,
      last_call_at: now,
      total_call_attempts: (currentLead.total_call_attempts || 0) + 1
    }

    // If this is the first call, set first_call_at
    if (!currentLead.first_call_at) {
      updateData.first_call_at = now
    }

    // Update the lead
    let updateQuery = supabaseClient
      .from('leads')
      .update(updateData)
      .eq('id', lead_id)

    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id)
    }

    const { data: updatedLead, error: updateError } = await updateQuery
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Call logged successfully',
      lead: updatedLead,
      isFirstCall: !currentLead.first_call_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Call logging error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to log call' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// Handle call outcome update
async function handleUpdateOutcome(req: Request, supabaseClient: any, role: string, tenant_id: string) {
  try {
    // Extract ALL fields including estimated_pipeline_value
    const { lead_id, outcome, estimated_pipeline_value } = await req.json()

    const validOutcomes = ['connected', 'voicemail', 'no_answer', 'not_fit', 'qualified', 'interested', 'callback_requested']
    
    if (!validOutcomes.includes(outcome)) {
      return new Response(
        JSON.stringify({ error: 'Invalid outcome value' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Prepare update data
    const updateData: any = { call_outcome: outcome }
    
    // Add estimated_pipeline_value if provided (for qualified leads)
    if (estimated_pipeline_value !== undefined && estimated_pipeline_value !== null) {
      updateData.estimated_pipeline_value = estimated_pipeline_value
    }

    // Update the lead with call outcome AND pipeline value
    let updateQuery = supabaseClient
      .from('leads')
      .update(updateData)
      .eq('id', lead_id)

    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id)
    }

    const { data: updatedLead, error } = await updateQuery
      .select()
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Lead not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Call outcome updated successfully',
      lead: updatedLead
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Outcome update error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update call outcome' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}