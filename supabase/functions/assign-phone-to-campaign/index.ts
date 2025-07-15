// supabase/functions/assign-phone-to-campaign/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AssignPhoneRequest {
  phone_number_id: number;
  a2p_campaign_id: number;
  action: 'assign' | 'unassign';
}

interface TwilioPhoneAssignmentResponse {
  account_sid: string;
  phone_number_sid: string;
  campaign_sid: string;
  date_created: string;
  date_updated: string;
  url: string;
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
    let requestBody: AssignPhoneRequest;
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
    const requiredFields = ['phone_number_id', 'a2p_campaign_id', 'action'];
    const missingFields = requiredFields.filter(field => !requestBody[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return new Response(`Missing required fields: ${missingFields.join(', ')}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (!['assign', 'unassign'].includes(requestBody.action)) {
      console.error('❌ Invalid action:', requestBody.action);
      return new Response('Action must be "assign" or "unassign"', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`📱 ${requestBody.action === 'assign' ? 'Assigning' : 'Unassigning'} phone number ${requestBody.phone_number_id} ${requestBody.action === 'assign' ? 'to' : 'from'} campaign ${requestBody.a2p_campaign_id}`);

    // Get phone number details and verify ownership
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, twilio_sid, status, tenant_id')
      .eq('id', requestBody.phone_number_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (phoneError || !phoneNumber) {
      console.error('❌ Phone number not found or access denied:', phoneError);
      return new Response('Phone number not found or access denied', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    if (phoneNumber.status !== 'active') {
      console.error('❌ Phone number not active. Status:', phoneNumber.status);
      return new Response(`Phone number must be active. Current status: ${phoneNumber.status}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Get A2P campaign details and verify ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('a2p_campaigns')
      .select(`
        id, 
        campaign_id, 
        twilio_campaign_sid, 
        status, 
        tenant_id,
        a2p_brands!inner (
          id,
          twilio_brand_sid,
          status
        )
      `)
      .eq('id', requestBody.a2p_campaign_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ A2P campaign not found or access denied:', campaignError);
      return new Response('A2P campaign not found or access denied', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    if (campaign.status !== 'VERIFIED') {
      console.error('❌ A2P campaign not verified. Status:', campaign.status);
      return new Response(`A2P campaign must be verified before assigning phone numbers. Current status: ${campaign.status}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (campaign.a2p_brands.status !== 'VERIFIED') {
      console.error('❌ A2P brand not verified. Status:', campaign.a2p_brands.status);
      return new Response(`A2P brand must be verified. Current status: ${campaign.a2p_brands.status}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Check current assignment status
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('phone_number_campaigns')
      .select('id, phone_number_id, a2p_campaign_id, assigned_at')
      .eq('phone_number_id', requestBody.phone_number_id)
      .eq('a2p_campaign_id', requestBody.a2p_campaign_id)
      .maybeSingle();

    if (assignmentError) {
      console.error('❌ Error checking existing assignment:', assignmentError);
      return new Response('Database error checking assignment', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Handle assignment logic
    if (requestBody.action === 'assign') {
      if (existingAssignment) {
        console.log('⚠️ Phone number already assigned to this campaign');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Phone number already assigned to this campaign',
            assignment: existingAssignment
          }), 
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if phone number is assigned to any other A2P campaign
      const { data: otherAssignments, error: otherError } = await supabase
        .from('phone_number_campaigns')
        .select(`
          id, 
          a2p_campaign_id,
          a2p_campaigns!inner (
            campaign_id,
            twilio_campaign_sid
          )
        `)
        .eq('phone_number_id', requestBody.phone_number_id)
        .neq('a2p_campaign_id', requestBody.a2p_campaign_id);

      if (otherError) {
        console.error('❌ Error checking other assignments:', otherError);
        return new Response('Database error checking other assignments', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      if (otherAssignments && otherAssignments.length > 0) {
        console.error('❌ Phone number already assigned to another A2P campaign:', otherAssignments[0].a2p_campaigns.campaign_id);
        return new Response(`Phone number is already assigned to A2P campaign: ${otherAssignments[0].a2p_campaigns.campaign_id}. Please unassign it first.`, { 
          status: 409,
          headers: corsHeaders 
        });
      }
    } else {
      // Unassign action
      if (!existingAssignment) {
        console.log('⚠️ Phone number not assigned to this campaign');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Phone number not assigned to this campaign',
            assignment: null
          }), 
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
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

    const authHeader = `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`;

    // Perform Twilio API operation
    let twilioResponse;
    let twilioData: TwilioPhoneAssignmentResponse | null = null;

    if (requestBody.action === 'assign') {
      console.log('🔄 Assigning phone number to campaign in Twilio...');
      
      twilioResponse = await fetch(
        `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${campaign.a2p_brands.twilio_brand_sid}/CampaignRegistrations/${campaign.twilio_campaign_sid}/PhoneNumbers`, 
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            PhoneNumberSid: phoneNumber.twilio_sid
          }),
        }
      );
    } else {
      console.log('🔄 Unassigning phone number from campaign in Twilio...');
      
      twilioResponse = await fetch(
        `https://messaging.twilio.com/v1/a2p/BrandRegistrations/${campaign.a2p_brands.twilio_brand_sid}/CampaignRegistrations/${campaign.twilio_campaign_sid}/PhoneNumbers/${phoneNumber.twilio_sid}`, 
        {
          method: "DELETE",
          headers: {
            "Authorization": authHeader,
          },
        }
      );
    }

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error(`❌ Twilio phone ${requestBody.action} failed: ${twilioResponse.status} ${twilioError}`);
      
      // Log the compliance event
      await supabase.from('a2p_compliance_events').insert({
        tenant_id,
        event_type: `phone_${requestBody.action}_failed`,
        event_data: {
          phone_number_id: phoneNumber.id,
          a2p_campaign_id: campaign.id,
          twilio_phone_sid: phoneNumber.twilio_sid,
          twilio_campaign_sid: campaign.twilio_campaign_sid,
          error: twilioError,
          status_code: twilioResponse.status
        },
        created_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: `Twilio phone ${requestBody.action} failed`,
          error: twilioError
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestBody.action === 'assign') {
      twilioData = await twilioResponse.json();
      console.log(`✅ Phone number assigned to campaign in Twilio`);
    } else {
      console.log(`✅ Phone number unassigned from campaign in Twilio`);
    }

    // Update database
    let dbResult;
    if (requestBody.action === 'assign') {
      const { data: newAssignment, error: insertError } = await supabase
        .from('phone_number_campaigns')
        .insert({
          phone_number_id: phoneNumber.id,
          a2p_campaign_id: campaign.id,
          assigned_at: new Date().toISOString(),
          assigned_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error saving assignment to database:', insertError);
        
        // Log the compliance event
        await supabase.from('a2p_compliance_events').insert({
          tenant_id,
          event_type: 'phone_assign_db_save_failed',
          event_data: {
            phone_number_id: phoneNumber.id,
            a2p_campaign_id: campaign.id,
            error: insertError.message
          },
          created_at: new Date().toISOString()
        });

        return new Response('Failed to save assignment to database', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      dbResult = newAssignment;
    } else {
      const { error: deleteError } = await supabase
        .from('phone_number_campaigns')
        .delete()
        .eq('id', existingAssignment!.id);

      if (deleteError) {
        console.error('❌ Error removing assignment from database:', deleteError);
        
        // Log the compliance event
        await supabase.from('a2p_compliance_events').insert({
          tenant_id,
          event_type: 'phone_unassign_db_failed',
          event_data: {
            phone_number_id: phoneNumber.id,
            a2p_campaign_id: campaign.id,
            error: deleteError.message
          },
          created_at: new Date().toISOString()
        });

        return new Response('Failed to remove assignment from database', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      dbResult = null;
    }

    // Log successful operation
    await supabase.from('a2p_compliance_events').insert({
      tenant_id,
      event_type: `phone_${requestBody.action}_success`,
      event_data: {
        phone_number_id: phoneNumber.id,
        phone_number: phoneNumber.phone_number,
        a2p_campaign_id: campaign.id,
        campaign_id: campaign.campaign_id,
        twilio_phone_sid: phoneNumber.twilio_sid,
        twilio_campaign_sid: campaign.twilio_campaign_sid,
        user_id: user.id
      },
      created_at: new Date().toISOString()
    });

    console.log(`✅ Phone number ${requestBody.action} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phone number ${requestBody.action}ed successfully`,
        assignment: dbResult,
        phone_number: {
          id: phoneNumber.id,
          phone_number: phoneNumber.phone_number
        },
        campaign: {
          id: campaign.id,
          campaign_id: campaign.campaign_id
        },
        twilio_data: twilioData
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('❗ Unexpected error in assign-phone-to-campaign:', err);
    return new Response('Unexpected server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});