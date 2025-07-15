// supabase/functions/get-a2p-status/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TwilioBrandStatus {
  account_sid: string;
  sid: string;
  friendly_name: string;
  entity_type: string;
  status: string;
  brand_type: string;
  failure_reason?: string;
  identity_status: string;
  russell_3000: boolean;
  government_entity: boolean;
  tax_exempt_status: string;
  skip_automatic_sec_vet: boolean;
  mock: boolean;
  date_created: string;
  date_updated: string;
  url: string;
}

interface TwilioCampaignStatus {
  account_sid: string;
  sid: string;
  campaign_id: string;
  description: string;
  message_flow: string;
  status: string;
  brand_registration_sid: string;
  campaign_use_case: string;
  has_embedded_links: boolean;
  has_embedded_phone: boolean;
  reseller_type?: string;
  subscriber_opt_in: boolean;
  age_gated: boolean;
  direct_lending: boolean;
  affiliate_marketing: boolean;
  number_pooling: boolean;
  failure_reason?: string;
  date_created: string;
  date_updated: string;
  url: string;
}

interface StatusResponse {
  success: boolean;
  brand?: {
    id: number;
    twilio_brand_sid: string;
    status: string;
    failure_reason?: string;
    last_checked: string;
    twilio_details: TwilioBrandStatus;
  };
  campaigns?: Array<{
    id: number;
    campaign_id: string;
    twilio_campaign_sid: string;
    status: string;
    failure_reason?: string;
    last_checked: string;
    twilio_details: TwilioCampaignStatus;
  }>;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate and authorize the request
    const { user, tenant_id, role, error: authError, status } = await authenticateAndAuthorize(req);
    
    if (authError || !user || !tenant_id) {
      console.error('❌ Authentication failed:', authError);
      return new Response(authError || 'Unauthorized', { 
        status: status || 401,
        headers: corsHeaders 
      });
    }

    console.log(`✅ Authenticated user ${user.id} for tenant ${tenant_id} - checking A2P status`);

    // Get Twilio credentials
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioToken) {
      console.error("❌ Twilio credentials not configured");
      return new Response('Twilio credentials not configured', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    const authHeader = `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`;
    const response: StatusResponse = {
      success: true,
      message: 'A2P status retrieved successfully'
    };

    // 1. Get and check brand status
    console.log('🔍 Fetching brand from database...');
    const { data: brand, error: brandError } = await supabase
      .from('a2p_brands')
      .select('id, twilio_brand_sid, status, failure_reason')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (brandError) {
      console.error('❌ Error fetching brand:', brandError);
      return new Response('Database error fetching brand', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (!brand) {
      console.log('⚠️ No brand found for tenant');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No A2P Brand found for this tenant',
          brand: null,
          campaigns: []
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Checking Twilio brand status for SID: ${brand.twilio_brand_sid}`);

    // Fetch brand status from Twilio
    const brandResponse = await fetch(
      `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${brand.twilio_brand_sid}`, 
      {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (!brandResponse.ok) {
      const brandError = await brandResponse.text();
      console.error(`❌ Twilio brand status check failed: ${brandResponse.status} ${brandError}`);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: 'brand_status_check_failed',
        event_data: {
          brand_id: brand.id,
          twilio_brand_sid: brand.twilio_brand_sid,
          error: brandError,
          status_code: brandResponse.status
        },
        created_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to check brand status with Twilio',
          error: brandError
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const twilioBrand: TwilioBrandStatus = await brandResponse.json();
    console.log(`✅ Brand status from Twilio: ${twilioResponse.status}`);

    // Update brand status in database if it changed
    if (twilioResponse.status !== brand.status || twilioResponse.failure_reason !== brand.failure_reason) {
      console.log(`📝 Updating brand status: ${brand.status} → ${twilioResponse.status}`);
      
      const { error: updateBrandError } = await supabase
        .from('a2p_brands')
        .update({
          status: twilioResponse.status,
          failure_reason: twilioResponse.failure_reason,
          identity_status: twilioResponse.identity_status,
          russell_3000: twilioResponse.russell_3000,
          government_entity: twilioResponse.government_entity,
          tax_exempt_status: twilioResponse.tax_exempt_status,
          twilio_updated_at: new Date(twilioResponse.date_updated).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (updateBrandError) {
        console.error('❌ Error updating brand status:', updateBrandError);
      } else {
        // Log status change
        await supabase.from('a2p_compliance_events').insert({
          tenant_id,
          event_type: 'brand_status_updated',
          event_data: {
            brand_id: brand.id,
            old_status: brand.status,
            new_status: twilioResponse.status,
            failure_reason: twilioResponse.failure_reason
          },
          created_at: new Date().toISOString()
        });
      }
    }

    response.brand = {
      id: brand.id,
      twilio_brand_sid: brand.twilio_brand_sid,
      status: twilioResponse.status,
      failure_reason: twilioResponse.failure_reason,
      last_checked: new Date().toISOString(),
      twilio_details: twilioResponse
    };

    // 2. Get and check campaign statuses
    console.log('🔍 Fetching campaigns from database...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('a2p_campaigns')
      .select('id, campaign_id, twilio_campaign_sid, status, failure_reason')
      .eq('tenant_id', tenant_id)
      .eq('brand_id', brand.id);

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      return new Response('Database error fetching campaigns', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    response.campaigns = [];

    if (campaigns && campaigns.length > 0) {
      console.log(`🔍 Checking ${campaigns.length} campaign(s) status...`);

      for (const campaign of campaigns) {
        console.log(`🔍 Checking campaign: ${campaign.campaign_id} (${campaign.twilio_campaign_sid})`);

        try {
          const campaignResponse = await fetch(
            `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${brand.twilio_brand_sid}/CampaignRegistrations/${campaign.twilio_campaign_sid}`, 
            {
              method: "GET",
              headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
              },
            }
          );

          if (!campaignResponse.ok) {
            const campaignError = await campaignResponse.text();
            console.error(`❌ Campaign ${campaign.campaign_id} status check failed: ${campaignResponse.status} ${campaignError}`);
            
            // Log the compliance event but continue with other campaigns
            await supabase.from('a2p_compliance_events').insert({
              tenant_id,
              event_type: 'campaign_status_check_failed',
              event_data: {
                brand_id: brand.id,
                campaign_id: campaign.id,
                twilio_campaign_sid: campaign.twilio_campaign_sid,
                error: campaignError,
                status_code: campaignResponse.status
              },
              created_at: new Date().toISOString()
            });

            // Add campaign with error status
            response.campaigns.push({
              id: campaign.id,
              campaign_id: campaign.campaign_id,
              twilio_campaign_sid: campaign.twilio_campaign_sid,
              status: 'ERROR',
              failure_reason: `API Error: ${campaignError}`,
              last_checked: new Date().toISOString(),
              twilio_details: null as any
            });

            continue;
          }

          const twilioCampaign: TwilioCampaignStatus = await campaignResponse.json();
          console.log(`✅ Campaign ${campaign.campaign_id} status: ${twilioCampaign.status}`);

          // Update campaign status in database if it changed
          if (twilioCampaign.status !== campaign.status || twilioCampaign.failure_reason !== campaign.failure_reason) {
            console.log(`📝 Updating campaign ${campaign.campaign_id} status: ${campaign.status} → ${twilioCampaign.status}`);
            
            const { error: updateCampaignError } = await supabase
              .from('a2p_campaigns')
              .update({
                status: twilioCampaign.status,
                failure_reason: twilioCampaign.failure_reason,
                subscriber_opt_in: twilioCampaign.subscriber_opt_in,
                age_gated: twilioCampaign.age_gated,
                direct_lending: twilioCampaign.direct_lending,
                affiliate_marketing: twilioCampaign.affiliate_marketing,
                number_pooling: twilioCampaign.number_pooling,
                twilio_updated_at: new Date(twilioCampaign.date_updated).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', campaign.id);

            if (updateCampaignError) {
              console.error(`❌ Error updating campaign ${campaign.campaign_id} status:`, updateCampaignError);
            } else {
              // Log status change
              await supabase.from('a2p_compliance_events').insert({
                tenant_id,
                event_type: 'campaign_status_updated',
                event_data: {
                  brand_id: brand.id,
                  campaign_id: campaign.id,
                  old_status: campaign.status,
                  new_status: twilioCampaign.status,
                  failure_reason: twilioCampaign.failure_reason
                },
                created_at: new Date().toISOString()
              });
            }
          }

          response.campaigns.push({
            id: campaign.id,
            campaign_id: campaign.campaign_id,
            twilio_campaign_sid: campaign.twilio_campaign_sid,
            status: twilioCampaign.status,
            failure_reason: twilioCampaign.failure_reason,
            last_checked: new Date().toISOString(),
            twilio_details: twilioCampaign
          });

        } catch (campaignErr) {
          console.error(`❌ Error checking campaign ${campaign.campaign_id}:`, campaignErr);
          response.campaigns.push({
            id: campaign.id,
            campaign_id: campaign.campaign_id,
            twilio_campaign_sid: campaign.twilio_campaign_sid,
            status: 'ERROR',
            failure_reason: `Network error: ${campaignErr.message}`,
            last_checked: new Date().toISOString(),
            twilio_details: null as any
          });
        }
      }
    }

    // Log successful status check
    await supabase.from('a2p_compliance_events').insert({
      tenant_id,
      event_type: 'status_check_completed',
      event_data: {
        brand_id: brand.id,
        brand_status: response.brand.status,
        campaigns_checked: response.campaigns.length,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    });

    console.log('✅ A2P status check completed successfully');

    return new Response(
      JSON.stringify(response), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('❗ Unexpected error in get-a2p-status:', err);
    return new Response('Unexpected server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});