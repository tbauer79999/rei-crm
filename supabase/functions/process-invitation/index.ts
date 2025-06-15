// supabase/functions/process-invitation/index.ts - FIXED: Can lookup by email
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ProcessInvitationRequest {
  user_id: string;
  email: string;
  invitation_id?: string; // Made optional - can lookup by email
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
    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: user_id, email" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎯 Processing invitation for user ${email}`);

    // Step 1: Find invitation by ID or email
    let invitation;
    
    if (invitation_id) {
      // Try to find by ID first
      const { data: invById, error: invByIdError } = await supabase
        .from("invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("email", email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!invByIdError && invById) {
        invitation = invById;
        console.log("✅ Found invitation by ID");
      }
    }
    
    // If not found by ID, try by email (this is the fallback for when ID is lost)
    if (!invitation) {
      const { data: invByEmail, error: invByEmailError } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!invByEmailError && invByEmail) {
        invitation = invByEmail;
        console.log("✅ Found invitation by email");
      }
    }

    if (!invitation) {
      console.error("❌ No valid invitation found for email:", email);
      return new Response(
        JSON.stringify({ 
          error: "No valid invitation found for this email address",
          details: "The invitation may have expired or already been used" 
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
      // Update existing profile
      console.log(`📝 Updating existing profile for user ${user_id}`);
      
      const { error: updateError } = await supabase
        .from("users_profile")
        .update({
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          invited_by_invitation_id: invitation.id,
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
          invited_by_invitation_id: invitation.id,
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
      .eq("id", invitation.id);

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
          invitation_id: invitation.id
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