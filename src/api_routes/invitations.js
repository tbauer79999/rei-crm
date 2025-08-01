const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Regular Supabase client for non-admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

// Send invitation endpoint
router.post('/invite', async (req, res) => {
  console.log('Invitation endpoint hit');
  console.log('Request body:', req.body);
  
  const { email, role, teamId, invitedBy } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Check if invitation already exists using admin client
    const { data: existingInvite } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record using admin client to bypass RLS
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        token,
        role: role || 'user',
        tenant_id: teamId,  // Changed from team_id to tenant_id
        invited_by: invitedBy,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // Send invitation email (you'll need to implement this with your email service)
    const invitationLink = `${process.env.FRONTEND_URL}/invitation-signup?token=${token}&email=${encodeURIComponent(email)}`;
    
    // TODO: Send email with invitationLink
    console.log('Invitation link:', invitationLink);

    return res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      invitationId: invitation.id
    });

  } catch (error) {
    console.error('Send invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invitation endpoint
router.post('/accept', async (req, res) => {
  const { invitationToken, email, password, firstName, lastName } = req.body;

  try {
    // Verify the invitation token using admin client
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', invitationToken)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update invitation status to expired using admin client
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Create the user with admin privileges to bypass email verification
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // This bypasses email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        invited: true,
        invitation_id: invitation.id,
        role: invitation.role || 'user',
        onboarding_completed: true,
        invited_by: invitation.invited_by,
        tenant_id: invitation.tenant_id  // Changed from team_id to tenant_id
      }
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return res.status(400).json({ error: 'Failed to create user account: ' + signUpError.message });
    }

    const user = authData.user;

    // Update invitation status to 'accepted' using admin client
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.id  // Changed from user_id to accepted_by_user_id
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation status:', updateError);
    }

    // Create user profile in your custom tables using admin client
    const { error: profileError } = await supabaseAdmin
      .from('users_profile')  // Changed from users_profiles to users_profile
      .insert({
        id: user.id,
        email: user.email,
        role: invitation.role || 'user',
        tenant_id: invitation.tenant_id,  // Changed from team_id to tenant_id
        invited_by_invitation_id: invitation.id,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Don't fail the whole process if profile creation fails
    }

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (signInError) {
      // User was created but couldn't sign in automatically
      return res.status(200).json({ 
        success: true, 
        message: 'Account created successfully. Please log in.',
        requiresLogin: true
      });
    }

    return res.status(200).json({
      success: true,
      user: user,
      session: signInData.session,
      message: 'Registration completed successfully'
    });

  } catch (error) {
    console.error('Invitation acceptance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation details endpoint
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Use admin client to bypass RLS
    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('email, role, status, expires_at')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation is ${invitation.status}` });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    return res.status(200).json({
      valid: true,
      email: invitation.email,
      role: invitation.role
    });

  } catch (error) {
    console.error('Verify invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend invitation endpoint
router.post('/:id/resend', async (req, res) => {
  const { id } = req.params;

  try {
    // Generate new token and expiry
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation with admin client
    const { data, error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (updateError || !data || data.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = data[0];
    const invitationLink = `${process.env.FRONTEND_URL}/invitation-signup?token=${newToken}&email=${encodeURIComponent(invitation.email)}`;
    
    console.log('Resending invitation link:', invitationLink);

    return res.status(200).json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Resend invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel/Delete invitation endpoint
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Debug environment and client
  console.log('🔍 Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('🔍 Service role key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));
  console.log('🔍 Supabase URL:', process.env.SUPABASE_URL);
  
  try {
    // Test if admin client works at all
    const { data: testData, error: testError } = await supabaseAdmin
      .from('invitations')
      .select('id, email, status')
      .limit(3);
    
    console.log('🔍 Admin client test - found invitations:', testData?.length || 0);
    console.log('🔍 Admin client test error:', testError);
    
    if (testData && testData.length > 0) {
      console.log('🔍 Sample invitation IDs:', testData.map(inv => inv.id));
      console.log('🔍 Looking for ID:', id);
      console.log('🔍 ID match found:', testData.some(inv => inv.id === id));
    }
    
    // Original delete logic
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', id)
      .select();

    console.log('🔍 Delete result - data:', data);
    console.log('🔍 Delete result - error:', error);

    if (error) {
      console.error('Error deleting invitation:', error);
      return res.status(500).json({ error: 'Failed to cancel invitation' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invitation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all invitations (for displaying in the UI)
router.get('/', async (req, res) => {
  try {
    // Get the user's tenant_id from their profile
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    // Decode the JWT to get user ID
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's profile to find their tenant_id
    const { data: profile } = await supabaseAdmin
      .from('users_profile')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    // Fetch all pending invitations for this tenant
    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    // Format the invitations for the frontend
    const formattedInvitations = invitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invitedDate: invite.created_at,
      expiresDate: invite.expires_at
    }));

    return res.status(200).json(formattedInvitations);

  } catch (error) {
    console.error('Get invitations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate secure invitation token
function generateInvitationToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

module.exports = router;