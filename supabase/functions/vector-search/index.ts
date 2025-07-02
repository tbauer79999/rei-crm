import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if this is a service-to-service call
  const authHeader = req.headers.get('authorization');
  const isServiceCall = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  
  let tenant_id: string;
  
  if (isServiceCall) {
    // For service-to-service calls, get tenant_id from request body
    console.log('Service-to-service call detected');
    const body = await req.json();
    tenant_id = body.tenant_id;
    
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required for service calls' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Put the body back for later processing
    req = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(body)
    });
  } else {
    // Regular user authentication
    const auth = await authenticateAndAuthorize(req);
    
    // Debug logging
    console.log('Auth result:', {
      user_id: auth.user?.id,
      tenant_id: auth.tenant_id,
      role: auth.role,
      error: auth.error
    });
    
    if (auth.error || !auth.tenant_id) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    tenant_id = auth.tenant_id;
  }

  try {
    const { query, match_count = 5, match_threshold = 0.1, campaign_id } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If campaign_id is provided, verify it exists and belongs to this tenant
    if (campaign_id) {
      console.log('Verifying campaign:', campaign_id);
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', campaign_id)
        .eq('tenant_id', tenant_id)
        .single();
      
      if (campaignError || !campaign) {
        console.error('Campaign verification failed:', campaignError);
        return new Response(JSON.stringify({ error: 'Invalid campaign' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Embed the query
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: EMBEDDING_MODEL,
      }),
    });

    const embedJson = await embedRes.json();
    const queryEmbedding = embedJson?.data?.[0]?.embedding;

    if (!queryEmbedding) {
      return new Response(JSON.stringify({ error: 'Embedding failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Debug logging before RPC
    console.log('Calling match_chunks with:', {
      tenant_id,
      match_count,
      match_threshold,
      embedding_length: queryEmbedding?.length,
      filtering_by_campaign: !!campaign_id,
      campaign_id
    });

    // Perform vector similarity search with optional campaign filter
    const { data, error } = await supabase.rpc('match_chunks', {
      match_embedding: queryEmbedding,
      match_tenant_id: tenant_id,
      match_count: match_count,
      match_threshold: match_threshold,
      filter_campaign_id: campaign_id || null  // Pass campaign_id to the function
    });

    console.log('RPC result:', {
      matches_found: data?.length || 0,
      error: error
    });

    if (error) {
      console.error('Vector search error:', error);
      return new Response(JSON.stringify({ error: 'Vector search failed', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let matches = data || [];

    // If no matches and campaign filtering was used, provide informative response
    if (matches.length === 0 && campaign_id) {
      // Check if campaign has any linked knowledge
      const { data: links } = await supabase
        .from('campaign_knowledge_links')
        .select('knowledge_id')
        .eq('campaign_id', campaign_id)
        .limit(1);
      
      if (!links || links.length === 0) {
        return new Response(JSON.stringify({ 
          matches: [],
          message: 'No knowledge assets linked to this campaign'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Enhance results with source information
    let enhancedMatches = matches;
    
    if (enhancedMatches.length > 0) {
      // Get unique knowledge base IDs
      const kbIds = [...new Set(enhancedMatches.map((m: any) => m.knowledge_base_id))];
      
      // Fetch knowledge base details
      const { data: kbData } = await supabase
        .from('knowledge_base')
        .select('id, title, source_type, website_url, file_name')
        .in('id', kbIds)
        .eq('tenant_id', tenant_id);
      
      const kbMap = new Map(kbData?.map(kb => [kb.id, kb]) || []);
      
      // Enhance each match
      enhancedMatches = enhancedMatches.map((match: any) => {
        const kb = kbMap.get(match.knowledge_base_id) || {};
        
        // Clean chunk text if it has [Source: URL] prefix
        let cleanText = match.chunk_text;
        const sourceMatch = match.chunk_text.match(/^\[Source: (https?:\/\/[^\]]+)\]\n\n/);
        if (sourceMatch) {
          cleanText = match.chunk_text.replace(sourceMatch[0], '');
        }
        
        return {
          ...match,
          chunk_text: cleanText,
          source: {
            type: kb.source_type || 'unknown',
            title: kb.title || 'Untitled',
            url: kb.website_url || null,
            file_name: kb.file_name || null
          },
          // Add campaign context if filtering by campaign
          ...(campaign_id ? { filtered_by_campaign: campaign_id } : {})
        };
      });
    }

    // Return appropriate response format based on caller
    const responseData = isServiceCall ? {
      chunks: enhancedMatches,  // Use 'chunks' for backward compatibility
      matches: enhancedMatches,
      ...(campaign_id ? { campaign_filtered: true, campaign_id } : {})
    } : {
      matches: enhancedMatches,
      ...(campaign_id ? { campaign_filtered: true, campaign_id } : {})
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});