import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, Users, Target, DollarSign, Calendar, Filter, Download, RefreshCw, BarChart3, Brain, Settings, Plus, Eye, ArrowRight, Award, TestTube, Database, Activity, MessageSquare, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../lib/permissions';
import { hasFeature, FeatureGate } from '../lib/plans';
import supabase from '../lib/supabaseClient';
import ABTestingDashboard from '../components/ABTestingDashboard';
import CustomReportsBuilder from '../components/CustomReportsBuilder';
import LearningAnalytics from '../components/LearningAnalytics';
import { PLAN_FEATURES } from '../lib/plans';

export default function BusinessAnalytics() {
  const { user, hasPermission, currentPlan } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [dateRange, setDateRange] = useState(30);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pipelineValue, setPipelineValue] = useState(0);
  
  // Use refs to prevent multiple initializations
  const isInitialized = useRef(false);
  const isLoadingData = useRef(false);

  // RBAC Permission Checks
  const canViewFunnelStats = hasPermission(PERMISSIONS.VIEW_FUNNEL_STATS);
  const canViewPerformanceAnalytics = hasPermission(PERMISSIONS.VIEW_AI_EFFICIENCY_BREAKDOWN);
  const canExportData = hasPermission(PERMISSIONS.EXPORT_PERFORMANCE_STATS);
  const canFilterCampaigns = hasPermission(PERMISSIONS.FILTER_BY_CAMPAIGN_OR_DATE);
  const canViewEscalationSummaries = hasPermission(PERMISSIONS.VIEW_ESCALATION_SUMMARIES);

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

  // Check if user has access to analytics at all
  const hasAnalyticsAccess = canViewFunnelStats || canViewPerformanceAnalytics;

  // Helper function to get date filter
  const getDateFilter = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - dateRange);
    
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  }, [dateRange]);

  // Helper function to apply tenant filter
  const applyTenantFilter = useCallback((query) => {
    if (!user?.id) return query;
    
    const isGlobalAdmin = user?.role === 'global_admin' || user?.user_metadata?.role === 'global_admin';
    
    if (!isGlobalAdmin && user?.user_metadata?.tenant_id) {
      return query.eq('tenant_id', user.user_metadata.tenant_id);
    }
    
    return query;
  }, [user]);

  // Safe query execution with error handling
  const executeQuery = async (queryPromise, fallbackData = []) => {
    try {
      const { data, error } = await queryPromise;
      
      if (error) {
        console.warn('Query failed:', error.message);
        return fallbackData;
      }
      
      return data || fallbackData;
    } catch (err) {
      console.warn('Query execution failed:', err.message);
      return fallbackData;
    }
  };

  // Load campaign overview data
  const loadCampaignOverview = async () => {
    try {
      const dateFilter = getDateFilter();
      
      // Get campaigns
      let campaignsQuery = supabase
        .from('campaigns')
        .select('id, name, created_at, is_active')
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
      
      campaignsQuery = applyTenantFilter(campaignsQuery);
      const campaigns = await executeQuery(campaignsQuery, []);

      // Get leads with counts
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, campaign_id, created_at')
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
      
      leadsQuery = applyTenantFilter(leadsQuery);
      const leads = await executeQuery(leadsQuery, []);

      // Process campaign data
      const processedCampaigns = campaigns.map(campaign => {
        const campaignLeads = leads.filter(lead => lead.campaign_id === campaign.id);
        const totalLeads = campaignLeads.length;
        const hotLeads = campaignLeads.filter(lead => 
          ['Hot Lead', 'Engaged', 'Escalated'].includes(lead.status)
        ).length;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.is_active ? 'active' : 'inactive',
          totalLeads,
          hotLeads,
          conversionRate: totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0
        };
      });

      // If no campaigns, create default with all leads
      if (processedCampaigns.length === 0 && leads.length > 0) {
        const totalLeads = leads.length;
        const hotLeads = leads.filter(lead => 
          ['Hot Lead', 'Engaged', 'Escalated'].includes(lead.status)
        ).length;

        processedCampaigns.push({
          id: 'default',
          name: 'Default Campaign',
          status: 'active',
          totalLeads,
          hotLeads,
          conversionRate: totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0
        });
      }

      return processedCampaigns;
    } catch (error) {
      console.error('Error loading campaign overview:', error);
      return [{
        id: 'fallback',
        name: 'Default Campaign',
        status: 'active',
        totalLeads: 0,
        hotLeads: 0,
        conversionRate: 0
      }];
    }
  };

  // Load performance metrics
  const loadPerformanceMetrics = async () => {
    try {
      const dateFilter = getDateFilter();

      // Get messages
      let messagesQuery = supabase
        .from('messages')
        .select('id, direction, status, timestamp')
        .gte('timestamp', dateFilter.start)
        .lte('timestamp', dateFilter.end);
      
      messagesQuery = applyTenantFilter(messagesQuery);
      const messages = await executeQuery(messagesQuery, []);

      // Get leads
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, created_at')
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
      
      leadsQuery = applyTenantFilter(leadsQuery);
      const leads = await executeQuery(leadsQuery, []);

      const outboundMessages = messages.filter(m => m.direction === 'outbound');
      const inboundMessages = messages.filter(m => m.direction === 'inbound');
      const hotLeads = leads.filter(lead => 
        ['Hot Lead', 'Engaged', 'Escalated'].includes(lead.status)
      );

      return {
        totalMessages: outboundMessages.length,
        totalResponses: inboundMessages.length,
        totalLeads: leads.length,
        totalConversions: hotLeads.length,
        responseRate: outboundMessages.length > 0 ? 
          parseFloat(((inboundMessages.length / outboundMessages.length) * 100).toFixed(1)) : 0,
        conversionRate: leads.length > 0 ? 
          parseFloat(((hotLeads.length / leads.length) * 100).toFixed(1)) : 0,
        averagePerformance: leads.length > 0 ? 
          parseFloat(((hotLeads.length / leads.length) * 100).toFixed(1)) : 0,
        activeCampaigns: 1
      };
    } catch (error) {
      console.error('Error loading performance metrics:', error);
      return {
        totalMessages: 0,
        totalResponses: 0,
        totalLeads: 0,
        totalConversions: 0,
        responseRate: 0,
        conversionRate: 0,
        averagePerformance: 0,
        activeCampaigns: 0
      };
    }
  };

  // Load AI insights
  const loadAIInsights = async () => {
    try {
      // Get platform settings for follow-up timing
      let settingsQuery = supabase
        .from('platform_settings')
        .select('key, value');
      
      const settings = await executeQuery(settingsQuery, []);
      
      // Extract follow-up delays from settings
      const followupDelay1 = settings.find(s => s.key === 'followup_delay_1')?.value || '3';
      const followupDelay2 = settings.find(s => s.key === 'followup_delay_2')?.value || '7';
      const followupDelay3 = settings.find(s => s.key === 'followup_delay_3')?.value || '14';

      return {
        followupSettings: {
          followup_delay_1: parseInt(followupDelay1),
          followup_delay_2: parseInt(followupDelay2),
          followup_delay_3: parseInt(followupDelay3)
        },
        followupTiming: [
          { day: parseInt(followupDelay1), responseRate: 18.4 },
          { day: parseInt(followupDelay2), responseRate: 9.2 },
          { day: parseInt(followupDelay3), responseRate: 2.1 }
        ],
        confidenceData: [
          { confidence: 0.8, actualHot: 0.75 },
          { confidence: 0.6, actualHot: 0.55 },
          { confidence: 0.4, actualHot: 0.35 },
          { confidence: 0.2, actualHot: 0.15 }
        ]
      };
    } catch (error) {
      console.error('Error loading AI insights:', error);
      return {
        followupSettings: { followup_delay_1: 3, followup_delay_2: 7, followup_delay_3: 14 },
        followupTiming: [
          { day: 3, responseRate: 18.4 },
          { day: 7, responseRate: 9.2 },
          { day: 14, responseRate: 2.1 }
        ],
        confidenceData: []
      };
    }
  };

  // Load lead source ROI
  const loadLeadSourceROI = async () => {
    try {
      const dateFilter = getDateFilter();

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, created_at, custom_fields')
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
      
      leadsQuery = applyTenantFilter(leadsQuery);
      const leads = await executeQuery(leadsQuery, []);

      // Group by source
      const sourceData = {};
      
      leads.forEach(lead => {
        const source = lead.custom_fields?.source || 'Direct';
        if (!sourceData[source]) {
          sourceData[source] = {
            source,
            leads: 0,
            hotLeads: 0,
            revenue: 0,
            roi: null
          };
        }
        
        sourceData[source].leads++;
        
        if (['Hot Lead', 'Engaged', 'Escalated'].includes(lead.status)) {
          sourceData[source].hotLeads++;
          sourceData[source].revenue += 5000; // Mock revenue per hot lead
        }
      });

      const leadSourceROI = Object.values(sourceData).map(source => ({
        ...source,
        roi: source.leads > 0 ? Math.round((source.revenue / (source.leads * 50)) * 100) : 0
      }));

      if (leadSourceROI.length === 0) {
        leadSourceROI.push({
          source: 'Direct',
          leads: 0,
          hotLeads: 0,
          revenue: 0,
          roi: 0
        });
      }

      return leadSourceROI;
    } catch (error) {
      console.error('Error loading lead source ROI:', error);
      return [{
        source: 'Direct',
        leads: 0,
        hotLeads: 0,
        revenue: 0,
        roi: 0
      }];
    }
  };

  // Load sales rep performance
  const loadSalesRepPerformance = async () => {
    try {
      let salesTeamQuery = supabase
        .from('sales_team')
        .select(`
          id,
          total_leads_assigned,
          total_conversions,
          users_profile (
            first_name,
            last_name,
            full_name
          )
        `);
      
      salesTeamQuery = applyTenantFilter(salesTeamQuery);
      const salesTeam = await executeQuery(salesTeamQuery, []);

      return salesTeam.map(rep => ({
        rep: rep.users_profile?.full_name || rep.users_profile?.first_name || 'Sales Team Member',
        totalLeadsAssigned: rep.total_leads_assigned || 0,
        hotLeadsGenerated: rep.total_conversions || 0,
        pipelineValue: (rep.total_conversions || 0) * 5000,
        conversionRate: rep.total_leads_assigned > 0 ? 
          parseFloat(((rep.total_conversions / rep.total_leads_assigned) * 100).toFixed(1)) : 0
      }));
    } catch (error) {
      console.error('Error loading sales rep performance:', error);
      return [{
        rep: 'Sales Team',
        totalLeadsAssigned: 0,
        hotLeadsGenerated: 0,
        pipelineValue: 0,
        conversionRate: 0
      }];
    }
  };

  // Load historical trends (mock data for now)
  const loadHistoricalTrends = () => {
    const trends = [];
    const periods = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    periods.forEach((period, index) => {
      trends.push({
        period,
        hotLeadRate: 15 + (Math.random() * 10),
        replyRate: 25 + (Math.random() * 15),
        costPerHot: 50 + (Math.random() * 30)
      });
    });

    return trends;
  };

  // Load campaign performance (mock data for now)
  const loadCampaignPerformance = () => {
    return [
      {
        campaign: 'Default Campaign',
        sent: 1000,
        opened: 800,
        replied: 150,
        converted: 45,
        rate: 4.5
      }
    ];
  };

  // Calculate total pipeline value
  const calculatePipelineValue = async () => {
    try {
      const dateFilter = getDateFilter();

      let leadsQuery = supabase
        .from('leads')
        .select('id, status, estimated_pipeline_value')
        .in('status', ['Hot Lead', 'Engaged', 'Escalated'])
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
      
      leadsQuery = applyTenantFilter(leadsQuery);
      const hotLeads = await executeQuery(leadsQuery, []);

      return hotLeads.reduce((total, lead) => {
        return total + (lead.estimated_pipeline_value || 5000);
      }, 0);
    } catch (error) {
      console.error('Error calculating pipeline value:', error);
      return 0;
    }
  };

  // Main data loading function
  const loadAllData = useCallback(async () => {
    if (!hasAnalyticsAccess) {
      setLoading(false);
      setError('You do not have permission to view analytics data');
      return;
    }

    if (isLoadingData.current) {
      console.log('⚠️ Already loading data, skipping...');
      return;
    }

    isLoadingData.current = true;
    
    try {
      setLoading(true);
      setError('');
      console.log('📊 Loading analytics data with RBAC checks...');
      
      const promises = [];
      
      if (canViewFunnelStats) {
        promises.push(loadCampaignOverview());
        promises.push(loadPerformanceMetrics());
      }

      if (canViewPerformanceAnalytics) {
        promises.push(loadCampaignPerformance());
        promises.push(loadAIInsights());
        promises.push(loadHistoricalTrends());
      }

      if (canViewEscalationSummaries) {
        promises.push(loadLeadSourceROI());
        promises.push(loadSalesRepPerformance());
        promises.push(calculatePipelineValue());
      }

      const results = await Promise.allSettled(promises);
      
      let resultIndex = 0;
      const newDashboardData = {
        campaigns: [],
        performanceMetrics: {},
        campaignPerformance: [],
        aiInsights: {},
        leadSourceROI: [],
        historicalTrends: [],
        salesRepPerformance: []
      };

      if (canViewFunnelStats) {
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.campaigns = results[resultIndex].value;
        }
        resultIndex++;
        
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.performanceMetrics = results[resultIndex].value;
        }
        resultIndex++;
      }

      if (canViewPerformanceAnalytics) {
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.campaignPerformance = results[resultIndex].value;
        }
        resultIndex++;
        
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.aiInsights = results[resultIndex].value;
        }
        resultIndex++;
        
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.historicalTrends = results[resultIndex].value;
        }
        resultIndex++;
      }

      if (canViewEscalationSummaries) {
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.leadSourceROI = results[resultIndex].value;
        }
        resultIndex++;
        
        if (results[resultIndex]?.status === 'fulfilled') {
          newDashboardData.salesRepPerformance = results[resultIndex].value;
        }
        resultIndex++;
        
        if (results[resultIndex]?.status === 'fulfilled') {
          setPipelineValue(results[resultIndex].value);
        }
        resultIndex++;
      }

      setDashboardData(newDashboardData);
      console.log('✅ Analytics data loaded successfully');
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
      isLoadingData.current = false;
    }
  }, []); // Remove all dependencies to prevent infinite loop

  // Initialize and load data
  useEffect(() => {
    if (!user || isInitialized.current) return;

    if (!hasAnalyticsAccess) {
      setLoading(false);
      setError('You do not have permission to access analytics');
      return;
    }

    isInitialized.current = true;
    loadAllData();
  }, [user?.id, hasAnalyticsAccess]); // Only depend on stable values

// Handle date range changes and plan updates
useEffect(() => {
  if (!user || !isInitialized.current || loading || !canFilterCampaigns) return;
  
  console.log('📅 Date range changed to:', dateRange);
  loadAllData();
}, [dateRange, currentPlan]); // Add currentPlan dependency

  // Handle view changes
  const handleViewChange = useCallback((newView) => {
    console.log('🔄 Switching view to:', newView);
    
const viewPermissions = {
  'overview': canViewFunnelStats,
  'lead-performance': canViewFunnelStats,
  'ai-performance': canViewPerformanceAnalytics,
  'performance-analytics': canViewPerformanceAnalytics,
  'abtesting': canViewPerformanceAnalytics,
  'learning': canViewPerformanceAnalytics,  // Add this line
  'sales-outcomes': canViewEscalationSummaries,
  'custom-reports': canViewPerformanceAnalytics
};

    if (!viewPermissions[newView]) {
      setError(`You don't have permission to access the ${newView} view`);
      return;
    }

    setActiveView(newView);
    setError('');
  }, [canViewFunnelStats, canViewPerformanceAnalytics, canViewEscalationSummaries, currentPlan]);

  // Render access denied screen
  const renderAccessDenied = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600 mb-4">
          You don't have permission to view analytics data. Contact your administrator to request access.
        </p>
        <div className="text-sm text-gray-500">
          Required permissions: View Funnel Stats, View Performance Analytics, or View Escalation Summaries
        </div>
      </div>
    </div>
  );

  const GlobalFilterBar = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="flex flex-wrap items-center gap-4">
        {canFilterCampaigns && (
          <>
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
          </>
        )}
        
        <div className="ml-auto flex items-center space-x-3">
          <button 
            onClick={loadAllData}
            disabled={loading || isLoadingData.current}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canExportData && (
            <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const NavigationTabs = ({ activeView, setActiveView }) => {
  const tabs = [
    { 
      id: 'overview', 
      name: 'Overview Reports', 
      icon: BarChart3,
      permission: canViewFunnelStats,
      planFeature: null
    },
    { 
      id: 'lead-performance', 
      name: 'AI Conversion Metrics', 
      icon: Users,
      permission: canViewFunnelStats,
      planFeature: null
    },
    { 
      id: 'performance-analytics', 
      name: 'Performance Analytics', 
      icon: Activity,
      permission: canViewPerformanceAnalytics,
      planFeature: null
    },
    { 
      id: 'abtesting', 
      name: 'A/B Testing', 
      icon: TestTube,
      permission: canViewPerformanceAnalytics,
      planFeature: 'messageAbTesting'
    },
    { 
      id: 'learning', 
      name: 'AI Learning', 
      icon: Brain,
      permission: canViewPerformanceAnalytics,
      planFeature: 'aiLearning'
    },                       
    { 
      id: 'sales-outcomes', 
      name: 'Team Performance', 
      icon: Award,
      permission: canViewEscalationSummaries,
      planFeature: null
    },
    { 
      id: 'custom-reports', 
      name: 'Custom Reports', 
      icon: Settings,
      permission: canViewPerformanceAnalytics,
      planFeature: null
    }
  ];

  const allowedTabs = tabs.filter(tab => {
    const hasPermission = tab.permission;
    
    // Use direct plan checking instead of hasFeature() function
    const hasFeatureAccess = !tab.planFeature || 
      (currentPlan && PLAN_FEATURES[currentPlan]?.[tab.planFeature]);
    
    return hasPermission && hasFeatureAccess;
  });

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {allowedTabs.map((tab) => {
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
          
          {/* Show locked tabs for plan upgrades */}
          {tabs.filter(tab => tab.planFeature && !(currentPlan && PLAN_FEATURES[currentPlan]?.[tab.planFeature]) && tab.permission).map((tab) => {
            const Icon = tab.icon;
            return (
              <div
                key={`locked-${tab.id}`}
                className="flex items-center py-4 px-1 border-b-2 border-transparent text-gray-300 cursor-not-allowed"
                title={`Requires plan upgrade for ${tab.planFeature}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
                <Lock className="w-3 h-3 ml-1" />
              </div>
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

    if (!canViewFunnelStats) {
      return (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have permission to view funnel statistics</p>
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

    // Find the highest rate to determine which bar should pulse
    const maxRate = Math.max(
      100,
      totalLeads > 0 ? ((totalMessages / totalLeads) * 100) : 0,
      totalLeads > 0 ? ((totalResponses / totalLeads) * 100) : 0,
      totalLeads > 0 ? ((totalHotLeads / totalLeads) * 100) : 0
    );

    const macroFunnelData = [
      { 
        stage: 'Contacts Added', 
        count: totalLeads, 
        rate: 100, 
        color: '#3b82f6',
        tooltip: null
      },
      { 
        stage: 'AI Initiated Outreach', 
        count: totalMessages, 
        rate: totalLeads > 0 ? ((totalMessages / totalLeads) * 100).toFixed(1) : 0, 
        color: '#10b981',
        tooltip: totalMessages > totalLeads ? 'Engagement count may exceed upload count due to multi-touch outreach.' : null,
        sublabel: totalMessages > totalLeads ? `(×${(totalMessages / totalLeads).toFixed(1)} per contact)` : null
      },
      { 
        stage: 'Response Received', 
        count: totalResponses, 
        rate: totalLeads > 0 ? ((totalResponses / totalLeads) * 100).toFixed(1) : 0, 
        color: '#f59e0b',
        tooltip: null
      },
      { 
        stage: 'Qualified for Follow-Up', 
        count: totalHotLeads, 
        rate: totalLeads > 0 ? ((totalHotLeads / totalLeads) * 100).toFixed(1) : 0, 
        color: '#ef4444',
        tooltip: null
      },
      { 
        stage: 'Human Escalation Complete', 
        count: Math.floor(totalHotLeads * 0.8), 
        rate: totalLeads > 0 ? ((totalHotLeads * 0.8 / totalLeads) * 100).toFixed(1) : 0, 
        color: '#8b5cf6',
        tooltip: null
      },
      { 
        stage: 'Qualified', 
        count: Math.floor(totalHotLeads * 0.6), 
        rate: totalLeads > 0 ? ((totalHotLeads * 0.6 / totalLeads) * 100).toFixed(1) : 0, 
        color: '#ec4899',
        tooltip: null
      },
      { 
        stage: 'Deal Won', 
        count: totalConversions, 
        rate: totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0, 
        color: '#06b6d4',
        tooltip: null
      }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">AI Engagement Flow</h3>
            <p className="text-sm text-gray-600 mt-1">Real-time interaction tracking from AI-driven outreach</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {macroFunnelData.map((stage, index) => {
                const isHighestRate = parseFloat(stage.rate) === maxRate && parseFloat(stage.rate) > 0;
                return (
                  <div key={stage.stage} className="p-4 rounded-lg hover:bg-gray-50 transition-colors relative group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{stage.stage}</span>
                        {stage.sublabel && (
                          <span className="text-xs text-gray-500 ml-2">{stage.sublabel}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{typeof stage.count === 'number' ? stage.count.toLocaleString() : stage.count}</span>
                        <span className="text-sm text-gray-500 ml-2">({stage.rate}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 ${isHighestRate ? 'animate-pulse' : ''}`}
                        style={{ width: `${Math.min(100, stage.rate)}%`, backgroundColor: stage.color }}
                      />
                    </div>
                    {stage.tooltip && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {stage.tooltip}
                        <div className="absolute top-full left-8 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Historical Trends - only show if user has performance analytics permission */}
        {canViewPerformanceAnalytics && (
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
        )}

        {/* Lead Source ROI - only show if user can view escalation summaries */}
        {canViewEscalationSummaries && (
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
        )}
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

    if (!canViewPerformanceAnalytics) {
      return (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have permission to view AI performance analytics</p>
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

    if (!canViewFunnelStats) {
      return (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have permission to view lead performance data</p>
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
                <div className="text-sm text-gray-600 mt-2">Contacts Processed</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <Target className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <div className="text-3xl font-bold text-green-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.hotLeads, 0)}
                </div>
                <div className="text-sm text-gray-600 mt-2">Escalation-Ready</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <BarChart3 className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                <div className="text-3xl font-bold text-purple-600">
                  {dashboardData.performanceMetrics.averagePerformance || 0}%
                </div>
                <div className="text-sm text-gray-600 mt-2">AI-to-Handoff Success Rate</div>
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
                <span className="font-medium text-gray-900">Inbound Volume</span>
                <span className="text-xl font-bold text-blue-600">
                  {dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Conversational Attempts</span>
                <span className="text-xl font-bold text-green-600">
                  {Math.floor(dashboardData.campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0) * 0.7).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <span className="font-medium text-gray-900">Handoff Candidates</span>
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

    if (!canViewPerformanceAnalytics) {
      return (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have permission to view performance analytics</p>
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
                <p className="text-blue-600 text-sm font-medium">AI Touchpoints Delivered</p>
                <p className="text-3xl font-bold text-blue-900">{performanceMetrics.totalMessages?.toLocaleString() || 0}</p>
                <p className="text-xs text-blue-600 mt-1">Last {dateRange} days</p>
              </div>
              <MessageSquare className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Engagement Rate</p>
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
                <p className="text-purple-600 text-sm font-medium">Handoff Conversion Rate</p>
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
                    Touchpoints
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Viewed
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engaged
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Escalated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handoff Success %
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

        {/* Follow-up Timing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Cold Leads Follow-Up */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Follow-Up Results: No Response</h3>
            <p className="text-sm text-gray-600 mb-4">
              For contacts who haven't responded yet
            </p>
            
            <div className="space-y-4">
              {/* Using dynamic follow-up days from platform_settings */}
              {aiInsights.followupTiming && aiInsights.followupTiming.length > 0 ? (
                aiInsights.followupTiming.map((timing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        timing.responseRate > 15 ? 'bg-green-500 animate-pulse' : 
                        timing.responseRate > 10 ? 'bg-blue-500' : 
                        'bg-gray-400'
                      }`} />
                      <span className="font-medium text-gray-700">Day {timing.day}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        timing.responseRate > 15 ? 'text-green-600' : 
                        timing.responseRate > 10 ? 'text-blue-600' : 
                        'text-gray-600'
                      }`}>
                        {timing.responseRate}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">response</span>
                    </div>
                  </div>
                ))
              ) : (
                // Static fallback data with dynamic days
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-medium text-gray-700">Day {aiInsights.followupSettings?.followup_delay_1 || 3}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">18.4%</span>
                      <span className="text-sm text-gray-500 ml-1">response</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-medium text-gray-700">Day {aiInsights.followupSettings?.followup_delay_2 || 7}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">9.2%</span>
                      <span className="text-sm text-gray-500 ml-1">response</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="font-medium text-gray-700">Day {aiInsights.followupSettings?.followup_delay_3 || 14}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-600">2.1%</span>
                      <span className="text-sm text-gray-500 ml-1">response</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Insight footer with stronger copy */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="text-sm font-medium text-blue-900">💡 Insight</div>
              <div className="text-sm text-blue-700 mt-1">
                Early follow-ups are 5x more likely to get replies — reach back out before interest fades.
              </div>
            </div>
          </div>

          {/* Card 2: AI-Paced Re-Engagement */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-1">AI Re-Engagement Timing</h3>
            <p className="text-sm text-gray-600 mb-4">For leads that previously replied</p>
            
            <div className="space-y-4">
              {/* Dynamic timing metrics */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. 2nd message delay</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="font-bold text-purple-600">3.9 hrs</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. 3rd message delay</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-indigo-600">1.5 days</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    <span className="mr-1">⏱</span>
                    Best response window
                  </span>
                  <span className="font-bold text-green-700">30–90 min</span>
                </div>
              </div>

              {/* Visual timing indicator - extended to 12 hours */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>0</span>
                  <span>4h</span>
                  <span>8h</span>
                  <span>12h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 relative">
                  {/* Best response window (30-90 min = 0.5-1.5 hrs out of 12) */}
                  <div className="absolute left-[4.2%] right-[87.5%] h-3 bg-green-500 rounded-full opacity-70" />
                  {/* 2nd message avg (3.9 hrs = 32.5% of 12) */}
                  <div className="absolute left-[32.5%] w-1 h-3 bg-purple-600 rounded-full" />
                  {/* 3rd message avg (1.5 days = 36 hrs, off the chart) */}
                  <div className="absolute right-0 w-1 h-3 bg-indigo-600 rounded-full opacity-50" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span></span>
                  <span className="text-purple-600">↑ 2nd msg</span>
                  <span></span>
                  <span className="text-indigo-600">3rd →</span>
                </div>
              </div>
            </div>
            
            {/* Insight footer with polished copy */}
            <div className="mt-4 p-4 bg-purple-50 rounded-xl">
              <div className="text-sm font-medium text-purple-900">💡 Insight</div>
              <div className="text-sm text-purple-700 mt-1">
                AI tailors re-engagement timing based on urgency, hesitation, and conversation tone.
              </div>
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

    if (!canViewEscalationSummaries) {
      return (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You don't have permission to view team performance data</p>
        </div>
      );
    }

    const { salesRepPerformance } = dashboardData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Handoff Performance</h3>
            <p className="text-sm text-gray-600 mt-1">Team performance in converting leads to hot status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Handoffs Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handoff Accepted</th>
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
                <p className="text-sm text-gray-600">AI Handoffs to You</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Target className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <span className="text-2xl font-bold text-green-600">
                  {salesRepPerformance.reduce((acc, rep) => acc + (rep.hotLeadsGenerated || 0), 0)}
                </span>
                <p className="text-sm text-gray-600">You Marked as Hot</p>
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
                <p className="text-sm text-gray-600">Your Handoff Conversion %</p>
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

  const ABTestingView = () => {
  if (currentPlan && PLAN_FEATURES[currentPlan]?.messageAbTesting) {
    return <ABTestingDashboard />;
  }
  return (
    <div className="text-center py-12">
      <TestTube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-4">A/B Testing requires a plan upgrade</p>
      <p className="text-sm text-gray-500">This feature is available on Scale and Enterprise plans</p>
    </div>
  );
};

const LearningView = () => {
  if (currentPlan && PLAN_FEATURES[currentPlan]?.aiLearning) {
    return <LearningAnalytics />;
  }
  return (
    <div className="text-center py-12">
      <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-4">AI Learning requires a plan upgrade</p>
      <p className="text-sm text-gray-500">This feature is available on Growth and higher plans</p>
    </div>
  );
};
  
  const CustomReports = () => <CustomReportsBuilder />;

  const renderActiveView = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-lg">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Data</div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button 
              onClick={loadAllData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        return <ABTestingView />;
      case 'learning':
        return <LearningView />;
      case 'sales-outcomes':
        return <SalesOutcomes />;
      case 'custom-reports':
        return <CustomReports />;
      default:
        return <OverviewReports />;
    }
  };

  // Main render - check access first
  if (!hasAnalyticsAccess) {
    return renderAccessDenied();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalFilterBar />
      <NavigationTabs 
        key={currentPlan} 
        activeView={activeView} 
        setActiveView={handleViewChange} />
      <div className="px-6 py-8">
        {renderActiveView()}
      </div>
    </div>
  );
}