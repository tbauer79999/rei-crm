import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  BarChart3, 
  Users, 
  MessageSquare, 
  ChevronRight, 
  Plus, 
  Search, 
  Settings,
  Eye,
  Zap,
  ZapOff,
  Calendar,
  TrendingUp,
  Activity,
  Brain
} from 'lucide-react';

const CampaignDashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch campaigns (using same logic as Campaign Management)
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('/api/campaigns', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.tenant_id) {
      fetchCampaigns();
    }
  }, [user?.tenant_id]);

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && campaign.is_active) ||
      (filterStatus === 'inactive' && !campaign.is_active);
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.is_active).length;
  const aiEnabledCampaigns = campaigns.filter(c => c.ai_on).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Campaigns</p>
              <p className="text-3xl font-bold">{totalCampaigns}</p>
              <p className="text-blue-100 text-xs mt-1">All active & inactive</p>
            </div>
            <Target className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Campaigns</p>
              <p className="text-3xl font-bold">{activeCampaigns}</p>
              <p className="text-green-100 text-xs mt-1">Currently running</p>
            </div>
            <Activity className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">AI-Powered</p>
              <p className="text-3xl font-bold">{aiEnabledCampaigns}</p>
              <p className="text-purple-100 text-xs mt-1">With AI enabled</p>
            </div>
            <Brain className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Avg Performance</p>
              <p className="text-3xl font-bold">87%</p>
              <p className="text-orange-100 text-xs mt-1">Success rate</p>
            </div>
            <BarChart3 className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Campaign Portfolio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Campaign Portfolio</h2>
            <p className="text-gray-600 mt-1">Monitor performance across all your campaigns</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            <Settings className="w-4 h-4" />
            <span>Configure Strategy</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    campaign.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    campaign.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {campaign.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-3">{campaign.name}</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Created</span>
                  <span className="font-medium text-gray-900">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">AI Status</span>
                  <div className="flex items-center space-x-1">
                    {campaign.ai_on ? (
                      <>
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Enabled</span>
                      </>
                    ) : (
                      <>
                        <ZapOff className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Disabled</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Description</span>
                  <span className="font-medium text-gray-900 text-sm text-right">
                    {campaign.description || 'No description'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Updated recently</span>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first campaign to get started.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">Most Active Campaign</h4>
            <div className="text-xl font-bold text-blue-600">
              {activeCampaigns > 0 ? filteredCampaigns.find(c => c.is_active)?.name || 'N/A' : 'No active campaigns'}
            </div>
            <div className="text-sm text-blue-700">Currently running</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <h4 className="font-medium text-green-900 mb-2">AI Adoption Rate</h4>
            <div className="text-xl font-bold text-green-600">
              {totalCampaigns > 0 ? Math.round((aiEnabledCampaigns / totalCampaigns) * 100) : 0}%
            </div>
            <div className="text-sm text-green-700">Campaigns using AI</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <h4 className="font-medium text-purple-900 mb-2">Next Action</h4>
            <div className="text-xl font-bold text-purple-600">
              {activeCampaigns === 0 ? 'Create Campaign' : 'Optimize AI'}
            </div>
            <div className="text-sm text-purple-700">Recommended step</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDashboard;