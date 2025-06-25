// supabase/functions/phone_numbers/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateAndAuthorize } from "../_shared/authUtils.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Authenticate and get user info
    const authResult = await authenticateAndAuthorize(req);
    
    if (authResult.error || !authResult.user) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Authentication failed" }),
        { 
          status: authResult.status || 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { user, tenant_id } = authResult;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "No tenant access configured" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get action from request body
    let body;
    let action;
    
    try {
      body = await req.json();
      action = body.action;
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return badRequest("Invalid request body");
    }

    if (!action) {
      return badRequest("Action is required");
    }

    console.log(`📱 Phone numbers action: ${action} for tenant: ${tenant_id}`);

    switch (action) {
      case 'popular-area-codes':
        return await getPopularAreaCodes();

      case 'search':
        const areaCode = body.areaCode;
        if (!areaCode) {
          return badRequest("Area code required");
        }
        return await searchPhoneNumbers(areaCode);

      case 'purchase':
        return await purchasePhoneNumber(
          body.phoneNumber,
          user.id,
          tenant_id,
          supabase
        );

      case 'list':
        return await listPhoneNumbers(tenant_id, supabase);

      case 'assign':
        return await assignPhoneNumber(
          body.phoneId,
          body.userId,
          tenant_id,
          supabase
        );

      case 'unassign':
        return await unassignPhoneNumber(
          body.phoneId,
          tenant_id,
          supabase
        );

      case 'release':
        return await releasePhoneNumber(
          body.phoneId,
          tenant_id,
          supabase
        );

      default:
        return notFound(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Edge function error:', error);
    return serverError(error.message || "Internal server error");
  }
});

// Helper response functions
function methodNotAllowed() {
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

function badRequest(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

function notFound(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

function serverError(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getPopularAreaCodes() {
  const popularAreaCodes = [
    { code: '212', city: 'New York, NY', available: true },
    { code: '213', city: 'Los Angeles, CA', available: true },
    { code: '312', city: 'Chicago, IL', available: true },
    { code: '415', city: 'San Francisco, CA', available: true },
    { code: '713', city: 'Houston, TX', available: true },
    { code: '305', city: 'Miami, FL', available: true },
    { code: '404', city: 'Atlanta, GA', available: true },
    { code: '206', city: 'Seattle, WA', available: true },
    { code: '617', city: 'Boston, MA', available: true },
    { code: '480', city: 'Phoenix, AZ', available: true },
  ];

  return new Response(
    JSON.stringify({ areaCodes: popularAreaCodes }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function searchPhoneNumbers(areaCode: string) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!twilioSid || !twilioToken) {
    throw new Error("Twilio credentials not configured");
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&SmsEnabled=true&VoiceEnabled=true&Limit=20`,
      {
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio search error:', error);
      throw new Error("Failed to search phone numbers");
    }

    const data = await response.json();
    
    const formattedNumbers = data.available_phone_numbers.map((number: any) => ({
      phoneNumber: number.phone_number,
      friendlyName: number.friendly_name,
      locality: number.locality,
      region: number.region,
      postalCode: number.postal_code,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.SMS,
        mms: number.capabilities.MMS,
      },
      cost: '$1.15/mo',
    }));

    return new Response(
      JSON.stringify({ availableNumbers: formattedNumbers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

async function purchasePhoneNumber(
  phoneNumber: string, 
  userId: string, 
  tenantId: string,
  supabase: any
) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!twilioSid || !twilioToken) {
    throw new Error("Twilio credentials not configured");
  }

  try {
    console.log(`📱 Purchasing phone number ${phoneNumber} for tenant ${tenantId}`);

    // Purchase from Twilio
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          PhoneNumber: phoneNumber,
          VoiceUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle_voice`,
          VoiceMethod: "POST",
          SmsUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle_sms`,
          SmsMethod: "POST",
        }),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio purchase error:', error);
      throw new Error("Failed to purchase phone number from Twilio");
    }

    const twilioData = await twilioResponse.json();

    // Save to database
    const { data: phoneRecord, error: dbError } = await supabase
      .from('phone_numbers')
      .insert({
        phone_number: twilioData.phone_number,
        twilio_sid: twilioData.sid,
        tenant_id: tenantId,
        user_id: null, // Not assigned to specific user yet
        status: 'active',
        capabilities: {
          voice: twilioData.capabilities.voice,
          sms: twilioData.capabilities.sms,
          mms: twilioData.capabilities.mms,
        },
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // TODO: Should release the number from Twilio if DB save fails
      throw new Error("Failed to save phone number to database");
    }

    console.log(`✅ Successfully purchased ${phoneNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        phoneNumber: phoneRecord 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Purchase error:', error);
    throw error;
  }
}

async function listPhoneNumbers(tenantId: string, supabase: any) {
  try {
    console.log(`📋 Listing phone numbers for tenant: ${tenantId}`);
    
    // First, try a simple query without joins
    const { data: numbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      throw new Error(`Failed to load phone numbers: ${error.message}`);
    }

    console.log(`✅ Found ${numbers?.length || 0} phone numbers`);

    // If we have numbers with user_ids, fetch the user profiles separately
    const userIds = [...new Set(numbers?.filter(n => n.user_id).map(n => n.user_id))];
    let userProfiles = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('users_profile')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (!profileError && profiles) {
        profiles.forEach(p => {
          userProfiles[p.id] = p;
        });
      }
    }

    // Format the response to match frontend expectations
    const formattedNumbers = numbers?.map((num: any) => ({
      ...num,
      profiles: num.user_id && userProfiles[num.user_id] ? {
        id: userProfiles[num.user_id].id,
        email: userProfiles[num.user_id].email,
        full_name: `${userProfiles[num.user_id].first_name || ''} ${userProfiles[num.user_id].last_name || ''}`.trim()
      } : null
    })) || [];

    return new Response(
      JSON.stringify({ phoneNumbers: formattedNumbers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('listPhoneNumbers error:', error);
    throw error;
  }
}

async function assignPhoneNumber(
  phoneId: number,
  userId: string | null,
  tenantId: string,
  supabase: any
) {
  const { error } = await supabase
    .from('phone_numbers')
    .update({ 
      user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', phoneId)
    .eq('tenant_id', tenantId); // Ensure tenant isolation

  if (error) {
    throw new Error("Failed to assign phone number");
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function unassignPhoneNumber(
  phoneId: number,
  tenantId: string,
  supabase: any
) {
  return assignPhoneNumber(phoneId, null, tenantId, supabase);
}

async function releasePhoneNumber(
  phoneId: number,
  tenantId: string,
  supabase: any
) {
  // Get phone number details
  const { data: phoneNumber, error: fetchError } = await supabase
    .from('phone_numbers')
    .select('twilio_sid')
    .eq('id', phoneId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !phoneNumber) {
    throw new Error("Phone number not found");
  }

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!twilioSid || !twilioToken) {
    throw new Error("Twilio credentials not configured");
  }

  // Release from Twilio
  const twilioResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${phoneNumber.twilio_sid}.json`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
      },
    }
  );

  if (!twilioResponse.ok && twilioResponse.status !== 404) {
    const error = await twilioResponse.text();
    console.error('Twilio release error:', error);
    throw new Error("Failed to release phone number from Twilio");
  }

  // Update database
  const { error: updateError } = await supabase
    .from('phone_numbers')
    .update({ 
      status: 'released',
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', phoneId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    throw new Error("Failed to update phone number status");
  }

  return new Response(
    JSON.stringify({ success: true }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}