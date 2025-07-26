import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';
// Removed import - implementing chunking inline to avoid ES6/CommonJS issues

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-3-small';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if this is a database trigger call
  const isDatabaseTrigger = req.headers.get('x-database-trigger') === 'true';
  
  let tenant_id: string;
  let user: any = null;

  try {
    const body = await req.json();

    if (isDatabaseTrigger) {
      // Handle database trigger calls
      console.log('🔄 Database trigger call detected');
      tenant_id = body.tenant_id;
      
      if (!tenant_id) {
        return new Response(JSON.stringify({ error: 'Missing tenant_id from trigger' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Handle regular user calls
      const auth = await authenticateAndAuthorize(req);
      if (auth.error || !auth.tenant_id) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status || 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      tenant_id = auth.tenant_id;
      user = auth.user;
    }

    // NEW WORKFLOW: Handle document_id (from trigger or UI)
    if (body.document_id) {
      const { document_id } = body;
      
      console.log(`📄 Processing document_id: ${document_id} for tenant: ${tenant_id}`);
      
      // 1. Fetch document from knowledge_base
      const { data: doc, error: docError } = await supabase
        .from('knowledge_base')
        .select('content, id, title, source_type')
        .eq('id', document_id)
        .eq('tenant_id', tenant_id)
        .single();
        
      if (docError || !doc) {
        console.error('❌ Document not found:', docError);
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (!doc.content || doc.content.trim().length < 50) {
        console.error('❌ Document content too short or empty');
        return new Response(JSON.stringify({ error: 'Document content is too short or empty' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`📊 Document found: ${doc.title}, content length: ${doc.content.length}`);
      
      // 2. Create chunks using inline chunking (avoiding CommonJS import issues)
      const CHUNK_SIZE = 1000;
      const preparedChunks = [];
      
      for (let i = 0; i < doc.content.length; i += CHUNK_SIZE) {
        const chunkText = doc.content.slice(i, i + CHUNK_SIZE).trim();
        if (!chunkText) continue;

        // Create embedding for this chunk
        const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: chunkText,
            model: EMBEDDING_MODEL
          })
        });

        const embedJson = await embedRes.json();

        if (!embedJson?.data?.[0]?.embedding) {
          console.error(`❌ Failed to embed chunk ${preparedChunks.length}`, embedJson);
          continue;
        }

        const embedding = embedJson.data[0].embedding;
        console.log(`✅ Embedded chunk ${preparedChunks.length} (length: ${embedding.length})`);

        preparedChunks.push({
          chunk_text: chunkText,
          chunk_embedding: embedding,
          knowledge_base_id: doc.id,
          tenant_id: tenant_id,
          chunk_index: preparedChunks.length,
          created_at: new Date().toISOString()
        });
      }
      
      console.log(`✂️ Created ${preparedChunks.length} chunks`);
      
      if (preparedChunks.length === 0) {
        return new Response(JSON.stringify({ error: 'No chunks could be created from document' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 3. Save chunks to database
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert(preparedChunks);

      if (insertError) {
        console.error('❌ Failed to save chunks:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save chunks', details: insertError }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`✅ Successfully saved ${preparedChunks.length} chunks for document ${document_id}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        chunks_created: preparedChunks.length,
        document_id: document_id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // EXISTING WORKFLOW: Handle pre-chunked content
    const { chunks, knowledge_base_id, metadata = {} } = body;

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid chunks array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!knowledge_base_id) {
      return new Response(JSON.stringify({ error: 'Missing knowledge_base_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🧩 Processing ${chunks.length} pre-chunked items for KB ID: ${knowledge_base_id}`);

    const preparedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: chunk,
          model: EMBEDDING_MODEL
        })
      });

      const embedJson = await embedRes.json();

      if (!embedJson?.data?.[0]?.embedding) {
        console.error(`❌ Failed to embed chunk ${i}`, embedJson);
        continue;
      }

      const embedding = embedJson.data[0].embedding;
      console.log(`✅ Embedded chunk ${i} (length: ${embedding.length})`);

      preparedChunks.push({
        chunk_text: chunk,
        chunk_embedding: embedding,
        knowledge_base_id,
        tenant_id,
        chunk_index: i,
        campaign_ids: metadata.campaign_ids || null,
        created_at: new Date().toISOString()
      });
    }

    if (preparedChunks.length === 0) {
      return new Response(JSON.stringify({ error: 'All embeddings failed. No chunks saved.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert(preparedChunks);

    if (insertError) {
      console.error('❌ Supabase insert failed:', insertError);
      return new Response(JSON.stringify({ error: 'Insert failed', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎉 Successfully inserted ${preparedChunks.length} chunks`);
    return new Response(JSON.stringify({ success: true, inserted: preparedChunks.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('🔥 Unexpected error in chunk-and-embed:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});