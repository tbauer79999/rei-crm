import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/button';
import supabase from '../lib/supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Users,
  MessageSquare,
  TrendingUp,
  Megaphone,
  Building2,
  Archive,
  ArchiveRestore,
  Zap,
  ZapOff,
  X,
  Target,
  Bot,
  Phone,
  Tag,
  Palette,
  Rocket,
  Settings,
  Clock
} from 'lucide-react';

// API Base URL - Add this after imports
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Campaign Progress Component
const CampaignProgress = ({ campaignId }) => {
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  
  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('ai_sent')
        .eq('campaign_id', campaignId);
      
      if (!error && data) {
        const total = data.length;
        const processed = data.filter(l => l.ai_sent).length;
        setProgress({ processed, total });
      }
    };
    
    fetchProgress();
  }, [campaignId]);
  
  if (progress.total === 0) {
    return <span className="text-sm text-gray-500">No leads</span>;
  }
  
  const percentage = Math.round((progress.processed / progress.total) * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center text-sm">
        <span className="font-medium">{progress.processed}</span>
        <span className="text-gray-500 mx-1">/</span>
        <span className="text-gray-500">{progress.total}</span>
        <span className="text-gray-500 ml-2">({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function CampaignManagement() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [campaignStats, setCampaignStats] = useState({
    totalLeads: 0,
    processedLeads: 0,
    remainingLeads: 0
  });

  // Campaign creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [aiArchetypes, setAiArchetypes] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    goal: '',
    aiArchetype: '',
    phoneNumber: '',
    aiEnabled: true,
    routingTags: [],
    color: '#3B82F6',
    description: ''
  });

  const isGlobalAdmin = user?.role === 'global_admin';

  // Fetch campaigns from API
  useEffect(() => {
    fetchCampaigns();
    if (isGlobalAdmin) {
      fetchTenants();
    }
  }, [tenantFilter, showArchived, user]);

  // Load form data when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      fetchAiArchetypes();
      fetchPhoneNumbers();
    }
  }, [showCreateModal]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      let url = `${API_BASE}/api/campaigns`;
      const params = new URLSearchParams();
      
      // If global admin and specific tenant selected, filter by tenant
      if (isGlobalAdmin && tenantFilter !== 'all') {
        params.append('tenant_id', tenantFilter);
      }
      
      if (showArchived) {
        params.append('show_archived', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('🔍 Fetching campaigns from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Response error:', errorData);
        throw new Error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Campaigns fetched:', data);
      setCampaigns(data);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching campaigns:', err);
      setError(`Failed to load campaigns: ${err.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/tenants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const fetchAiArchetypes = async () => {
    try {
      // Using direct Supabase call - no tenant filter since table doesn't have tenant_id
      const { data, error } = await supabase
        .from('ai_archetypes')
        .select('id, name, persona') // Using 'persona' instead of 'description'
        .order('name');

      if (error) {
        throw error;
      }
      setAiArchetypes(data || []);
    } catch (err) {
      console.error('Error fetching AI archetypes:', err);
      setAiArchetypes([]);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      console.log('🔍 DEBUG - Fetching phone numbers for tenant:', user.tenant_id);
      console.log('🔍 DEBUG - User object:', user);
      
      // First, let's see ALL phone numbers in the table
      const { data: allPhones, error: allError } = await supabase
        .from('phone_numbers')
        .select('id, phone_number, status, tenant_id')
        .limit(5);
        
      console.log('🔍 DEBUG - ALL phone numbers (first 5):', allPhones);
      
      // Now try the filtered query
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('id, phone_number, status, tenant_id')
        .eq('tenant_id', user.tenant_id);

      console.log('🔍 DEBUG - Filtered phone numbers result:', { data, error });
      console.log('🔍 DEBUG - Tenant ID type:', typeof user.tenant_id);

      if (error) {
        throw error;
      }
      setPhoneNumbers(data || []);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setPhoneNumbers([]);
    }
  };

  const fetchCampaignStats = async () => {
    try {
      // Get all campaign IDs for the current view
      const campaignIds = filteredCampaigns.map(c => c.id);
      
      if (campaignIds.length === 0) {
        setCampaignStats({ totalLeads: 0, processedLeads: 0, remainingLeads: 0 });
        return;
      }

      // Fetch lead counts from Supabase
      const { data: allLeads, error: allError } = await supabase
        .from('leads')
        .select('id, ai_sent')
        .in('campaign_id', campaignIds);

      if (allError) throw allError;

      const totalLeads = allLeads?.length || 0;
      const processedLeads = allLeads?.filter(lead => lead.ai_sent === true).length || 0;
      const remainingLeads = totalLeads - processedLeads;

      setCampaignStats({
        totalLeads,
        processedLeads,
        remainingLeads
      });
    } catch (err) {
      console.error('Error fetching campaign stats:', err);
    }
  };

  const archiveCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to archive this campaign? It will be hidden from the main view but can be restored later.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from current view (will be refetched)
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive campaign');
      }
    } catch (err) {
      console.error('Error archiving campaign:', err);
      setError('Failed to archive campaign');
    }
  };

  const unarchiveCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to restore this campaign?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/unarchive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh the view
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unarchive campaign');
      }
    } catch (err) {
      console.error('Error unarchiving campaign:', err);
      setError('Failed to unarchive campaign');
    }
  };

  const updateCampaignActiveStatus = async (campaignId, newActiveStatus) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newActiveStatus })
      });

      if (response.ok) {
        const updatedCampaign = await response.json();
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, is_active: updatedCampaign.is_active } : c
        ));
      } else {
        throw new Error('Failed to update campaign status');
      }
    } catch (err) {
      console.error('Error updating campaign status:', err);
      setError('Failed to update campaign status');
    }
  };

  const toggleAiOn = async (campaignId, currentAiOn) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/ai-toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ai_on: !currentAiOn
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, ai_on: !currentAiOn } : c
        ));
        
        setError(''); // Clear any previous errors
        console.log(`AI ${!currentAiOn ? 'enabled' : 'disabled'} for campaign`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle AI setting');
      }
    } catch (err) {
      console.error('Error toggling AI setting:', err);
      setError(`Failed to toggle AI setting: ${err.message}`);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.goal) {
      setError('Campaign name and goal are required');
      return;
    }

    setIsCreating(true);
    try {
      if (!user || !user.tenant_id) {
        throw new Error('User authentication information not available. Please log in.');
      }

      const now = new Date().toISOString();
      const startDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

      // Prepare the campaign data according to your schema
      const campaignData = {
        name: campaignForm.name.trim(),
        description: campaignForm.description?.trim() || null,
        start_date: startDate,
        end_date: null, // Can be set later
        target_audience: campaignForm.goal ? { 
          goal: campaignForm.goal,
          routingTags: campaignForm.routingTags,
          color: campaignForm.color,
          phoneNumber: campaignForm.phoneNumber
        } : null,
        ai_prompt_template: campaignForm.aiArchetype || null,
        created_by_email: user.email,
        tenant_id: user.tenant_id,
        is_active: true,
        ai_outreach_enabled: campaignForm.aiEnabled,
        ai_on: campaignForm.aiEnabled,
        archived: false,
        ai_archetype_id: campaignForm.aiArchetype || null
      };

      console.log('🔍 Creating campaign with data:', campaignData);

      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new campaign to the list
      setCampaigns([newCampaign, ...campaigns]);
      setShowCreateModal(false);
      resetForm();
      setError('');
      
      console.log('✅ Campaign created successfully:', newCampaign.id);
    } catch (err) {
      console.error('❌ Error creating campaign:', err);
      setError(`Failed to create campaign: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setCampaignForm({
      name: '',
      goal: '',
      aiArchetype: '',
      phoneNumber: '',
      aiEnabled: true,
      routingTags: [],
      color: '#3B82F6',
      description: ''
    });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
    setError('');
  };

  const addRoutingTag = (tag) => {
    if (tag && !campaignForm.routingTags.includes(tag)) {
      setCampaignForm({
        ...campaignForm,
        routingTags: [...campaignForm.routingTags, tag]
      });
    }
  };

  const removeRoutingTag = (tagToRemove) => {
    setCampaignForm({
      ...campaignForm,
      routingTags: campaignForm.routingTags.filter(tag => tag !== tagToRemove)
    });
  };

  const getStatusBadge = (campaign) => {
    // Use is_active instead of status since there's no status column
    const isActive = campaign.is_active;
    const isArchived = campaign.archived;
    
    if (isArchived) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </span>
      );
    }
    
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Play className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Pause className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'Lead Generation': 'text-blue-600',
      'Promotional': 'text-purple-600',
      'Follow-up': 'text-green-600',
      'Nurture': 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by active status instead of status
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = campaign.is_active === true;
    } else if (statusFilter === 'inactive') {
      matchesStatus = campaign.is_active === false;
    }
    // 'all' shows everything
    
    return matchesSearch && matchesStatus;
  });

  // Fetch stats when filtered campaigns change
  useEffect(() => {
    if (filteredCampaigns.length > 0) {
      fetchCampaignStats();
    } else {
      setCampaignStats({ totalLeads: 0, processedLeads: 0, remainingLeads: 0 });
    }
  }, [filteredCampaigns]);

  // Calculate stats based on actual schema
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.is_active === true && c.ai_on === true).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showArchived ? 'Archived Campaigns' : 'Campaign Management'}
          </h1>
          <p className="text-gray-600">
            {showArchived 
              ? 'View and restore archived campaigns'
              : 'Create, manage, and track your messaging campaigns'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className="inline-flex items-center px-4 py-2"
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Show Active
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Show Archived
              </>
            )}
          </Button>
          {!showArchived && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leads Processed</p>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.processedLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {campaignStats.totalLeads > 0 
                  ? `${Math.round((campaignStats.processedLeads / campaignStats.totalLeads) * 100)}% complete`
                  : 'No leads yet'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Remaining Leads</p>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.remainingLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {campaignStats.remainingLeads > 0 && activeCampaigns > 0
                  ? `~${Math.ceil(campaignStats.remainingLeads / (activeCampaigns * 120))} hours to complete`
                  : campaignStats.remainingLeads > 0 ? 'Activate campaigns to start' : 'All processed'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeCampaigns > 0 ? `${activeCampaigns * 120}` : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">leads/hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={isGlobalAdmin ? "Search campaigns or tenants..." : "Search campaigns..."}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            
            {/* Status Filter */}
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Tenant Filter - Only for Global Admins */}
            {isGlobalAdmin && (
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="all">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                {isGlobalAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.description || 'No description'}</div>
                    </div>
                  </td>
                  {isGlobalAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {campaign.tenants?.name || 'Unknown Tenant'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {getStatusBadge(campaign)}
                  </td>
                  <td className="px-6 py-4">
                    <CampaignProgress campaignId={campaign.id} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {/* AI Toggle Switch */}
                      <button
                        onClick={() => toggleAiOn(campaign.id, campaign.ai_on)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          campaign.ai_on 
                            ? 'bg-blue-600' 
                            : 'bg-gray-200'
                        }`}
                        title={campaign.ai_on ? 'AI Enabled - Click to disable' : 'AI Disabled - Click to enable'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            campaign.ai_on ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      
                      {/* AI Status Text */}
                      <div className="flex items-center space-x-1">
                        {campaign.ai_on ? (
                          <>
                            <Zap className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">AI ON</span>
                          </>
                        ) : (
                          <>
                            <ZapOff className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">AI OFF</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="View Campaign"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {showArchived ? (
                        <button 
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                          title="Restore Campaign"
                          onClick={() => unarchiveCampaign(campaign.id)}
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button 
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Edit Campaign"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!campaign.is_active && (
                            <button 
                              className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                              title="Activate Campaign"
                              onClick={() => updateCampaignActiveStatus(campaign.id, true)}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {campaign.is_active && (
                            <button 
                              className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50"
                              title="Deactivate Campaign"
                              onClick={() => updateCampaignActiveStatus(campaign.id, false)}
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Archive Campaign"
                            onClick={() => archiveCampaign(campaign.id)}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCampaigns.length === 0 && !loading && (
          <div className="text-center py-12">
            {showArchived ? (
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : (
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showArchived ? 'No archived campaigns found' : 'No campaigns found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {showArchived ? (
                'There are no archived campaigns to display.'
              ) : (
                searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first campaign.'
              )}
            </p>
            {!showArchived && !searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Campaign Drawer */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out z-40 ${
              showCreateModal ? 'bg-opacity-50' : 'bg-opacity-0'
            }`} 
            onClick={handleCloseModal}
          ></div>
          
          {/* Sliding Drawer */}
          <div className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-all duration-500 ease-out overflow-y-auto ${
            showCreateModal ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 backdrop-blur-sm bg-white/95">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
                    <p className="text-sm text-gray-600">Configure your AI-powered outreach</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
              {/* Campaign Name */}
              <div className="transform transition-all duration-300 delay-100">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g. Buyer Follow-Up, B2B BD Outreach"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Campaign Goal */}
              <div className="transform transition-all duration-300 delay-150">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Campaign Goal *
                </label>
                <select
                  value={campaignForm.goal}
                  onChange={(e) => setCampaignForm({ ...campaignForm, goal: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                >
                  <option value="">Select campaign objective...</option>
                  <option value="qualify-sellers">Qualify Sellers</option>
                  <option value="recruit-candidates">Recruit Candidates</option>
                  <option value="book-demos">Book Demos</option>
                  <option value="lead-nurture">Lead Nurture</option>
                  <option value="follow-up">Follow-Up Sequence</option>
                  <option value="appointment-setting">Appointment Setting</option>
                </select>
              </div>

              {/* AI Archetype */}
              <div className="transform transition-all duration-300 delay-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <Bot className="w-4 h-4 inline mr-1" />
                  AI Personality
                </label>
                {aiArchetypes.length > 0 ? (
                  <select
                    value={campaignForm.aiArchetype}
                    onChange={(e) => setCampaignForm({ ...campaignForm, aiArchetype: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                  >
                    <option value="">Choose AI personality...</option>
                    {aiArchetypes.map(archetype => (
                      <option key={archetype.id} value={archetype.id}>
                        {archetype.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed transition-all duration-200">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>No personalities available yet. Configure in AI Settings.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Number - Commented out for now */}
              {/* 
              <div className="transform transition-all duration-300 delay-250">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Assigned Phone Number
                </label>
                <select
                  value={campaignForm.phoneNumber}
                  onChange={(e) => setCampaignForm({ ...campaignForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                >
                  <option value="">Select phone number...</option>
                  {phoneNumbers.map(phone => (
                    <option key={phone.id} value={phone.phone_number}>
                      {phone.phone_number}
                    </option>
                  ))}
                </select>
              </div>
              */}

              {/* AI Status Toggle */}
              <div className="transform transition-all duration-300 delay-300">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  <Zap className="w-4 h-4 inline mr-1" />
                  AI Status
                </label>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200">
                  <div>
                    <div className="font-medium text-gray-900">AI-Powered Responses</div>
                    <div className="text-sm text-gray-600">Enable intelligent auto-responses</div>
                  </div>
                  <button
                    onClick={() => setCampaignForm({ ...campaignForm, aiEnabled: !campaignForm.aiEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95 ${
                      campaignForm.aiEnabled ? 'bg-blue-600 shadow-lg' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-lg ${
                        campaignForm.aiEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Routing Tags */}
              <div className="transform transition-all duration-300 delay-350">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Routing Tags
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {campaignForm.routingTags.map((tag, index) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 transform transition-all duration-200 hover:scale-105"
                      >
                        {tag}
                        <button
                          onClick={() => removeRoutingTag(tag)}
                          className="ml-2 hover:text-blue-600 transition-colors duration-150"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add routing tag (press Enter)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRoutingTag(e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Tags help route leads to specific campaigns automatically</p>
                </div>
              </div>

              {/* Color Picker */}
              <div className="transform transition-all duration-300 delay-400">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Campaign Color
                </label>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={campaignForm.color}
                      onChange={(e) => setCampaignForm({ ...campaignForm, color: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer transition-all duration-200 hover:border-gray-400 hover:scale-105 active:scale-95"
                    />
                    <div 
                      className="absolute inset-0 rounded-lg shadow-inner pointer-events-none"
                      style={{ backgroundColor: campaignForm.color, opacity: 0.1 }}
                    ></div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={campaignForm.color}
                      onChange={(e) => setCampaignForm({ ...campaignForm, color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-all duration-200 hover:border-gray-400"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Used for dashboard visualization and organization</p>
              </div>

              {/* Description */}
              <div className="transform transition-all duration-300 delay-450">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Campaign Description
                </label>
                <textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Describe the campaign strategy and target audience..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {campaignForm.aiEnabled ? (
                    <span className="flex items-center text-green-600 animate-pulse">
                      <Zap className="w-4 h-4 mr-1" />
                      AI Ready to Deploy
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-500">
                      <ZapOff className="w-4 h-4 mr-1" />
                      Manual Mode
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseModal}
                    disabled={isCreating}
                    className="transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCampaign}
                    disabled={isCreating || !campaignForm.name || !campaignForm.goal}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Launch Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}