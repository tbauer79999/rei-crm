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
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

export default function PhoneNumbersSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Phone numbers state
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all');
  
  // Purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedAreaCode, setSelectedAreaCode] = useState('');
  const [customAreaCode, setCustomAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [popularAreaCodes, setPopularAreaCodes] = useState([]);
  
  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningNumber, setAssigningNumber] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalNumbers: 0,
    assignedNumbers: 0,
    unassignedNumbers: 0,
    monthlyCost: 0
  });



  useEffect(() => {
    loadPhoneNumbers();
    loadTeamMembers();
    loadPopularAreaCodes();
  }, []);

  const loadPhoneNumbers = async () => {
    setLoading(true);
    try {
      // Use Supabase functions invoke
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'list' }
      });
      
      if (error) throw error;
      
      setPhoneNumbers(data.phoneNumbers || []);
      
      // Calculate stats
      const assigned = data.phoneNumbers?.filter(n => n.user_id).length || 0;
      setStats({
        totalNumbers: data.phoneNumbers?.length || 0,
        assignedNumbers: assigned,
        unassignedNumbers: (data.phoneNumbers?.length || 0) - assigned,
        monthlyCost: (data.phoneNumbers?.length || 0) * 1.15
      });

    } catch (error) {
      console.error('Error loading phone numbers:', error);
      setError('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      // Still use the existing team API for now
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/team/members', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.filter(member => member.status === 'active'));
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadPopularAreaCodes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'popular-area-codes' }
      });
      
      if (error) throw error;
      setPopularAreaCodes(data.areaCodes || []);
    } catch (error) {
      console.error('Error loading area codes:', error);
    }
  };

  const searchPhoneNumbers = async (areaCode) => {
    try {
      setSearchingNumbers(true);
      setError('');
      
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'search', areaCode }
      });
      
      if (error) throw error;
      
      if (data.availableNumbers.length === 0) {
        setError(`No phone numbers available in area code ${areaCode}. Try a different area code.`);
        return;
      }

      setAvailableNumbers(data.availableNumbers);
      setSelectedAreaCode(areaCode);
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      setError('Failed to search phone numbers. Please try again.');
    } finally {
      setSearchingNumbers(false);
    }
  };

  const purchasePhoneNumber = async (phoneNumber) => {
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

      if (data.success) {
        setSuccess('Phone number purchased successfully!');
        setShowPurchaseModal(false);
        setAvailableNumbers([]);
        setSelectedAreaCode('');
        loadPhoneNumbers();
      }
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      setError('Failed to purchase phone number. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const assignPhoneNumber = async () => {
    if (!selectedUserId || !assigningNumber) return;

    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: {
          action: 'assign',
          phoneId: assigningNumber.id,
          userId: selectedUserId
        }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess('Phone number assigned successfully!');
        setShowAssignModal(false);
        setAssigningNumber(null);
        setSelectedUserId('');
        setAssignmentNote('');
        loadPhoneNumbers();
      }
    } catch (error) {
      console.error('Error assigning phone number:', error);
      setError('Failed to assign phone number. Please try again.');
    }
  };

  const unassignPhoneNumber = async (phoneId) => {
    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'unassign', phoneId }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess('Phone number unassigned successfully!');
        loadPhoneNumbers();
      }
    } catch (error) {
      console.error('Error unassigning phone number:', error);
      setError('Failed to unassign phone number. Please try again.');
    }
  };

  const releasePhoneNumber = async (phoneId) => {
    if (!window.confirm('Are you sure you want to release this phone number? This action cannot be undone.')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('phone_numbers', {
        body: { action: 'release', phoneId }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess('Phone number released successfully!');
        loadPhoneNumbers();
      }
    } catch (error) {
      console.error('Error releasing phone number:', error);
      setError('Failed to release phone number. Please try again.');
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

  const handleCustomAreaCodeSubmit = (e) => {
    e.preventDefault();
    if (customAreaCode.length === 3 && /^\d{3}$/.test(customAreaCode)) {
      searchPhoneNumbers(customAreaCode);
    } else {
      setError('Please enter a valid 3-digit area code');
    }
  };

  const filteredNumbers = phoneNumbers.filter(number => {
    const matchesSearch = number.phone_number.includes(searchTerm) ||
                         number.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         number.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAssigned === 'all' || 
                         (filterAssigned === 'assigned' && number.user_id) ||
                         (filterAssigned === 'unassigned' && !number.user_id);
    
    return matchesSearch && matchesFilter;
  });

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phone Numbers</h2>
          <p className="text-gray-600 mt-1">Manage your business phone numbers and assignments</p>
        </div>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Phone Number
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <p className="text-green-600 text-sm font-medium">Assigned</p>
              <p className="text-3xl font-bold text-green-900">{stats.assignedNumbers}</p>
              <p className="text-xs text-green-600 mt-1">To team members</p>
            </div>
            <UserPlus className="w-10 h-10 text-green-600" />
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
              <p className="text-purple-600 text-sm font-medium">Monthly Cost</p>
              <p className="text-3xl font-bold text-purple-900">${stats.monthlyCost.toFixed(2)}</p>
              <p className="text-xs text-purple-600 mt-1">Estimated</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
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
                placeholder="Search by number or assigned user..."
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
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capabilities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage This Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchased
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
                          ID: {number.twilio_sid.slice(-6)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {number.user_id ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">
                              {(number.profiles?.full_name || 'U').split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {number.profiles?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">{number.profiles?.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
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
                    <div className="text-sm text-gray-900">
                      {Math.floor(Math.random() * 500) + 100} messages
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.floor(Math.random() * 50) + 10} calls
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(number.purchased_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {!number.user_id ? (
                        <button
                          onClick={() => {
                            setAssigningNumber(number);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Assign to user"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => unassignPhoneNumber(number.id)}
                          className="text-orange-600 hover:text-orange-900 transition-colors"
                          title="Unassign from user"
                        >
                          <UserPlus className="w-4 h-4 rotate-45" />
                        </button>
                      )}
                      <button
                        onClick={() => releasePhoneNumber(number.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Release number"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Phone Number Management</p>
            <p>You can purchase multiple phone numbers for different purposes: one per sales person, one per campaign, or for different regions. Each number costs approximately $1.15/month plus usage charges.</p>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
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
                    <form onSubmit={handleCustomAreaCodeSubmit} className="flex gap-3">
                      <input
                        type="text"
                        value={customAreaCode}
                        onChange={(e) => setCustomAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="e.g., 555"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength="3"
                      />
                      <button
                        type="submit"
                        disabled={customAreaCode.length !== 3 || searchingNumbers}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search
                      </button>
                    </form>
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
                            {number.capabilities.sms && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">SMS</span>
                            )}
                            {number.capabilities.voice && (
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

      {/* Assign Modal */}
      {showAssignModal && assigningNumber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Phone Number</h3>
              <p className="text-sm text-gray-600 mt-1">
                Assign {formatPhoneNumber(assigningNumber.phone_number)} to a team member
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team Member
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a team member...</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Note (Optional)
                  </label>
                  <textarea
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    placeholder="e.g., For California leads, Spanish-speaking clients, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p>Assigned numbers will be used for all outbound communications from this team member.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningNumber(null);
                  setSelectedUserId('');
                  setAssignmentNote('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={assignPhoneNumber}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Number
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}