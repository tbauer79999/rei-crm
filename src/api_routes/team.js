// src/api_routes/team.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// GET /api/team/stats - Get team statistics
router.get('/stats', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  
  try {
    console.log('=== TEAM STATS ENDPOINT ===');
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Try to use the database function first
    try {
      const { data: stats, error } = await supabase
        .rpc('get_team_stats', { tenant_uuid: tenant_id });

      if (!error && stats) {
        console.log('Team stats from function:', stats);
        return res.json(stats);
      }

      console.log('Function failed or returned null, falling back to manual calculation:', error);
    } catch (funcError) {
      console.log('Function call failed, calculating manually:', funcError.message);
    }

    // Fallback: Calculate stats manually if function doesn't exist
    console.log('Calculating team stats manually...');

    // Get total members
    const { data: members, error: membersError } = await supabase
      .from('users_profile')
      .select('id, role')
      .eq('tenant_id', tenant_id)
      .neq('role', 'global_admin');

    if (membersError) {
      console.error('Error fetching members for stats:', membersError);
      throw membersError;
    }

    // Get pending invitations
    const { data: invites, error: invitesError } = await supabase
      .from('invitations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('status', 'pending');

    // Don't fail if invitations table doesn't exist
    const pendingInvites = invitesError ? 0 : (invites?.length || 0);

    const stats = {
      totalMembers: members?.length || 0,
      activeUsers: members?.length || 0, // All members are considered active for now
      pendingInvites: pendingInvites,
      lastWeekLogins: 0 // TODO: Implement login tracking
    };

    console.log('Manually calculated team stats:', stats);
    res.json(stats);

  } catch (err) {
    console.error('Team stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team statistics' });
  }
});

// GET /api/team/members - Get all team members
router.get('/members', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  
  try {
    console.log('=== TEAM MEMBERS ENDPOINT ===');
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('users_profile')
      .select(`
  id,
  email,
  role,
  created_at,
  tenant_id,
  is_active
`)
      .neq('role', 'global_admin'); // Don't show global admins

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: members, error: membersError } = await query
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      throw membersError;
    }

    // Transform data to match frontend expectations
    const transformedMembers = members.map(member => ({
      id: member.id, // This should be the actual user ID from users_profile.id
      name: member.email.split('@')[0], // Extract name from email
      email: member.email,
      role: member.role,
      status: 'active', // You can enhance this with actual activity tracking
      lastLogin: null, // Add when you track login times
      invitedBy: 'Admin',
      joinedDate: member.created_at,
      leadsHandled: 0, // TODO: Calculate from leads table
      conversions: 0,   // TODO: Calculate from conversions
      tenant_id: member.tenant_id // Keep this separate from the user ID
    }));

    console.log('Found team members:', transformedMembers.length);
    console.log('Sample member data:', transformedMembers[0]); // Debug the first member
    res.json(transformedMembers);

  } catch (err) {
    console.error('Team members error:', err.message);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /api/team/invitations - Get pending invitations
router.get('/invitations', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  
  try {
    console.log('=== PENDING INVITATIONS ENDPOINT ===');
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // First, let's check if the invitations table exists and what columns it has
    console.log('Querying invitations table...');

    // Try simplified query first to avoid foreign key issues
    let query = supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        expires_at,
        invited_by
      `)
      .eq('status', 'pending');

    // Apply tenant filtering - need to determine if it's tenant_id or business_id
    if (role !== 'global_admin') {
      // First try with tenant_id (matching users_profile)
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: invitations, error: invitationsError } = await query
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations with tenant_id:', invitationsError);
      console.error('Error details:', JSON.stringify(invitationsError, null, 2));
      
      // If tenant_id doesn't work, try business_id
      if (invitationsError.message?.includes('column') || invitationsError.code === '42703') {
        console.log('Trying with business_id instead of tenant_id...');
        
        let retryQuery = supabase
          .from('invitations')
          .select(`
            id,
            email,
            role,
            status,
            created_at,
            expires_at,
            invited_by
          `)
          .eq('status', 'pending');

        if (role !== 'global_admin') {
          retryQuery = retryQuery.eq('business_id', tenant_id);
        }

        const { data: retryInvitations, error: retryError } = await retryQuery
          .order('created_at', { ascending: false });

        if (retryError) {
          console.error('Retry with business_id also failed:', retryError);
          // Return empty array instead of failing completely
          console.log('Returning empty invitations array due to errors');
          return res.json([]);
        }

        // Use retry results
        const transformedInvitations = (retryInvitations || []).map(invite => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          invitedDate: invite.created_at,
          expiresDate: invite.expires_at,
          invitedBy: 'Admin' // Simplified since we removed the problematic join
        }));

        console.log('Found pending invitations (with business_id):', transformedInvitations.length);
        return res.json(transformedInvitations);
      }
      
      // If it's not a column error, return empty array to prevent 500 error
      console.log('Returning empty invitations array due to other error');
      return res.json([]);
    }

    // Try to get inviter information separately to avoid join issues
    const transformedInvitations = (invitations || []).map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invitedDate: invite.created_at,
      expiresDate: invite.expires_at,
      invitedBy: 'Admin' // Simplified - avoid the problematic foreign key lookup for now
    }));

    console.log('Found pending invitations:', transformedInvitations.length);
    res.json(transformedInvitations);

  } catch (err) {
    console.error('Pending invitations error:', err.message);
    console.error('Full error:', err);
    // Return empty array instead of 500 error to prevent frontend from breaking
    res.json([]);
  }
});

// POST /api/team/invite - Send invitation
router.post('/invite', async (req, res) => {
  const { role, tenant_id, id: user_id } = req.user || {};
  const { email, role: inviteRole = 'user' } = req.body; // Fixed: use 'role' from body instead of 'inviteRole'
  
  try {
    console.log('=== SEND INVITATION ENDPOINT ===');
    console.log('Inviting:', email, 'as role:', inviteRole);
    console.log('User tenant_id:', tenant_id);

    // Security checks
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    if (!['business_admin', 'global_admin'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to send invitations' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if invitation already exists - try both field names
    let existingInvite;
    try {
      const { data: tenantIdCheck } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', tenant_id)
        .eq('status', 'pending')
        .single();
      existingInvite = tenantIdCheck;
    } catch (err) {
      // Try with business_id instead
      try {
        const { data: businessIdCheck } = await supabase
          .from('invitations')
          .select('id')
          .eq('email', email)
          .eq('business_id', tenant_id)
          .eq('status', 'pending')
          .single();
        existingInvite = businessIdCheck;
      } catch (err2) {
        // Neither field exists or other error - continue
      }
    }

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users_profile')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists in your organization' });
    }

    // Create invitation record with proper expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Try to create invitation with tenant_id first
    let invitation;
    try {
      const { data: newInvitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email,
          tenant_id: tenant_id,
          invited_by: user_id,
          role: inviteRole,
          status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (inviteError) throw inviteError;
      invitation = newInvitation;
    } catch (err) {
      console.log('tenant_id failed, trying business_id:', err.message);
      
      // Try with business_id instead
      const { data: retryInvitation, error: retryError } = await supabase
        .from('invitations')
        .insert({
          email,
          business_id: tenant_id,
          invited_by: user_id,
          role: inviteRole,
          status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (retryError) {
        console.error('Both tenant_id and business_id failed:', retryError);
        throw retryError;
      }
      
      invitation = retryInvitation;
    }

// Send invitation link (replace the entire try/catch block)
// Send Supabase Auth invitation
try {
  console.log('🚀 Sending Supabase Auth invitation...');
  console.log('Email:', email);
  console.log('Invitation ID:', invitation.id);

const invitationRedirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invitation_id=${invitation.id}&tenant_id=${tenant_id}&role=${inviteRole}&email=${encodeURIComponent(email)}`;

  console.log('✅ Invitation link created:', invitationRedirectUrl);
  console.log('📧 Also sending email via Supabase Auth');

  // Send actual email via Supabase Auth
  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: invitationRedirectUrl,
  data: {
    invitation_id: invitation.id,
    tenant_id: tenant_id,
    role: inviteRole,
    invited_signup: true,
    skip_onboarding: true
  }
});

  if (authError) {
    console.error('Auth invitation failed:', authError);
    throw authError;
  } else {
    console.log('✅ Auth invitation email sent successfully');
  }
} catch (authErr) {
  console.error('Auth invitation error:', authErr);
  return res.status(500).json({ error: 'Failed to send invitation email: ' + authErr.message });
}

    console.log('Invitation created successfully:', invitation.id);
    res.json({ 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role
      }
    });

  } catch (err) {
    console.error('Send invitation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send invitation' });
  }
});

// POST /api/team/invitations/:invitationId/resend - Resend invitation
router.post('/invitations/:invitationId/resend', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  const { invitationId } = req.params;
  
  try {
    console.log('=== RESEND INVITATION ENDPOINT ===');
    console.log('Resending invitation:', invitationId);

    // Security check
    if (!['business_admin', 'global_admin'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get invitation details - try both field names
    let invitation;
    try {
      let query = supabase
        .from('invitations')
        .select('email, tenant_id, role')
        .eq('id', invitationId)
        .eq('status', 'pending');

      if (role !== 'global_admin') {
        query = query.eq('tenant_id', tenant_id);
      }

      const { data: tenantIdResult, error: fetchError } = await query.single();
      
      if (fetchError) throw fetchError;
      invitation = tenantIdResult;
    } catch (err) {
      console.log('tenant_id failed, trying business_id for resend');
      
      // Try with business_id
      let query = supabase
        .from('invitations')
        .select('email, business_id, role')
        .eq('id', invitationId)
        .eq('status', 'pending');

      if (role !== 'global_admin') {
        query = query.eq('business_id', tenant_id);
      }

      const { data: businessIdResult, error: retryError } = await query.single();
      
      if (retryError || !businessIdResult) {
        return res.status(404).json({ error: 'Invitation not found' });
      }
      
      invitation = businessIdResult;
    }

    // Update invitation expiry
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('invitations')
      .update({
        expires_at: newExpiresAt
      })
      .eq('id', invitationId);

    // Optional: Resend Supabase Auth invitation
    try {
      const { error: authError } = await supabase.auth.admin.inviteUserByEmail(invitation.email, {
        data: {
          invitation_id: invitationId,
          tenant_id: invitation.tenant_id || invitation.business_id,
          role: invitation.role
        }
      });

      if (authError) {
        console.warn('Auth resend failed:', authError);
      }
    } catch (authErr) {
      console.warn('Auth resend error (continuing anyway):', authErr);
    }

    console.log('Invitation resent successfully');
    res.json({ success: true, message: 'Invitation resent successfully' });

  } catch (err) {
    console.error('Resend invitation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to resend invitation' });
  }
});

// Legacy route for backward compatibility
router.post('/resend/:invitationId', async (req, res) => {
  // Redirect to new endpoint
  req.url = `/invitations/${req.params.invitationId}/resend`;
  return router.handle(req, res);
});

// DELETE /api/team/invitations/:invitationId - Cancel invitation
router.delete('/invitations/:invitationId', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  const { invitationId } = req.params;
  
  try {
    console.log('=== CANCEL INVITATION ENDPOINT ===');
    console.log('Canceling invitation:', invitationId);

    // Security check
    if (!['business_admin', 'global_admin'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Try to cancel with tenant_id first
    let cancelResult;
    try {
      let query = supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (role !== 'global_admin') {
        query = query.eq('tenant_id', tenant_id);
      }

      const { error } = await query;
      
      if (error) throw error;
      cancelResult = true;
    } catch (err) {
      console.log('tenant_id failed, trying business_id for cancel');
      
      // Try with business_id
      let query = supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (role !== 'global_admin') {
        query = query.eq('business_id', tenant_id);
      }

      const { error: retryError } = await query;
      
      if (retryError) {
        console.error('Both tenant_id and business_id failed for cancel:', retryError);
        throw retryError;
      }
      
      cancelResult = true;
    }

    console.log('Invitation canceled successfully');
    res.json({ success: true, message: 'Invitation canceled successfully' });

  } catch (err) {
    console.error('Cancel invitation error:', err.message);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// Legacy route for backward compatibility
router.delete('/invite/:invitationId', async (req, res) => {
  // Redirect to new endpoint
  req.url = `/invitations/${req.params.invitationId}`;
  return router.handle(req, res);
});

// PATCH /api/team/members/:userId/toggle-status - Toggle user active/inactive status
router.patch('/members/:userId/toggle-status', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  const { userId } = req.params;
  
  try {
    console.log('=== TOGGLE USER STATUS ENDPOINT ===');
    console.log('Toggling status for user:', userId);
    console.log('User tenant_id:', tenant_id);
    console.log('User role:', role);

    // Security check
    if (!['business_admin', 'global_admin'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get current user status - make sure we're querying the right user
    let query = supabase
      .from('users_profile')
      .select('is_active, email')
      .eq('id', userId);

    // Apply tenant filtering unless global admin
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: currentUser, error: fetchError } = await query.single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      
      if (fetchError.code === '42703') {
        return res.status(500).json({ error: 'Database schema error: is_active column missing. Please add it.' });
      }
      
      return res.status(404).json({ error: 'User not found or no permission to access' });
    }

    console.log('Current user data:', currentUser);

    // Toggle the status
    const newStatus = !currentUser.is_active;
    console.log('Changing status from', currentUser.is_active, 'to', newStatus);
    
    let updateQuery = supabase
      .from('users_profile')
      .update({ is_active: newStatus })
      .eq('id', userId);

    // Apply tenant filtering unless global admin
    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('Error updating user status:', updateError);
      throw updateError;
    }

    console.log('User status toggled successfully');
    res.json({ 
      success: true, 
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });

  } catch (err) {
    console.error('Toggle user status error:', err.message);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Legacy route for backward compatibility
router.post('/toggle-status/:userId', async (req, res) => {
  // Redirect to new endpoint
  req.method = 'PATCH';
  req.url = `/members/${req.params.userId}/toggle-status`;
  return router.handle(req, res);
});

module.exports = router;