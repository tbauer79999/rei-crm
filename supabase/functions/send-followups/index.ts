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
    console.log("🔄 Starting daily follow-up processing...");

    // Get all active tenants for follow-up processing
    const { data: tenants, error: tenantError } = await supabase
      .from("campaigns")
      .select("tenant_id")
      .eq("is_active", true)
      .is("archived", false); // Get unique tenant_ids

    if (tenantError) {
      console.error("❌ Error fetching tenants:", tenantError);
      return new Response(
        JSON.stringify({ error: "Error fetching tenants" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const uniqueTenants = [...new Set(tenants.map(t => t.tenant_id))];
    console.log(`🏢 Processing follow-ups for ${uniqueTenants.length} tenants`);

    let totalFollowupsProcessed = 0;
    let tenantResults = [];

    for (const tenant_id of uniqueTenants) {
      console.log(`🏢 Processing tenant: ${tenant_id}`);

      // Get follow-up delay settings for this tenant
      const { data: followupSettings, error: settingsError } = await supabase
        .from("platform_settings")
        .select("key, value")
        .eq("tenant_id", tenant_id)
        .in("key", ["followup_delay_1", "followup_delay_2", "followup_delay_3"]);

      if (settingsError) {
        console.error(`❌ Error fetching follow-up settings for tenant ${tenant_id}:`, settingsError);
        continue;
      }

      // Parse delay settings with defaults
      const delaySettings = {
      // Initialize follow-up stage tracking
      // Assumes leads table has followup_stage and last_followup_sent columns
        followup_delay_1: 3,
        followup_delay_2: 7, 
        followup_delay_3: 14
      };

      followupSettings?.forEach(setting => {
        const delay = parseInt(setting.value);
        if (!isNaN(delay)) {
          delaySettings[setting.key] = delay;
        }
      });

      console.log(`⏰ Follow-up delays for tenant ${tenant_id}:`, delaySettings);

      let tenantFollowupsProcessed = 0;

      // Process each follow-up stage (1, 2, 3)
      for (let stage = 1; stage <= 3; stage++) {
        // Prevent duplicate follow-ups: ensure leads haven't already received this stage
        const delayKey = `followup_delay_${stage}` as keyof typeof delaySettings;
        const delayDays = delaySettings[delayKey];
        const expectedCurrentStage = stage - 1; // If sending stage 1, current should be 0

        console.log(`📅 Finding leads ready for follow-up stage ${stage} (${delayDays} days delay)`);

    

             const { data: leads, error: leadsError } = await supabase.rpc("get_leads_ready_for_followup", {
          tenant_id_input: tenant_id,
          stage_input: expectedCurrentStage,
          delay_days_input: delayDays
        });

        if (leadsError) {
          console.error(`❌ Error fetching leads for stage ${stage}:`, leadsError);
          continue;
        }

        console.log(`📋 Found ${leads?.length || 0} leads ready for follow-up stage ${stage}`);

        for (const lead of leads || []) {
          await processFollowupLead(lead, stage, tenant_id);
          tenantFollowupsProcessed++;
        }
      }
      totalFollowupsProcessed += tenantFollowupsProcessed;
      
tenantResults.push({
  tenant_id: tenant_id,
  followups_processed: tenantFollowupsProcessed,
  delay_settings: delaySettings
});

      console.log(`✅ Tenant ${tenant_id} complete: ${tenantFollowupsProcessed} follow-ups processed`);
    }

    console.log(`🎯 Daily follow-up processing complete: ${totalFollowupsProcessed} total follow-ups sent`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily follow-up processing complete",
        total_followups_processed: totalFollowupsProcessed,
        tenants_processed: uniqueTenants.length,
        tenant_results: tenantResults,
        processing_timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error("❗ Unexpected error in send-followups:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message || "Internal Server Error",
        processing_timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Helper function to process individual follow-up lead
  async function processFollowupLead(lead: any, stage: number, tenant_id: string) {
    try {
      console.log(`📤 Sending follow-up ${stage} for lead ${lead.id} (${lead.name || lead.phone}) in campaign ${lead.campaign_name}`);

      const aiFollowupUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-followup-outreach`;
      
      const followupResponse = await fetch(aiFollowupUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          tenant_id,
          lead_id: lead.id,
          campaign_id: lead.campaign_id,
          follow_up_stage: stage,
        }),
      });

      if (!followupResponse.ok) {
        const errorText = await followupResponse.text();
        console.error(`❌ AI follow-up ${stage} failed for lead ${lead.id}: ${errorText}`);
        return false;
      }

      const responseData = await followupResponse.json();
      console.log(`✅ Follow-up ${stage} sent successfully for lead ${lead.id}${responseData.sequence_complete ? ' (sequence complete)' : ''}`);
      return true;

    } catch (error) {
      console.error(`❌ Error processing follow-up ${stage} for lead ${lead.id}:`, error);
      return false;
    }
  }
});