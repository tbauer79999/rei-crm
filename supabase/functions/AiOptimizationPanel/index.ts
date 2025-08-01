import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

// Helper function to apply tenant filter to sales_metrics queries
function applySalesMetricsTenantFilter(query: any, role: string, tenant_id: string) {
  if (role !== 'global_admin') {
    return query.eq('tenant_id', tenant_id)
  }
  return query
}

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
      meta: { role, tenant_id, source: 'sales_metrics' }
    }

    // 1. FETCH SALES METRICS FOR MESSAGE ANALYTICS
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync_sales_metrics`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenant_id,
    role,
    period_type: 'daily',
    start_date: thirtyDaysAgo.toISOString().split('T')[0],
  }),
});

if (!response.ok) {
  throw new Error(`Failed to fetch sales metrics: ${response.statusText}`);
}

const metrics = await response.json();


    const { data: metricsData, error: metricsError } = await metricsQuery

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
    }

    // 2. EXTRACT KEYWORDS FROM CUSTOM_METRICS OR USE SAMPLE MESSAGES
    try {
      // Try to get keywords from custom_metrics first
      let keywords: string[] = []
      
      if (metricsData && metricsData.length > 0) {
        // Look for keywords in custom_metrics
        const keywordData = metricsData
          .map(metric => metric.custom_metrics?.popular_keywords || [])
          .flat()
        
        if (keywordData.length > 0) {
          keywords = keywordData.slice(0, 10)
        }
      }

      // If no keywords from metrics, get sample from recent messages (limited)
      if (keywords.length === 0) {
        let keywordsQuery = supabaseClient
          .from('messages')
          .select('message_body')
          .eq('direction', 'inbound')
          .not('message_body', 'is', null)
          .neq('message_body', '')
          .gte('timestamp', thirtyDaysAgo.toISOString())
          .limit(200) // Reduced limit for performance

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
          keywords = Object.entries(wordCount)
            .filter(([word, count]) => count >= 2)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word)
        }
      }

      responseData.keywords = keywords.length > 0 ? keywords : ['interested', 'price', 'timeline', 'demo', 'call', 'meeting']
    } catch (error) {
      console.error('Error fetching keywords:', error)
    }

    // 3. CALCULATE HOT SUMMARY METRICS FROM SALES_METRICS
    try {
      if (metricsData && metricsData.length > 0) {
        const totalConversations = metricsData.reduce((sum, metric) => sum + (metric.ai_conversations_started || 0), 0)
        const totalHandshakes = metricsData.reduce((sum, metric) => sum + (metric.ai_successful_handshakes || 0), 0)
        const totalHotLeads = metricsData.reduce((sum, metric) => sum + (metric.hot_leads || 0), 0)
        const totalSMS = metricsData.reduce((sum, metric) => sum + (metric.manual_sms_sent || 0), 0)
        const totalCalls = metricsData.reduce((sum, metric) => sum + (metric.manual_calls_made || 0), 0)

        // Calculate average messages per hot lead
        const totalMessages = totalConversations + totalSMS + totalCalls
        const avgMessages = totalHotLeads > 0 ? Number((totalMessages / totalHotLeads).toFixed(1)) : 0

        // Calculate average time to hot from metrics
        const timeToHotValues = metricsData
          .filter(metric => metric.avg_time_to_hot)
          .map(metric => parseIntervalToMinutes(metric.avg_time_to_hot))
        
        const avgTimeHours = timeToHotValues.length > 0
          ? Number((timeToHotValues.reduce((a, b) => a + b) / timeToHotValues.length / 60).toFixed(1))
          : 0

        // Estimate fastest metrics (20th percentile)
        const fastestMessages = totalHotLeads > 0 ? Math.max(1, Math.floor(avgMessages * 0.6)) : 0
        const fastestTimeMinutes = avgTimeHours > 0 ? Math.max(5, Math.floor(avgTimeHours * 60 * 0.4)) : 0

        responseData.hotSummary.metrics = {
          avgMessages,
          avgTimeHours,
          fastestMessages,
          fastestTimeMinutes
        }

        // Add conversation quality metrics from sales_metrics
        const avgConversationLength = metricsData
          .filter(metric => metric.avg_conversation_length)
          .map(metric => metric.avg_conversation_length)
        
        if (avgConversationLength.length > 0) {
          const avgLength = avgConversationLength.reduce((a, b) => a + b) / avgConversationLength.length
          responseData.hotSummary.avgConversationLength = Number(avgLength.toFixed(1))
        }

        // Add dropoff rate from metrics
        const dropoffRates = metricsData
          .filter(metric => metric.conversation_dropoff_rate)
          .map(metric => metric.conversation_dropoff_rate)
        
        if (dropoffRates.length > 0) {
          const avgDropoff = dropoffRates.reduce((a, b) => a + b) / dropoffRates.length
          responseData.hotSummary.dropoffRate = Number((avgDropoff * 100).toFixed(1))
        }
      }
    } catch (error) {
      console.error('Error calculating hot summary metrics:', error)
    }

    // 4. GET TRIGGER PHRASES FROM CUSTOM_METRICS OR USE DEFAULTS
    try {
      let triggerPhrases: string[] = []
      
      if (metricsData && metricsData.length > 0) {
        // Try to get trigger phrases from custom_metrics
        const phrasesData = metricsData
          .map(metric => metric.custom_metrics?.hot_trigger_phrases || [])
          .flat()
          .filter((phrase, index, arr) => arr.indexOf(phrase) === index) // Remove duplicates
        
        if (phrasesData.length > 0) {
          triggerPhrases = phrasesData.slice(0, 6)
        }
      }

      // Default trigger phrases if none found in metrics
      if (triggerPhrases.length === 0) {
        triggerPhrases = [
          "Let's talk",
          "I'm ready to",
          "Can we schedule", 
          "Call me today",
          "What's your timeline",
          "I'm interested in"
        ]
      }

      responseData.hotSummary.triggerPhrases = triggerPhrases
    } catch (error) {
      console.error('Error fetching trigger phrases:', error)
    }

    // 5. GET OPT-OUT REASONS FROM CUSTOM_METRICS OR LIMITED LEADS QUERY
    try {
      let optOutReasons: Array<{reason: string, count: number}> = []
      
      // Try to get opt-out data from custom_metrics first
      if (metricsData && metricsData.length > 0) {
        const optOutData = metricsData
          .map(metric => metric.custom_metrics?.opt_out_reasons || {})
          .reduce((acc, reasons) => {
            Object.entries(reasons).forEach(([reason, count]) => {
              acc[reason] = (acc[reason] || 0) + (Number(count) || 0)
            })
            return acc
          }, {} as Record<string, number>)
        
        if (Object.keys(optOutData).length > 0) {
          optOutReasons = Object.entries(optOutData)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
        }
      }

      // If no opt-out data from metrics, get limited sample from leads table
      if (optOutReasons.length === 0) {
        let optOutQuery = supabaseClient
          .from('leads')
          .select('opt_out_reason')
          .not('opt_out_reason', 'is', null)
          .neq('opt_out_reason', '')
          .limit(500) // Limited for performance

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
          optOutReasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
        }
      }

      responseData.hotSummary.optOutReasons = optOutReasons
    } catch (error) {
      console.error('Error fetching opt-out reasons:', error)
    }

    // 6. MESSAGE SEARCH (if keyword provided) - Keep limited for performance
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

    // 7. LEAD DETAILS & MESSAGES (if lead_id provided) - Keep existing logic
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

    // 8. ADD ADDITIONAL METRICS FROM SALES_METRICS
    try {
      if (metricsData && metricsData.length > 0) {
        // Add conversation restart data
        const totalRestarts = metricsData.reduce((sum, metric) => sum + (metric.conversation_restarts || 0), 0)
        responseData.hotSummary.conversationRestarts = totalRestarts

        // Add AI vs manual message breakdown
        const totalAIConversations = metricsData.reduce((sum, metric) => sum + (metric.ai_conversations_started || 0), 0)
        const totalManualMessages = metricsData.reduce((sum, metric) => sum + (metric.manual_sms_sent || 0) + (metric.manual_calls_made || 0), 0)
        
        responseData.hotSummary.messageBreakdown = {
          aiConversations: totalAIConversations,
          manualMessages: totalManualMessages,
          aiPercentage: totalAIConversations + totalManualMessages > 0 
            ? Number(((totalAIConversations / (totalAIConversations + totalManualMessages)) * 100).toFixed(1))
            : 0
        }

        // Add engagement metrics
        const totalHandshakes = metricsData.reduce((sum, metric) => sum + (metric.ai_successful_handshakes || 0), 0)
        const engagementRate = totalAIConversations > 0 
          ? Number(((totalHandshakes / totalAIConversations) * 100).toFixed(1))
          : 0
        
        responseData.hotSummary.engagementRate = engagementRate
      }
    } catch (error) {
      console.error('Error calculating additional metrics:', error)
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

// Helper function to parse PostgreSQL interval strings to minutes
function parseIntervalToMinutes(interval: string): number {
  if (!interval) return 0
  
  const parts = interval.toString().split(':')
  if (parts.length >= 2) {
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    return hours * 60 + minutes
  }
  return 0
}