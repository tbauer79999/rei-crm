import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Clock,
  UserCheck
} from 'lucide-react';

// API Base URL - Add this after imports
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Knowledge Assets Dropdown Component
const KnowledgeAssetsDropdown = ({ campaign, knowledgeAssets, selectedAssets, onUpdate, isOpen, onToggle }) => {
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openUpward, setOpenUpward] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const button = document.getElementById(`knowledge-dropdown-${campaign.id}`);
      if (button) {
        const rect = button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 240;
        
        setOpenUpward(spaceBelow < dropdownHeight);
        setDropdownPosition({
          top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    }
  }, [isOpen, campaign.id, openUpward]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div
      className="fixed z-50"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        minWidth: `${Math.max(dropdownPosition.width, 256)}px`
      }}
    >
      <div className="w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
        {knowledgeAssets.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">No knowledge assets available</div>
        ) : (
          <div className="py-1">
            {knowledgeAssets.map((asset) => {
              const isSelected = selectedAssets?.includes(asset.id);
              const icon = asset.source_type === 'pdf' ? '📄' : '🌐';
              const displayText = asset.source_type === 'pdf' 
                ? asset.title || asset.file_name || 'Untitled PDF'
                : asset.website_url || 'Untitled Website';
              
              return (
                <label
                  key={asset.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onUpdate(asset.id, e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm flex items-center flex-1 min-w-0">
                    <span className="mr-2">{icon}</span>
                    <span className="truncate" title={displayText}>
                      {displayText}
                    </span>
                  </span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {asset.source_type}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

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
  const [salesTeamMembers, setSalesTeamMembers] = useState([]);
  const [campaignStats, setCampaignStats] = useState({
    totalLeads: 0,
    processedLeads: 0,
    remainingLeads: 0
  });
  const [tenantNames, setTenantNames] = useState({});
  const [tenantNamesLoaded, setTenantNamesLoaded] = useState(false);
  const [tenantIndustry, setTenantIndustry] = useState('');
  const [knowledgeAssets, setKnowledgeAssets] = useState([]);
  const [selectedKnowledgeAssets, setSelectedKnowledgeAssets] = useState({});
  const [knowledgeDropdownOpen, setKnowledgeDropdownOpen] = useState({});
  
  // Campaign creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [aiArchetypes, setAiArchetypes] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    goal: '',
    aiArchetype: '',
    phoneNumberId: '',
    aiEnabled: true,
    routingTags: [],
    color: '#3B82F6',
    description: '',
    assignedTo: ''
  });

  const isGlobalAdmin = user?.role === 'global_admin';
  const [isFetching, setIsFetching] = useState(false);

  // Fetch tenant industry
  const fetchTenantIndustry = async () => {
    try {
      if (!user?.tenant_id) return;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('industry')
        .eq('id', user.tenant_id)
        .single();
      
      if (error) throw error;
      
      setTenantIndustry(data?.industry || '');
      console.log('Tenant industry:', data?.industry);
    } catch (err) {
      console.error('Error fetching tenant industry:', err);
    }
  };

  // Fetch knowledge assets
  const fetchKnowledgeAssets = async () => {
    try {
      if (!user?.tenant_id) return;
      
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, source_type, file_url, website_url, created_at')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setKnowledgeAssets(data || []);
      console.log('Knowledge assets:', data);
    } catch (err) {
      console.error('Error fetching knowledge assets:', err);
    }
  };

  // Fetch campaign knowledge links
  const fetchCampaignKnowledgeLinks = async (campaignId) => {
    try {
      const { data: links, error } = await supabase
        .from('campaign_knowledge_links')
        .select('knowledge_id')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      
      return links?.map(link => link.knowledge_id) || [];
    } catch (err) {
      console.error('Error fetching campaign knowledge links:', err);
      return [];
    }
  };

  // Update campaign knowledge links
  const updateCampaignKnowledgeLinks = async (campaignId, selectedIds) => {
    try {
      // Delete existing links
      const { error: deleteError } = await supabase
        .from('campaign_knowledge_links')
        .delete()
        .eq('campaign_id', campaignId);
      
      if (deleteError) throw deleteError;
      
      // Insert new links if any
      if (selectedIds.length > 0) {
        const newLinks = selectedIds.map((knowledge_id) => ({
          campaign_id: campaignId,
          knowledge_id: knowledge_id
        }));
        
        const { error: insertError } = await supabase
          .from('campaign_knowledge_links')
          .insert(newLinks);
        
        if (insertError) throw insertError;
      }
      
      console.log('Successfully updated knowledge links for campaign:', campaignId);
    } catch (err) {
      console.error('Error updating campaign knowledge links:', err);
      setError('Failed to update knowledge assets');
    }
  };

  // Get the dynamic column header based on industry
  const getDynamicColumnHeader = () => {
    switch (tenantIndustry) {
      case 'Staffing':
        return 'Talk Track';
      case 'Home Services':
      case 'Financial Services':
      case 'Mortgage Lending':
        return 'Service Type';
      case 'Auto Sales':
        return 'Vehicle Type';
      default:
        return null;
    }
  };

  // Get the dynamic dropdown options based on industry
  const getDynamicDropdownOptions = () => {
    switch (tenantIndustry) {
      case 'Staffing':
        return [
          { value: 'recruiting_candidates', label: 'Recruiting Candidates (B2C)' },
          { value: 'acquiring_clients', label: 'Acquiring Clients (B2B)' }
        ];
      case 'Home Services':
        return [
          { value: 'hvac', label: 'HVAC' },
          { value: 'roofing', label: 'Roofing' },
          { value: 'solar', label: 'Solar' },
          { value: 'lawn_care', label: 'Lawn Care' },
          { value: 'plumbing', label: 'Plumbing' },
          { value: 'other', label: 'Other' }
        ];
      case 'Financial Services':
        return [
          { value: 'mortgage_lending', label: 'Mortgage Lending' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'credit_repair', label: 'Credit Repair' },
          { value: 'tax_relief', label: 'Tax Relief' }
        ];
      case 'Auto Sales':
        return [
          { value: 'new_cars', label: 'New Cars' },
          { value: 'used_cars', label: 'Used Cars' },
          { value: 'lease_offers', label: 'Lease Offers' },
          { value: 'trade_in_leads', label: 'Trade-In Leads' }
        ];
      case 'Mortgage Lending':
        return [
          { value: 'purchase', label: 'Purchase' },
          { value: 'refinance', label: 'Refinance' },
          { value: 'heloc', label: 'HELOC' },
          { value: 'pre_approval', label: 'Pre-Approval' }
        ];
      default:
        return [];
    }
  };

  // Update campaign dynamic field (generic function for all industry-specific fields)
  const updateCampaignDynamicField = async (campaignId, value) => {
    try {
      // Determine which field to update based on industry
      let fieldName = '';
      switch (tenantIndustry) {
        case 'Staffing':
          fieldName = 'talk_track';
          break;
        case 'Home Services':
        case 'Financial Services':
        case 'Mortgage Lending':
          fieldName = 'service_type';
          break;
        case 'Auto Sales':
          fieldName = 'vehicle_type';
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ [fieldName]: value })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, [fieldName]: value } : c
      ));
      
      setError('');
    } catch (err) {
      console.error('Error updating campaign dynamic field:', err);
      setError('Failed to update campaign');
    }
  };

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    if (isFetching) return; // Prevent multiple simultaneous fetches
    
    try {
      setIsFetching(true);
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      let url = `${API_BASE}/campaigns`;
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

      // Fetch sales team assignments AND phone numbers for campaigns
      const campaignIds = data.map(c => c.id);
      if (campaignIds.length > 0) {
        // Get campaign details with phone numbers and dynamic fields
        const { data: campaignDetails, error: detailError } = await supabase
          .from('campaigns')
          .select(`
            id, 
            assigned_to_sales_team_id,
            phone_number_id,
            talk_track,
            service_type,
            vehicle_type,
            phone_numbers (
              id,
              phone_number
            )
          `)
          .in('id', campaignIds);
        
        if (!detailError && campaignDetails) {
          // Get sales team member details
          const salesTeamIds = campaignDetails
            .filter(c => c.assigned_to_sales_team_id)
            .map(c => c.assigned_to_sales_team_id);
          
          let salesTeamData = [];
          if (salesTeamIds.length > 0) {
            const { data: salesData } = await supabase
              .from('sales_team_view')
              .select('sales_team_id, full_name, email')
              .in('sales_team_id', salesTeamIds);
            
            salesTeamData = salesData || [];
          }
          
          // Merge all data together
          const enhancedCampaigns = data.map(campaign => {
            const details = campaignDetails.find(d => d.id === campaign.id);
            const salesPerson = salesTeamData.find(s => s.sales_team_id === details?.assigned_to_sales_team_id);
            
            return {
              ...campaign,
              assigned_to_sales_team_id: details?.assigned_to_sales_team_id,
              assigned_to_name: salesPerson?.full_name,
              assigned_to_email: salesPerson?.email,
              phone_number_id: details?.phone_number_id,
              phone_number: details?.phone_numbers?.phone_number || null,
              talk_track: details?.talk_track,
              service_type: details?.service_type,
              vehicle_type: details?.vehicle_type
            };
          });
          
          setCampaigns(enhancedCampaigns);
        } else {
          setCampaigns(data);
        }
      } else {
        setCampaigns(data);
      }
    } catch (err) {
      console.error('❌ Error fetching campaigns:', err);
      setError(`Failed to load campaigns: ${err.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Initial data load
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (user?.tenant_id && mounted) {
        await fetchTenantIndustry();
        await fetchCampaigns();
        await fetchSalesTeamMembers();
        await fetchPhoneNumbers();
        await fetchKnowledgeAssets();
        
        if (isGlobalAdmin && mounted) {
          await fetchTenants();
          await fetchTenantNames();
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [user?.tenant_id, isGlobalAdmin]);

  // Load campaign knowledge links
  useEffect(() => {
    const loadKnowledgeLinks = async () => {
      for (const campaign of campaigns) {
        const linkedIds = await fetchCampaignKnowledgeLinks(campaign.id);
        setSelectedKnowledgeAssets(prev => ({
          ...prev,
          [campaign.id]: linkedIds
        }));
      }
    };
    
    if (campaigns.length > 0) {
      loadKnowledgeLinks();
    }
  }, [campaigns]);

  // Close knowledge dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside of any knowledge dropdown button or portal content
      const isClickInsideButton = event.target.closest('[id^="knowledge-dropdown-"]');
      const isClickInsidePortal = event.target.closest('.fixed.z-50');
      
      if (!isClickInsideButton && !isClickInsidePortal) {
        setKnowledgeDropdownOpen({});
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Load form data when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      fetchAiArchetypes();
      fetchPhoneNumbers();
      fetchSalesTeamMembers();
    }
  }, [showCreateModal]);

  const fetchSalesTeamMembers = async () => {
    try {
      console.log('🔍 Fetching sales team for tenant:', user?.tenant_id);
      
      if (!user?.tenant_id) {
        console.log('❌ No tenant_id available yet');
        return;
      }
      
      const { data, error } = await supabase
        .from('sales_team_view')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('is_available', true)
        .order('full_name');

      console.log('📊 Sales team data:', data);
      console.log('❌ Sales team error:', error);

      if (error) throw error;
      
      setSalesTeamMembers(data || []);
      
      // If only one sales person (likely the admin), auto-select them
      if (data && data.length === 1) {
        setCampaignForm(prev => ({ ...prev, assignedTo: data[0].sales_team_id }));
      }
    } catch (err) {
      console.error('Error fetching sales team:', err);
      setSalesTeamMembers([]);
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

  const fetchTenantNames = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('tenant_id, value')
        .eq('key', 'company_name');

      if (error) throw error;

      const nameMap = {};
      data?.forEach(setting => {
        if (setting.tenant_id && setting.value) {
          nameMap[setting.tenant_id] = setting.value;
        }
      });

      setTenantNames(nameMap);
      setTenantNamesLoaded(true);
    } catch (err) {
      console.error('Error fetching tenant names:', err);
      setTenantNamesLoaded(true);
    }
  };

  const fetchAiArchetypes = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_archetypes')
        .select('id, name, persona')
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
      console.log('🔍 Fetching phone numbers for tenant:', user.tenant_id);
      
      const { data: tenantPhones, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('tenant_id', user.tenant_id);
        
      console.log('📞 Phone numbers found:', tenantPhones);
      console.log('📞 Count:', tenantPhones?.length || 0);
      
      if (error) {
        console.error('❌ Error fetching phone numbers:', error);
        throw error;
      }
      
      setPhoneNumbers(tenantPhones || []);
    } catch (err) {
      console.error('❌ Error in fetchPhoneNumbers:', err);
      setPhoneNumbers([]);
    }
  };

  const fetchCampaignStats = async () => {
    try {
      const campaignIds = filteredCampaigns.map(c => c.id);
      
      if (campaignIds.length === 0) {
        setCampaignStats({ totalLeads: 0, processedLeads: 0, remainingLeads: 0 });
        return;
      }

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
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/toggle-active`, {
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
      
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/ai-toggle`, {
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
        
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, ai_on: !currentAiOn } : c
        ));
        
        setError('');
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

  const updateCampaignAssignment = async (campaignId, salesTeamId) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ assigned_to_sales_team_id: salesTeamId })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.map(c => {
        if (c.id === campaignId) {
          const salesPerson = salesTeamMembers.find(s => s.sales_team_id === salesTeamId);
          return {
            ...c,
            assigned_to_sales_team_id: salesTeamId,
            assigned_to_name: salesPerson?.full_name,
            assigned_to_email: salesPerson?.email
          };
        }
        return c;
      }));
      
      setError('');
    } catch (err) {
      console.error('Error updating campaign assignment:', err);
      setError('Failed to update campaign assignment');
    }
  };

  const updateCampaignPhoneNumber = async (campaignId, phoneNumberId) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ phone_number_id: phoneNumberId })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.map(c => {
        if (c.id === campaignId) {
          const phone = phoneNumbers.find(p => p.id === phoneNumberId);
          return {
            ...c,
            phone_number_id: phoneNumberId,
            phone_number: phone?.phone_number || null
          };
        }
        return c;
      }));
      
      setError('');
    } catch (err) {
      console.error('Error updating campaign phone number:', err);
      setError('Failed to update campaign phone number');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    setIsCreating(true);
    try {
      if (!user || !user.tenant_id) {
        throw new Error('User authentication information not available. Please log in.');
      }

      const now = new Date().toISOString();
      const startDate = new Date().toISOString().split('T')[0];

      const campaignData = {
        name: campaignForm.name.trim(),
        description: null,
        start_date: startDate,
        end_date: null,
        phone_number_id: null,
        target_audience: null,
        ai_prompt_template: null,
        created_by_email: user.email,
        tenant_id: user.tenant_id,
        is_active: true,
        ai_outreach_enabled: false,
        ai_on: false,
        archived: false,
        ai_archetype_id: null,
        assigned_to_sales_team_id: null
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
      phoneNumberId: '',
      aiEnabled: true,
      routingTags: [],
      color: '#3B82F6',
      description: '',
      assignedTo: salesTeamMembers.length === 1 ? salesTeamMembers[0].sales_team_id : ''
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

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch =
        campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = campaign.is_active === true;
      } else if (statusFilter === 'inactive') {
        matchesStatus = campaign.is_active === false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, statusFilter]);

  // Fetch stats when filtered campaigns change
  useEffect(() => {
    if (filteredCampaigns.length > 0) {
      fetchCampaignStats();
    } else {
      setCampaignStats({ totalLeads: 0, processedLeads: 0, remainingLeads: 0 });
    }
  }, [filteredCampaigns]);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.is_active === true && c.ai_on === true).length;

  // Check if we should show the dynamic column
  const showDynamicColumn = ['Staffing', 'Home Services', 'Financial Services', 'Auto Sales', 'Mortgage Lending'].includes(tenantIndustry);

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
              <p className="text-sm font-medium text-gray-600">Leads Analyzed</p>
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
              <p className="text-sm font-medium text-gray-600">AI Analysis Speed</p>
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
                    {tenantNames[tenant.id] || tenant.name || `Tenant ${tenant.id}`}
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
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                {/* Dynamic Column Header */}
                {showDynamicColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getDynamicColumnHeader()}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Knowledge Assets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Activation
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
                          {tenantNames[campaign.tenant_id] || campaign.tenants?.name || 'Unknown Tenant'}
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
                    <select
                      value={campaign.assigned_to_sales_team_id || ''}
                      onChange={(e) => updateCampaignAssignment(campaign.id, e.target.value || null)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      title={campaign.assigned_to_name ? `Assigned to ${campaign.assigned_to_name}` : 'Not assigned'}
                    >
                      <option value="">Unassigned</option>
                      {salesTeamMembers.map(member => (
                        <option key={member.sales_team_id} value={member.sales_team_id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={campaign.phone_number_id || ''}
                      onChange={(e) => updateCampaignPhoneNumber(campaign.id, e.target.value || null)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      title={campaign.phone_number ? `Current: ${campaign.phone_number}` : 'Not assigned'}
                    >
                      <option value="">Not assigned</option>
                      {phoneNumbers.map(phone => (
                        <option key={phone.id} value={phone.id}>
                          {phone.phone_number}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Dynamic Dropdown Cell */}
                  {showDynamicColumn && (
                    <td className="px-6 py-4">
                      <select
                        value={
                          campaign.talk_track || 
                          campaign.service_type || 
                          campaign.vehicle_type || 
                          ''
                        }
                        onChange={(e) => updateCampaignDynamicField(campaign.id, e.target.value || null)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select {getDynamicColumnHeader().toLowerCase()}...</option>
                        {getDynamicDropdownOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {/* Knowledge Assets Multi-Select */}
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        id={`knowledge-dropdown-${campaign.id}`}
                        onClick={() => setKnowledgeDropdownOpen({
                          ...knowledgeDropdownOpen,
                          [campaign.id]: !knowledgeDropdownOpen[campaign.id]
                        })}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between min-w-[140px] bg-white hover:bg-gray-50"
                      >
                        <span className="truncate">
                          {selectedKnowledgeAssets[campaign.id]?.length > 0
                            ? `${selectedKnowledgeAssets[campaign.id].length} selected`
                            : 'Select assets...'}
                        </span>
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <KnowledgeAssetsDropdown
                        campaign={campaign}
                        knowledgeAssets={knowledgeAssets}
                        selectedAssets={selectedKnowledgeAssets[campaign.id]}
                        isOpen={knowledgeDropdownOpen[campaign.id]}
                        onToggle={() => setKnowledgeDropdownOpen({
                          ...knowledgeDropdownOpen,
                          [campaign.id]: !knowledgeDropdownOpen[campaign.id]
                        })}
                        onUpdate={async (assetId, checked) => {
                          const currentSelected = selectedKnowledgeAssets[campaign.id] || [];
                          let newSelected;
                          
                          if (checked) {
                            newSelected = [...currentSelected, assetId];
                          } else {
                            newSelected = currentSelected.filter(id => id !== assetId);
                          }
                          
                          setSelectedKnowledgeAssets({
                            ...selectedKnowledgeAssets,
                            [campaign.id]: newSelected
                          });
                          
                          // Update in database
                          await updateCampaignKnowledgeLinks(campaign.id, newSelected);
                        }}
                      />
                    </div>
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
                            <span className="text-sm font-medium text-blue-600">AI Engaged</span>
                          </>
                        ) : (
                          <>
                            <ZapOff className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">AI Inactive</span>
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
          <div className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-all duration-500 ease-out ${
            showCreateModal ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
                  <p className="text-sm text-gray-600">Start your AI-powered outreach</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="e.g. Summer Promotion, Q4 Outreach"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaignForm.name.trim()) {
                        handleCreateCampaign();
                      }
                    }}
                    autoFocus
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseModal}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCampaign}
                    disabled={isCreating || !campaignForm.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Campaign'
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