import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createEmbeddingChunks } from '../_shared/chunkingService.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-3-small';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function createEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: EMBEDDING_MODEL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data?.data?.[0]?.embedding) {
      console.error('Invalid embedding response structure:', data);
      return null;
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    return null;
  }
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const { user, tenant_id, error, status } = await authenticateAndAuthorize(req);
    if (error || !tenant_id) {
      return new Response(JSON.stringify({ error }), {
        status: status || 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(JSON.stringify({ error: 'Missing document_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get document content - using 'id' to match document_id
    const { data: doc, error: docError } = await supabase
      .from('knowledge_base')
      .select('content')
      .match({ id: document_id, tenant_id })
      .maybeSingle();

    if (docError || !doc || !doc.content || doc.content.trim() === '') {
      console.error('Document fetch or content missing:', docError);
      return new Response(JSON.stringify({ error: 'Document content missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Clear existing chunks for this document to avoid duplicates
    // Fixed: using knowledge_base_id instead of document_id
    const { error: deleteError } = await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('knowledge_base_id', document_id)
      .eq('tenant_id', tenant_id);

    if (deleteError) {
      console.error('Error clearing existing chunks:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to clear existing chunks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chunks = createEmbeddingChunks(doc.content);
    console.log(`Processing ${chunks.length} chunks for document ${document_id}`);

    let inserted = 0;
    const failed = [];

    // Process chunks with better error handling
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Skip empty chunks
      if (!chunk.trim()) {
        console.log(`Skipping empty chunk ${i}`);
        continue;
      }

      const embedding = await createEmbedding(chunk);
      
      if (!embedding) {
        console.error(`Failed to create embedding for chunk ${i}`);
        failed.push(i);
        continue;
      }

      // Fixed: using correct column names
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert({
          tenant_id,
          knowledge_base_id: document_id, // Fixed column name
          chunk_index: i,
          chunk_text: chunk,
          chunk_embedding: embedding // Fixed column name
        });

      if (insertError) {
        console.error(`Chunk ${i} insert failed:`, insertError);
        failed.push(i);
      } else {
        inserted++;
        console.log(`Successfully inserted chunk ${i}/${chunks.length}`);
      }
    }

    const response = {
      status: 'completed',
      total_chunks: chunks.length,
      inserted_chunks: inserted,
      failed_chunks: failed.length,
      failed_indices: failed.length > 0 ? failed : undefined
    };

    // If more than half failed, consider it a failure
    if (failed.length > chunks.length / 2) {
      return new Response(JSON.stringify({
        ...response,
        status: 'failed',
        error: 'More than half of chunks failed to process'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Fatal error in chunk-and-embed:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      details: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});