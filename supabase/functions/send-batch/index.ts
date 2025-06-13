import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    // Check if this is a single campaign toggle or batch processing
    if (req.method === "PATCH" || req.method === "POST") {
      const requestBody = await req.json();
      
      if (requestBody.campaignId && requestBody.hasOwnProperty('ai_on')) {
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

    for (const campaign of campaigns) {
      const { id: campaignId, tenant_id, ai_on, name } = campaign;

      if (!ai_on) {
        console.log(`⛔ Skipping campaign ${campaignId} (${name}) because ai_on is false.`);
        continue;
      }

      console.log(`🚀 Processing campaign ${campaignId} (${name}) for NEW leads...`);

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
        
        // Check if campaign should be marked as completed (no new leads left)
        const { data: remainingLeads } = await supabase
          .from("leads")
          .select("id")
          .eq("campaign_id", campaignId)
          .eq("ai_sent", false)
          .limit(1);

        if (!remainingLeads || remainingLeads.length === 0) {
          console.log(`🏁 Campaign ${campaignId} (${name}) has no remaining NEW leads - marking as completed`);
          await supabase
            .from("campaigns")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", campaignId);
        }
        
        continue;
      }

      console.log(`📤 Processing ${newLeads.length} NEW leads for campaign ${campaignId} (${name})`);

      let campaignLeadsProcessed = 0;
      
      // Process each NEW lead
      for (const lead of newLeads) {
        console.log(`📧 Sending NEW lead ${lead.id} (${lead.name || lead.phone}) to AI initial outreach...`);

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
            continue;
          }

          // Mark lead as sent and update timestamps
          await supabase
            .from("leads")
            .update({ 
              ai_sent: true, 
              ai_sent_at: new Date().toISOString(),
              follow_up_stage: 0, // Initialize follow-up tracking
              last_outbound_at: new Date().toISOString()
            })
            .eq("id", lead.id);

          campaignLeadsProcessed++;
          console.log(`✅ NEW lead ${lead.id} processed successfully`);

        } catch (fetchError) {
          console.error(`❌ Error calling AI outreach for NEW lead ${lead.id}:`, fetchError);
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
      
      const campaignResult = {
        ...campaign,
        new_leads_processed: campaignLeadsProcessed,
        processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch'
      };
      
      processedCampaigns.push(campaignResult);
      
      console.log(`🎯 Campaign ${campaignId} (${name}) complete: ${campaignLeadsProcessed} NEW leads processed`);
    }

    const responseMessage = isManualToggle 
      ? `✅ Manual campaign processing complete.`
      : `✅ Scheduled batch processing complete.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        processing_type: isManualToggle ? 'manual_toggle' : 'scheduled_batch',
        campaigns_processed: processedCampaigns.length,
        total_new_leads_processed: totalNewLeadsProcessed,
        campaigns: processedCampaigns
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