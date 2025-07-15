// supabase/functions/create-a2p-brand/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CreateBrandRequest {
  company_name: string;
  company_type: 'CORPORATION' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'NON_PROFIT';
  ein?: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  email: string;
  website?: string;
  vertical: string;
  alt_business_id?: string;
  alt_business_id_type?: 'DUNS' | 'LEI' | 'GIIN';
}

interface TwilioBrandResponse {
  account_sid: string;
  sid: string;
  friendly_name: string;
  entity_type: string;
  status: string;
  brand_type: string;
  failure_reason?: string;
  date_created: string;
  date_updated: string;
  url: string;
  links: {
    brand_registrations: string;
  };
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

    console.log(`✅ Authenticated user ${user.id} for tenant ${tenant_id} with role ${role}`);

    // Parse request body
    let requestBody: CreateBrandRequest;
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
    const requiredFields = ['company_name', 'company_type', 'phone', 'street', 'city', 'state', 'postal_code', 'country', 'email', 'vertical'];
    const missingFields = requiredFields.filter(field => !requestBody[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return new Response(`Missing required fields: ${missingFields.join(', ')}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log('📋 Creating A2P Brand for:', requestBody.company_name);

    // Check if brand already exists for this tenant
    const { data: existingBrand, error: checkError } = await supabase
      .from('a2p_brands')
      .select('id, twilio_brand_sid, status')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing brand:', checkError);
      return new Response('Database error checking existing brand', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (existingBrand) {
      console.log('⚠️ Brand already exists for tenant:', existingBrand);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Brand already exists for this tenant',
          existing_brand: existingBrand
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

    // Prepare Twilio API request body
    const twilioRequestBody = new URLSearchParams({
      FriendlyName: requestBody.company_name,
      EntityType: requestBody.company_type,
      Phone: requestBody.phone,
      Street: requestBody.street,
      City: requestBody.city,
      State: requestBody.state,
      PostalCode: requestBody.postal_code,
      Country: requestBody.country,
      Email: requestBody.email,
      Vertical: requestBody.vertical,
      BrandType: 'STANDARD' // Default to STANDARD brand type
    });

    // Add optional fields if provided
    if (requestBody.ein) {
      twilioRequestBody.append('Ein', requestBody.ein);
    }
    if (requestBody.website) {
      twilioRequestBody.append('Website', requestBody.website);
    }
    if (requestBody.alt_business_id && requestBody.alt_business_id_type) {
      twilioRequestBody.append('AltBusinessId', requestBody.alt_business_id);
      twilioRequestBody.append('AltBusinessIdType', requestBody.alt_business_id_type);
    }

    console.log('🔄 Calling Twilio A2P Brand API...');

    // Call Twilio A2P Brand API
    const twilioResponse = await fetch(`https://messaging.twilio.com/v1/a2p/BrandRegistrations`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioRequestBody,
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error(`❌ Twilio A2P Brand creation failed: ${twilioResponse.status} ${twilioError}`);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: 'brand_creation_failed',
        event_data: {
          error: twilioError,
          status_code: twilioResponse.status,
          request_data: Object.fromEntries(twilioRequestBody)
        },
        created_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Twilio A2P Brand creation failed',
          error: twilioError
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const twilioData: TwilioBrandResponse = await twilioResponse.json();
    console.log(`✅ Twilio A2P Brand created successfully. SID: ${twilioData.sid}`);

    // Save brand to database
    const { data: savedBrand, error: saveError } = await supabase
      .from('a2p_brands')
      .insert({
        tenant_id,
        twilio_brand_sid: twilioData.sid,
        company_name: requestBody.company_name,
        company_type: requestBody.company_type,
        ein: requestBody.ein,
        phone: requestBody.phone,
        street: requestBody.street,
        city: requestBody.city,
        state: requestBody.state,
        postal_code: requestBody.postal_code,
        country: requestBody.country,
        email: requestBody.email,
        website: requestBody.website,
        vertical: requestBody.vertical,
        alt_business_id: requestBody.alt_business_id,
        alt_business_id_type: requestBody.alt_business_id_type,
        status: twilioData.status,
        brand_type: twilioData.brand_type,
        failure_reason: twilioData.failure_reason,
        twilio_created_at: new Date(twilioData.date_created).toISOString(),
        twilio_updated_at: new Date(twilioData.date_updated).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving brand to database:', saveError);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: 'brand_db_save_failed',
        event_data: {
          twilio_brand_sid: twilioData.sid,
          error: saveError.message
        },
        created_at: new Date().toISOString()
      });

      return new Response('Failed to save brand to database', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Log successful brand creation
    await supabase.from('a2p_compliance_events').insert({
      tenant_id,
      event_type: 'brand_created',
      event_data: {
        brand_id: savedBrand.id,
        twilio_brand_sid: twilioData.sid,
        company_name: requestBody.company_name,
        status: twilioData.status
      },
      created_at: new Date().toISOString()
    });

    console.log('✅ A2P Brand creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'A2P Brand created successfully',
        brand: savedBrand,
        twilio_data: {
          sid: twilioData.sid,
          status: twilioData.status,
          brand_type: twilioData.brand_type,
          date_created: twilioData.date_created
        }
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('❗ Unexpected error in create-a2p-brand:', err);
    return new Response('Unexpected server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});