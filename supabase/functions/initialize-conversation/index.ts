import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { lead_id, tenant_id } = await req.json();
    // Basic validation
    if (!lead_id) {
      return new Response(JSON.stringify({
        error: 'Lead ID is required.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    console.log(`Attempting to initialize conversation for Lead ID: ${lead_id}, Tenant ID: ${tenant_id || 'not provided'}`);
    // Initialize Supabase client with service role key for RLS bypass (if needed for inserts)
    // Make sure your SUPABASE_URL and SERVICE_ROLE_KEY are set in your Edge Function environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL or Service Role Key not found in environment variables.');
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false
      }
    });
    // 1. Check if a conversation already exists for this lead
    const { data: existingConversation, error: existingConversationError } = await supabase.from('conversations').select('id').eq('lead_id', lead_id).single();
    if (existingConversationError && existingConversationError.code !== 'PGRST116') {
      console.error('Error checking existing conversation:', existingConversationError);
      throw existingConversationError;
    }
    if (existingConversation) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Conversation already exists for this lead.',
        conversation_id: existingConversation.id
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // 2. Fetch lead details to get the tenant_id if not provided, and ensure lead exists
    const { data: leadData, error: leadError } = await supabase.from('leads').select('id, tenant_id').eq('id', lead_id).single();
    if (leadError) {
      console.error('Error fetching lead data:', leadError);
      return new Response(JSON.stringify({
        error: 'Lead not found or error fetching lead data.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    const leadTenantId = leadData.tenant_id;
    if (!leadTenantId) {
      return new Response(JSON.stringify({
        error: 'Lead does not have an associated tenant ID.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // 3. Create a new conversation record
    const { data: newConversation, error: createConversationError } = await supabase.from('conversations').insert({
      lead_id: lead_id,
      tenant_id: leadTenantId,
      status: 'active',
      current_lead_status: 'Cold Lead'
    }).select('id').single();
    if (createConversationError) {
      console.error('Error creating conversation:', createConversationError);
      throw createConversationError;
    }
    const conversationId = newConversation.id;
    // 4. Update the lead record with the new conversation_id
    const { error: updateLeadError } = await supabase.from('leads').update({
      conversation_id: conversationId
    }).eq('id', lead_id);
    if (updateLeadError) {
      console.error('Error updating lead with conversation ID:', updateLeadError);
      throw updateLeadError;
    }
    console.log(`Conversation initialized successfully for Lead ID: ${lead_id}, Conversation ID: ${conversationId}`);
    return new Response(JSON.stringify({
      success: true,
      conversation_id: conversationId,
      message: 'Conversation initialized.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
