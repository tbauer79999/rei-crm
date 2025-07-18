import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical, 
  UserPlus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Loader,
  ChevronDown,
  X,
  Shield,
  MessageSquare,
  PhoneCall,
  Calendar,
  TrendingUp,
  ExternalLink,
  Settings,
  Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import supabase from '../../lib/supabaseClient';

export default function PhoneNumbersSettings() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Permission checks
  const canViewPhoneNumbers = hasPermission(PERMISSIONS.VIEW_PHONE_NUMBERS);
  const canManagePhoneNumbers = hasPermission(PERMISSIONS.MANAGE_PHONE_NUMBERS);
  const canAssignPhoneNumbers = hasPermission(PERMISSIONS.ASSIGN_PHONE_NUMBERS);
  
  // Phone numbers state
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all');
  
  // A2P state
  const [a2pCampaigns, setA2pCampaigns] = useState([]);
  const [a2pStatus, setA2pStatus] = useState(null);
  const [showA2pModal, setShowA2pModal] = useState(false);
  const [assigningA2pNumber, setAssigningA2pNumber] = useState(null);
  const [selectedA2pCampaign, setSelectedA2pCampaign] = useState('');
  
  // Purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedAreaCode, setSelectedAreaCode] = useState('');
  const [customAreaCode, setCustomAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [popularAreaCodes, setPopularAreaCodes] = useState([]);
  
  // Campaign assignment modal state
  const [showCampaignAssignModal, setShowCampaignAssignModal] = useState(false);
  const [assigningNumber, setAssigningNumber] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalNumbers: 0,
    assignedToCampaigns: 0,
    unassignedNumbers: 0,
    monthlyCost: 0,
    a2pAssigned: 0,
    a2pCompliant: 0
  });

  useEffect(() => {
    if (canViewPhoneNumbers) {
      loadPhoneNumbers();
      loadCampaigns();
      loadPopularAreaCodes();
      loadA2pData();
    } else {
      setLoading(false);
    }
  }, [canViewPhoneNumbers]);

  const loadA2pData = async () => {
    if (!canViewPhoneNumbers) return;
    
    // A2P features are optional - but if tables exist, try to load them
    try {
      // Try to load A2P status - this function may not exist
      const { data: statusData, error: statusError } = await supabase.functions.invoke('get-a2p-status');
      if (!statusError && statusData && statusData.success) {
        setA2pStatus(statusData);
        setA2pCampaigns(statusData.campaigns || []);
      }
    } catch (a2pError) {
      // A2P function doesn't exist - this is fine, just skip A2P features
      console.log('A2P features not configured - skipping A2P status loading');
    }

    try {
      // Load phone number A2P assignments with correct column names
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('phone_number_campaigns')
        .select(`
          phone_number_id,
          a2p_campaign_id,
          a2p_campaigns (
            id,
            campaign_name,
            registration_status
          )
        `);

      if (!assignmentError && assignmentData && Array.isArray(assignmentData)) {
        // Update phone numbers with A2P assignments
        setPhoneNumbers(prevNumbers => 
          prevNumbers.map(phone => ({
            ...phone,
            a2p_assignment: assignmentData.find(a => a.phone_number_id === phone.id)
          }))
        );
      }
    } catch (assignmentError) {
      console.log('A2P assignment tables not configured - skipping A2P assignments');
    }
  };

  const loadPhoneNumbers = async () => {
    if (!canViewPhoneNumbers) return;
    
    setLoading(true);
    try {
      // Load phone numbers for this tenant with campaign assignments
      const { data: phoneData, error: phoneError } = await supabase
        .from('phone_numbers')
        .select(`
          *,
          campaigns (
            id,
            name,
            is_active
          )
        `)
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });
      
      if (phoneError) {
        console.error('Error loading phone numbers:', phoneError);
        setError('Failed to load phone numbers: ' + phoneError.message);
        return;
      }
      
      const phoneNumbersData = phoneData || [];
      setPhoneNumbers(phoneNumbersData);
      
      // Calculate stats
      const assignedToCampaigns = phoneNumbersData.filter(n => n.campaigns && n.campaigns.length > 0).length;
      setStats(prevStats => ({
        ...prevStats,
        totalNumbers: phoneNumbersData.length,
        assignedToCampaigns,
        unassignedNumbers: phoneNumbersData.length - assignedToCampaigns,
        monthlyCost: phoneNumbersData.length * 1.15
      }));

    } catch (error) {
      console.error('Error loading phone numbers:', error);
      setError('Failed to load phone numbers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    if (!canAssignPhoneNumbers) return;
    
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, is_active, phone_number_id')
        .eq('tenant_id', user?.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (!campaignError && campaignData) {
        setCampaigns(campaignData);
        console.log('Campaigns loaded:', campaignData.length);
      } else {
        console.log('Error loading campaigns:', campaignError);
        setCampaigns([]);
      }
    } catch (error) {
      console.log('Error accessing campaigns table:', error);
      setCampaigns([]);
    }
  };

  const assignPhoneToA2p = async () => {
    if (!canManagePhoneNumbers) {
      setError("You don't have permission to manage phone number assignments.");
      return;
    }

    if (!selectedA2pCampaign || !assigningA2pNumber) return;

    try {
      const { data, error } = await supabase.functions.invoke('assign-phone-to-campaign', {
        body: {
          phone_number_id: assigningA2pNumber.id,
          a2p_campaign_id: parseInt(selectedA2pCampaign),
          action: 'assign'
        }
      });

      if (error) {
        console.log('A2P assignment function not available:', error);
        setError('A2P assignment features are not configured yet.');
        return;
      }

      if (data && data.success) {
        setSuccess('Phone number assigned to A2P campaign successfully!');
        setShowA2pModal(false);
        setAssigningA2pNumber(null);
        setSelectedA2pCampaign('');
        loadA2pData();
      } else {
        setError(data?.message || 'A2P assignment failed');
      }
    } catch (error) {
      console.log('A2P assignment not available:', error);
      setError('A2P assignment features are not configured yet.');
    }
  };

  const unassignPhoneFromA2p = async (phoneId, a2pCampaignId) => {
    if (!canManagePhoneNumbers) {
      setError("You don't have permission to manage phone number assignments.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('assign-phone-to-campaign', {
        body: {
          phone_number_id: phoneId,
          a2p_campaign_id: a2pCampaignId,
          action: 'unassign'
        }
      });

      if (error) {
        console.log('A2P unassignment function not available:', error);
        setError('A2P assignment features are not configured yet.');
        return;
      }

      if (data && data.success) {
        setSuccess('Phone number unassigned from A2P campaign successfully!');
        loadA2pData();
      } else {
        setError(data?.message || 'A2P unassignment failed');
      }
    } catch (error) {
      console.log('A2P unassignment not available:', error);
      setError('A2P assignment features are not configured yet.');
    }
  };

  const loadPopularAreaCodes = async () => {
    if (!canViewPhoneNumbers) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'popular-area-codes' }
      });
      
      if (!error && data && data.areaCodes && Array.isArray(data.areaCodes)) {
        setPopularAreaCodes(data.areaCodes);
      } else {
        // Use default area codes if API doesn't support this feature
        console.log('Popular area codes API not available - using defaults');
        setDefaultAreaCodes();
      }
    } catch (error) {
      console.log('Area codes API not configured - using default area codes');
      setDefaultAreaCodes();
    }
  };

  const setDefaultAreaCodes = () => {
    setPopularAreaCodes([
      { code: '212', city: 'New York, NY', available: true },
      { code: '415', city: 'San Francisco, CA', available: true },
      { code: '305', city: 'Miami, FL', available: true },
      { code: '972', city: 'Dallas, TX', available: true },
      { code: '404', city: 'Atlanta, GA', available: true },
      { code: '602', city: 'Phoenix, AZ', available: true }
    ]);
  };

  const searchPhoneNumbers = async (areaCode) => {
    if (!canManagePhoneNumbers) {
      setError("You don't have permission to purchase phone numbers.");
      return;
    }

    try {
      setSearchingNumbers(true);
      setError('');
      
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'search', areaCode }
      });
      
      if (error) throw error;
      
      const availableNumbersData = data?.availableNumbers || [];
      if (availableNumbersData.length === 0) {
        setError(`No phone numbers available in area code ${areaCode}. Try a different area code.`);
        return;
      }

      setAvailableNumbers(availableNumbersData);
      setSelectedAreaCode(areaCode);
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      setError('Failed to search phone numbers: ' + error.message);
    } finally {
      setSearchingNumbers(false);
    }
  };

  const purchasePhoneNumber = async (phoneNumber) => {
    if (!canManagePhoneNumbers) {
      setError("You don't have permission to purchase phone numbers.");
      return;
    }

    try {
      setPurchasing(true);
      setError('');

      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: {
          action: 'purchase',
          phoneNumber: phoneNumber.phoneNumber
        }
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccess('Phone number purchased successfully!');
        setShowPurchaseModal(false);
        setAvailableNumbers([]);
        setSelectedAreaCode('');
        loadPhoneNumbers();
      } else {
        throw new Error(data?.message || 'Purchase failed');
      }
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      setError('Failed to purchase phone number: ' + error.message);
    } finally {
      setPurchasing(false);
    }
  };

  const assignPhoneToCampaign = async () => {
    if (!canAssignPhoneNumbers) {
      setError("You don't have permission to assign phone numbers to campaigns.");
      return;
    }

    if (!selectedCampaignId || !assigningNumber) return;

    try {
      // Update the campaign to use this phone number
      const { data, error } = await supabase
        .from('campaigns')
        .update({ phone_number_id: assigningNumber.id })
        .eq('id', selectedCampaignId)
        .eq('tenant_id', user?.tenant_id);

      if (error) throw error;

      setSuccess('Phone number assigned to campaign successfully!');
      setShowCampaignAssignModal(false);
      setAssigningNumber(null);
      setSelectedCampaignId('');
      loadPhoneNumbers();
      loadCampaigns();
    } catch (error) {
      console.error('Error assigning phone number to campaign:', error);
      setError('Failed to assign phone number to campaign: ' + error.message);
    }
  };

  const unassignPhoneFromCampaign = async (phoneId, campaignId) => {
    if (!canAssignPhoneNumbers) {
      setError("You don't have permission to unassign phone numbers.");
      return;
    }

    try {
      // Remove phone number from campaign
      const { data, error } = await supabase
        .from('campaigns')
        .update({ phone_number_id: null })
        .eq('id', campaignId)
        .eq('tenant_id', user?.tenant_id);

      if (error) throw error;

      setSuccess('Phone number unassigned from campaign successfully!');
      loadPhoneNumbers();
      loadCampaigns();
    } catch (error) {
      console.error('Error unassigning phone number from campaign:', error);
      setError('Failed to unassign phone number from campaign: ' + error.message);
    }
  };

  const releasePhoneNumber = async (phoneId) => {
    if (!canManagePhoneNumbers) {
      setError("You don't have permission to release phone numbers.");
      return;
    }

    if (!window.confirm('Are you sure you want to release this phone number? This action cannot be undone and will unassign it from any campaigns.')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'release', phoneId }
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccess('Phone number released successfully!');
        loadPhoneNumbers();
      } else {
        throw new Error(data?.message || 'Release failed');
      }
    } catch (error) {
      console.error('Error releasing phone number:', error);
      setError('Failed to release phone number: ' + error.message);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.substring(1);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return phoneNumber;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const handleCustomAreaCodeSubmit = (e) => {
    e.preventDefault();
    if (customAreaCode.length === 3 && /^\d{3}$/.test(customAreaCode)) {
      searchPhoneNumbers(customAreaCode);
    } else {
      setError('Please enter a valid 3-digit area code');
    }
  };

  const filteredNumbers = phoneNumbers.filter(number => {
    if (!number) return false;
    
    const phoneMatch = number.phone_number?.includes(searchTerm) || false;
    const campaignMatch = number.campaigns?.some(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || false;
    const matchesSearch = phoneMatch || campaignMatch;
    
    const matchesFilter = filterAssigned === 'all' || 
                         (filterAssigned === 'assigned' && number.campaigns && number.campaigns.length > 0) ||
                         (filterAssigned === 'unassigned' && (!number.campaigns || number.campaigns.length === 0));
    
    return matchesSearch && matchesFilter;
  });

  // Calculate A2P stats
  useEffect(() => {
    const a2pAssigned = phoneNumbers.filter(n => n.a2p_assignment).length;
    const a2pCompliant = phoneNumbers.filter(n => 
      n.a2p_assignment?.a2p_campaigns?.registration_status === 'approved'
    ).length;
    
    setStats(prevStats => ({
      ...prevStats,
      a2pAssigned,
      a2pCompliant
    }));
  }, [phoneNumbers]);

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

  // Permission check - show access denied if user can't view phone numbers
  if (!canViewPhoneNumbers) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to view phone number management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      {/* Permission Check Alert */}
      {!canManagePhoneNumbers && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            You have read-only access to phone number management. Admin permissions required to purchase, assign, or release phone numbers.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phone Numbers</h2>
          <p className="text-gray-600 mt-1">Manage your business phone numbers and campaign assignments</p>
        </div>
        <div className="flex items-center gap-3">
          {canManagePhoneNumbers && (
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone Number
            </button>
          )}
        </div>
      </div>

      {/* A2P Compliance Alert */}
      {(!a2pStatus?.brand || a2pStatus.brand.status !== 'VERIFIED') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-yellow-800 font-medium">A2P Compliance Required</p>
                <p className="text-yellow-700 text-sm mt-1">
                  SMS messaging requires A2P brand and campaign registration for compliance.
                </p>
              </div>
            </div>
            <button 
              onClick={() => window.open('/settings/a2p-compliance', '_blank')}
              className="inline-flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
            >
              Setup A2P
              <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Numbers</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalNumbers}</p>
              <p className="text-xs text-blue-600 mt-1">Active numbers</p>
            </div>
            <Phone className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Campaign Assigned</p>
              <p className="text-3xl font-bold text-green-900">{stats.assignedToCampaigns}</p>
              <p className="text-xs text-green-600 mt-1">To active campaigns</p>
            </div>
            <Target className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Available</p>
              <p className="text-3xl font-bold text-orange-900">{stats.unassignedNumbers}</p>
              <p className="text-xs text-orange-600 mt-1">Ready to assign</p>
            </div>
            <Shield className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">A2P Assigned</p>
              <p className="text-3xl font-bold text-purple-900">{stats.a2pAssigned}</p>
              <p className="text-xs text-purple-600 mt-1">Campaign assigned</p>
            </div>
            <MessageSquare className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-medium">A2P Compliant</p>
              <p className="text-3xl font-bold text-emerald-900">{stats.a2pCompliant}</p>
              <p className="text-xs text-emerald-600 mt-1">Verified campaigns</p>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Monthly Cost</p>
              <p className="text-3xl font-bold text-slate-900">${stats.monthlyCost.toFixed(2)}</p>
              <p className="text-xs text-slate-600 mt-1">Estimated</p>
            </div>
            <TrendingUp className="w-10 h-10 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Phone Numbers List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Your Phone Numbers</h3>
          </div>
          
          {/* Search and Filter */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by number or campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Numbers</option>
              <option value="assigned">Assigned to Campaigns</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredNumbers.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Phone Numbers</h3>
              <p className="text-gray-600 mb-4">
                {phoneNumbers.length === 0 
                  ? "You haven't purchased any phone numbers yet."
                  : "No phone numbers match your search criteria."
                }
              </p>
              {canManagePhoneNumbers && phoneNumbers.length === 0 && (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Purchase Your First Number
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    A2P Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capabilities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNumbers.map((number) => (
                  <tr key={number.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatPhoneNumber(number.phone_number)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {number.twilio_sid?.slice(-6) || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {number.campaigns && number.campaigns.length > 0 ? (
                        <div className="space-y-1">
                          {number.campaigns.map((campaign) => (
                            <div key={campaign.id} className="flex items-center justify-between">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Target className="w-3 h-3 mr-1" />
                                {campaign.name}
                              </span>
                              {canAssignPhoneNumbers && (
                                <button
                                  onClick={() => unassignPhoneFromCampaign(number.id, campaign.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors ml-2"
                                  title="Unassign from campaign"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        canAssignPhoneNumbers && campaigns.length > 0 ? (
                          <button
                            onClick={() => {
                              setAssigningNumber(number);
                              setShowCampaignAssignModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors text-sm"
                          >
                            Assign to Campaign
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">Unassigned</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {number.a2p_assignment ? (
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            number.a2p_assignment.a2p_campaigns?.registration_status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {number.a2p_assignment.a2p_campaigns?.campaign_name || 'Campaign'}
                          </span>
                          {canManagePhoneNumbers && (
                            <button
                              onClick={() => unassignPhoneFromA2p(number.id, number.a2p_assignment.a2p_campaign_id)}
                              className="text-red-600 hover:text-red-900 transition-colors ml-2"
                              title="Unassign from A2P campaign"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        canManagePhoneNumbers ? (
                          <button
                            onClick={() => {
                              setAssigningA2pNumber(number);
                              setShowA2pModal(true);
                            }}
                            disabled={a2pCampaigns.filter(c => c.registration_status === 'approved').length === 0}
                            className="text-blue-600 hover:text-blue-900 transition-colors text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            {a2pCampaigns.filter(c => c.registration_status === 'approved').length > 0 ? 'Assign A2P' : 'No campaigns'}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">Not assigned</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {number.capabilities?.sms && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            SMS
                          </span>
                        )}
                        {number.capabilities?.voice && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <PhoneCall className="w-3 h-3 mr-1" />
                            Voice
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        number.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {number.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canManagePhoneNumbers && (
                          <button
                            onClick={() => releasePhoneNumber(number.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Release number"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Phone Number Management</p>
            <p>Phone numbers are purchased for your organization and can be assigned to campaigns. When users activate campaigns, they select which phone number to use. Each number costs approximately $1.15/month plus usage charges.</p>
          </div>
        </div>
      </div>

      {/* Campaign Assignment Modal */}
      {showCampaignAssignModal && assigningNumber && canAssignPhoneNumbers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign to Campaign</h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign {formatPhoneNumber(assigningNumber.phone_number)} to a campaign
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Campaign
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a campaign...</option>
                    {campaigns.filter(c => !c.phone_number_id).map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  {campaigns.filter(c => !c.phone_number_id).length === 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      No campaigns available for assignment. All active campaigns already have phone numbers assigned.
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p>Assigning a phone number to a campaign allows users to send SMS and make calls using this number when the campaign is active.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCampaignAssignModal(false);
                  setAssigningNumber(null);
                  setSelectedCampaignId('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={assignPhoneToCampaign}
                disabled={!selectedCampaignId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign to Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A2P Assignment Modal */}
      {showA2pModal && assigningA2pNumber && canManagePhoneNumbers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign to A2P Campaign</h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign {formatPhoneNumber(assigningA2pNumber.phone_number)} to an A2P campaign for compliance
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select A2P Campaign
                  </label>
                  <select
                    value={selectedA2pCampaign}
                    onChange={(e) => setSelectedA2pCampaign(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an A2P campaign...</option>
                    {a2pCampaigns.filter(campaign => campaign.registration_status === 'approved').map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.campaign_name} - {campaign.registration_status}
                      </option>
                    ))}
                  </select>
                  {a2pCampaigns.filter(c => c.registration_status === 'approved').length === 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      No approved A2P campaigns available. Create and get campaigns approved in A2P Compliance settings first.
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p>Assigning phone numbers to A2P campaigns ensures SMS compliance and prevents message blocking by carriers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowA2pModal(false);
                  setAssigningA2pNumber(null);
                  setSelectedA2pCampaign('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={assignPhoneToA2p}
                disabled={!selectedA2pCampaign}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign to Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal - keeping this the same as it works fine */}
      {showPurchaseModal && canManagePhoneNumbers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Phone Number</h3>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setAvailableNumbers([]);
                  setSelectedAreaCode('');
                  setCustomAreaCode('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              {availableNumbers.length === 0 ? (
                <div className="space-y-6">
                  {/* Popular Area Codes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Select Area Code</h4>
                    {searchingNumbers ? (
                      <div className="flex justify-center py-8">
                        <Loader className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {popularAreaCodes.map((areaCode) => (
                          <button
                            key={areaCode.code}
                            onClick={() => searchPhoneNumbers(areaCode.code)}
                            disabled={!areaCode.available}
                            className={`p-3 border rounded-lg text-left transition-colors ${
                              areaCode.available
                                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-gray-900">({areaCode.code})</span>
                                <div className="flex items-center text-xs text-gray-600 mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {areaCode.city}
                                </div>
                              </div>
                              {areaCode.available && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Area Code */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Or Enter Custom Area Code</h4>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={customAreaCode}
                        onChange={(e) => setCustomAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="e.g., 555"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength="3"
                      />
                      <button
                        onClick={() => searchPhoneNumbers(customAreaCode)}
                        disabled={customAreaCode.length !== 3 || searchingNumbers}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      Available Numbers in ({selectedAreaCode})
                    </h4>
                    <button
                      onClick={() => {
                        setAvailableNumbers([]);
                        setSelectedAreaCode('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change Area Code
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableNumbers.map((number, index) => (
                      <div
                        key={number.phoneNumber}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatPhoneNumber(number.phoneNumber)}
                          </div>
                          {number.locality && (
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {number.locality}, {number.region}
                            </div>
                          )}
                          <div className="flex items-center space-x-3 mt-2">
                            {number.capabilities?.sms && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">SMS</span>
                            )}
                            {number.capabilities?.voice && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Voice</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-2">{number.cost}</div>
                          <button
                            onClick={() => purchasePhoneNumber(number)}
                            disabled={purchasing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {purchasing ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              'Purchase'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}