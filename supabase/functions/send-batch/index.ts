import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
// Helper function to create a delay
const delay = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    let campaigns = [];
    let isManualToggle = false;
    let requestBody = null;
    // Read the body ONCE and store it
    if (req.method === "PATCH" || req.method === "POST") {
      try {
        requestBody = await req.json();
      } catch (e) {
        // No body or invalid JSON
        requestBody = null;
      }
    }
    // Now check if it's a scheduled batch or manual toggle
    const isScheduledBatch = !(req.method === "PATCH" || req.method === "POST") || !(requestBody?.campaignId && requestBody.hasOwnProperty('ai_on'));
    if (isScheduledBatch) {
      // Get business hours settings from platform_settings
      const { data: settings } = await supabase.from("platform_settings").select("key, value").in("key", [
        "timezone",
        "officeOpenHour",
        "officeCloseHour",
        "officeDays"
      ]);
      const settingsMap = settings?.reduce((acc, s)=>({
          ...acc,
          [s.key]: s.value
        }), {}) || {};
      const timezone = settingsMap.timezone === "EST" ? "America/New_York" : "America/New_York";
      const openHour = parseInt(settingsMap.officeOpenHour || "8");
      const closeHour = parseInt(settingsMap.officeCloseHour || "17");
      const officeDays = (settingsMap.officeDays || "Monday,Tuesday,Wednesday,Thursday,Friday").split(",");
      // Check current time in business timezone
      const now = new Date();
      const businessTime = new Date(now.toLocaleString("en-US", {
        timeZone: timezone
      }));
      const hour = businessTime.getHours();
      const dayOfWeek = businessTime.getDay(); // 0 = Sunday, 6 = Saturday
      const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ][dayOfWeek];
      // Check if outside business hours
      if (hour < openHour || hour >= closeHour || !officeDays.includes(dayName)) {
        console.log(`⏰ Outside business hours (${timezone}: ${businessTime.toLocaleString()}). Skipping batch processing.`);
        return new Response(JSON.stringify({
          success: true,
          message: "Outside business hours - batch processing skipped",
          current_time: businessTime.toLocaleString(),
          business_hours: `${openHour}:00 - ${closeHour}:00 ${timezone}`,
          business_days: officeDays.join(", ")
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Check if this is a single campaign toggle or batch processing
    if (requestBody && requestBody.campaignId && requestBody.hasOwnProperty('ai_on')) {
      // Manual campaign toggle
      isManualToggle = true;
      const { campaignId, ai_on } = requestBody;
      console.log(`🎯 Manual campaign toggle: ${campaignId} → ai_on=${ai_on}`);
      // Update the specific campaign's ai_on status
      const { data: updatedCampaign, error: updateErr } = await supabase.from("campaigns").update({
        ai_on,
        updated_at: new Date().toISOString()
      }).eq("id", campaignId).select("*").single();
      if (updateErr) {
        console.error("❌ Error updating campaign:", updateErr);
        return new Response(JSON.stringify({
          error: "Error updating campaign"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // If AI was turned ON, process this campaign immediately
      if (ai_on) {
        campaigns = [
          updatedCampaign
        ];
        console.log(`✅ Campaign ${campaignId} AI enabled - will process NEW leads immediately`);
      } else {
        // AI turned OFF, just return success
        console.log(`⛔ Campaign ${campaignId} AI disabled - no processing needed`);
        return new Response(JSON.stringify({
          success: true,
          message: "Campaign AI disabled successfully",
          campaign: updatedCampaign
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // If no specific campaign provided, get all campaigns with ai_on = true (scheduled batch mode)
    if (campaigns.length === 0) {
      console.log("🔄 Scheduled batch mode - processing all campaigns with ai_on=true");
      const { data: allCampaigns, error: campaignErr } = await supabase.from("campaigns").select("*").eq("ai_on", true).eq("is_active", true) // Only active campaigns
      .is("archived", false); // Not archived campaigns
      if (campaignErr) {
        console.error("❌ Error fetching campaigns:", campaignErr);
        return new Response(JSON.stringify({
          error: "Error fetching campaigns"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      campaigns = allCampaigns || [];
      console.log(`📊 Found ${campaigns.length} campaigns with AI enabled`);
    }
    let processedCampaigns = [];
    let totalNewLeadsProcessed = 0;
    let totalLeadsAttempted = 0;
    let totalRetryMessagesProcessed = 0;
    let totalRetryMessagesAttempted = 0;
    let processingErrors = [];
 // Get throttling settings for all tenants
    const { data: throttleSettings } = await supabase
      .from("platform_settings")
      .select("tenant_id, value")
      .eq("key", "ai_hourly_throttle_limit");
    
    const throttleLimits = new Map();
    throttleSettings?.forEach(setting => {
      throttleLimits.set(setting.tenant_id, parseInt(setting.value) || 30);
    });

    for (const campaign of campaigns){
      const { id: campaignId, tenant_id, ai_on, name } = campaign;
      if (!ai_on) {
        console.log(`⛔ Skipping campaign ${campaignId} (${name}) because ai_on is false.`);
        continue;
      }
      
      // ===== THROTTLING CHECK =====
      const hourlyLimit = throttleLimits.get(tenant_id) || 30;
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { count: currentHourlyCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .eq('direction', 'outbound')
        .gte('timestamp', hourAgo.toISOString());
      
      const messagesThisHour = currentHourlyCount || 0;
      const throttleWillApply = messagesThisHour >= hourlyLimit;
      
      // Log throttling event
      await supabase.from('throttling_events').insert({
        tenant_id,
        campaign_id: campaignId,
        event_type: throttleWillApply ? 'throttle_applied' : 'throttle_checked',
        hourly_limit: hourlyLimit,
        current_hourly_count: messagesThisHour,
        messages_blocked: throttleWillApply ? 1 : 0
      });
      
      if (throttleWillApply) {
        console.log(`🚦 THROTTLE: Campaign ${campaignId} blocked - ${messagesThisHour}/${hourlyLimit} messages this hour`);
        continue;
      }
      
      console.log(`✅ THROTTLE: Campaign ${campaignId} approved - ${messagesThisHour}/${hourlyLimit} messages this hour`);
      // ===== EXISTING UNTOUCHED LEADS LOGIC =====
      // First, get the total count of unprocessed leads
      const { count: totalUnprocessed } = await supabase.from("leads").select("*", {
        count: 'exact',
        head: true
      }).eq("tenant_id", tenant_id).eq("campaign_id", campaignId).eq("ai_sent", false);
      console.log(`📊 Campaign "${name}" has ${totalUnprocessed} total unprocessed leads`);
      // Get NEW leads only (ai_sent = false)
      const { data: newLeads, error: leadErr } = await supabase.from("leads").select("*").eq("tenant_id", tenant_id).eq("campaign_id", campaignId).eq("ai_sent", false).limit(7); // Reduced to 7 to leave room for retry messages
      if (leadErr) {
        console.error(`❌ Error fetching NEW leads for campaign ${campaignId}:`, leadErr);
        processingErrors.push({
          campaignId,
          error: `Failed to fetch leads: ${leadErr.message}`
        });
        continue;
      }
      // ===== NEW: RETRY-ELIGIBLE FAILED MESSAGES LOGIC =====
      console.log(`🔄 Checking for retry-eligible failed messages for campaign ${campaignId}...`);
      const { data: retryMessages, error: retryError } = await supabase.from('messages').select(`
          *,
          leads!inner(campaign_id, tenant_id, name, phone, email)
        `).eq('status', 'failed').eq('retry_eligible', true).lt('retry_count', 3).eq('direction', 'outbound').is('original_message_id', null).eq('queued', false).eq('leads.campaign_id', campaignId).eq('leads.tenant_id', tenant_id).order('inserted_at', {
        ascending: true
      }).limit(3); // Process up to 3 retry messages per campaign
      if (retryError) {
        console.error(`❌ Error fetching retry messages for campaign ${campaignId}:`, retryError);
        processingErrors.push({
          campaignId,
          error: `Failed to fetch retry messages: ${retryError.message}`
        });
      } else {
        console.log(`🔄 Found ${retryMessages?.length || 0} retry-eligible messages for campaign ${campaignId}`);
      }
      // Check if we have anything to process
      const hasNewLeads = newLeads && newLeads.length > 0;
      const hasRetryMessages = retryMessages && retryMessages.length > 0;
      if (!hasNewLeads && !hasRetryMessages) {
        console.log(`✅ No NEW leads or RETRY messages to process for campaign ${campaignId} (${name})`);
        // If this was a manual toggle and no leads to process, still mark campaign as started
        if (isManualToggle) {
          await supabase.from("campaigns").update({
            started_at: new Date().toISOString()
          }).eq("id", campaignId);
        }
        // Campaign is complete - no new leads left
        if (!hasNewLeads) {
          console.log(`🏁 Campaign ${campaignId} (${name}) has no remaining NEW leads - marking as completed`);
          await supabase.from("campaigns").update({
            completed_at: new Date().toISOString()
          }).eq("id", campaignId);
        }
        continue;
      }
      console.log(`📤 Processing batch: ${newLeads?.length || 0} new leads + ${retryMessages?.length || 0} retry messages`);
      let campaignLeadsProcessed = 0;
      let campaignLeadsAttempted = 0;
      let campaignRetryProcessed = 0;
      let campaignRetryAttempted = 0;
      // ===== PROCESS NEW LEADS (EXISTING LOGIC) =====
      if (hasNewLeads) {
        console.log(`📧 Processing ${newLeads.length} NEW leads...`);
        for(let i = 0; i < newLeads.length; i++){
          const lead = newLeads[i];
          campaignLeadsAttempted++;
          // Add delay between leads (except for the first one)
          if (i > 0 || hasRetryMessages) {
            const delayMs = 3000 + Math.random() * 2000; // 3-5 seconds random delay
            console.log(`⏱️ Waiting ${Math.round(delayMs / 1000)}s before processing next lead...`);
            await delay(delayMs);
          }
          console.log(`📧 [NEW ${i + 1}/${newLeads.length}] Sending lead ${lead.id} (${lead.name || lead.phone}) - Progress: ${campaignLeadsProcessed + 1}/${totalUnprocessed} total`);
          const aiOutreachUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-initial-outreach`;
          try {
            const outreachResponse = await fetch(aiOutreachUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                tenant_id,
                lead_id: lead.id,
                campaign_id: campaignId
              })
            });
            if (!outreachResponse.ok) {
              const errorText = await outreachResponse.text();
              console.error(`❌ AI outreach failed for lead ${lead.id}: ${errorText}`);
              processingErrors.push({
                leadId: lead.id,
                error: `AI outreach failed: ${errorText}`
              });
              continue;
            }
            // Mark lead as sent and update timestamps
            const { error: updateError } = await supabase.from("leads").update({
              ai_sent: true,
              ai_sent_at: new Date().toISOString(),
              follow_up_stage: 0,
              last_outbound_at: new Date().toISOString()
            }).eq("id", lead.id);
            if (updateError) {
              console.error(`❌ Failed to update lead ${lead.id} status:`, updateError);
              processingErrors.push({
                leadId: lead.id,
                error: `Failed to update lead status: ${updateError.message}`
              });
              continue;
            }
            campaignLeadsProcessed++;
            console.log(`✅ NEW lead ${lead.id} processed successfully`);
          } catch (fetchError) {
            console.error(`❌ Error calling AI outreach for NEW lead ${lead.id}:`, fetchError);
            processingErrors.push({
              leadId: lead.id,
              error: `Exception during processing: ${fetchError.message}`
            });
          }
        }
      }
      // ===== PROCESS RETRY MESSAGES =====
      if (hasRetryMessages) {
        console.log(`🔄 Processing ${retryMessages.length} RETRY messages...`);
        for(let i = 0; i < retryMessages.length; i++){
          const retryMessage = retryMessages[i];
          const lead = retryMessage.leads;
          campaignRetryAttempted++;
          // Add delay between retry messages
          if (i > 0 || hasNewLeads) {
            const delayMs = 3000 + Math.random() * 2000; // 3-5 seconds random delay
            console.log(`⏱️ Waiting ${Math.round(delayMs / 1000)}s before processing next retry...`);
            await delay(delayMs);
          }
          console.log(`🔄 [RETRY ${i + 1}/${retryMessages.length}] Retrying message ${retryMessage.id} for lead ${lead.name || lead.phone} (attempt ${retryMessage.retry_count + 1}/3)`);
          try {
            // Generate new message using AI outreach
            const aiOutreachUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-initial-outreach`;
            const outreachResponse = await fetch(aiOutreachUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                tenant_id,
                lead_id: lead.id,
                campaign_id: campaignId,
                is_retry: true,
                original_message_id: retryMessage.id
              })
            });
            if (!outreachResponse.ok) {
              const errorText = await outreachResponse.text();
              console.error(`❌ AI retry outreach failed for message ${retryMessage.id}: ${errorText}`);
              processingErrors.push({
                messageId: retryMessage.id,
                leadId: lead.id,
                error: `AI retry outreach failed: ${errorText}`
              });
              // Increment retry count even on failure
              await supabase.from('messages').update({
                retry_count: retryMessage.retry_count + 1
              }).eq('id', retryMessage.id);
              continue;
            }
            // Increment the retry count on the original failed message
            const { error: retryUpdateError } = await supabase.from('messages').update({
              retry_count: retryMessage.retry_count + 1
            }).eq('id', retryMessage.id);
            if (retryUpdateError) {
              console.error(`❌ Failed to update retry count for message ${retryMessage.id}:`, retryUpdateError);
              processingErrors.push({
                messageId: retryMessage.id,
                error: `Failed to update retry count: ${retryUpdateError.message}`
              });
              continue;
            }
            campaignRetryProcessed++;
            console.log(`✅ RETRY message ${retryMessage.id} processed successfully (attempt ${retryMessage.retry_count + 1})`);
          } catch (fetchError) {
            console.error(`❌ Error processing retry message ${retryMessage.id}:`, fetchError);
            processingErrors.push({
              messageId: retryMessage.id,
              leadId: lead.id,
              error: `Exception during retry processing: ${fetchError.message}`
            });
            // Increment retry count even on exception
            try {
              await supabase.from('messages').update({
                retry_count: retryMessage.retry_count + 1
              }).eq('id', retryMessage.id);
            } catch (updateErr) {
              console.error(`❌ Failed to update retry count after exception:`, updateErr);
            }
          }
        }
      }
      // Update campaign started timestamp if any leads were processed
      if (campaignLeadsProcessed > 0 || campaignRetryProcessed > 0) {
        await supabase.from("campaigns").update({
          started_at: new Date().toISOString()
        }).eq("id", campaignId);
      }
      totalNewLeadsProcessed += campaignLeadsProcessed;
      totalLeadsAttempted += campaignLeadsAttempted;
      totalRetryMessagesProcessed += campaignRetryProcessed;
      totalRetryMessagesAttempted += campaignRetryAttempted;
      const campaignResult = {
        ...campaign,
        new_leads_processed: campaignLeadsProcessed,
        new_leads_attempted: campaignLeadsAttempted,
        retry_messages_processed: campaignRetryProcessed,
        retry_messages_attempted: campaignRetryAttempted,
        total_unprocessed_at_start: totalUnprocessed,
        remaining_unprocessed: totalUnprocessed - campaignLeadsProcessed,
        processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch'
      };
      processedCampaigns.push(campaignResult);
      console.log(`🎯 Campaign ${campaignId} (${name}) batch complete:`);
      console.log(`   - NEW leads processed: ${campaignLeadsProcessed}/${campaignLeadsAttempted}`);
      console.log(`   - RETRY messages processed: ${campaignRetryProcessed}/${campaignRetryAttempted}`);
      console.log(`   - Remaining unprocessed leads: ${totalUnprocessed - campaignLeadsProcessed}`);
      console.log(`   - Campaign progress: ${Math.round(campaignLeadsProcessed / (totalUnprocessed || 1) * 100)}%`);
    }
    const responseMessage = isManualToggle ? `✅ Manual campaign processing complete.` : `✅ Scheduled batch processing complete.`;
    console.log(`\n📊 Final Summary:`);
    console.log(`- Campaigns processed: ${processedCampaigns.length}`);
    console.log(`- Total NEW leads attempted: ${totalLeadsAttempted}`);
    console.log(`- Total NEW leads successful: ${totalNewLeadsProcessed}`);
    console.log(`- Total RETRY messages attempted: ${totalRetryMessagesAttempted}`);
    console.log(`- Total RETRY messages successful: ${totalRetryMessagesProcessed}`);
    console.log(`- Total errors: ${processingErrors.length}`);
    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch',
      campaigns_processed: processedCampaigns.length,
      total_new_leads_processed: totalNewLeadsProcessed,
      total_new_leads_attempted: totalLeadsAttempted,
      total_retry_messages_processed: totalRetryMessagesProcessed,
      total_retry_messages_attempted: totalRetryMessagesAttempted,
      campaigns: processedCampaigns,
      errors: processingErrors.length > 0 ? processingErrors : undefined
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error("❗ Unexpected error in send-batch:", err);
    return new Response(JSON.stringify({
      error: err.message || "Internal Server Error",
      processing_type: "error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
