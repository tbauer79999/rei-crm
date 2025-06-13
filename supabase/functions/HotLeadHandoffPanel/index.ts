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
    const action = url.searchParams.get('action') || 'default'

    // Handle different actions based on the action parameter
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

// Handle default data fetch (hot leads + summary stats)
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
    // 1. FETCH HOT LEADS
    let hotLeadsQuery = supabaseClient
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
      .order('marked_hot_at', { ascending: false })

    if (role !== 'global_admin') {
      hotLeadsQuery = hotLeadsQuery.eq('tenant_id', tenant_id)
    }

    const { data: hotLeads, error: leadsError } = await hotLeadsQuery

    if (!leadsError && hotLeads) {
      // For each hot lead, get their latest message for context
      const leadsWithMessages = await Promise.all(
        hotLeads.map(async (lead) => {
          // Get latest message for this lead
          const { data: messages } = await supabaseClient
            .from('messages')
            .select('message_body, timestamp')
            .eq('lead_id', lead.id)
            .order('timestamp', { ascending: false })
            .limit(1)

          const latestMessage = messages?.[0]

          // Calculate time since marked hot
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
          }

          return {
            id: lead.id,
            name: lead.name || 'Unnamed Lead',
            marked_hot_time_ago,
            snippet: latestMessage?.message_body?.slice(0, 80) + '...' || 'No recent messages',
            call_logged: lead.call_logged || false,
            campaign: lead.campaign
          }
        })
      )

      responseData.hotLeads = leadsWithMessages
    }

    // 2. FETCH HOT SUMMARY STATS
    // Get hot leads from last 48 hours for summary
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    
    let summaryQuery = supabaseClient
      .from('leads')
      .select('id, name, status, marked_hot_at, call_logged, created_at, first_call_at')
      .eq('status', 'Hot Lead')
      .gte('marked_hot_at', fortyEightHoursAgo)

    if (role !== 'global_admin') {
      summaryQuery = summaryQuery.eq('tenant_id', tenant_id)
    }

    const { data: summaryLeads, error: summaryError } = await summaryQuery

    if (!summaryError && summaryLeads) {
      // Calculate response time stats
      const leadsWithResponseTimes = []
      
      for (const lead of summaryLeads) {
        if (lead.marked_hot_at && lead.first_call_at) {
          const markedTime = new Date(lead.marked_hot_at)
          const callTime = new Date(lead.first_call_at)
          const responseTimeMinutes = (callTime.getTime() - markedTime.getTime()) / (1000 * 60)
          leadsWithResponseTimes.push(responseTimeMinutes)
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
      }
    }

    // 3. FETCH CALL OUTCOMES (Last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    let outcomesQuery = supabaseClient
      .from('leads')
      .select('id, call_logged, call_outcome, first_call_at')
      .not('call_outcome', 'is', null)
      .gte('first_call_at', sevenDaysAgo)

    if (role !== 'global_admin') {
      outcomesQuery = outcomesQuery.eq('tenant_id', tenant_id)
    }

    const { data: recentLeads, error: outcomesError } = await outcomesQuery

    if (!outcomesError && recentLeads) {
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
    const { lead_id, outcome } = await req.json()

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

    // Update the lead with call outcome
    let updateQuery = supabaseClient
      .from('leads')
      .update({ call_outcome: outcome })
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