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

    // Check permissions
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Parse URL parameters
    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    console.log(`=== LEAD JOURNEY FUNNEL ENDPOINT ===`)
    console.log('user role:', role)
    console.log('user tenant_id:', tenant_id)
    console.log('days:', days)

    const responseData: any = {
      statusDistribution: [],
      funnelData: [],
      transitionData: [],
      trends: [],
      totalLeads: 0,
      periodDays: days,
      meta: { role, tenant_id }
    }

    try {
      // 1. FETCH ALL LEADS FOR FUNNEL ANALYTICS
      let leadsQuery = supabaseClient
        .from('leads')
        .select('id, status, status_history, created_at, campaign')

      // Apply tenant filtering based on role
      if (role !== 'global_admin') {
        leadsQuery = leadsQuery.eq('tenant_id', tenant_id)
      }

      const { data: leads, error: leadsError } = await leadsQuery

      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        throw leadsError
      }

      console.log('Found leads:', leads?.length || 0)

      if (!leads || leads.length === 0) {
        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      responseData.totalLeads = leads.length

      // 2. CALCULATE STATUS DISTRIBUTION
      const statusCounts: Record<string, number> = {}
      leads.forEach(lead => {
        const status = lead.status || 'Unknown'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      responseData.statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
      }))

      // 3. CALCULATE FUNNEL PROGRESSION
      const funnelStages = [
        { key: 'uploaded', name: 'Uploaded', statuses: ['New Lead', 'Cold Lead', 'Warm Lead', 'Engaging', 'Responding', 'Hot Lead'] },
        { key: 'engaged', name: 'Engaged', statuses: ['Engaging', 'Responding', 'Hot Lead'] },
        { key: 'responding', name: 'Responding', statuses: ['Responding', 'Hot Lead'] },
        { key: 'hot', name: 'Hot', statuses: ['Hot Lead'] }
      ]

      responseData.funnelData = funnelStages.map(stage => {
        const count = leads.filter(lead => 
          stage.statuses.includes(lead.status)
        ).length
        
        return {
          stage: stage.name,
          count
        }
      })

      // 4. PARSE STATUS TRANSITIONS FROM status_history
      const transitions: Record<string, number> = {}
      
      leads.forEach(lead => {
        if (lead.status_history) {
          // Parse the status history: "2025-05-20: New Lead\n2025-05-21: Warm Lead\n2025-05-22: Hot Lead"
          const historyLines = lead.status_history.split('\\n').filter((line: string) => line.trim())
          
          for (let i = 0; i < historyLines.length - 1; i++) {
            const currentLine = historyLines[i].trim()
            const nextLine = historyLines[i + 1].trim()
            
            // Extract status from "YYYY-MM-DD: Status Name"
            const currentStatus = currentLine.split(': ')[1]
            const nextStatus = nextLine.split(': ')[1]
            
            if (currentStatus && nextStatus) {
              const transitionKey = `${currentStatus} → ${nextStatus}`
              transitions[transitionKey] = (transitions[transitionKey] || 0) + 1
            }
          }
        }
      })

      responseData.transitionData = Object.entries(transitions)
        .map(([transition, count]) => {
          const totalLeads = leads.length
          const percent = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
          return {
            transition,
            count,
            percent: `${percent}%`
          }
        })
        .sort((a, b) => b.count - a.count) // Sort by count descending
        .slice(0, 10) // Top 10 transitions

      // 5. FETCH LEAD TRENDS DATA
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let trendsQuery = supabaseClient
        .from('leads')
        .select('created_at')
        .gte('created_at', daysAgo)
        .order('created_at', { ascending: true })

      // Apply tenant filtering
      if (role !== 'global_admin') {
        trendsQuery = trendsQuery.eq('tenant_id', tenant_id)
      }

      const { data: trendData, error: trendError } = await trendsQuery

      if (trendError) {
        console.error('Error fetching trend data:', trendError)
        throw trendError
      }

      console.log('Found leads for trends:', trendData?.length || 0)

      // Group by date
      const dateGroups: Record<string, number> = {}
      trendData?.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0] // YYYY-MM-DD
        dateGroups[date] = (dateGroups[date] || 0) + 1
      })

      // Create array with all dates in range (including zeros)
      const trends = []
      const startDate = new Date(daysAgo)
      const endDate = new Date()
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        trends.push({
          date: dateStr,
          leads: dateGroups[dateStr] || 0
        })
      }

      responseData.trends = trends
      responseData.totalPeriod = trendData?.length || 0

      console.log('Status distribution:', responseData.statusDistribution.length)
      console.log('Funnel data:', responseData.funnelData.length)
      console.log('Transition data:', responseData.transitionData.length)
      console.log('Trend data points:', responseData.trends.length)

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('Error processing lead journey data:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead journey data', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
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