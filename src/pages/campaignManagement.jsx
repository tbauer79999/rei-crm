import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/button';
import supabase from '../lib/supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Archive, 
  ArchiveRestore,
  Zap,
  ZapOff,
  X,
  Building2,
  Megaphone,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  Eye,
  Settings
} from 'lucide-react';

// API Base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Updated KnowledgeAssetsDropdown Component with Fixed Positioning
const KnowledgeAssetsDropdown = ({ campaign, knowledgeAssets, selectedAssets, onUpdate, isOpen, onToggle }) => {
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openUpward, setOpenUpward] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const button = document.getElementById(`knowledge-dropdown-${campaign.id}`);
      if (button) {
        const rect = button.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate absolute position including scroll
        const absoluteTop = rect.top + scrollTop;
        const absoluteLeft = rect.left + scrollLeft;
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 240;
        
        // Determine if dropdown should open upward
        const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
        setOpenUpward(shouldOpenUpward);
        
        // Calculate final position
        const finalTop = shouldOpenUpward 
          ? absoluteTop - dropdownHeight - 4 
          : absoluteTop + rect.height + 4;
        
        // Ensure dropdown doesn't go off-screen horizontally
        const dropdownWidth = Math.max(rect.width, 256);
        let finalLeft = absoluteLeft;
        
        // Check if dropdown would go off the right edge
        if (finalLeft + dropdownWidth > window.innerWidth + scrollLeft) {
          finalLeft = window.innerWidth + scrollLeft - dropdownWidth - 8;
        }
        
        // Check if dropdown would go off the left edge
        if (finalLeft < scrollLeft + 8) {
          finalLeft = scrollLeft + 8;
        }
        
        setDropdownPosition({
          top: finalTop,
          left: finalLeft,
          width: dropdownWidth
        });
      }
    }
  }, [isOpen, campaign.id]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div
      className="fixed z-50"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`
      }}
    >
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
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
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                  />
                  <span className="text-sm flex items-center flex-1 min-w-0">
                    <span className="mr-2 flex-shrink-0">{icon}</span>
                    <span className="truncate" title={displayText}>
                      {displayText}
                    </span>
                  </span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
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

// Enhanced Campaign Progress Component with Delivery Status
const CampaignProgress = ({ campaignId }) => {
  const [progress, setProgress] = useState({ 
    processed: 0, 
    total: 0,
    sent: 0,        // ✅ NEW: Separate sent vs delivered
    delivered: 0,
    failed: 0,
    retries: 0,
    queued: 0
  });
  
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Get lead progress
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, ai_sent')
          .eq('campaign_id', campaignId);
        
        if (leadsError) throw leadsError;
        
        // Get message delivery status for this campaign's leads
        const leadIds = leads?.map(l => l.id) || [];
        
        if (leadIds.length > 0) {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('status, original_message_id')
            .eq('direction', 'outbound')
            .in('lead_id', leadIds);
          
          if (!messagesError && messages) {
            const total = leads.length;
            const processed = leads.filter(l => l.ai_sent).length;
            
            // ✅ UPDATED: Count delivery statuses properly
            const sent = messages.filter(m => m.status === 'sent').length;
            const delivered = messages.filter(m => m.status === 'delivered').length;
            const failed = messages.filter(m => m.status === 'failed' || m.status === 'undelivered').length;
            const retries = messages.filter(m => m.original_message_id !== null).length;
            const queued = messages.filter(m => m.status === 'queued' || m.status === 'pending').length;
            
            setProgress({ 
              processed, 
              total,
              sent,        // ✅ NEW
              delivered,   // ✅ NOW ACCURATE
              failed,
              retries,
              queued
            });
          } else {
            // If no messages or error, just show lead progress
            setProgress({ 
              processed: leads.filter(l => l.ai_sent).length, 
              total: leads.length,
              delivered: 0,
              failed: 0,
              retries: 0,
              queued: 0
            });
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    };
    
    fetchProgress();
    
    // Set up real-time updates
    const interval = setInterval(fetchProgress, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [campaignId]);
  
  if (progress.total === 0) {
    return (
      <div className="space-y-2">
        <span className="text-sm text-gray-500">No leads</span>
      </div>
    );
  }
  
  const percentage = Math.round((progress.processed / progress.total) * 100);
  
  return (
    <div className="space-y-3">
      {/* Main Progress */}
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
      
      {/* Delivery Status Metrics */}
      {progress.processed > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
            <span className="text-gray-600 truncate">Delivered:</span>
            <span className="font-medium text-green-600">{progress.delivered}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            <span className="text-gray-600 truncate">Failed:</span>
            <span className="font-medium text-red-600">{progress.failed}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <RefreshCcw className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="text-gray-600 truncate">Retries:</span>
            <span className="font-medium text-blue-600">{progress.retries}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
            <span className="text-gray-600 truncate">Queued:</span>
            <span className="font-medium text-yellow-600">{progress.queued}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile Campaign Card Component
const CampaignCard = ({ 
  campaign, 
  isGlobalAdmin, 
  tenantNames, 
  salesTeamMembers, 
  phoneNumbers, 
  knowledgeAssets, 
  selectedKnowledgeAssets, 
  knowledgeDropdownOpen, 
  setKnowledgeDropdownOpen,
  showArchived,
  showDynamicColumn,
  getDynamicColumnHeader,
  getDynamicDropdownOptions,
  getStatusBadge,
  updateCampaignAssignment,
  updateCampaignPhoneNumber,
  updateCampaignDynamicField,
  updateCampaignKnowledgeLinks,
  setSelectedKnowledgeAssets,
  toggleAiOn,
  archiveCampaign,
  unarchiveCampaign
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description}</p>
          )}
          {isGlobalAdmin && (
            <div className="flex items-center space-x-2 mt-2">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate">
                {tenantNames[campaign.tenant_id] || campaign.tenants?.name || 'Unknown Tenant'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
          {getStatusBadge(campaign)}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress - Always Visible */}
      <div>
        <CampaignProgress campaignId={campaign.id} />
      </div>

      {/* AI Toggle - Always Visible */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">AI Processing</span>
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
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {/* Assignment */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Assigned To</label>
            <select
              value={campaign.assigned_to_sales_team_id || ''}
              onChange={(e) => updateCampaignAssignment(campaign.id, e.target.value || null)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {salesTeamMembers.map(member => (
                <option key={member.sales_team_id} value={member.sales_team_id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <select
              value={campaign.phone_number_id || ''}
              onChange={(e) => updateCampaignPhoneNumber(campaign.id, e.target.value || null)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No phone assigned</option>
              {phoneNumbers.map(phone => (
                <option key={phone.id} value={phone.id}>
                  {phone.phone_number}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Field */}
          {showDynamicColumn && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{getDynamicColumnHeader()}</label>
              <select
                value={
                  campaign.talk_track || 
                  campaign.service_type || 
                  campaign.vehicle_type || 
                  ''
                }
                onChange={(e) => updateCampaignDynamicField(campaign.id, e.target.value || null)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select {getDynamicColumnHeader().toLowerCase()}...</option>
                {getDynamicDropdownOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Knowledge Assets */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Knowledge Assets</label>
            <div className="relative">
              <button
                id={`knowledge-dropdown-${campaign.id}`}
                onClick={() => setKnowledgeDropdownOpen({
                  ...knowledgeDropdownOpen,
                  [campaign.id]: !knowledgeDropdownOpen[campaign.id]
                })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between bg-white hover:bg-gray-50"
              >
                <span className="truncate">
                  {selectedKnowledgeAssets[campaign.id]?.length > 0
                    ? `${selectedKnowledgeAssets[campaign.id].length} selected`
                    : 'Select knowledge assets...'}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
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
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            {showArchived ? (
              <button 
                className="inline-flex items-center px-3 py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                onClick={() => unarchiveCampaign(campaign.id)}
              >
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Restore
              </button>
            ) : (
              <button 
                className="inline-flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => archiveCampaign(campaign.id)}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </button>
            )}
          </div>
        </div>
      )}
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
  const [tenantIndustry, setTenantIndustry] = useState('');
  const [knowledgeAssets, setKnowledgeAssets] = useState([]);
  const [selectedKnowledgeAssets, setSelectedKnowledgeAssets] = useState({});
  const [knowledgeDropdownOpen, setKnowledgeDropdownOpen] = useState({});
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  
  // Campaign creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: ''
  });

  const isGlobalAdmin = user?.role === 'global_admin';
  const [isFetching, setIsFetching] = useState(false);
  
  useEffect(() => {
    document.title = "Campaign Manager – SurFox";
  }, []);

  // Auto-switch to mobile view on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setViewMode('cards');
      } else {
        setViewMode('table');
      }
    };

    // Set initial view mode
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Update campaign assignment
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

  // Update campaign phone number
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

  // Update campaign dynamic field
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
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      let url = `${API_BASE}/campaigns`;
      const params = new URLSearchParams();
      
      if (isGlobalAdmin && tenantFilter !== 'all') {
        params.append('tenant_id', tenantFilter);
      }
      
      if (showArchived) {
        params.append('show_archived', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const data = await response.json();

      // Fetch additional campaign details
      const campaignIds = data.map(c => c.id);
      if (campaignIds.length > 0) {
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
      console.error('Error fetching campaigns:', err);
      setError(`Failed to load campaigns: ${err.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchSalesTeamMembers = async () => {
    try {
      if (!user?.tenant_id) return;
      
      const { data, error } = await supabase
        .from('sales_team_view')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('is_available', true)
        .order('full_name');

      if (error) throw error;
      
      setSalesTeamMembers(data || []);
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
    } catch (err) {
      console.error('Error fetching tenant names:', err);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const { data: tenantPhones, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('tenant_id', user.tenant_id);
        
      if (error) throw error;
      
      setPhoneNumbers(tenantPhones || []);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
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
    if (!window.confirm('Are you sure you want to archive this campaign?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/archive`, {
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
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/unarchive`, {
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
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { ...c, ai_on: !currentAiOn } : c
        ));
        setError('');
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
    if (!campaignForm.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    setIsCreating(true);
    try {
      if (!user || !user.tenant_id) {
        throw new Error('User authentication information not available.');
      }

      const startDate = new Date().toISOString().split('T')[0];

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: campaignForm.name.trim(),
          startDate: startDate,
          description: null,
          tenant_id: user.tenant_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const newCampaign = await response.json();

      setCampaigns([newCampaign, ...campaigns]);
      setShowCreateModal(false);
      setCampaignForm({ name: '' });
      setError('');
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(`Failed to create campaign: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCampaignForm({ name: '' });
    setError('');
  };

  const getStatusBadge = (campaign) => {
    const isActive = campaign.is_active;
    const isArchived = campaign.archived;
    const aiOn = campaign.ai_on;
    
    if (isArchived) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Archive className="w-3 h-3 mr-1 flex-shrink-0" />
          Archived
        </span>
      );
    }
    
    if (aiOn && isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
          AI Active
        </span>
      );
    } else if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          Ready
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
          Inactive
        </span>
      );
    }
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
      } else if (statusFilter === 'ai_active') {
        matchesStatus = campaign.ai_on === true;
      }

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, statusFilter]);

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
      const isClickInsideButton = event.target.closest('[id^="knowledge-dropdown-"]');
      const isClickInsidePortal = event.target.closest('.fixed.z-50');
      
      if (!isClickInsideButton && !isClickInsidePortal) {
        setKnowledgeDropdownOpen({});
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch stats when filtered campaigns change
  useEffect(() => {
    if (filteredCampaigns.length > 0) {
      fetchCampaignStats();
    } else {
      setCampaignStats({ totalLeads: 0, processedLeads: 0, remainingLeads: 0 });
    }
  }, [filteredCampaigns]);

  // Add this new useEffect
useEffect(() => {
  const checkJWT = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Decode the JWT to see what claims are inside
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      console.log('JWT payload:', payload);
      console.log('tenant_id in JWT:', payload.tenant_id);
      console.log('role in JWT:', payload.role);
    }
  };
  checkJWT();
}, []);

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
    <div className="space-y-4 lg:space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
            {showArchived ? 'Archived Campaigns' : 'Campaign Management'}
          </h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">
            {showArchived 
              ? 'View and restore archived campaigns'
              : 'Create, manage, and track your messaging campaigns'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Desktop View Toggle */}
          <div className="hidden lg:flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cards
            </button>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className="inline-flex items-center px-3 lg:px-4 py-2"
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Show Active</span>
                <span className="sm:hidden">Active</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Show Archived</span>
                <span className="sm:hidden">Archived</span>
              </>
            )}
          </Button>
          {!showArchived && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 lg:px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Create Campaign</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div className="ml-3 lg:ml-4 min-w-0 flex-1">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Campaigns</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
            </div>
            <div className="ml-3 lg:ml-4 min-w-0 flex-1">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Leads Analyzed</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{campaignStats.processedLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {campaignStats.totalLeads > 0 
                  ? `${Math.round((campaignStats.processedLeads / campaignStats.totalLeads) * 100)}% complete`
                  : 'No leads yet'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
            </div>
            <div className="ml-3 lg:ml-4 min-w-0 flex-1">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{campaignStats.remainingLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {campaignStats.remainingLeads > 0 && activeCampaigns > 0
                  ? `~${Math.ceil(campaignStats.remainingLeads / (activeCampaigns * 120))} hrs`
                  : campaignStats.remainingLeads > 0 ? 'Start campaigns' : 'All processed'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div className="ml-3 lg:ml-4 min-w-0 flex-1">
              <p className="text-xs lg:text-sm font-medium text-gray-600">AI Speed</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {activeCampaigns > 0 ? `${activeCampaigns * 120}` : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">leads/hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={isGlobalAdmin ? "Search campaigns or tenants..." : "Search campaigns..."}
                className="w-full pl-10 pr-4 py-2 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-3">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            
            {/* Status Filter */}
            <select
              className="border border-gray-300 rounded-lg px-2 lg:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base min-w-0 flex-1 lg:flex-initial"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ai_active">AI Active</option>
            </select>

            {/* Tenant Filter - Only for Global Admins */}
            {isGlobalAdmin && (
              <select
                className="border border-gray-300 rounded-lg px-2 lg:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base min-w-0 flex-1 lg:flex-initial"
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

      {/* Campaign List - Responsive Layout */}
      {viewMode === 'cards' ? (
        /* Mobile/Card View */
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isGlobalAdmin={isGlobalAdmin}
              tenantNames={tenantNames}
              salesTeamMembers={salesTeamMembers}
              phoneNumbers={phoneNumbers}
              knowledgeAssets={knowledgeAssets}
              selectedKnowledgeAssets={selectedKnowledgeAssets}
              knowledgeDropdownOpen={knowledgeDropdownOpen}
              setKnowledgeDropdownOpen={setKnowledgeDropdownOpen}
              showArchived={showArchived}
              showDynamicColumn={showDynamicColumn}
              getDynamicColumnHeader={getDynamicColumnHeader}
              getDynamicDropdownOptions={getDynamicDropdownOptions}
              getStatusBadge={getStatusBadge}
              updateCampaignAssignment={updateCampaignAssignment}
              updateCampaignPhoneNumber={updateCampaignPhoneNumber}
              updateCampaignDynamicField={updateCampaignDynamicField}
              updateCampaignKnowledgeLinks={updateCampaignKnowledgeLinks}
              setSelectedKnowledgeAssets={setSelectedKnowledgeAssets}
              toggleAiOn={toggleAiOn}
              archiveCampaign={archiveCampaign}
              unarchiveCampaign={unarchiveCampaign}
            />
          ))}
        </div>
      ) : (
        /* Desktop Table View */
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
                    Progress & Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment & Phone
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
                    AI Toggle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <div className="text-sm text-gray-500">
                          {campaign.description || 'No description'}
                        </div>
                      </div>
                    </td>
                    {isGlobalAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 truncate">
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
                      <div className="space-y-2">
                        {/* Assigned To */}
                        <div>
                          <select
                            value={campaign.assigned_to_sales_team_id || ''}
                            onChange={(e) => updateCampaignAssignment(campaign.id, e.target.value || null)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                            title={campaign.assigned_to_name ? `Assigned to ${campaign.assigned_to_name}` : 'Not assigned'}
                          >
                            <option value="">Unassigned</option>
                            {salesTeamMembers.map(member => (
                              <option key={member.sales_team_id} value={member.sales_team_id}>
                                {member.full_name || member.email}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Phone Number */}
                        <div>
                          <select
                            value={campaign.phone_number_id || ''}
                            onChange={(e) => updateCampaignPhoneNumber(campaign.id, e.target.value || null)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                            title={campaign.phone_number ? `Current: ${campaign.phone_number}` : 'Not assigned'}
                          >
                            <option value="">No phone assigned</option>
                            {phoneNumbers.map(phone => (
                              <option key={phone.id} value={phone.id}>
                                {phone.phone_number}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
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
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
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
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between min-w-[120px] bg-white hover:bg-gray-50"
                        >
                          <span className="truncate">
                            {selectedKnowledgeAssets[campaign.id]?.length > 0
                              ? `${selectedKnowledgeAssets[campaign.id].length} selected`
                              : 'Select...'}
                          </span>
                          <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <div className="flex items-center justify-center">
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
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        {showArchived ? (
                          <button 
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Restore Campaign"
                            onClick={() => unarchiveCampaign(campaign.id)}
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Archive Campaign"
                            onClick={() => archiveCampaign(campaign.id)}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCampaigns.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 lg:p-12">
          <div className="text-center">
            {showArchived ? (
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : (
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showArchived ? 'No archived campaigns found' : 'No campaigns found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out z-40 ${
              showCreateModal ? 'bg-opacity-50' : 'bg-opacity-0'
            }`} 
            onClick={handleCloseModal}
          ></div>
          
          {/* Sliding Modal - Responsive */}
          <div className={`fixed right-0 top-0 h-full w-full sm:max-w-lg bg-white shadow-2xl z-50 transform transition-all duration-500 ease-out ${
            showCreateModal ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
            <div className="p-4 lg:p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
                  <p className="text-sm text-gray-600 mt-1">Start your AI-powered outreach</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="e.g. Summer Promotion, Q4 Outreach"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && campaignForm.name.trim()) {
                        handleCreateCampaign();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 flex-shrink-0">
                <Button 
                  variant="outline" 
                  onClick={handleCloseModal}
                  disabled={isCreating}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCampaign}
                  disabled={isCreating || !campaignForm.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
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
        </>
      )}
    </div>
  );
}