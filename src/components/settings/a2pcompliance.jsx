import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle, 
  Phone, 
  Plus, 
  Settings,
  FileText,
  Users,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Zap,
  Building2,
  Eye,
  X,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

const A2PCompliance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [brandData, setBrandData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Brand form state
  const [brandForm, setBrandForm] = useState({
    company_name: '',
    company_type: 'CORPORATION',
    ein: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    email: '',
    website: '',
    vertical: 'TECHNOLOGY'
  });

  // Load A2P data function
  const loadA2pData = async () => {
    try {
      console.log('Loading A2P data...');
      
      // Load A2P status from your Edge Function
      const { data: statusData, error: statusError } = await supabase.functions.invoke('get-a2p-status');
      
      if (statusError) {
        console.error('Error loading A2P status:', statusError);
        setError('Failed to load A2P status');
        return;
      }

      if (statusData && statusData.success) {
        setStatusData(statusData);
        setBrandData(statusData.brand);
        setCampaigns(statusData.campaigns || []);
      }

      // Load phone numbers for assignments
      const { data: phoneData, error: phoneError } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'list' }
      });
      
      if (!phoneError && phoneData && phoneData.phoneNumbers) {
        setPhoneNumbers(phoneData.phoneNumbers);
      }

    } catch (error) {
      console.error('Error loading A2P data:', error);
      setError('Failed to load A2P data');
    }
  };

  // Auto-refresh when switching tabs
  useEffect(() => {
    if (activeTab !== 'overview') {
      loadA2pData();
    }
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    loadA2pData();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Create brand API call
  const createBrand = async (data) => {
    setLoading(true);
    setError('');
    try {
      const { data: result, error } = await supabase.functions.invoke('create-a2p-brand', {
        body: data
      });
      
      if (error) throw error;
      
      if (result && result.success) {
        setBrandData(result.brand);
        setSuccess('Brand registration submitted successfully! A2P campaigns will be automatically created when you start messaging.');
        return { success: true };
      } else {
        return { success: false, error: result?.message || 'Unknown error occurred' };
      }
    } catch (error) {
      console.error('Brand creation failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    setError('');
    try {
      await loadA2pData();
      setSuccess('Status refreshed successfully');
    } catch (error) {
      console.error('Status refresh failed:', error);
      setError('Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
  };

  const assignPhoneToA2P = async (phoneId, campaignId, action) => {
    try {
      setError('');
      const { data: result, error } = await supabase.functions.invoke('assign-phone-to-campaign', {
        body: {
          phone_number_id: phoneId,
          a2p_campaign_id: campaignId,
          action: action
        }
      });
      
      if (error) throw error;
      
      if (result && result.success) {
        // Reload phone numbers to reflect changes
        await loadA2pData();
        setSuccess(`Phone number ${action === 'assign' ? 'assigned to' : 'unassigned from'} A2P campaign successfully`);
        return { success: true };
      } else {
        setError(result?.message || 'Failed to update phone assignment');
        return { success: false, error: result?.message };
      }
    } catch (error) {
      console.error('Phone assignment failed:', error);
      setError('Failed to update phone assignment');
      return { success: false, error: error.message };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PENDING': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'IN_REVIEW': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'FAILED': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'IN_REVIEW': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FAILED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleBrandSubmit = async () => {
    // Validate required fields
    const requiredFields = ['company_name', 'company_type', 'phone', 'street', 'city', 'state', 'postal_code', 'email', 'vertical'];
    const missingFields = requiredFields.filter(field => !brandForm[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const result = await createBrand(brandForm);
    if (!result.success) {
      setError(`Brand registration failed: ${result.error}`);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.substring(1);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return phoneNumber;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            A2P Compliance
          </h1>
          <p className="text-gray-600 mt-2">
            Register your business for SMS compliance. Campaigns will be automatically created when needed.
          </p>
        </div>
        <button
          onClick={refreshStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Brand Status</p>
              <div className="flex items-center gap-2 mt-1">
                {brandData ? getStatusIcon(brandData.status) : <AlertCircle className="h-5 w-5 text-gray-400" />}
                <span className="font-semibold">{brandData?.status || 'Not Created'}</span>
              </div>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Auto Campaigns</p>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">{campaigns.length} Created</span>
              </div>
            </div>
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Phone Numbers</p>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-5 w-5 text-green-500" />
                <span className="font-semibold">{phoneNumbers.filter(p => p.a2p_campaign_id).length} Assigned</span>
              </div>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance</p>
              <div className="flex items-center gap-2 mt-1">
                {brandData?.status === 'VERIFIED' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-700">Ready</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-700">Setup Needed</span>
                  </>
                )}
              </div>
            </div>
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'campaigns', label: 'Auto Campaigns', icon: Zap },
            { id: 'assignments', label: 'Phone Assignments', icon: Phone }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Existing Brand Display */}
          {brandData && (
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(brandData.status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(brandData.status)}
                    <h3 className="text-lg font-semibold">{brandData.company_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(brandData.status)}`}>
                      {brandData.status}
                    </span>
                  </div>
                  <p className="text-sm mt-1">EIN: {brandData.ein || 'Not provided'} | {brandData.vertical}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {brandData.status === 'VERIFIED' 
                      ? '✅ Your business is verified for A2P messaging. Campaigns will be created automatically when you send messages.'
                      : brandData.status === 'PENDING'
                      ? '⏳ Brand registration is under review. This typically takes 1-5 business days.'
                      : brandData.status === 'FAILED'
                      ? '❌ Brand registration was rejected. Please check the details and resubmit.'
                      : '⏳ Brand registration is being processed.'
                    }
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          )}

          {/* Auto-Campaign Info */}
          {brandData?.status === 'VERIFIED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Automatic A2P Campaign Management</h3>
                  <p className="text-blue-800 mb-3">
                    SurFox automatically creates and manages A2P campaigns based on your messaging activity:
                  </p>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span><strong>AI Follow-ups</strong> → Customer Care Campaign</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span><strong>Promotional Messages</strong> → Marketing Campaign</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span><strong>Appointment Reminders</strong> → Account Notification Campaign</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span><strong>Lead Re-engagement</strong> → Customer Care Campaign</span>
                    </div>
                  </div>
                  <p className="text-blue-600 mt-3 text-sm">
                    Phone numbers are automatically assigned to the appropriate campaigns when you start messaging.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Brand Registration Form */}
          {!brandData && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">Register Your Business Brand</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Register your business with carriers for A2P compliance. This one-time setup enables compliant SMS messaging.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={brandForm.company_name}
                      onChange={(e) => setBrandForm({ ...brandForm, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your Business Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Type *</label>
                    <select
                      required
                      value={brandForm.company_type}
                      onChange={(e) => setBrandForm({ ...brandForm, company_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="CORPORATION">Corporation</option>
                      <option value="LLC">LLC</option>
                      <option value="PARTNERSHIP">Partnership</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                      <option value="NON_PROFIT">Non-Profit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EIN (Tax ID)</label>
                    <input
                      type="text"
                      value={brandForm.ein}
                      onChange={(e) => setBrandForm({ ...brandForm, ein: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="12-3456789 (Optional but recommended)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone *</label>
                    <input
                      type="tel"
                      required
                      value={brandForm.phone}
                      onChange={(e) => setBrandForm({ ...brandForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+15551234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={brandForm.street}
                      onChange={(e) => setBrandForm({ ...brandForm, street: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={brandForm.city}
                      onChange={(e) => setBrandForm({ ...brandForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Orlando"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={brandForm.state}
                      onChange={(e) => setBrandForm({ ...brandForm, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="FL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={brandForm.postal_code}
                      onChange={(e) => setBrandForm({ ...brandForm, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="32801"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={brandForm.email}
                      onChange={(e) => setBrandForm({ ...brandForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@yourbusiness.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={brandForm.website}
                      onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://yourbusiness.com (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry Vertical *</label>
                    <select
                      required
                      value={brandForm.vertical}
                      onChange={(e) => setBrandForm({ ...brandForm, vertical: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="TECHNOLOGY">Technology</option>
                      <option value="HEALTHCARE">Healthcare</option>
                      <option value="FINANCIAL">Financial Services</option>
                      <option value="RETAIL">Retail</option>
                      <option value="EDUCATION">Education</option>
                      <option value="REAL_ESTATE">Real Estate</option>
                      <option value="AUTOMOTIVE">Automotive</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <select
                      required
                      value={brandForm.country}
                      onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBrandSubmit}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {loading ? 'Registering Brand...' : 'Register Business Brand'}
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-gray-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How A2P Compliance Works</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>1. Brand Registration:</strong> Register your business once with carriers</p>
                  <p><strong>2. Auto Campaign Creation:</strong> SurFox creates campaigns automatically based on message types</p>
                  <p><strong>3. Phone Assignment:</strong> Numbers are assigned to appropriate campaigns when messaging starts</p>
                  <p><strong>4. Compliant Messaging:</strong> All messages are sent through verified, compliant pathways</p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Registration typically takes 1-5 business days for approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Existing Auto-Created Campaigns */}
          {campaigns.length > 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Auto-Created Campaigns
              </h3>
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className={`p-4 rounded-lg border ${getStatusColor(campaign.status)} border-opacity-50`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(campaign.status)}
                          <h4 className="font-semibold">{campaign.campaign_id?.replace('_', ' ')}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Auto-Created
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                        {campaign.failure_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            <strong>Failure reason:</strong> {campaign.failure_reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowCampaignDetails(showCampaignDetails === campaign.id ? null : campaign.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Campaign Details */}
                    {showCampaignDetails === campaign.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Use Case:</strong> {campaign.campaign_use_case}</p>
                            <p><strong>Created:</strong> {formatDate(campaign.twilio_created_at)}</p>
                            <p><strong>Updated:</strong> {formatDate(campaign.twilio_updated_at)}</p>
                          </div>
                          <div>
                            <p><strong>Opt-in Required:</strong> {campaign.subscriber_opt_in ? 'Yes' : 'No'}</p>
                            <p><strong>Contains Links:</strong> {campaign.embedded_link ? 'Yes' : 'No'}</p>
                            <p><strong>Contains Phone:</strong> {campaign.embedded_phone ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        {campaign.sample_messages && campaign.sample_messages.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-sm">Sample Messages:</p>
                            <div className="mt-2 space-y-2">
                              {campaign.sample_messages.map((message, index) => (
                                <div key={index} className="text-sm bg-gray-50 p-2 rounded border">
                                  {message}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Auto-Created Campaigns Yet</h3>
              <p className="text-gray-600 mb-4">
                Campaigns will be automatically created when you start sending messages through SurFox.
              </p>
              {!brandData ? (
                <p className="text-sm text-yellow-600">
                  Complete brand registration first to enable automatic campaign creation.
                </p>
              ) : brandData.status !== 'VERIFIED' ? (
                <p className="text-sm text-yellow-600">
                  Wait for brand verification to complete before campaigns can be created.
                </p>
              ) : (
                <p className="text-sm text-blue-600">
                  Start a messaging campaign to see auto-created A2P campaigns appear here.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Phone Number A2P Assignments</h3>
          
          {phoneNumbers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No phone numbers found. Please purchase phone numbers first.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="font-medium">Phone Number Assignments</h4>
                <p className="text-sm text-gray-500">View and manage phone number assignments to A2P campaigns.</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {phoneNumbers.map((phone) => (
                  <div key={phone.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{formatPhoneNumber(phone.phone_number)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            phone.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {phone.status}
                          </span>
                          {phone.a2p_campaign_id && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Assigned to Campaign {phone.a2p_campaign_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {campaigns.length > 0 && campaigns.some(c => c.status === 'VERIFIED') ? (
                        <>
                          {!phone.a2p_campaign_id ? (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignPhoneToA2P(phone.id, parseInt(e.target.value), 'assign');
                                }
                              }}
                              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              defaultValue=""
                            >
                              <option value="">Assign to Campaign</option>
                              {campaigns.filter(c => c.status === 'VERIFIED').map(campaign => (
                                <option key={campaign.id} value={campaign.id}>
                                  {campaign.campaign_id?.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => assignPhoneToA2P(phone.id, phone.a2p_campaign_id, 'unassign')}
                              className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm border border-red-200"
                            >
                              Unassign
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {campaigns.length === 0 ? 'No campaigns available' : 'No verified campaigns available'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Automatic Assignment</p>
                <p>
                  Phone numbers are automatically assigned to the appropriate A2P campaigns when you start messaging. 
                  Manual assignment is only needed for specific use cases or troubleshooting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details Modal */}
      {showCampaignDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Details</h3>
              <button
                onClick={() => setShowCampaignDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal content would go here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default A2PCompliance;