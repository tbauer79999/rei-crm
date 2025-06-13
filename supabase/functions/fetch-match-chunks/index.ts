import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-3-small';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const { user, tenant_id, error, status } = await authenticateAndAuthorize(req);

    if (error || !user || !tenant_id) {
      return new Response(JSON.stringify({ error }), {
        status: status || 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { query, match_count = 5, match_threshold = 0.8 } = await req.json();

    // DEBUG: Log authentication and query info
    console.log('Debug - tenant_id:', tenant_id);
    console.log('Debug - query:', query);
    console.log('Debug - match_count:', match_count);
    console.log('Debug - match_threshold:', match_threshold);

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: query,
        model: EMBEDDING_MODEL
      })
    });

    const embeddingJson = await embeddingRes.json();
    const query_embedding = embeddingJson?.data?.[0]?.embedding;

    // DEBUG: Log embedding info
    console.log('Debug - embedding length:', query_embedding?.length);
    console.log('Debug - embedding first 5 values:', query_embedding?.slice(0, 5));

    if (!query_embedding) {
      return new Response(JSON.stringify({ error: 'Embedding failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DEBUG: Log before RPC call
    console.log('Debug - calling match_chunks with:', {
      match_tenant_id: tenant_id,
      match_count,
      match_threshold
    });

    const { data, error: matchError } = await supabase.rpc('match_chunks', {
      match_embedding: query_embedding,
      match_tenant_id: tenant_id,
      match_count,
      match_threshold
    });

    // DEBUG: Log RPC results
    console.log('Debug - RPC result data:', data);
    console.log('Debug - RPC result error:', matchError);
    console.log('Debug - Number of matches found:', data?.length || 0);

    if (matchError) {
      console.error('Vector search failed:', matchError);
      return new Response(JSON.stringify({ error: 'Vector search failed', detail: matchError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ matches: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Fatal error:', err);
    return new Response(JSON.stringify({ error: 'Unhandled server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});