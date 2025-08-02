import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PERMISSIONS } from '../../lib/permissions';
import supabase from '../../lib/supabaseClient.js';
import {
  Brain,
  MessageSquare,
  Clock,
  Wand2,
  Save,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  MessageCircle,
  Zap,
  Target,
  BarChart3,
  Copy,
  RotateCcw,
  Filter,
  Search,
  Edit3,
  Play,
  Pause,
  Activity,
  Users,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  buildInstructionBundle,
  buildInitialInstruction,
  buildFollowupInstruction  
} from '../../lib/instructionBuilder.js';

const EnterpriseAIStrategyHub = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Permission checks
  const canViewAISettings = hasPermission(PERMISSIONS.VIEW_EDIT_AI_SETTINGS) || hasPermission(PERMISSIONS.VIEW_AI_BUNDLE_PREVIEW);
  const canEditAISettings = hasPermission(PERMISSIONS.VIEW_EDIT_AI_SETTINGS);
  const canEditInstructions = hasPermission(PERMISSIONS.EDIT_TONE_PERSONA_INDUSTRY_INSTRUCTIONS);
  const canRebuildBundle = hasPermission(PERMISSIONS.REBUILD_AI_INSTRUCTION_BUNDLE);
  const canViewBundlePreview = hasPermission(PERMISSIONS.VIEW_AI_BUNDLE_PREVIEW);

  // Strategy Configuration State
  const [strategyConfig, setStrategyConfig] = useState({
    businessName: '',
    industry: '',
    role: '',
    
    // Initial Instructions (First Contact)
    initialTone: '',
    initialPersona: '',
    
    // Engagement Instructions (Ongoing)
    engagementTone: '',
    engagementPersona: '',
    
    followups: [
      {
        id: 1,
        day: 3,
        type: 'gentle_reminder',
        tone: '',
        persona: '',
        enabled: true
      },
      {
        id: 2,
        day: 7,
        type: 'value_add',
        tone: '',
        persona: '',
        enabled: true
      },
      {
        id: 3,
        day: 14,
        type: 'final_attempt',
        tone: '',
        persona: '',
        enabled: true
      }
    ]
  });

  // Mock campaigns data (replace with real API call)
  const [campaigns, setCampaigns] = useState([
    { 
      id: '1', 
      name: 'Q1 Enterprise Outreach', 
      status: 'active', 
      leads: 1247, 
      conversion: 12.3,
      lastModified: '2024-01-15',
      strategy: 'consultative',
      aiPersona: 'Sales Consultant',
      industry: 'Technology'
    },
    { 
      id: '2', 
      name: 'Fortune 500 Warm Leads', 
      status: 'active', 
      leads: 89, 
      conversion: 18.7,
      lastModified: '2024-01-12',
      strategy: 'aggressive_sales',
      aiPersona: 'Senior Account Executive',
      industry: 'Enterprise Software'
    },
    { 
      id: '3', 
      name: 'Webinar Follow-up Sequence', 
      status: 'paused', 
      leads: 456, 
      conversion: 8.1,
      lastModified: '2024-01-10',
      strategy: 'gentle_nurture',
      aiPersona: 'Marketing Specialist',
      industry: 'Education Technology'
    }
  ]);

  const strategyTemplates = [
    {
      id: 'consultative',
      name: 'Consultative Sales',
      description: 'Relationship-first approach with value-driven messaging',
      icon: '🤝',
      industry: 'B2B SaaS',
      avgConversion: '14.2%',
      followupCount: 3,
      timeline: '21 days',
      tone: 'Professional & Consultative',
      persona: 'Trusted Advisor'
    },
    {
      id: 'aggressive_sales',
      name: 'High-Velocity Sales',
      description: 'Fast-paced, conversion-focused with urgency triggers',
      icon: '🎯',
      industry: 'Enterprise',
      avgConversion: '18.3%',
      followupCount: 3,
      timeline: '14 days',
      tone: 'Assertive & Confident',
      persona: 'Closer'
    },
    {
      id: 'gentle_nurture',
      name: 'Long-term Nurture',
      description: 'Patient relationship building with educational content',
      icon: '🌱',
      industry: 'Healthcare',
      avgConversion: '9.1%',
      followupCount: 3,
      timeline: '45 days',
      tone: 'Empathetic & Supportive',
      persona: 'Educator'
    }
  ];

  const industryOptions = {
    'Real Estate': ['Wholesaler', 'Retail Agent', 'Lead Qualifier', 'Appointment Setter'],
    'Staffing': ['Recruiter', 'Interview Coordinator', 'Client Relations'],
    'Home Services': ['Contractor', 'Estimator', 'Appointment Scheduler'],
    'Legal Intake': ['Intake Assistant', 'Client Support', 'Case Qualifier'],
    'Healthcare': ['Clinic Intake', 'Follow-Up Coordinator', 'Patient Support'],
    'Insurance': ['Agent', 'Renewal Support', 'Claims Assistant'],
    'Education': ['Admissions', 'Enrollment Support', 'Student Services'],
    'Consulting': ['Business Consultant', 'Sales Advisor', 'Client Manager'],
    'Finance': ['Financial Advisor', 'Loan Officer', 'Investment Consultant'],
    'Other': ['Sales Rep', 'Lead Nurturer', 'Customer Support']
  };

  const toneOptions = [
    'Friendly & Casual',
    'Assertive & Confident',
    'Aggressive & Bold',
    'Neutral & Professional',
    'Empathetic & Supportive'
  ];

  const initialPersonaOptions = [
    'Icebreaker / Intro',
    'Lead Qualifier',
    'FAQ Assistant',
    'Information Gatherer',
    'First Contact Specialist'
  ];

  const engagementPersonaOptions = [
    'Nurturer',
    'Appointment Setter',
    'Closer',
    'Relationship Builder',
    'Follow-up Specialist',
    'Objection Handler'
  ];

  const followupPersonaOptions = [
    'Gentle Reminder',
    'Value Provider',
    'Urgency Creator',
    'Relationship Builder',
    'Closing Specialist',
    'Final Attempt'
  ];

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    // Use the environment variable you already have set
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // For development
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001';
    }
    
    // Fallback
    return 'https://api.getsurfox.com/api';
  };

  // API helper function with better error handling
  const callAPI = async (endpoint, options = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const apiBaseUrl = getApiBaseUrl();
      const fullUrl = `${apiBaseUrl}${endpoint}`;

      console.log('Making API call to:', fullUrl);

      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        // Check if response is HTML (common when API endpoint doesn't exist)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API endpoint not found. Expected JSON but received HTML. Check your API URL: ${fullUrl}`);
        }

        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `Server error (${response.status}): ${errorText}` };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      // Check if response is actually JSON
      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Load existing configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!user?.tenant_id || !canViewAISettings) {
        setLoading(false);
        return;
      }

      try {
        // Updated to use the correct endpoint format
        const settings = await callAPI(`/settings?tenant_id=${user.tenant_id}`);
        
        // Extract configuration from existing settings
        const extractLine = (bundle, label) => {
          const match = bundle?.match(new RegExp(`${label}:\\s*(.+)`));
          return match ? match[1].trim() : '';
        };

        const initialBundle = settings['ai_instruction_initial']?.value || '';
        const engagementBundle = settings['aiinstruction_bundle']?.value || '';

        setStrategyConfig(prev => ({
          ...prev,
          businessName: extractLine(engagementBundle, 'BUSINESS_NAME') || 'Your Business',
          industry: extractLine(engagementBundle, 'INDUSTRY') || '',
          role: extractLine(engagementBundle, 'ROLE') || '',
          initialTone: extractLine(initialBundle, 'TONE') || '',
          initialPersona: extractLine(initialBundle, 'PERSONA') || '',
          engagementTone: extractLine(engagementBundle, 'TONE') || '',
          engagementPersona: extractLine(engagementBundle, 'PERSONA') || ''
        }));

      } catch (err) {
        console.error('Error loading configuration:', err);
        setError(`Failed to load existing configuration: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [user?.tenant_id, canViewAISettings]);

  // Dashboard Component
  const CampaignDashboard = () => {
    const filteredCampaigns = campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || campaign.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-8">
        {/* Permission Check Alert */}
        {!canEditAISettings && canViewAISettings && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-800">
              You have read-only access to AI settings. Admin permissions required to modify AI strategies and instructions.
            </span>
          </div>
        )}

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Campaigns</p>
                <p className="text-3xl font-bold">{campaigns.length}</p>
                <p className="text-blue-100 text-xs mt-1">↑ 2 new this month</p>
              </div>
              <Target className="w-10 h-10 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Avg. Conversion</p>
                <p className="text-3xl font-bold">13.0%</p>
                <p className="text-green-100 text-xs mt-1">↑ 2.1% vs last month</p>
              </div>
              <BarChart3 className="w-10 h-10 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Active Leads</p>
                <p className="text-3xl font-bold">1,792</p>
                <p className="text-purple-100 text-xs mt-1">Across all campaigns</p>
              </div>
              <Users className="w-10 h-10 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Messages Sent</p>
                <p className="text-3xl font-bold">12.8K</p>
                <p className="text-orange-100 text-xs mt-1">This month</p>
              </div>
              <MessageSquare className="w-10 h-10 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Campaign Portfolio</h2>
              <p className="text-gray-600 mt-1">Manage AI strategies across all your campaigns</p>
            </div>
            {canEditInstructions && (
              <button 
                onClick={() => {
                  setSelectedCampaign(null);
                  setActiveTab('strategy');
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Strategy</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Campaign Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => {
                  if (canViewAISettings) {
                    setSelectedCampaign(campaign);
                    setActiveTab('strategy');
                  }
                }}
                className={`bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group ${
                  canViewAISettings ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      campaign.status === 'active' ? 'bg-green-500' : 
                      campaign.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      campaign.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {campaign.status.toUpperCase()}
                    </span>
                  </div>
                  {canViewAISettings && (
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  )}
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-3">{campaign.name}</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Active Leads</span>
                    <span className="font-bold text-gray-900">{campaign.leads.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Conversion Rate</span>
                    <span className="font-bold text-green-600">{campaign.conversion}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">AI Persona</span>
                    <span className="font-medium text-gray-900 text-sm">{campaign.aiPersona}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Modified {campaign.lastModified}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded-full capitalize text-gray-700">
                      {campaign.strategy.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">AI Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">Top Performing Persona</h4>
              <div className="text-2xl font-bold text-blue-600">Senior Account Executive</div>
              <div className="text-sm text-blue-700">18.7% avg conversion</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <h4 className="font-medium text-green-900 mb-2">Optimal Follow-up Timing</h4>
              <div className="text-2xl font-bold text-green-600">Day 3</div>
              <div className="text-sm text-green-700">23.4% response rate</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="font-medium text-purple-900 mb-2">Best Industry Strategy</h4>
              <div className="text-2xl font-bold text-purple-600">Consultative</div>
              <div className="text-sm text-purple-700">For B2B SaaS campaigns</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Strategy Builder Component
  const StrategyBuilder = () => {
    const applyTemplate = (template) => {
      if (!canEditInstructions) {
        setError("You don't have permission to modify AI instructions.");
        return;
      }

      setStrategyConfig(prev => ({
        ...prev,
        initialTone: template.tone,
        initialPersona: initialPersonaOptions[0], // Default to first option
        engagementTone: template.tone,
        engagementPersona: template.persona,
        followups: prev.followups.map((followup, index) => ({
          ...followup,
          tone: template.tone,
          persona: followupPersonaOptions[index] || 'Gentle Reminder'
        }))
      }));
      setUnsavedChanges(true);
    };

    const updateFollowup = (index, field, value) => {
      if (!canEditInstructions) {
        setError("You don't have permission to modify AI instructions.");
        return;
      }

      setStrategyConfig(prev => ({
        ...prev,
        followups: prev.followups.map((followup, i) => 
          i === index ? { ...followup, [field]: value } : followup
        )
      }));
      setUnsavedChanges(true);
    };

    const updateStrategyConfig = (field, value) => {
      if (!canEditInstructions) {
        setError("You don't have permission to modify AI instructions.");
        return;
      }

      setStrategyConfig(prev => ({ ...prev, [field]: value }));
      setUnsavedChanges(true);
    };

    const saveStrategy = async () => {
      if (!canRebuildBundle) {
        setError("You don't have permission to rebuild AI instruction bundles.");
        return;
      }

      setSaving(true);
      setError('');
      setSuccess('');

      try {
        if (!user?.tenant_id) {
          throw new Error('Authentication required');
        }
          console.log('Debug: strategyConfig.businessName =', strategyConfig.businessName);
          const initialBundle = buildInitialInstruction({
            tone: strategyConfig.initialTone,
            persona: strategyConfig.initialPersona,
            industry: strategyConfig.industry,
            role: strategyConfig.role,
            leadDetails: strategyConfig.leadDetails || {},
            knowledgeBase: strategyConfig.knowledgeBase || '',
            campaignMetadata: strategyConfig.campaignMetadata || {},
            platformSettings: settingsPayload  // ← ADD THIS LINE
          });

          const engagementBundle = buildInstructionBundle({
            tone: strategyConfig.engagementTone,
            persona: strategyConfig.engagementPersona,
            industry: strategyConfig.industry,
            role: strategyConfig.role,
            leadDetails: strategyConfig.leadDetails || {},
            knowledgeBase: strategyConfig.knowledgeBase || '',
            campaignMetadata: strategyConfig.campaignMetadata || {},
            platformSettings: settingsPayload  // ← ADD THIS LINE
          });

        // Build follow-up bundles
        const followupBundles = strategyConfig.followups.map((followup, index) => 
          buildFollowupInstruction({
            tone: followup.tone || strategyConfig.engagementTone,
            persona: followup.persona,
            industry: strategyConfig.industry,
            role: strategyConfig.role,
            leadDetails: strategyConfig.leadDetails || {},
            knowledgeBase: strategyConfig.knowledgeBase || '',
            campaignMetadata: strategyConfig.campaignMetadata || {},
            followupStage: index + 1,
            platformSettings: settingsPayload  // ← ADD THIS LINE
          })
        );

            const settingsPayload = {
              ai_instruction_initial: { value: initialBundle },
              aiinstruction_bundle: { value: engagementBundle },
              ai_instruction_followup_1: { value: followupBundles[0] || '' },
              ai_instruction_followup_2: { value: followupBundles[1] || '' },
              ai_instruction_followup_3: { value: followupBundles[2] || '' },
              followup_delay_1: { value: strategyConfig.followups[0]?.day.toString() || '3' },
              followup_delay_2: { value: strategyConfig.followups[1]?.day.toString() || '7' },
              followup_delay_3: { value: strategyConfig.followups[2]?.day.toString() || '14' },
              ai_representative_name: { value: strategyConfig.businessName }  // ← ADD THIS LINE
              };

        // Updated to use the correct endpoint format
        await callAPI('/settings', {
          method: 'PUT',
          body: JSON.stringify({ 
            settings: settingsPayload, 
            tenant_id: user.tenant_id 
          })
        });

        setSuccess('AI strategy saved successfully!');
        setUnsavedChanges(false);
        setTimeout(() => setSuccess(''), 3000);

      } catch (err) {
        console.error('Failed to save strategy:', err);
        setError(`Save failed: ${err.message}`);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-8">
        {/* Strategy Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCampaign ? `Configure ${selectedCampaign.name}` : 'AI Strategy Builder'}
              </h2>
              <p className="text-gray-600 mt-1">Design your AI persona and automated follow-up sequence</p>
            </div>
            <div className="flex items-center space-x-3">
              {unsavedChanges && canEditInstructions && (
                <div className="flex items-center space-x-2 text-orange-600 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Unsaved changes</span>
                </div>
              )}
              {canRebuildBundle && (
                <button
                  onClick={saveStrategy}
                  disabled={saving || !canEditInstructions}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Strategy</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Permission Check Alert */}
          {!canEditInstructions && canViewAISettings && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <span className="text-yellow-800">
                You have read-only access to AI instructions. Admin permissions required to modify AI strategies.
              </span>
            </div>
          )}

          {/* Core AI Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Representative Name
              </label>
              <input
                type="text"
                value={strategyConfig.businessName}
                onChange={(e) => updateStrategyConfig('businessName', e.target.value)}
                disabled={!canEditInstructions}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., Sarah Thompson, Mike Chen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={strategyConfig.industry}
                onChange={(e) => {
                  if (canEditInstructions) {
                    setStrategyConfig(prev => ({ ...prev, industry: e.target.value, role: '' }));
                    setUnsavedChanges(true);
                  }
                }}
                disabled={!canEditInstructions}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select industry</option>
                {Object.keys(industryOptions).map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {strategyConfig.industry && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={strategyConfig.role}
                  onChange={(e) => updateStrategyConfig('role', e.target.value)}
                  disabled={!canEditInstructions}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select role</option>
                  {industryOptions[strategyConfig.industry].map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Initial vs Engagement Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Initial Instructions */}
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900">Initial Contact Instructions</h3>
                  <p className="text-blue-700 text-sm">How AI introduces itself and makes first contact</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Initial Tone
                  </label>
                  <select
                    value={strategyConfig.initialTone}
                    onChange={(e) => updateStrategyConfig('initialTone', e.target.value)}
                    disabled={!canEditInstructions}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select tone</option>
                    {toneOptions.map(tone => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Initial Persona
                  </label>
                  <select
                    value={strategyConfig.initialPersona}
                    onChange={(e) => updateStrategyConfig('initialPersona', e.target.value)}
                    disabled={!canEditInstructions}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select persona</option>
                    {initialPersonaOptions.map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Engagement Instructions */}
            <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Engagement Instructions</h3>
                  <p className="text-green-700 text-sm">How AI nurtures and advances prospects</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-900 mb-2">
                    Engagement Tone
                  </label>
                  <select
                    value={strategyConfig.engagementTone}
                    onChange={(e) => updateStrategyConfig('engagementTone', e.target.value)}
                    disabled={!canEditInstructions}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select tone</option>
                    {toneOptions.map(tone => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-900 mb-2">
                    Engagement Persona
                  </label>
                  <select
                    value={strategyConfig.engagementPersona}
                    onChange={(e) => updateStrategyConfig('engagementPersona', e.target.value)}
                    disabled={!canEditInstructions}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select persona</option>
                    {engagementPersonaOptions.map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Templates */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategyTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-6 border border-gray-200 rounded-xl transition-all hover:shadow-md ${
                  canEditInstructions 
                    ? 'hover:border-blue-300 cursor-pointer' 
                    : 'opacity-75 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">{template.icon}</span>
                  <div>
                    <h4 className="font-bold text-gray-900">{template.name}</h4>
                    <p className="text-xs text-gray-500">{template.timeline} • {template.followupCount} messages</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="text-green-600 font-medium">{template.avgConversion} conversion</span>
                  <span className="text-gray-500">{template.industry}</span>
                </div>
                <button 
                  onClick={() => applyTemplate(template)}
                  disabled={!canEditInstructions}
                  className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {canEditInstructions ? 'Apply Template' : 'View Only'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Sequence */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Follow-up Sequence</h3>
          
          <div className="space-y-6">
            {strategyConfig.followups.map((followup, index) => (
              <div key={followup.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Follow-up {index + 1}</div>
                      <div className="text-sm text-gray-600 capitalize">{followup.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={followup.enabled}
                      onChange={(e) => updateFollowup(index, 'enabled', e.target.checked)}
                      disabled={!canEditInstructions}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delay (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={followup.day}
                      onChange={(e) => updateFollowup(index, 'day', parseInt(e.target.value))}
                      disabled={!canEditInstructions}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Communication Tone
                    </label>
                    <select
                      value={followup.tone || strategyConfig.engagementTone}
                      onChange={(e) => updateFollowup(index, 'tone', e.target.value)}
                      disabled={!canEditInstructions}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Use engagement tone</option>
                      {toneOptions.map(tone => (
                        <option key={tone} value={tone}>{tone}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Follow-up Persona
                    </label>
                    <select
                      value={followup.persona}
                      onChange={(e) => updateFollowup(index, 'persona', e.target.value)}
                      disabled={!canEditInstructions}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select persona</option>
                      {followupPersonaOptions.map(persona => (
                        <option key={persona} value={persona}>{persona}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Visualization */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-4">Follow-up Timeline</h4>
            <div className="flex items-center space-x-4 text-sm overflow-x-auto">
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>Day 0: Initial Contact</span>
              </div>
              {strategyConfig.followups.map((followup, index) => (
                <React.Fragment key={followup.id}>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center space-x-2 whitespace-nowrap">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-emerald-500' : 'bg-purple-500'
                    }`}></div>
                    <span>Day {followup.day}: {followup.persona || 'Follow-up'}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Projection */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Strategy Performance Projection</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.max(...strategyConfig.followups.map(f => f.day))}
              </div>
              <div className="text-sm text-gray-600">Total Days</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">14.2%</div>
              <div className="text-sm text-gray-600">Est. Conversion</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {strategyConfig.followups.filter(f => f.enabled).length + 1}
              </div>
              <div className="text-sm text-gray-600">Touch Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">87%</div>
              <div className="text-sm text-gray-600">Engagement Rate</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Permission check - show access denied if user can't view AI settings
  if (!canViewAISettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to view AI instruction settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">AI Strategy Hub</span>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('strategy')}
                  disabled={!canViewAISettings}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors disabled:cursor-not-allowed disabled:text-gray-400 ${
                    activeTab === 'strategy'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Strategy Builder
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        )}

        {/* Breadcrumb */}
        {selectedCampaign && activeTab === 'strategy' && (
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedCampaign(null);
                }}
                className="hover:text-gray-700"
              >
                All Campaigns
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">{selectedCampaign.name}</span>
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && <CampaignDashboard />}
        {activeTab === 'strategy' && <StrategyBuilder />}
      </div>
    </div>
  );
};

export default EnterpriseAIStrategyHub;