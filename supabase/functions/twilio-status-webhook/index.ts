// supabase/functions/twilio-status-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests from Twilio
  if (req.method !== 'POST') {
    console.error('❌ Invalid request method:', req.method);
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Twilio's form data
    const formData = await req.formData();
    
    // Extract Twilio webhook parameters
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log('📞 Twilio webhook received:', {
      messageSid,
      messageStatus,
      errorCode,
      to,
      from
    });

    // Validate required fields
    if (!messageSid || !messageStatus) {
      console.error('❌ Missing required webhook data');
      return new Response('Bad Request: Missing MessageSid or MessageStatus', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Find the message in our database using the Twilio SID
    const { data: message, error: findError } = await supabase
      .from('messages')
      .select('id, lead_id, tenant_id')
      .eq('message_id', messageSid)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding message:', findError);
      return new Response('Database error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (!message) {
      console.warn(`⚠️ Message not found for SID: ${messageSid}`);
      // Return 200 to prevent Twilio retries for messages we don't track
      return new Response('Message not found', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    console.log('✅ Message found:', {
      messageId: message.id,
      leadId: message.lead_id,
      tenantId: message.tenant_id
    });

    // Update the message with delivery status using existing columns
    const updateData: any = {
      status: messageStatus,
      updated_at: new Date().toISOString()
    };

    // Add error information if present
    if (errorCode) {
      updateData.error_code = errorCode;
    }
    // Note: Your messages table doesn't have error_message column, just error_code

    const { error: updateError } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('❌ Error updating message status:', updateError);
      return new Response('Failed to update message', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log(`✅ Message ${message.id} updated with status: ${messageStatus}`);

    // Get campaign from lead to update metrics
    if (message.lead_id) {
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('campaign_id')
          .eq('id', message.lead_id)
          .single();

        if (lead?.campaign_id) {
          await updateCampaignMetrics(supabase, lead.campaign_id, messageStatus);
        }
      } catch (campaignError) {
        console.error('❌ Error updating campaign metrics:', campaignError);
        // Don't fail the webhook if campaign update fails
      }
    }

    // Log the webhook for debugging (requires webhook_logs table)
    try {
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          webhook_type: 'twilio_status',
          message_sid: messageSid,
          status: messageStatus,
          error_code: errorCode || null,
          raw_data: Object.fromEntries(formData.entries()),
          processed_at: new Date().toISOString(),
          tenant_id: message.tenant_id
        });

      if (logError) {
        console.warn('⚠️ Failed to log webhook (non-critical):', logError);
      }
    } catch (logError) {
      console.warn('⚠️ Webhook logging failed (non-critical):', logError);
    }
    try {
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          webhook_type: 'twilio_status',
          message_sid: messageSid,
          status: messageStatus,
          error_code: errorCode || null,
          raw_data: Object.fromEntries(formData.entries()),
          processed_at: new Date().toISOString(),
          tenant_id: message.tenant_id
        });

      if (logError) {
        console.warn('⚠️ Failed to log webhook (non-critical):', logError);
      }
    } catch (logError) {
      console.warn('⚠️ Webhook logging failed (non-critical):', logError);
    }

    // Return success to Twilio
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❗ Unexpected webhook error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});

// Helper function to update campaign delivery metrics
async function updateCampaignMetrics(supabase: any, campaignId: string, messageStatus: string) {
  console.log(`📊 Updating campaign ${campaignId} metrics for status: ${messageStatus}`);

  // First, let's check if campaigns table has delivery metric columns
  // If not, we'll add them dynamically or create a separate metrics table
  
  try {
    // Try to get current campaign - this will tell us what columns exist
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Error fetching campaign for metrics update:', campaignError);
      return;
    }

    // Check if we have delivery metric columns, if not create campaign_metrics record
    if (!('delivered_count' in campaign)) {
      console.log('📊 Using campaign_metrics table for delivery tracking');
      await updateCampaignMetricsTable(supabase, campaignId, messageStatus);
      return;
    }

    // Use existing columns in campaigns table
    let updateData: any = {};

    switch (messageStatus.toLowerCase()) {
      case 'delivered':
        updateData.delivered_count = (campaign.delivered_count || 0) + 1;
        console.log(`📈 Incrementing delivered count to ${updateData.delivered_count}`);
        break;
        
      case 'failed':
      case 'undelivered':
        updateData.failed_count = (campaign.failed_count || 0) + 1;
        console.log(`📈 Incrementing failed count to ${updateData.failed_count}`);
        break;
        
      case 'sent':
        updateData.sent_count = (campaign.sent_count || 0) + 1;
        console.log(`📈 Incrementing sent count to ${updateData.sent_count}`);
        break;
        
      default:
        console.log(`ℹ️ No metric update needed for status: ${messageStatus}`);
        return;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);

      if (updateError) {
        console.error('❌ Error updating campaign metrics:', updateError);
        throw updateError;
      }

      console.log('✅ Campaign metrics updated successfully');
    }

  } catch (error) {
    console.error('❌ Error in updateCampaignMetrics:', error);
    throw error;
  }
}

// Helper function to update metrics in a separate table if needed
async function updateCampaignMetricsTable(supabase: any, campaignId: string, messageStatus: string) {
  // Upsert campaign metrics record
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await supabase
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('date', today)
    .single();

  let updateData: any = {
    campaign_id: campaignId,
    date: today,
    delivered_count: existing?.delivered_count || 0,
    failed_count: existing?.failed_count || 0,
    sent_count: existing?.sent_count || 0,
    updated_at: new Date().toISOString()
  };

  switch (messageStatus.toLowerCase()) {
    case 'delivered':
      updateData.delivered_count += 1;
      break;
    case 'failed':
    case 'undelivered':
      updateData.failed_count += 1;
      break;
    case 'sent':
      updateData.sent_count += 1;
      break;
  }

  const { error } = await supabase
    .from('campaign_metrics')
    .upsert(updateData, { 
      onConflict: 'campaign_id,date' 
    });

  if (error) {
    console.error('❌ Error updating campaign_metrics table:', error);
    throw error;
  }

  console.log('✅ Campaign metrics table updated successfully');
}