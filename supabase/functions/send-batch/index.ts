import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Helper function to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    let campaigns = [];
    let isManualToggle = false;
    let requestBody: any = null;
    
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
    const isScheduledBatch = !(req.method === "PATCH" || req.method === "POST") || 
                           !(requestBody?.campaignId && requestBody.hasOwnProperty('ai_on'));
    
    if (isScheduledBatch) {
      // Get business hours settings from platform_settings
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["timezone", "officeOpenHour", "officeCloseHour", "officeDays"]);
      
      const settingsMap = settings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) || {};
      
      const timezone = settingsMap.timezone === "EST" ? "America/New_York" : "America/New_York";
      const openHour = parseInt(settingsMap.officeOpenHour || "8");
      const closeHour = parseInt(settingsMap.officeCloseHour || "17");
      const officeDays = (settingsMap.officeDays || "Monday,Tuesday,Wednesday,Thursday,Friday").split(",");
      
      // Check current time in business timezone
      const now = new Date();
      const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const hour = businessTime.getHours();
      const dayOfWeek = businessTime.getDay(); // 0 = Sunday, 6 = Saturday
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];
      
      // Check if outside business hours
      if (hour < openHour || hour >= closeHour || !officeDays.includes(dayName)) {
        console.log(`⏰ Outside business hours (${timezone}: ${businessTime.toLocaleString()}). Skipping batch processing.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Outside business hours - batch processing skipped",
            current_time: businessTime.toLocaleString(),
            business_hours: `${openHour}:00 - ${closeHour}:00 ${timezone}`,
            business_days: officeDays.join(", ")
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Check if this is a single campaign toggle or batch processing
    if (requestBody && requestBody.campaignId && requestBody.hasOwnProperty('ai_on')) {
      // Manual campaign toggle
      isManualToggle = true;
      const { campaignId, ai_on } = requestBody;
      
      console.log(`🎯 Manual campaign toggle: ${campaignId} → ai_on=${ai_on}`);
      
      // Update the specific campaign's ai_on status
      const { data: updatedCampaign, error: updateErr } = await supabase
        .from("campaigns")
        .update({ ai_on, updated_at: new Date().toISOString() })
        .eq("id", campaignId)
        .select("*")
        .single();

      if (updateErr) {
        console.error("❌ Error updating campaign:", updateErr);
        return new Response(
          JSON.stringify({ error: "Error updating campaign" }), 
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // If AI was turned ON, process this campaign immediately
      if (ai_on) {
        campaigns = [updatedCampaign];
        console.log(`✅ Campaign ${campaignId} AI enabled - will process NEW leads immediately`);
      } else {
        // AI turned OFF, just return success
        console.log(`⛔ Campaign ${campaignId} AI disabled - no processing needed`);
        return new Response(JSON.stringify({
          success: true,
          message: "Campaign AI disabled successfully",
          campaign: updatedCampaign
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If no specific campaign provided, get all campaigns with ai_on = true (scheduled batch mode)
    if (campaigns.length === 0) {
      console.log("🔄 Scheduled batch mode - processing all campaigns with ai_on=true");
      
      const { data: allCampaigns, error: campaignErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("ai_on", true)
        .eq("is_active", true) // Only active campaigns
        .is("archived", false); // Not archived campaigns

      if (campaignErr) {
        console.error("❌ Error fetching campaigns:", campaignErr);
        return new Response(
          JSON.stringify({ error: "Error fetching campaigns" }), 
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      campaigns = allCampaigns || [];
      console.log(`📊 Found ${campaigns.length} campaigns with AI enabled`);
    }

    let processedCampaigns = [];
    let totalNewLeadsProcessed = 0;
    let totalLeadsAttempted = 0;
    let processingErrors = [];

    for (const campaign of campaigns) {
      const { id: campaignId, tenant_id, ai_on, name } = campaign;

      if (!ai_on) {
        console.log(`⛔ Skipping campaign ${campaignId} (${name}) because ai_on is false.`);
        continue;
      }

      console.log(`🚀 Processing campaign ${campaignId} (${name}) for NEW leads...`);

      // First, get the total count of unprocessed leads
      const { count: totalUnprocessed } = await supabase
        .from("leads")
        .select("*", { count: 'exact', head: true })
        .eq("tenant_id", tenant_id)
        .eq("campaign_id", campaignId)
        .eq("ai_sent", false);

      console.log(`📊 Campaign "${name}" has ${totalUnprocessed} total unprocessed leads`);

      // Get NEW leads only (ai_sent = false)
      const { data: newLeads, error: leadErr } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("campaign_id", campaignId)
        .eq("ai_sent", false)
        .limit(10); // Process up to 10 new leads per campaign

      if (leadErr) {
        console.error(`❌ Error fetching NEW leads for campaign ${campaignId}:`, leadErr);
        processingErrors.push({ campaignId, error: `Failed to fetch leads: ${leadErr.message}` });
        continue;
      }

      if (!newLeads || newLeads.length === 0) {
        console.log(`✅ No NEW leads to process for campaign ${campaignId} (${name})`);
        
        // If this was a manual toggle and no leads to process, still mark campaign as started
        if (isManualToggle) {
          await supabase
            .from("campaigns")
            .update({ started_at: new Date().toISOString() })
            .eq("id", campaignId);
        }
        
        // Campaign is complete - no new leads left
        console.log(`🏁 Campaign ${campaignId} (${name}) has no remaining NEW leads - marking as completed`);
        await supabase
          .from("campaigns")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", campaignId);
        
        continue;
      }

      console.log(`📤 Processing batch of ${newLeads.length} leads (${newLeads.length} of ${totalUnprocessed} remaining)`);

      let campaignLeadsProcessed = 0;
      let campaignLeadsAttempted = 0;
      
      // Process each NEW lead with staggered delays
      for (let i = 0; i < newLeads.length; i++) {
        const lead = newLeads[i];
        campaignLeadsAttempted++;
        
        // Add delay between leads (except for the first one)
        if (i > 0) {
          const delayMs = 3000 + Math.random() * 2000; // 3-5 seconds random delay
          console.log(`⏱️ Waiting ${Math.round(delayMs/1000)}s before processing next lead...`);
          await delay(delayMs);
        }
        
        console.log(`📧 [${i + 1}/${newLeads.length}] Sending lead ${lead.id} (${lead.name || lead.phone}) - Progress: ${campaignLeadsProcessed + 1}/${totalUnprocessed} total`);

        const aiOutreachUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-initial-outreach`;
        
        try {
          const outreachResponse = await fetch(aiOutreachUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              tenant_id,
              lead_id: lead.id,
              campaign_id: campaignId,
            }),
          });

          if (!outreachResponse.ok) {
            const errorText = await outreachResponse.text();
            console.error(`❌ AI outreach failed for lead ${lead.id}: ${errorText}`);
            processingErrors.push({ leadId: lead.id, error: `AI outreach failed: ${errorText}` });
            continue;
          }

          // Mark lead as sent and update timestamps
          const { error: updateError } = await supabase
            .from("leads")
            .update({ 
              ai_sent: true, 
              ai_sent_at: new Date().toISOString(),
              follow_up_stage: 0, // Initialize follow-up tracking
              last_outbound_at: new Date().toISOString()
            })
            .eq("id", lead.id);

          if (updateError) {
            console.error(`❌ Failed to update lead ${lead.id} status:`, updateError);
            processingErrors.push({ leadId: lead.id, error: `Failed to update lead status: ${updateError.message}` });
            continue;
          }

          campaignLeadsProcessed++;
          console.log(`✅ NEW lead ${lead.id} processed successfully`);

        } catch (fetchError) {
          console.error(`❌ Error calling AI outreach for NEW lead ${lead.id}:`, fetchError);
          processingErrors.push({ leadId: lead.id, error: `Exception during processing: ${fetchError.message}` });
        }
      }

      // Update campaign started timestamp if any leads were processed
      if (campaignLeadsProcessed > 0) {
        await supabase
          .from("campaigns")
          .update({ started_at: new Date().toISOString() })
          .eq("id", campaignId);
      }

      totalNewLeadsProcessed += campaignLeadsProcessed;
      totalLeadsAttempted += campaignLeadsAttempted;
      
      const campaignResult = {
        ...campaign,
        new_leads_processed: campaignLeadsProcessed,
        new_leads_attempted: campaignLeadsAttempted,
        total_unprocessed_at_start: totalUnprocessed,
        remaining_unprocessed: totalUnprocessed - campaignLeadsProcessed,
        processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch'
      };
      
      processedCampaigns.push(campaignResult);
      
      console.log(`🎯 Campaign ${campaignId} (${name}) batch complete:`);
      console.log(`   - Processed: ${campaignLeadsProcessed}/${campaignLeadsAttempted} in this batch`);
      console.log(`   - Remaining: ${totalUnprocessed - campaignLeadsProcessed} leads still to process`);
      console.log(`   - Progress: ${Math.round((campaignLeadsProcessed / totalUnprocessed) * 100)}% of total campaign`);
    }

    const responseMessage = isManualToggle 
      ? `✅ Manual campaign processing complete.`
      : `✅ Scheduled batch processing complete.`;

    console.log(`\n📊 Final Summary:`);
    console.log(`- Campaigns processed: ${processedCampaigns.length}`);
    console.log(`- Total leads attempted: ${totalLeadsAttempted}`);
    console.log(`- Total leads successful: ${totalNewLeadsProcessed}`);
    console.log(`- Total errors: ${processingErrors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch',
        campaigns_processed: processedCampaigns.length,
        total_new_leads_processed: totalNewLeadsProcessed,
        total_new_leads_attempted: totalLeadsAttempted,
        campaigns: processedCampaigns,
        errors: processingErrors.length > 0 ? processingErrors : undefined
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error("❗ Unexpected error in send-batch:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message || "Internal Server Error",
        processing_type: "error"
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});