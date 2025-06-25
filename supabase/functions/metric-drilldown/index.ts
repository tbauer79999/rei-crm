// supabase/functions/metric-drilldown/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateAndAuthorize } from '../_shared/edgeFunctionAuth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  })

  const auth = await authenticateAndAuthorize(req)
  if (auth.error || !auth.tenant_id) {
    return new Response(JSON.stringify({ error: auth.error || 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { role, tenant_id } = auth
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const keyword = url.searchParams.get('keyword')
  const leadId = url.searchParams.get('lead_id')

  let data: any = {}

  if (type === 'hot-summary') {
    // Dynamically import your hot summary logic
    const { default: getHotSummary } = await import('../get-lead-analytics/index.ts')
    data = await getHotSummary({ supabase, role, tenant_id, keyword, leadId })
  } else if (type === 'optimization') {
    // Future: other metric types here
    data = { error: 'Optimization drilldown not yet implemented' }
  } else {
    data = { error: 'Invalid or missing metric type' }
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
