import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  MoreVertical, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Send,
  Copy,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  RefreshCw,
  Link,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

export default function SalesTeamSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationLink, setInvitationLink] = useState(null);
  
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    activeUsers: 0,
    pendingInvites: 0,
    lastWeekLogins: 0
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  // Updated function to get fresh auth token
  const getAuthToken = async () => {
    try {
      // Get fresh session to ensure token is valid
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        return null;
      }
      
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Updated function to create auth headers with fresh token
  const getAuthHeaders = async () => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated - no valid token found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const headers = await getAuthHeaders();
      console.log('Making API calls with fresh token');

      // Load data with better error handling using Promise.allSettled
      const [statsRes, membersRes] = await Promise.allSettled([
        fetch('/api/team/stats', { headers }),
        fetch('/api/team/members', { headers })
      ]);

      // Handle stats
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const stats = await statsRes.value.json();
        setTeamStats(stats);
        console.log('Stats loaded successfully:', stats);
      } else {
        console.warn('Failed to load stats:', statsRes.reason || 'Network error');
        setTeamStats({
          totalMembers: 0,
          activeUsers: 0,
          pendingInvites: 0,
          lastWeekLogins: 0
        });
      }

      // Handle members
      if (membersRes.status === 'fulfilled' && membersRes.value.ok) {
        const members = await membersRes.value.json();
        setTeamMembers(members);
        console.log('Members loaded successfully:', members.length);
      } else {
        console.warn('Failed to load members:', membersRes.reason || 'Network error');
        setTeamMembers([]);
      }

      // Handle invitations separately (non-blocking)
      try {
        const invitesRes = await fetch('/api/team/invitations', { headers });
        if (invitesRes.ok) {
          const invites = await invitesRes.json();
          setPendingInvites(invites);
          console.log('Invitations loaded successfully:', invites.length);
        } else {
          console.warn('Failed to load invitations, but continuing...');
          setPendingInvites([]);
        }
      } catch (inviteError) {
        console.warn('Invitations endpoint error:', inviteError);
        setPendingInvites([]);
      }

      console.log('Data loaded successfully');

    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      setError('Please enter first and last name');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setInviteLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const headers = await getAuthHeaders();

      // First, get the user's tenant_id from their profile
      const profileRes = await fetch('/api/team/stats', { headers });
      if (!profileRes.ok) {
        throw new Error('Failed to get user profile');
      }
      
      // The tenant_id is used in the stats endpoint, so we know the user has one

      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          firstName: inviteFirstName,
          lastName: inviteLastName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `Server error (${response.status}): ${errorText}` };
        }
        throw new Error(errorData.error || `Failed to send invitation (${response.status})`);
      }
      
      const data = await response.json();
      setSuccess('Invitation created successfully!');
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('user');
      setShowInviteModal(false);
      
      // Store the invitation link for display
      setInvitationLink({
        email: inviteEmail,
        name: `${inviteFirstName} ${inviteLastName}`,
        url: data.signupUrl
      });
      
      // Reload data to reflect changes
      await loadTeamData();
      
    } catch (error) {
      console.error('Error sending invite:', error);
      setError(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/team/members/${userId}/toggle-status`, {
        method: 'PATCH',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `Server error (${response.status}): ${errorText}` };
        }
        throw new Error(errorData.error || `Failed to update user status (${response.status})`);
      }
      
      const data = await response.json();
      setSuccess(data.message || 'User status updated successfully!');
      
      // Reload the data
      await loadTeamData();
      
    } catch (error) {
      console.error('Error updating user status:', error);
      setError(error.message || 'Failed to update user status. Please try again.');
    }
  };

  const handleResendInvite = async (invitationId) => {
    try {
      console.log('Resending invitation:', invitationId);
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers
      });

      console.log('Resend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `Server error (${response.status}): ${errorText}` };
        }
        
        throw new Error(errorData.error || `Failed to resend invitation (${response.status})`);
      }

      const data = await response.json();
      console.log('Resend success:', data);
      setSuccess('Invitation resent successfully!');
      await loadTeamData();
    } catch (error) {
      console.error('Error resending invite:', error);
      setError(error.message || 'Failed to resend invitation. Please try again.');
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      console.log('Canceling invitation:', invitationId);
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'DELETE',
        headers
      });

      console.log('Cancel response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cancel error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `Server error (${response.status}): ${errorText}` };
        }
        
        throw new Error(errorData.error || `Failed to cancel invitation (${response.status})`);
      }

      const data = await response.json();
      console.log('Cancel success:', data);
      setSuccess('Invitation canceled successfully!');
      await loadTeamData();
    } catch (error) {
      console.error('Error canceling invite:', error);
      setError(error.message || 'Failed to cancel invitation. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'business_admin':
        return 'Admin';
      case 'user':
        return 'User';
      case 'global_admin':
        return 'Global Admin';
      default:
        return role || 'User';
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = (member.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || member.status === filterStatus;
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

      {/* Invitation Link Modal */}
      {invitationLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Invitation Created Successfully</h3>
              <button
                onClick={() => setInvitationLink(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Send this invitation link to <span className="font-medium text-gray-900">{invitationLink.name || invitationLink.email}</span>:
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700 break-all font-mono">
                      {invitationLink.url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(invitationLink.url);
                      // Don't use setSuccess which shows the white bar
                      // Instead, show a temporary tooltip or change button text
                      const button = e.currentTarget;
                      const originalText = button.innerHTML;
                      button.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Copied!';
                      button.classList.add('bg-green-600', 'hover:bg-green-700');
                      button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                      
                      setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('bg-green-600', 'hover:bg-green-700');
                        button.classList.add('bg-blue-600', 'hover:bg-blue-700');
                      }, 2000);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => setInvitationLink(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Important</p>
                      <p>This invitation link expires in 7 days. The recipient must use this exact link to sign up and join your organization.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Team Management</h2>
          <p className="text-gray-600 mt-1">Invite team members and manage user access to your CRM</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Members</p>
              <p className="text-3xl font-bold text-blue-900">{teamStats.totalMembers}</p>
              <p className="text-xs text-blue-600 mt-1">Including admins</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-green-900">{teamStats.activeUsers}</p>
              <p className="text-xs text-green-600 mt-1">Currently enabled</p>
            </div>
            <UserCheck className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Pending Invites</p>
              <p className="text-3xl font-bold text-orange-900">{teamStats.pendingInvites}</p>
              <p className="text-xs text-orange-600 mt-1">Awaiting acceptance</p>
            </div>
            <Mail className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Weekly Logins</p>
              <p className="text-3xl font-bold text-purple-900">{teamStats.lastWeekLogins}</p>
              <p className="text-xs text-purple-600 mt-1">Last 7 days</p>
            </div>
            <Shield className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Team Roster */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Roster</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadTeamData}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(member.name || 'U').split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{member.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getRoleDisplay(member.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(member.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {member.leadsHandled || 0} leads
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.conversions || 0} conversions
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.joinedDate ? formatDate(member.joinedDate) : 'Pending'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {member.status === 'pending' ? (
                        <button
                          onClick={() => {
                            console.log('Resending invite for member:', member);
                            const inviteId = member.invitationId || member.id;
                            console.log('Using invite ID:', inviteId);
                            handleResendInvite(inviteId);
                          }}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            console.log('Toggling status for member:', member);
                            console.log('Using member ID:', member.id);
                            handleToggleUserStatus(member.id, member.status);
                          }}
                          className={`transition-colors ${
                            member.status === 'active' 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {member.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
            <p className="text-sm text-gray-600 mt-1">Invitations expire after 7 days</p>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                    <div className="text-sm text-gray-500">
                      Invited {formatDate(invite.invitedDate)} • Expires {formatDate(invite.expiresDate)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium transition-colors"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => {
                      console.log('Canceling invite:', invite);
                      console.log('Using invite ID:', invite.id);
                      handleCancelInvite(invite.id);
                    }}
                    className="text-red-600 hover:text-red-900 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="John"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="business_admin">Business Admin</option>
                  </select>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">User Permissions</p>
                      <p>Users can view leads, send messages, and manage conversations. Business Admins can also invite users and access settings.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteFirstName('');
                  setInviteLastName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim() || !inviteFirstName.trim() || !inviteLastName.trim() || inviteLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {inviteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Create Invitation Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}