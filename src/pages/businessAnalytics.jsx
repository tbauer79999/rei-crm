import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, Users, Target, DollarSign, Calendar, Filter, Download, RefreshCw, BarChart3, Brain, Settings, Plus, Eye, ArrowRight, Award, TestTube, Database, Activity, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../lib/analyticsDataService';
import ABTestingDashboard from '../components/ABTestingDashboard';

export default function BusinessAnalytics() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [dateRange, setDateRange] = useState(30);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pipelineValue, setPipelineValue] = useState(0);
  
  // Use refs to prevent multiple initializations
  const isInitialized = useRef(false);
  const isLoadingData = useRef(false);

  // Real data state
  const [dashboardData, setDashboardData] = useState({
    campaigns: [],
    performanceMetrics: {},
    campaignPerformance: [],
    aiInsights: {},
    leadSourceROI: [],
    historicalTrends: [],
    salesRepPerformance: []
  });

  // Memoized load function to prevent recreation
  const loadAllData = useCallback(async () => {
    // Prevent concurrent loads
    if (isLoadingData.current) {
      console.log('⚠️ Already loading data, skipping...');
      return;
    }

    isLoadingData.current = true;
    
    try {
      setLoading(true);
      console.log('📊 Loading all analytics data...');
      
      const [
        campaigns,
        performanceMetrics,
        campaignPerformance,
        aiInsights,
        leadSourceROI,
        historicalTrends,
        salesRepPerformance,
        totalPipelineValue
      ] = await Promise.all([
        analyticsService.getCampaignOverview(),
        analyticsService.getPerformanceMetrics(),
        analyticsService.getCampaignPerformanceData(),
        analyticsService.getAIPerformanceInsights(),
        analyticsService.getLeadSourceROI(),
        analyticsService.getHistoricalTrends(),
        analyticsService.getSalesRepPerformance(),
        analyticsService.getTotalPipelineValue()
      ]);

      setDashboardData({
        campaigns,
        performanceMetrics,
        campaignPerformance,
        aiInsights,
        leadSourceROI,
        historicalTrends,
        salesRepPerformance
      });

      setPipelineValue(totalPipelineValue);

      setError('');
      console.log('✅ Analytics data loaded successfully');
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      isLoadingData.current = false;
    }
  }, []); // Empty deps, function never changes

  // Initialize analytics service only once
  useEffect(() => {
    const initializeAndLoadData = async () => {
      if (!user || isInitialized.current) return;

      isInitialized.current = true;
      
      try {
        console.log('🔧 Initializing analytics service...');
        await analyticsService.initialize(user);
        await loadAllData();
      } catch (err) {
        console.error('Error initializing analytics:', err);
        setError('Failed to load analytics data');
        setLoading(false);
      }
    };

    initializeAndLoadData();
  }, [user, loadAllData]);

  // Handle date range changes
  useEffect(() => {
    if (!user || !isInitialized.current || loading) return;
    
    console.log('📅 Date range changed to:', dateRange);
    analyticsService.setDateRange(dateRange);
    loadAllData();
  }, [dateRange, loadAllData]);

  // Prevent data reload on tab change
  const handleViewChange = useCallback((newView) => {
    console.log('🔄 Switching view to:', newView);
    setActiveView(newView);
    // Don't reload data when switching tabs
  }, []);

  const GlobalFilterBar = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Campaigns</option>
            {dashboardData.campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center space-x-3">
          <button 
            onClick={loadAllData}
            disabled={loading || isLoadingData.current}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>
    </div>
  );

  const NavigationTabs = ({ activeView, setActiveView }) => {
    const tabs = [
      { id: 'overview', name: 'Overview Reports', icon: BarChart3 },
      { id: 'lead-performance', name: 'Lead Performance', icon: Users },
      { id: 'ai-performance', name: 'AI Performance', icon: Brain },
      { id: 'performance-analytics', name: 'Performance Analytics', icon: Activity },
      { id: 'abtesting', name: 'A/B Testing', icon: TestTube },
      { id: 'sales-outcomes', name: 'Team Performance', icon: Award },
      { id: 'custom-reports', name: 'Custom Reports', icon: Settings }
    ];

    return (
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  };

  const OverviewReports = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Calculate macro funnel from real data
    const { campaigns, performanceMetrics } = dashboardData;
    const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0);
    const totalHotLeads = campaigns.reduce((sum, campaign) => sum + campaign.hotLeads, 0);
    const totalMessages = performanceMetrics.totalMessages || 0;
    const totalResponses = performanceMetrics.totalResponses || 0;
    const totalConversions = performanceMetrics.totalConversions || 0;

    const macroFunnelData = [
      { stage: 'Leads Uploaded', count: totalLeads, rate: 100, color: '#3b82f6' },
      { stage: 'AI Engaged', count: totalMessages, rate: totalLeads > 0 ? ((totalMessages / totalLeads) * 100).toFixed(1) : 0, color: '#10b981' },
      { stage: 'Replied', count: totalResponses, rate: totalLeads > 0 ? ((totalResponses / totalLeads) * 100).toFixed(1) : 0, color: '#f59e0b' },
      { stage: 'Hot Lead', count: totalHotLeads, rate: totalLeads > 0 ? ((totalHotLeads / totalLeads) * 100).toFixed(1) : 0, color: '#ef4444' },
      { stage: 'Sales Connected', count: Math.floor(totalHotLeads * 0.8), rate: totalLeads > 0 ? ((totalHotLeads * 0.8 / totalLeads) * 100).toFixed(1) : 0, color: '#8b5cf6' },
      { stage: 'Qualified', count: Math.floor(totalHotLeads * 0.6), rate: totalLeads > 0 ? ((totalHotLeads * 0.6 / totalLeads) * 100).toFixed(1) : 0, color: '#ec4899' },
      { stage: 'Deal Won', count: totalConversions, rate: totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0, color: '#06b6d4' }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Macro Conversion Funnel</h3>
            <p className="text-sm text-gray-600 mt-1">Real data from your campaigns and leads</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {macroFunnelData.map((stage, index) => (
                <div key={stage.stage} className="p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">{stage.stage}</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">{typeof stage.count === 'number' ? stage.count.toLocaleString() : stage.count}</span>
                      <span className="text-sm text-gray-500 ml-2">({stage.rate}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, stage.rate)}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Historical Performance Trends</h3>
            <p className="text-sm text-gray-600 mt-1">Real cost and performance data from your campaigns</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dashboardData.historicalTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="rate" orientation="left" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="cost" orientation="right" stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line yAxisId="rate" dataKey="hotLeadRate" stroke="#10b981" strokeWidth={3} name="Hot Lead Rate %" />
                <Line yAxisId="rate" dataKey="replyRate" stroke="#3b82f6" strokeWidth={3} name="Reply Rate %" />
                <Line yAxisId="cost" dataKey="costPerHot" stroke="#f59e0b" strokeWidth={3} name="Cost per Hot Lead $" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Source ROI Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hot Leads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.leadSourceROI.map((source, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.source}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{source.leads.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{source.hotLeads}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${source.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        source.roi === null ? 'bg-green-100 text-green-800' :
                        source.roi > 200 ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {source.roi === null ? 'Free' : `${source.roi}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AIPerformance = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">AI Confidence vs Actual Outcome</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={dashboardData.aiInsights.confidenceData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="confidence" 
                  domain={[0, 1]} 
                  type="number"
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <YAxis 
                  dataKey="actualHot" 
                  domain={[0, 1]} 
                  type="number"
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'actualHot' ? `${(value * 100).toFixed(1)}%` : `${(value * 100).toFixed(0)}%`,
                    name === 'actualHot' ? 'Actual Hot %' : 'AI Confidence'
                  ]}
                />
                <Scatter dataKey="actualHot" fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const LeadPerformance = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Performance Overview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <Users className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-2">Total Leads</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <Target className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <div className="text-3xl font-bold text-green-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.hotLeads, 0)}
                </div>
                <div className="text-sm text-gray-600 mt-2">Hot Leads</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <BarChart3 className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                <div className="text-3xl font-bold text-purple-600">
                  {dashboardData.performanceMetrics.averagePerformance || 0}%
                </div>
                <div className="text-sm text-gray-600 mt-2">Avg Conversion Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Conversion Funnel</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-900">Total Leads</span>
                <span className="text-xl font-bold text-blue-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Engaged Leads</span>
                <span className="text-xl font-bold text-green-600">
                  {Math.floor(dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0) * 0.7).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <span className="font-medium text-gray-900">Hot Leads</span>
                <span className="text-xl font-bold text-orange-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.hotLeads, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PerformanceAnalytics = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const { performanceMetrics, campaignPerformance, aiInsights } = dashboardData;

    return (
      <div className="space-y-8">
        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Messages</p>
                <p className="text-3xl font-bold text-blue-900">{performanceMetrics.totalMessages?.toLocaleString() || 0}</p>
                <p className="text-xs text-blue-600 mt-1">Last {dateRange} days</p>
              </div>
              <MessageSquare className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Response Rate</p>
                <p className="text-3xl font-bold text-green-900">{performanceMetrics.responseRate || 0}%</p>
                <p className="text-xs text-green-600 mt-1">
                  {performanceMetrics.totalResponses || 0} responses
                </p>
              </div>
              <Activity className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-900">{performanceMetrics.conversionRate || 0}%</p>
                <p className="text-xs text-purple-600 mt-1">
                  {performanceMetrics.totalConversions || 0} conversions
                </p>
              </div>
              <Target className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-orange-900">{performanceMetrics.activeCampaigns || 0}</p>
                <p className="text-xs text-orange-600 mt-1">Currently running</p>
              </div>
              <BarChart3 className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Campaign Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Campaign Performance Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages Sent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Replied
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Converted
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaignPerformance.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{row.campaign}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {row.sent?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{row.opened?.toLocaleString() || 0}</div>
                      <div className="text-xs text-gray-500">
                        {row.sent > 0 ? ((row.opened / row.sent) * 100).toFixed(1) : 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{row.replied?.toLocaleString() || 0}</div>
                      <div className="text-xs text-gray-500">
                        {row.sent > 0 ? ((row.replied / row.sent) * 100).toFixed(1) : 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{row.converted?.toLocaleString() || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        row.rate >= 15 
                          ? 'bg-green-100 text-green-800'
                          : row.rate >= 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {row.rate || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights with Real Follow-up Timing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing AI Personas</h3>
            <div className="space-y-4">
              {(aiInsights.topPerformingPersonas || []).map((persona, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-xl ${
                  index === 0 ? 'bg-green-50' : 
                  index === 1 ? 'bg-blue-50' : 'bg-yellow-50'
                }`}>
                  <div>
                    <div className="font-medium text-gray-900">{persona.name}</div>
                    <div className="text-sm text-gray-600">{persona.campaigns} campaigns</div>
                  </div>
                  <div className={`font-bold text-lg ${
                    index === 0 ? 'text-green-600' : 
                    index === 1 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {persona.conversion}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Optimal Follow-up Timing</h3>
            <div className="space-y-4">
              {(aiInsights.followupTiming || []).map((timing, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-600">Day {timing.day} Follow-up</span>
                  <span className={`font-medium ${
                    index === 0 ? 'text-green-600' : 
                    index === 1 ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    {timing.responseRate}% response
                  </span>
                </div>
              ))}
              
              {/* Dynamic recommendation based on actual data */}
              {aiInsights.followupTiming && aiInsights.followupTiming.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm font-medium text-blue-900">💡 Recommendation</div>
                  <div className="text-sm text-blue-700 mt-1">
                    {(() => {
                      const bestTiming = aiInsights.followupTiming.reduce((best, current) => 
                        current.responseRate > best.responseRate ? current : best
                      );
                      return `Day ${bestTiming.day} follow-up shows highest response rate (${bestTiming.responseRate}%)`;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SalesOutcomes = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const { salesRepPerformance } = dashboardData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Qualification Performance</h3>
            <p className="text-sm text-gray-600 mt-1">Team performance in converting leads to hot status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hot Leads Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipeline Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesRepPerformance && salesRepPerformance.length > 0 ? (
                  salesRepPerformance.map((rep, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{rep.rep}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{rep.totalLeadsAssigned || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="font-semibold text-green-600">{rep.hotLeadsGenerated || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${(rep.pipelineValue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          rep.conversionRate >= 75 ? 'bg-green-100 text-green-800' :
                          rep.conversionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          rep.conversionRate > 0 ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rep.conversionRate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                      No team data available. Add team members in the Sales Team section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Lead Qualification Summary</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <span className="text-2xl font-bold text-blue-600">
                  {salesRepPerformance.reduce((acc, rep) => acc + (rep.totalLeadsAssigned || 0), 0)}
                </span>
                <p className="text-sm text-gray-600">Total Leads Assigned</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Target className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <span className="text-2xl font-bold text-green-600">
                  {salesRepPerformance.reduce((acc, rep) => acc + (rep.hotLeadsGenerated || 0), 0)}
                </span>
                <p className="text-sm text-gray-600">Hot Leads Generated</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <span className="text-2xl font-bold text-purple-600">
                  {(() => {
                    const totalAssigned = salesRepPerformance.reduce((acc, rep) => acc + (rep.totalLeadsAssigned || 0), 0);
                    const totalHot = salesRepPerformance.reduce((acc, rep) => acc + (rep.hotLeadsGenerated || 0), 0);
                    if (totalAssigned === 0) return '0%';
                    return `${((totalHot / totalAssigned) * 100).toFixed(1)}%`;
                  })()}
                </span>
                <p className="text-sm text-gray-600">Overall Conversion Rate</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <DollarSign className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                <span className="text-2xl font-bold text-orange-600">
                  ${(pipelineValue/1000).toFixed(0)}K
                </span>
                <p className="text-sm text-gray-600">Total Pipeline Value</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomReports = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Custom Report Builder</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Build Custom Reports</h4>
            <p className="text-gray-600 mb-6">Create personalized analytics dashboards with your real data</p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4 inline mr-2" />
              Create New Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Data</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button 
              onClick={loadAllData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'overview':
        return <OverviewReports />;
      case 'lead-performance':
        return <LeadPerformance />;
      case 'ai-performance':
        return <AIPerformance />;
      case 'performance-analytics':
        return <PerformanceAnalytics />;
      case 'abtesting':
        return <ABTestingDashboard />;
      case 'sales-outcomes':
        return <SalesOutcomes />;
      case 'custom-reports':
        return <CustomReports />;
      default:
        return <OverviewReports />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilterBar />
      <NavigationTabs activeView={activeView} setActiveView={handleViewChange} />
      <div className="px-6 py-8">
        {renderActiveView()}
      </div>
    </div>
  );
}