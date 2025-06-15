// src/api_routes/team.js - FIXED: No inviteUserByEmail, just returns signup URL
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
      status: member.is_active !== false ? 'active' : 'inactive', // Default to active if not set
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

    console.log('Querying invitations table...');

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

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: invitations, error: invitationsError } = await query
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      console.error('Error details:', JSON.stringify(invitationsError, null, 2));
      
      // Return empty array instead of failing completely
      console.log('Returning empty invitations array due to errors');
      return res.json([]);
    }

    // Transform invitations to match frontend expectations
    const transformedInvitations = (invitations || []).map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invitedDate: invite.created_at,
      expiresDate: invite.expires_at,
      invitedBy: 'Admin' // Simplified since we removed the problematic join
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

// POST /api/team/invite - Send invitation (NO SUPABASE EMAIL)
router.post('/invite', async (req, res) => {
  const { role, tenant_id, id: user_id } = req.user || {};
  const { email, role: inviteRole = 'user' } = req.body;
  
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

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .eq('status', 'pending')
      .single();

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
    
    // Generate a random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email,
        tenant_id: tenant_id,
        invited_by: user_id,
        role: inviteRole,
        status: 'pending',
        expires_at: expiresAt,
        token: token
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invitation:', inviteError);
      throw inviteError;
    }

    // Build the signup URL
    const signupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invitation_email=${encodeURIComponent(email)}`;

    // Don't use Supabase's inviteUserByEmail - just return the signup URL
    console.log('✅ Invitation created successfully');
    console.log('📧 Signup link for user:', signupUrl);

    // Return success with the signup URL
    res.json({ 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role
      },
      signupUrl: signupUrl,
      message: `Invitation created. Send this link to ${email}: ${signupUrl}`
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

    // Get invitation details
    let query = supabase
      .from('invitations')
      .select('email, tenant_id, role')
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: invitation, error: fetchError } = await query.single();
    
    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Update invitation expiry
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('invitations')
      .update({
        expires_at: newExpiresAt
      })
      .eq('id', invitationId);

    // Build the signup URL
    const signupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invitation_email=${encodeURIComponent(invitation.email)}`;

    console.log('Invitation resent successfully');
    res.json({ 
      success: true, 
      message: 'Invitation resent successfully',
      signupUrl: signupUrl
    });

  } catch (err) {
    console.error('Resend invitation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to resend invitation' });
  }
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

    // Cancel invitation
    let query = supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { error } = await query;
    
    if (error) {
      console.error('Failed to cancel invitation:', error);
      throw error;
    }

    console.log('Invitation canceled successfully');
    res.json({ success: true, message: 'Invitation canceled successfully' });

  } catch (err) {
    console.error('Cancel invitation error:', err.message);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
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

    // Toggle the status - default to true if is_active is null/undefined
    const currentStatus = currentUser.is_active !== false; // Default to active
    const newStatus = !currentStatus;
    console.log('Changing status from', currentStatus, 'to', newStatus);
    
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

module.exports = router;