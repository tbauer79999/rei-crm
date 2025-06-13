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

    // Parse URL to get query parameters
    const url = new URL(req.url)
    const keyword = url.searchParams.get('keyword')
    const leadId = url.searchParams.get('lead_id')

    // Initialize response data
    const responseData: any = {
      keywords: [],
      hotSummary: {
        metrics: {
          avgMessages: 0,
          avgTimeHours: 0,
          fastestMessages: 0,
          fastestTimeMinutes: 0
        },
        triggerPhrases: [],
        optOutReasons: []
      },
      messageSearch: null,
      leadDetails: null,
      leadMessages: null,
      meta: { role, tenant_id }
    }

    // 1. FETCH KEYWORDS
    try {
      // Build query based on user role for keywords
      let keywordsQuery = supabaseClient
        .from('messages')
        .select('message_body')
        .eq('direction', 'inbound')
        .not('message_body', 'is', null)
        .neq('message_body', '')
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000)

      // Apply tenant filtering
      if (role !== 'global_admin') {
        keywordsQuery = keywordsQuery.eq('tenant_id', tenant_id)
      }

      const { data: messages, error: keywordsError } = await keywordsQuery

      if (!keywordsError && messages) {
        // Extract and count keywords
        const wordCount: Record<string, number> = {}
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'])

        messages.forEach(msg => {
          const words = msg.message_body
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
          
          words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1
          })
        })

        // Get top keywords (minimum 2 occurrences)
        const keywords = Object.entries(wordCount)
          .filter(([word, count]) => count >= 2)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word)

        responseData.keywords = keywords.length > 0 ? keywords : ['interested', 'price', 'timeline', 'demo', 'call', 'meeting']
      }
    } catch (error) {
      console.error('Error fetching keywords:', error)
    }

    // 2. FETCH HOT SUMMARY METRICS
    try {
      // Get all hot leads with timing data
      let hotLeadsQuery = supabaseClient
        .from('leads')
        .select('id, created_at, marked_hot_at, status_history')
        .eq('status', 'Hot Lead')
        .not('marked_hot_at', 'is', null)

      if (role !== 'global_admin') {
        hotLeadsQuery = hotLeadsQuery.eq('tenant_id', tenant_id)
      }

      const { data: hotLeads, error: leadsError } = await hotLeadsQuery

      if (!leadsError && hotLeads && hotLeads.length > 0) {
        // Get message counts for each hot lead
        const leadIds = hotLeads.map(lead => lead.id)
        const { data: messageCounts } = await supabaseClient
          .from('messages')
          .select('lead_id')
          .in('lead_id', leadIds)
          .not('message_body', 'is', null)
          .neq('message_body', '')

        // Count messages per lead
        const messageCountsByLead: Record<string, number> = {}
        messageCounts?.forEach(msg => {
          messageCountsByLead[msg.lead_id] = (messageCountsByLead[msg.lead_id] || 0) + 1
        })

        // Calculate metrics
        let totalMessages = 0
        let totalTimeHours = 0
        let fastestMessages = Infinity
        let fastestTimeMinutes = Infinity

        hotLeads.forEach(lead => {
          const messageCount = messageCountsByLead[lead.id] || 0
          totalMessages += messageCount

          // Calculate time difference
          const createdTime = new Date(lead.created_at)
          const hotTime = new Date(lead.marked_hot_at)
          const timeHours = (hotTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60)
          totalTimeHours += timeHours

          // Track fastest
          if (messageCount > 0 && messageCount < fastestMessages) {
            fastestMessages = messageCount
            fastestTimeMinutes = Math.round(timeHours * 60)
          }
        })

        const avgMessages = totalMessages > 0 ? Math.round((totalMessages / hotLeads.length) * 10) / 10 : 0
        const avgTimeHours = Math.round((totalTimeHours / hotLeads.length) * 10) / 10

        responseData.hotSummary.metrics = {
          avgMessages,
          avgTimeHours,
          fastestMessages: fastestMessages === Infinity ? 0 : fastestMessages,
          fastestTimeMinutes: fastestTimeMinutes === Infinity ? 0 : fastestTimeMinutes
        }
      }
    } catch (error) {
      console.error('Error fetching hot summary metrics:', error)
    }

    // 3. FETCH HOT TRIGGER PHRASES
    try {
      responseData.hotSummary.triggerPhrases = [
        "Let's talk",
        "I'm ready to",
        "Can we schedule", 
        "Call me today",
        "What's your timeline",
        "I'm interested in"
      ]
    } catch (error) {
      console.error('Error fetching trigger phrases:', error)
    }

    // 4. FETCH OPT-OUT REASONS
    try {
      let optOutQuery = supabaseClient
        .from('leads')
        .select('opt_out_reason')
        .not('opt_out_reason', 'is', null)
        .neq('opt_out_reason', '')

      if (role !== 'global_admin') {
        optOutQuery = optOutQuery.eq('tenant_id', tenant_id)
      }

      const { data: optOuts, error: optOutError } = await optOutQuery

      if (!optOutError && optOuts) {
        // Count occurrences of each reason
        const reasonCounts: Record<string, number> = {}
        optOuts.forEach(lead => {
          const reason = lead.opt_out_reason
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
        })

        // Convert to array and sort by count
        const reasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)

        responseData.hotSummary.optOutReasons = reasons
      }
    } catch (error) {
      console.error('Error fetching opt-out reasons:', error)
    }

    // 5. MESSAGE SEARCH (if keyword provided)
    if (keyword) {
      try {
        let searchQuery = supabaseClient
          .from('messages')
          .select('id, message_body, direction, timestamp, lead_id')
          .not('message_body', 'is', null)
          .neq('message_body', '')
          .ilike('message_body', `%${keyword}%`)
          .order('timestamp', { ascending: false })
          .limit(50)

        if (role !== 'global_admin') {
          searchQuery = searchQuery.eq('tenant_id', tenant_id)
        }

        const { data: searchResults, error: searchError } = await searchQuery

        if (!searchError) {
          responseData.messageSearch = {
            matches: searchResults || [],
            keyword,
            results_count: searchResults?.length || 0
          }
        }
      } catch (error) {
        console.error('Error searching messages:', error)
      }
    }

    // 6. LEAD DETAILS & MESSAGES (if lead_id provided)
    if (leadId) {
      try {
        // First, verify the lead exists and user has access to it
        let leadCheckQuery = supabaseClient
          .from('leads')
          .select('id, name, phone, email, status, created_at, marked_hot_at, status_history, tenant_id')
          .eq('id', leadId)

        if (role !== 'global_admin') {
          leadCheckQuery = leadCheckQuery.eq('tenant_id', tenant_id)
        }

        const { data: leadData, error: leadError } = await leadCheckQuery.single()

        if (!leadError && leadData) {
          // Split name into first_name and last_name if needed
          const nameParts = leadData.name ? leadData.name.split(' ') : ['', '']
          responseData.leadDetails = {
            ...leadData,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || ''
          }

          // Get messages for this lead
          const { data: leadMessages, error: messagesError } = await supabaseClient
            .from('messages')
            .select('id, message_body, direction, timestamp, lead_id')
            .eq('lead_id', leadId)
            .not('message_body', 'is', null)
            .neq('message_body', '')
            .order('timestamp', { ascending: true })

          if (!messagesError) {
            responseData.leadMessages = {
              messages: leadMessages || [],
              lead_id: leadId,
              messages_count: leadMessages?.length || 0
            }
          }
        }
      } catch (error) {
        console.error('Error fetching lead details:', error)
      }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

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