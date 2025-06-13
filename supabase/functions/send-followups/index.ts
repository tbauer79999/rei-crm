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
      .is("archived", false)
      .group("tenant_id"); // Get unique tenant_ids

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
        const delayKey = `followup_delay_${stage}` as keyof typeof delaySettings;
        const delayDays = delaySettings[delayKey];
        const expectedCurrentStage = stage - 1; // If sending stage 1, current should be 0

        console.log(`📅 Finding leads ready for follow-up stage ${stage} (${delayDays} days delay)`);

        // Find leads ready for this follow-up stage
        const followupQuery = `
          SELECT l.*, c.id as campaign_id, c.name as campaign_name
          FROM leads l
          JOIN campaigns c ON l.campaign_id = c.id
          WHERE l.tenant_id = $1
          AND l.follow_up_stage = $2
          AND l.last_outbound_at IS NOT NULL
          AND l.last_outbound_at <= NOW() - INTERVAL '${delayDays} days'
          AND c.is_active = true
          AND c.archived = false
          AND NOT EXISTS (
            SELECT 1 FROM messages m 
            WHERE m.lead_id = l.id 
            AND m.direction = 'inbound' 
            AND m.timestamp > l.last_outbound_at
          )
          LIMIT 50
        `;

        const { data: followupLeads, error: followupError } = await supabase
          .rpc('execute_sql', { 
            sql_query: followupQuery,
            params: [tenant_id, expectedCurrentStage]
          });

        if (followupError) {
          console.error(`❌ Error finding follow-up stage ${stage} leads for tenant ${tenant_id}:`, followupError);
          
          // Fallback to simpler query
          const { data: fallbackLeads, error: fallbackError } = await supabase
            .from("leads")
            .select(`
              *, 
              campaigns!inner(id, name, is_active, archived)
            `)
            .eq("tenant_id", tenant_id)
            .eq("follow_up_stage", expectedCurrentStage)
            .not("last_outbound_at", "is", null)
            .lte("last_outbound_at", new Date(Date.now() - delayDays * 24 * 60 * 60 * 1000).toISOString())
            .eq("campaigns.is_active", true)
            .eq("campaigns.archived", false)
            .limit(50);

          if (fallbackError) {
            console.error(`❌ Fallback query also failed for stage ${stage}:`, fallbackError);
            continue;
          }

          // Check each lead for recent inbound messages manually
          const validLeads = [];
          for (const lead of fallbackLeads || []) {
            const { data: recentMessages } = await supabase
              .from("messages")
              .select("id")
              .eq("lead_id", lead.id)
              .eq("direction", "inbound")
              .gt("timestamp", lead.last_outbound_at)
              .limit(1);

            if (!recentMessages || recentMessages.length === 0) {
              validLeads.push({
                ...lead,
                campaign_id: lead.campaigns.id,
                campaign_name: lead.campaigns.name
              });
            }
          }

          console.log(`📋 Found ${validLeads.length} leads ready for follow-up stage ${stage} (fallback method)`);
          
          // Process valid leads
          for (const lead of validLeads) {
            await processFollowupLead(lead, stage, tenant_id);
            tenantFollowupsProcessed++;
          }

        } else {
          console.log(`📋 Found ${followupLeads?.length || 0} leads ready for follow-up stage ${stage}`);

          // Process each follow-up lead
          for (const lead of followupLeads || []) {
            await processFollowupLead(lead, stage, tenant_id);
            tenantFollowupsProcessed++;
          }
        }
      }

      totalFollowupsProcessed += tenantFollowupsProcessed;
      
      tenantResults.push({
        tenant_id,
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