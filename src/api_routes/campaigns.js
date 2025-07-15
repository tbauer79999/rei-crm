const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');
router.use(addUserProfile);
router.use(filterByTenant);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all campaigns for a tenant (or all tenants if global admin)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 DEBUG - Campaign route accessed');
    console.log('🔍 DEBUG - req.user:', req.user);
    console.log('🔍 DEBUG - User role:', req.user?.role);
    
    const { tenant_id, show_archived } = req.query;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;
    
    // Allow all authenticated users to view campaigns
    if (!req.user) {
      console.log('❌ No authenticated user');
      return res.status(401).json({ 
        error: 'Authentication required'
      });
    }

    // Start building the query
    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply tenant filtering based on user role
    if (userRole === 'global_admin') {
      // Global admin can see all campaigns or filter by specific tenant
      if (tenant_id) {
        query = query.eq('tenant_id', tenant_id);
      }
      // If no tenant_id specified, global admin sees all campaigns (no filter)
    } else {
      // All other users only see their own tenant's campaigns
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    // Filter by archived status
    if (show_archived === 'true') {
      query = query.eq('archived', true);
    } else {
      query = query.or('archived.is.null,archived.eq.false');
    }

    console.log('🔍 DEBUG - Final query filters applied');
    
    const { data: campaigns, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
    }

    console.log('✅ Successfully fetched campaigns:', campaigns?.length || 0);
    res.json(campaigns || []);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Test route for debugging
router.get('/test', async (req, res) => {
  console.log('🧪 TEST ROUTE - User:', req.user);
  console.log('🧪 TEST ROUTE - User role:', req.user?.role);
  
  res.json({ 
    message: 'Test route works!', 
    user: req.user,
    role: req.user?.role,
    tenant_id: req.user?.tenant_id
  });
});

// Create new campaign - restricted to admins only
router.post('/', async (req, res) => {
  try {
    const { name, startDate, endDate, description, targetAudience, aiPromptTemplate, tenant_id } = req.body;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Creating campaign with data:', { name, startDate, endDate, tenant_id });

    // Check if user has admin access for creating campaigns
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to create campaigns' });
    }

    // Determine which tenant to create campaign for
    let campaignTenantId;
    if (userRole === 'global_admin') {
      // Global admin can create campaigns for any tenant
      campaignTenantId = tenant_id || userTenantId;
      if (!campaignTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required for campaign creation' });
      }
    } else {
      // Other admins can only create campaigns for their own tenant
      campaignTenantId = userTenantId;
      if (!campaignTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
    }

    if (!name || !startDate) {
      return res.status(400).json({ error: 'Name and start date are required' });
    }

    const newCampaign = {
      name,
      start_date: startDate,
      end_date: endDate || null,
      description: description || null,
      target_audience: targetAudience ? (typeof targetAudience === 'string' ? targetAudience : JSON.stringify(targetAudience)) : null,
      ai_prompt_template: aiPromptTemplate || null,
      tenant_id: campaignTenantId,
      created_by_email: req.user.email,
      is_active: true,
      ai_outreach_enabled: false,
      archived: false
    };

    console.log('🔍 DEBUG - Inserting campaign:', newCampaign);

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert([newCampaign])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating campaign:', error);
      return res.status(500).json({ error: 'Failed to create campaign', details: error.message });
    }

    console.log('✅ Campaign created successfully:', campaign.id);
    res.status(201).json(campaign);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Add this endpoint to your existing campaigns.js file
// Insert this after the existing router.post('/', ...) endpoint

// POST /api/campaigns/resolve-or-create - for extension use
router.post('/resolve-or-create', async (req, res) => {
  try {
    const { campaign_name, tenant_id, created_by_email } = req.body;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Extension user details:', { userRole, userTenantId, email: req.user?.email });
    console.log('🔍 DEBUG - Resolving/creating campaign:', campaign_name);

    // Input validation
    if (!campaign_name || typeof campaign_name !== 'string') {
      return res.status(400).json({ error: 'campaign_name is required and must be a string' });
    }

    const trimmedName = campaign_name.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({ error: 'campaign_name cannot be empty' });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'campaign_name cannot exceed 100 characters' });
    }

    // Determine which tenant to use
    let campaignTenantId;
    if (userRole === 'global_admin') {
      campaignTenantId = tenant_id || userTenantId;
    } else {
      // Non-global admins use their own tenant
      campaignTenantId = userTenantId;
    }

    if (!campaignTenantId) {
      return res.status(400).json({ error: 'Tenant ID is required for campaign creation' });
    }

    // Sanitize campaign name (basic XSS prevention)
    const sanitizedName = trimmedName.replace(/[<>"']/g, '');

    console.log('🔍 DEBUG - Searching for existing campaign with name:', sanitizedName, 'tenant:', campaignTenantId);

    // First, try to find existing campaign (case-insensitive search)
    let query = supabaseAdmin
      .from('campaigns')
      .select('id, name, is_active, archived')
      .ilike('name', sanitizedName)
      .eq('tenant_id', campaignTenantId);

    const { data: existingCampaigns, error: searchError } = await query;

    if (searchError) {
      console.error('❌ Campaign search error:', searchError);
      throw searchError;
    }

    console.log('🔍 DEBUG - Search results:', existingCampaigns);

    // If campaign exists, return its ID (and reactivate if needed)
    if (existingCampaigns && existingCampaigns.length > 0) {
      const existing = existingCampaigns[0];
      
      // If campaign is inactive or archived, reactivate it
      if (!existing.is_active || existing.archived) {
        const { error: updateError } = await supabaseAdmin
          .from('campaigns')
          .update({ 
            is_active: true, 
            archived: false,
            archived_at: null
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ Campaign reactivation error:', updateError);
        }
      }

      console.log('✅ Found existing campaign:', existing.id);
      return res.json({
        campaign_id: existing.id,
        name: existing.name,
        created: false,
        reactivated: !existing.is_active || existing.archived
      });
    }

    // Campaign doesn't exist, create it
    const today = new Date().toISOString().split('T')[0];
    
    const newCampaign = {
      name: sanitizedName, // This satisfies the "name" requirement
      start_date: today,   // This satisfies the "start date" requirement  
      end_date: null,
      description: `Auto-created from extension by ${created_by_email || req.user?.email || 'system'}`,
      target_audience: null,
      ai_prompt_template: null,
      tenant_id: campaignTenantId,
      created_by_email: created_by_email || req.user?.email || 'extension@system',
      is_active: true,
      ai_outreach_enabled: false,
      archived: false
    };

    console.log('🔍 DEBUG - Creating new campaign with data:', newCampaign);

    const { data: createdCampaign, error: createError } = await supabaseAdmin
      .from('campaigns')
      .insert([newCampaign])
      .select()
      .single();

    if (createError) {
      console.error('❌ Campaign creation error:', createError);
      
      // Handle duplicate name errors gracefully
      if (createError.code === '23505') {
        return res.status(409).json({ 
          error: 'Campaign name already exists',
          code: 'DUPLICATE_CAMPAIGN'
        });
      }
      
      throw createError;
    }

    // Log campaign creation for audit
    console.log(`✅ Campaign created: ${createdCampaign.name} (ID: ${createdCampaign.id}) by ${req.user?.email || 'system'}`);

    res.status(201).json({
      campaign_id: createdCampaign.id,
      name: createdCampaign.name,
      created: true,
      reactivated: false
    });

  } catch (err) {
    console.error('❌ Campaign resolve/create error:', err.message);
    res.status(500).json({ 
      error: 'Failed to resolve or create campaign',
      message: err.message 
    });
  }
});


// Get campaign by ID - allow all authenticated users to view
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Fetching campaign by ID:', id);

    // Allow all authenticated users to view campaigns
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build query to get specific campaign
    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.single();

    if (error) {
      console.error('❌ Error fetching campaign:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      return res.status(500).json({ error: 'Failed to fetch campaign', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    console.log('✅ Campaign fetched successfully:', campaign.id);
    res.json(campaign);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Update campaign - restricted to admins
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Updating campaign:', id, 'with updates:', updates);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to update campaigns' });
    }

    // Map frontend fields to database columns
    if (updates.targetAudience !== undefined) {
      updates.target_audience = updates.targetAudience ? 
        (typeof updates.targetAudience === 'string' ? updates.targetAudience : JSON.stringify(updates.targetAudience)) : null;
      delete updates.targetAudience;
    }
    if (updates.aiPromptTemplate !== undefined) {
      updates.ai_prompt_template = updates.aiPromptTemplate;
      delete updates.aiPromptTemplate;
    }
    if (updates.startDate !== undefined) {
      updates.start_date = updates.startDate;
      delete updates.startDate;
    }
    if (updates.endDate !== undefined) {
      updates.end_date = updates.endDate;
      delete updates.endDate;
    }

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.tenant_id; // Don't allow changing tenant

    let query = supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.select().single();

    if (error) {
      console.error('❌ Error updating campaign:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to update campaign', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    console.log('✅ Campaign updated successfully:', campaign.id);
    res.json(campaign);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Archive campaign - restricted to admins
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Archiving campaign:', id);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to archive campaigns' });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .update({ 
        archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.select().single();

    if (error) {
      console.error('❌ Error archiving campaign:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to archive campaign', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    console.log('✅ Campaign archived successfully:', campaign.id);
    res.json({ message: 'Campaign archived successfully', campaign });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Unarchive campaign - restricted to admins
router.patch('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Unarchiving campaign:', id);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to unarchive campaigns' });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .update({ 
        archived: false,
        archived_at: null
      })
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.select().single();

    if (error) {
      console.error('❌ Error unarchiving campaign:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to unarchive campaign', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    console.log('✅ Campaign unarchived successfully:', campaign.id);
    res.json({ message: 'Campaign unarchived successfully', campaign });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Delete campaign - restricted to admins
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Deleting campaign:', id);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to delete campaigns' });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { error } = await query;

    if (error) {
      console.error('❌ Error deleting campaign:', error);
      return res.status(500).json({ error: 'Failed to delete campaign', details: error.message });
    }

    console.log('✅ Campaign deleted successfully:', id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Toggle active status - restricted to admins
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Toggling active status for campaign:', id, 'to:', is_active);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to toggle campaign status' });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .update({ is_active })
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.select().single();

    if (error) {
      console.error('❌ Error updating campaign active status:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to update campaign active status', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    console.log('✅ Campaign active status updated successfully:', campaign.id);
    res.json(campaign);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Toggle AI setting for campaign - restricted to admins
// Toggle AI setting for campaign - restricted to admins
router.patch('/:id/ai-toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { ai_on } = req.body;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Toggling AI for campaign:', id, 'to:', ai_on);

    // Check if user has admin access
    if (!['global_admin', 'enterprise_admin', 'business_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required to toggle AI settings' });
    }

    if (typeof ai_on !== 'boolean') {
      return res.status(400).json({ error: 'ai_on must be a boolean' });
    }

    let query = supabaseAdmin
      .from('campaigns')
      .update({ ai_on })
      .eq('id', id);

    // Apply tenant filtering for non-global admins
    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      query = query.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error } = await query.select().single();

    if (error) {
      console.error('❌ Error toggling AI setting:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to toggle AI setting', details: error.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    console.log('✅ AI setting updated successfully:', campaign.id);

    // If AI was turned ON, trigger the edge function to process leads
    if (ai_on) {
      console.log('🚀 AI enabled - calling edge function to process leads');
      
      try {
        const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/send-batch`;
        
        const edgeResponse = await fetch(edgeFunctionUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            campaignId: id,
            ai_on: true
          })
        });

        if (!edgeResponse.ok) {
          const errorText = await edgeResponse.text();
          console.error('❌ Edge function call failed:', errorText);
          // Don't fail the whole request, just log the error
        } else {
          const result = await edgeResponse.json();
          console.log('✅ Edge function response:', result);
        }
      } catch (edgeError) {
        console.error('❌ Error calling edge function:', edgeError);
        // Don't fail the whole request, just log the error
      }
    }

    res.json(campaign);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Get campaign analytics/stats - allow all authenticated users to view
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenant_id;

    console.log('🔍 DEBUG - Fetching analytics for campaign:', id);

    // Allow all authenticated users to view analytics
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify campaign access first
    let campaignQuery = supabaseAdmin
      .from('campaigns')
      .select('id, tenant_id')
      .eq('id', id);

    if (userRole !== 'global_admin') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      campaignQuery = campaignQuery.eq('tenant_id', userTenantId);
    }

    const { data: campaign, error: campaignError } = await campaignQuery.single();

    if (campaignError) {
      console.error('❌ Error verifying campaign access:', campaignError);
      if (campaignError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Campaign not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to verify campaign access', details: campaignError.message });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Mock analytics data for now
    const analytics = {
      totalContacts: 0,
      messagesSent: 0,
      responses: 0,
      responseRate: 0,
      opens: 0,
      openRate: 0,
      clicks: 0,
      clickRate: 0,
      conversions: 0,
      conversionRate: 0
    };

    console.log('✅ Analytics fetched successfully for campaign:', id);
    res.json(analytics);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;