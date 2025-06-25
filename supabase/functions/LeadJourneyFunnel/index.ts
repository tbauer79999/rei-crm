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

    // Parse URL
    const url = new URL(req.url)
    const pathname = url.pathname
    const days = parseInt(url.searchParams.get('days') || '30')
    const period = url.searchParams.get('period') || '30days'

    console.log(`=== LEAD JOURNEY FUNNEL ENDPOINT ===`)
    console.log('user role:', role)
    console.log('user tenant_id:', tenant_id)
    console.log('pathname:', pathname)
    console.log('days:', days)

    // Handle path-based routing for modal endpoints
    if (pathname.endsWith('/status-distribution')) {
      return await handleStatusDistribution(supabaseClient, role, tenant_id, period)
    } else if (pathname.endsWith('/progression-funnel')) {
      return await handleProgressionFunnel(supabaseClient, role, tenant_id, period)
    } else if (pathname.endsWith('/upload-trend')) {
      return await handleUploadTrend(supabaseClient, role, tenant_id, period)
    } else if (pathname.endsWith('/status-transitions')) {
      return await handleStatusTransitions(supabaseClient, role, tenant_id, period)
    }

    // Default handler - original functionality
    return await handleDefaultData(supabaseClient, role, tenant_id, days)

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

// NEW: Handle status distribution modal
async function handleStatusDistribution(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Get all leads for status distribution
    let query = supabaseClient
      .from('leads')
      .select('id, name, status, created_at, status_history')

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Calculate status distribution
    const statusCounts: Record<string, number> = {}
    leads?.forEach(lead => {
      const status = lead.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }))

    // Generate trend data for selected period
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const statusTrend: any[] = []
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      statusTrend.push({
        date: d.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 40 // Mock for now
      })
    }

    // Find stuck leads (in same status for > 30 days)
    const stuckLeads: any[] = []
    const now = new Date()

    leads?.forEach(lead => {
      if (lead.status_history) {
        const lines = lead.status_history.split('\\n').filter((line: string) => line.trim())
        const lastLine = lines[lines.length - 1]
        if (lastLine) {
          const lastDate = new Date(lastLine.split(': ')[0])
          const daysInStatus = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysInStatus > 30) {
            stuckLeads.push({
              leadId: lead.id,
              name: lead.name || 'Unnamed Lead',
              currentStatus: lead.status,
              daysInStatus,
              lastActivity: lastDate.toISOString().split('T')[0]
            })
          }
        }
      }
    })

    // Calculate metrics
    const hotLeads = leads?.filter(l => l.status === 'Hot Lead').length || 0
    const totalLeads = leads?.length || 0
    const conversionRate = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : '0'

    // Calculate average lead age
    const leadAges = leads?.map(lead => {
      const created = new Date(lead.created_at)
      const age = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      return age
    }) || []
    const avgAge = leadAges.length > 0 ? Math.round(leadAges.reduce((a, b) => a + b) / leadAges.length) : 0

    const responseData = {
      statusDistribution,
      statusTrend,
      stuckLeads: stuckLeads.slice(0, 10), // Top 10 stuck leads
      metrics: {
        totalLeads,
        hotLeads,
        avgAge,
        conversionRate
      },
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in status distribution:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch status distribution data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// NEW: Handle progression funnel modal
async function handleProgressionFunnel(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Get leads with status history
    let query = supabaseClient
      .from('leads')
      .select('id, status, status_history, created_at')

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Define funnel stages
    const funnelStages = [
      { fromStage: 'New', toStage: 'Engaged', statuses: ['New Lead', 'Cold Lead'] },
      { fromStage: 'Engaged', toStage: 'Qualified', statuses: ['Warm Lead', 'Engaging'] },
      { fromStage: 'Qualified', toStage: 'Hot', statuses: ['Responding'] },
      { fromStage: 'Hot', toStage: 'Converted', statuses: ['Hot Lead'] }
    ]

    // Calculate funnel metrics
    const funnelData = funnelStages.map((stage, index) => {
      const countEntered = leads?.filter(lead => {
        // Check if lead ever reached this stage
        return lead.status_history?.includes(stage.fromStage) || 
               stage.statuses.some(s => lead.status_history?.includes(s))
      }).length || 0

      const countExited = index < funnelStages.length - 1 
        ? leads?.filter(lead => {
            return lead.status_history?.includes(funnelStages[index + 1].fromStage)
          }).length || 0
        : 0

      const conversionRate = countEntered > 0 ? ((countExited / countEntered) * 100).toFixed(1) : '0'
      const dropOffRate = countEntered > 0 ? (((countEntered - countExited) / countEntered) * 100).toFixed(1) : '0'

      return {
        fromStage: stage.fromStage,
        toStage: stage.toStage,
        countEntered,
        countExited,
        conversionRate: parseFloat(conversionRate),
        dropOffRate: parseFloat(dropOffRate)
      }
    })

    // Calculate time in stage (mock data for now)
    const timeInStage = [
      { stage: 'New', avgDays: 2.5 },
      { stage: 'Engaged', avgDays: 5.3 },
      { stage: 'Qualified', avgDays: 8.7 },
      { stage: 'Hot', avgDays: 3.2 }
    ]

    // Mock drop-off reasons
    const dropoffReasons = [
      { reason: 'No Response', count: 45 },
      { reason: 'Not Qualified', count: 32 },
      { reason: 'Wrong Timing', count: 28 },
      { reason: 'Chose Competitor', count: 15 }
    ]
    const totalDropoffs = dropoffReasons.reduce((sum, r) => sum + r.count, 0)

    const responseData = {
      funnelData,
      timeInStage,
      dropoffReasons,
      totalDropoffs,
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in progression funnel:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch progression funnel data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// NEW: Handle upload trend modal
async function handleUploadTrend(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Calculate date range
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get leads created in period
    let query = supabaseClient
      .from('leads')
      .select('id, name, created_at, campaign, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Generate volume trend
    const volumeTrend: any[] = []
    const dateGroups = new Map<string, number>()

    leads?.forEach(lead => {
      const date = new Date(lead.created_at).toISOString().split('T')[0]
      dateGroups.set(date, (dateGroups.get(date) || 0) + 1)
    })

    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      volumeTrend.push({
        date: dateStr,
        count: dateGroups.get(dateStr) || 0,
        previousPeriod: Math.floor(Math.random() * 25) + 15 // Mock previous period
      })
    }

    // Source breakdown
    const sourceCounts = new Map<string, number>()
    leads?.forEach(lead => {
      const source = lead.campaign || 'Direct'
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
    })

    const sourceBreakdown = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate quality by source
    const qualityBySource = sourceBreakdown.map(source => {
      const sourceLeads = leads?.filter(l => (l.campaign || 'Direct') === source.source) || []
      const hotLeads = sourceLeads.filter(l => l.status === 'Hot Lead').length
      const hotRate = sourceLeads.length > 0 ? hotLeads / sourceLeads.length : 0
      
      return {
        source: source.source,
        volume: source.count,
        avgScore: 0.65 + Math.random() * 0.25, // Mock score
        hotRate,
        qualityIndex: hotRate * 0.8 + 0.2 // Simplified quality index
      }
    })

    // Recent uploads
    const recentUploads = leads?.slice(0, 10).map(lead => ({
      name: lead.name || 'Unnamed Lead',
      source: lead.campaign || 'Direct',
      uploadDate: new Date(lead.created_at).toISOString().split('T')[0],
      initialStatus: 'New Lead'
    })) || []

    // Mock integration status
    const integrationStatus = [
      { name: 'CSV Upload', lastSync: '2 hours ago', status: 'Healthy' },
      { name: 'API Integration', lastSync: '15 minutes ago', status: 'Healthy' },
      { name: 'Manual Entry', lastSync: 'N/A', status: 'Active' }
    ]

    const responseData = {
      volumeTrend,
      sourceBreakdown,
      qualityBySource,
      recentUploads,
      integrationStatus,
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in upload trend:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch upload trend data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// NEW: Handle status transitions modal
async function handleStatusTransitions(supabaseClient: any, role: string, tenant_id: string, period: string) {
  try {
    // Get leads with status history
    let query = supabaseClient
      .from('leads')
      .select('id, name, status, status_history, created_at')

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: leads, error } = await query

    if (error) throw error

    // Parse transitions
    const transitions = new Map<string, number>()
    const transitionDetails: any[] = []

    leads?.forEach(lead => {
      if (lead.status_history) {
        const lines = lead.status_history.split('\\n').filter((line: string) => line.trim())
        
        for (let i = 0; i < lines.length - 1; i++) {
          const currentLine = lines[i].trim()
          const nextLine = lines[i + 1].trim()
          
          const currentStatus = currentLine.split(': ')[1]
          const nextStatus = nextLine.split(': ')[1]
          
          if (currentStatus && nextStatus) {
            const key = `${currentStatus}|${nextStatus}`
            transitions.set(key, (transitions.get(key) || 0) + 1)
            
            transitionDetails.push({
              from: currentStatus,
              to: nextStatus,
              leadId: lead.id,
              leadName: lead.name
            })
          }
        }
      }
    })

    // Convert to transition flow format
    const transitionFlow = Array.from(transitions.entries())
      .map(([key, count]) => {
        const [from, to] = key.split('|')
        return { from, to, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Build transition matrix
    const statuses = ['New Lead', 'Cold Lead', 'Warm Lead', 'Engaging', 'Responding', 'Hot Lead', 'Disqualified']
    const matrix: Record<string, Record<string, number>> = {}

    statuses.forEach(from => {
      matrix[from] = {}
      statuses.forEach(to => {
        const key = `${from}|${to}`
        matrix[from][to] = transitions.get(key) || 0
      })
    })

    // Common paths
    const pathCounts = new Map<string, number>()
    leads?.forEach(lead => {
      if (lead.status_history) {
        const lines = lead.status_history.split('\\n').filter((line: string) => line.trim())
        const path = lines.map(line => line.split(': ')[1]).filter(Boolean).join(' → ')
        if (path) {
          pathCounts.set(path, (pathCounts.get(path) || 0) + 1)
        }
      }
    })

    const commonPaths = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Find stuck transitions
    const stuckTransitions: any[] = []
    const now = new Date()

    leads?.forEach(lead => {
      if (lead.status_history) {
        const lines = lead.status_history.split('\\n').filter((line: string) => line.trim())
        const lastLine = lines[lines.length - 1]
        
        if (lastLine) {
          const lastDate = new Date(lastLine.split(': ')[0])
          const timeSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (timeSinceLast > 7 && lead.status !== 'Hot Lead' && lead.status !== 'Disqualified') {
            // Determine expected next status based on current
            const expectedNextMap: Record<string, string> = {
              'New Lead': 'Cold Lead',
              'Cold Lead': 'Warm Lead',
              'Warm Lead': 'Engaging',
              'Engaging': 'Responding',
              'Responding': 'Hot Lead'
            }
            
            stuckTransitions.push({
              name: lead.name || 'Unnamed Lead',
              currentStatus: lead.status,
              expectedNext: expectedNextMap[lead.status] || 'Unknown',
              timeSinceLast: `${timeSinceLast} days`
            })
          }
        }
      }
    })

    const responseData = {
      transitionFlow,
      statuses,
      matrix,
      commonPaths,
      stuckTransitions: stuckTransitions.slice(0, 10),
      meta: { role, tenant_id }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in status transitions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch status transitions data' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// Original default handler
async function handleDefaultData(supabaseClient: any, role: string, tenant_id: string, days: number) {
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
}