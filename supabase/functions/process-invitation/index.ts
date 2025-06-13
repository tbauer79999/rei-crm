// supabase/functions/process-invitation/index.ts - FIXED to match your schema
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ProcessInvitationRequest {
  user_id: string;
  email: string;
  invitation_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Parse request body
    const { user_id, email, invitation_id }: ProcessInvitationRequest = await req.json();

    // Validate required fields
    if (!user_id || !email || !invitation_id) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: user_id, email, invitation_id" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎯 Processing invitation for user ${email} with invitation ${invitation_id}`);

    // Step 1: Validate invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", invitation_id)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      console.error("❌ Invalid or expired invitation:", invitationError?.message);
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired invitation",
          details: invitationError?.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Valid invitation found for tenant ${invitation.tenant_id} with role ${invitation.role}`);

    // Step 2: Create or update user profile
    const { data: existingProfile } = await supabase
      .from("users_profile")
      .select("id")
      .eq("id", user_id)
      .single();

    if (existingProfile) {
      // Update existing profile - FIXED: removed updated_at field
      console.log(`📝 Updating existing profile for user ${user_id}`);
      
      const { error: updateError } = await supabase
        .from("users_profile")
        .update({
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          invited_by_invitation_id: invitation_id,
          is_active: true
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("❌ Error updating user profile:", updateError);
        throw updateError;
      }
    } else {
      // Create new profile
      console.log(`✨ Creating new profile for user ${user_id}`);
      
      const { error: insertError } = await supabase
        .from("users_profile")
        .insert({
          id: user_id,
          email: email,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          invited_by_invitation_id: invitation_id,
          is_active: true
        });

      if (insertError) {
        console.error("❌ Error creating user profile:", insertError);
        throw insertError;
      }
    }

    // Step 3: Mark invitation as accepted
    const { error: invitationUpdateError } = await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user_id
      })
      .eq("id", invitation_id);

    if (invitationUpdateError) {
      console.error("❌ Error updating invitation status:", invitationUpdateError);
      throw invitationUpdateError;
    }

    console.log(`🎉 Successfully processed invitation for ${email} - Role: ${invitation.role}, Tenant: ${invitation.tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation processed successfully",
        user_profile: {
          user_id,
          email,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          invitation_id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("❗ Unexpected error processing invitation:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});