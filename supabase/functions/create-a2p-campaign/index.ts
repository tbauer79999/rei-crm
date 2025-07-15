// supabase/functions/create-a2p-campaign/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CreateCampaignRequest {
  campaign_id: string; // Use case identifier: "AI_ENGAGEMENT", "MANUAL_SALES", "BROADCAST"
  description: string;
  message_flow?: string;
  help_message?: string;
  optout_keywords?: string[];
  optin_keywords?: string[];
  help_keywords?: string[];
  subscriber_opt_in?: boolean;
  age_gated?: boolean;
  direct_lending?: boolean;
  embedded_link?: boolean;
  embedded_phone?: boolean;
  affiliate_marketing?: boolean;
  number_pooling?: boolean;
  sample_messages: string[];
}

interface TwilioCampaignResponse {
  account_sid: string;
  sid: string;
  campaign_id: string;
  description: string;
  message_flow: string;
  status: string;
  brand_registration_sid: string;
  has_embedded_links: boolean;
  has_embedded_phone: boolean;
  campaign_use_case: string;
  date_created: string;
  date_updated: string;
  url: string;
}

// Campaign use case mapping
const CAMPAIGN_USE_CASES: { [key: string]: string } = {
  'AI_ENGAGEMENT': 'MIXED',
  'MANUAL_SALES': 'MIXED', 
  'BROADCAST': 'MARKETING',
  'CUSTOMER_CARE': 'CUSTOMER_CARE',
  'DELIVERY_NOTIFICATIONS': 'DELIVERY_NOTIFICATION',
  'FRAUD_ALERT': 'FRAUD_ALERT',
  'ACCOUNT_NOTIFICATIONS': 'ACCOUNT_NOTIFICATION',
  'TWO_FACTOR_AUTH': '2FA'
};

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

    console.log(`✅ Authenticated user ${user.id} for tenant ${tenant_id} with role ${role}`);

    // Parse request body
    let requestBody: CreateCampaignRequest;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('❌ Invalid JSON in request body:', jsonError);
      return new Response('Invalid JSON request body', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Validate required fields
    const requiredFields = ['campaign_id', 'description', 'sample_messages'];
    const missingFields = requiredFields.filter(field => !requestBody[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return new Response(`Missing required fields: ${missingFields.join(', ')}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!requestBody.sample_messages || requestBody.sample_messages.length === 0) {
      console.error('❌ At least one sample message is required');
      return new Response('At least one sample message is required', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log('📋 Creating A2P Campaign:', requestBody.campaign_id);

    // Get the brand for this tenant
    const { data: brand, error: brandError } = await supabase
      .from('a2p_brands')
      .select('id, twilio_brand_sid, status')
      .eq('tenant_id', tenant_id)
      .single();

    if (brandError || !brand) {
      console.error('❌ No A2P Brand found for tenant:', brandError);
      return new Response('No A2P Brand found. Please create a brand first.', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (brand.status !== 'VERIFIED') {
      console.error('❌ Brand not verified. Status:', brand.status);
      return new Response(`Brand must be verified before creating campaigns. Current status: ${brand.status}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Check if campaign already exists for this tenant and campaign_id
    const { data: existingCampaign, error: checkError } = await supabase
      .from('a2p_campaigns')
      .select('id, twilio_campaign_sid, status, campaign_id')
      .eq('tenant_id', tenant_id)
      .eq('campaign_id', requestBody.campaign_id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing campaign:', checkError);
      return new Response('Database error checking existing campaign', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (existingCampaign) {
      console.log('⚠️ Campaign already exists for tenant:', existingCampaign);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Campaign already exists for this tenant and campaign ID',
          existing_campaign: existingCampaign
        }), 
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Determine campaign use case
    const campaignUseCase = CAMPAIGN_USE_CASES[requestBody.campaign_id] || 'MIXED';

    // Prepare Twilio API request body
    const twilioRequestBody = new URLSearchParams({
      CampaignId: requestBody.campaign_id,
      Description: requestBody.description,
      MessageFlow: requestBody.message_flow || 'Opt-in message flow for ' + requestBody.campaign_id,
      CampaignUseCase: campaignUseCase,
      BrandRegistrationSid: brand.twilio_brand_sid,
      HasEmbeddedLinks: (requestBody.embedded_link || false).toString(),
      HasEmbeddedPhone: (requestBody.embedded_phone || false).toString()
    });

    // Add optional fields
    if (requestBody.help_message) {
      twilioRequestBody.append('HelpMessage', requestBody.help_message);
    }

    if (requestBody.optout_keywords && requestBody.optout_keywords.length > 0) {
      twilioRequestBody.append('OptOutKeywords', requestBody.optout_keywords.join(','));
    }

    if (requestBody.optin_keywords && requestBody.optin_keywords.length > 0) {
      twilioRequestBody.append('OptInKeywords', requestBody.optin_keywords.join(','));
    }

    if (requestBody.help_keywords && requestBody.help_keywords.length > 0) {
      twilioRequestBody.append('HelpKeywords', requestBody.help_keywords.join(','));
    }

    // Add sample messages (Twilio expects these as separate parameters)
    requestBody.sample_messages.forEach((message, index) => {
      twilioRequestBody.append(`MessageSamples`, message);
    });

    // Add boolean flags if provided
    if (requestBody.subscriber_opt_in !== undefined) {
      twilioRequestBody.append('SubscriberOptIn', requestBody.subscriber_opt_in.toString());
    }
    if (requestBody.age_gated !== undefined) {
      twilioRequestBody.append('AgeGated', requestBody.age_gated.toString());
    }
    if (requestBody.direct_lending !== undefined) {
      twilioRequestBody.append('DirectLending', requestBody.direct_lending.toString());
    }
    if (requestBody.affiliate_marketing !== undefined) {
      twilioRequestBody.append('AffiliateMarketing', requestBody.affiliate_marketing.toString());
    }
    if (requestBody.number_pooling !== undefined) {
      twilioRequestBody.append('NumberPooling', requestBody.number_pooling.toString());
    }

    console.log('🔄 Calling Twilio A2P Campaign API...');

    // Call Twilio A2P Campaign API
    const twilioResponse = await fetch(`https://messaging.twilio.com/v1/a2p/BrandRegistrations/${brand.twilio_brand_sid}/CampaignRegistrations`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioRequestBody,
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error(`❌ Twilio A2P Campaign creation failed: ${twilioResponse.status} ${twilioError}`);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: 'campaign_creation_failed',
        event_data: {
          brand_id: brand.id,
          campaign_id: requestBody.campaign_id,
          error: twilioError,
          status_code: twilioResponse.status,
          request_data: Object.fromEntries(twilioRequestBody)
        },
        created_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Twilio A2P Campaign creation failed',
          error: twilioError
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const twilioData: TwilioCampaignResponse = await twilioResponse.json();
    console.log(`✅ Twilio A2P Campaign created successfully. SID: ${twilioData.sid}`);

    // Save campaign to database
    const { data: savedCampaign, error: saveError } = await supabase
      .from('a2p_campaigns')
      .insert({
        tenant_id,
        brand_id: brand.id,
        twilio_campaign_sid: twilioData.sid,
        campaign_id: requestBody.campaign_id,
        description: requestBody.description,
        message_flow: requestBody.message_flow,
        help_message: requestBody.help_message,
        optout_keywords: requestBody.optout_keywords,
        optin_keywords: requestBody.optin_keywords,
        help_keywords: requestBody.help_keywords,
        subscriber_opt_in: requestBody.subscriber_opt_in,
        age_gated: requestBody.age_gated,
        direct_lending: requestBody.direct_lending,
        embedded_link: requestBody.embedded_link,
        embedded_phone: requestBody.embedded_phone,
        affiliate_marketing: requestBody.affiliate_marketing,
        number_pooling: requestBody.number_pooling,
        sample_messages: requestBody.sample_messages,
        campaign_use_case: campaignUseCase,
        status: twilioData.status,
        twilio_created_at: new Date(twilioData.date_created).toISOString(),
        twilio_updated_at: new Date(twilioData.date_updated).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving campaign to database:', saveError);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: 'campaign_db_save_failed',
        event_data: {
          brand_id: brand.id,
          twilio_campaign_sid: twilioData.sid,
          error: saveError.message
        },
        created_at: new Date().toISOString()
      });

      return new Response('Failed to save campaign to database', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Log successful campaign creation
    await supabase.from('a2p_compliance_events').insert({
      tenant_id,
      event_type: 'campaign_created',
      event_data: {
        brand_id: brand.id,
        campaign_id: savedCampaign.id,
        twilio_campaign_sid: twilioData.sid,
        campaign_use_case: campaignUseCase,
        status: twilioData.status
      },
      created_at: new Date().toISOString()
    });

    console.log('✅ A2P Campaign creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'A2P Campaign created successfully',
        campaign: savedCampaign,
        twilio_data: {
          sid: twilioData.sid,
          status: twilioData.status,
          campaign_use_case: twilioData.campaign_use_case,
          date_created: twilioData.date_created
        }
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('❗ Unexpected error in create-a2p-campaign:', err);
    return new Response('Unexpected server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});