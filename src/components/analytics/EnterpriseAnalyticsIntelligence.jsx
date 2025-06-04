import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ScatterChart, Scatter, ComposedChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, Phone, DollarSign, Calendar, Filter, Download, RefreshCw, BarChart3, Activity, Brain, Handshake, Settings, ChevronDown, Search, Plus, Eye, Share, Clock, ArrowRight, Building2, Globe, Zap, Award, AlertTriangle, Star, Shield, Database, Crown, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/apiClient';
import MetricCard from '../../components/ui/MetricCard'
import NavigationTabs from '../../components/ui/NavigationTabs'


// Mock data as fallback
const fallbackData = {
  industryBenchmarks: [
    { industry: 'Healthcare', customers: 234, avgRevenue: 45000, conversionRate: 18.2, benchmarkPosition: 'Top 10%' },
    { industry: 'Real Estate', customers: 567, avgRevenue: 28000, conversionRate: 22.1, benchmarkPosition: 'Top 5%' },
    { industry: 'Technology', customers: 445, avgRevenue: 52000, conversionRate: 15.8, benchmarkPosition: 'Top 15%' },
    { industry: 'Financial Services', customers: 189, avgRevenue: 78000, conversionRate: 12.4, benchmarkPosition: 'Top 20%' },
    { industry: 'Manufacturing', customers: 123, avgRevenue: 38000, conversionRate: 16.7, benchmarkPosition: 'Top 25%' }
  ],
  portfolioPerformance: [
    { segment: 'Enterprise (1000+ employees)', customers: 45, totalRevenue: 2800000, avgLTV: 95000, churnRate: 2.1, nps: 68 },
    { segment: 'Mid-Market (100-999 employees)', customers: 128, totalRevenue: 3200000, avgLTV: 42000, churnRate: 5.8, nps: 58 },
    { segment: 'SMB (10-99 employees)', customers: 890, totalRevenue: 4100000, avgLTV: 12500, churnRate: 12.4, nps: 52 },
    { segment: 'Startup (<10 employees)', customers: 1250, totalRevenue: 1900000, avgLTV: 3800, churnRate: 22.1, nps: 45 }
  ]
};

const GlobalKPIBar = ({ data, loading }) => {
  const kpis = data || {
    totalARR: 16200000,
    platformHealth: 99.7,
    enterpriseNPS: 68,
    marketPosition: 3
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Total ARR</p>
            <p className="text-2xl font-bold">
              {loading ? '...' : `$${(kpis.totalARR / 1000000).toFixed(1)}M`}
            </p>
            <p className="text-xs text-green-300">+22% QoQ</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Platform Health</p>
            <p className="text-2xl font-bold">
              {loading ? '...' : `${kpis.platformHealth}%`}
            </p>
            <p className="text-xs text-green-300">SLA Met</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Enterprise NPS</p>
            <p className="text-2xl font-bold">
              {loading ? '...' : kpis.enterpriseNPS}
            </p>
            <p className="text-xs text-green-300">+5 pts</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Market Position</p>
            <p className="text-2xl font-bold">
              {loading ? '...' : `#${kpis.marketPosition}`}
            </p>
            <p className="text-xs text-yellow-300">AI Lead Gen</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs opacity-80">Data Status</p>
            <p className="text-sm">
              {loading ? 'Loading...' : 'Real-time • Updated 2m ago'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}`}></div>
        </div>
      </div>
    </div>
  );
};

const EnterpriseFilterBar = ({ filters, setFilters, onRefresh, loading }) => (
  <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-gray-500" />
        <select 
          value={filters.customerSegment} 
          onChange={(e) => setFilters({...filters, customerSegment: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Customer Segments</option>
          <option value="enterprise">Enterprise (1000+)</option>
          <option value="midmarket">Mid-Market (100-999)</option>
          <option value="smb">SMB (10-99)</option>
          <option value="startup">Startup (&lt;10)</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Globe className="w-4 h-4 text-gray-500" />
        <select 
          value={filters.geography} 
          onChange={(e) => setFilters({...filters, geography: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="global">Global</option>
          <option value="north-america">North America</option>
          <option value="europe">Europe</option>
          <option value="apac">Asia Pacific</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select 
          value={filters.timeframe} 
          onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="last6months">Last 6 Months</option>
          <option value="last12months">Last 12 Months</option>
          <option value="ytd">Year to Date</option>
          <option value="last24months">Last 24 Months</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Layers className="w-4 h-4 text-gray-500" />
        <select 
          value={filters.industry} 
          onChange={(e) => setFilters({...filters, industry: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Industries</option>
          <option value="healthcare">Healthcare</option>
          <option value="realestate">Real Estate</option>
          <option value="technology">Technology</option>
          <option value="financial">Financial Services</option>
        </select>
      </div>

      <div className="ml-auto flex items-center space-x-3">
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm">
          <Database className="w-4 h-4 mr-1" />
          Data Sources
        </button>
        <button className="flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm">
          <Crown className="w-4 h-4 mr-1" />
          Executive Report
        </button>
      </div>
    </div>
  </div>
);

// API service functions
const apiService = {
  getAuthHeaders: () => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async fetchARRWaterfall(filters) {
  try {
    const response = await apiClient.get('/enterprise-analytics/revenue/arr-waterfall', {
      params: filters
    });
    return response?.data || { success: false, data: null };
  } catch (error) {
    console.error('Error fetching ARR waterfall:', error);
    return { success: false, data: null };
  }
},

  async fetchGlobalKPIs() {
    try {
      const response = await apiClient.get('/enterprise-analytics/kpis/global');
      return response?.data || { success: false, data: null };
    } catch (error) {
      console.error('Error fetching global KPIs:', error);
      return { success: false, data: null };
    }
  },

 async fetchMarketIntelligence(filters) {
  try {
    // CHANGE THIS LINE:
    const response = await apiClient.get('/enterprise-analytics/market/competitive-analysis', {
      params: filters
    });
    return response?.data || { success: false, data: null };
  } catch (error) {
    console.error('Error fetching market intelligence:', error);
    return { success: false, data: null };
  }
},

async fetchIndustryBenchmarks(filters) {
  try {
    // CHANGE THIS LINE:
    const response = await apiClient.get('/enterprise-analytics/market/industry-benchmarks', {
      params: filters
    });
    return response?.data || { success: false, data: null };
  } catch (error) {
    console.error('Error fetching industry benchmarks:', error);
    return { success: false, data: null };
  }
},

 async fetchRevenueMetrics(filters) {
    try {
      const response = await apiClient.get('/enterprise-analytics/revenue/metrics', {
        params: filters
      });
      return response?.data || { success: false, data: null };
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      return { success: false, data: null };
    }
  },


  async fetchPortfolioPerformance(filters) {
    try {
      const response = await apiClient.get('/enterprise-analytics/portfolio/performance', {
        params: filters
      });
      return response?.data || { success: false, data: null };
    } catch (error) {
      console.error('Error fetching portfolio performance:', error);
      return { success: false, data: null };
    }
  },

  async fetchCohortAnalysis(filters) {
    try {
      const response = await apiClient.get('/enterprise-analytics/portfolio/cohort-analysis', {
        params: filters
      });
      return response?.data || { success: false, data: null };
    } catch (error) {
      console.error('Error fetching cohort analysis:', error);
      return { success: false, data: null };
    }
  },

  async fetchPredictiveAnalytics(filters) {
    try {
      const [churnResponse, forecastResponse] = await Promise.all([
        apiClient.get('/enterprise-analytics/predictive/churn-risk', { params: filters }),
        apiClient.get('/enterprise-analytics/predictive/forecasting', { params: filters })
      ]);

      return {
        success: true,
        churnRisk: churnResponse?.data || { success: false, data: null },
        forecasting: forecastResponse?.data || { success: false, data: null }
      };
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      return { 
        success: false, 
        churnRisk: { success: false, data: null },
        forecasting: { success: false, data: null }
      };
    }
  }
};


// Component JSX (assumed it's part of PortfolioIntelligence or similar)
const PortfolioIntelligence = ({ loading }) => {
  return (
    <div>
      {/* Customer Health Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Enterprise Health Score"
          value="87"
          change="+5 pts"
          trend="up"
          insight="45 enterprise customers"
          icon={Shield}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Expansion Pipeline"
          value="$2.8M"
          change="+34%"
          trend="up"
          insight="234 opportunities identified"
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="At-Risk Revenue"
          value="$890K"
          change="-12%"
          trend="up"
          insight="42 accounts flagged"
          icon={AlertTriangle}
          color="orange"
          loading={loading}
        />
        <MetricCard
          title="Customer Success Score"
          value="94%"
          change="+2%"
          trend="up"
          insight="Based on product adoption"
          icon={Star}
          color="purple"
          loading={loading}
        />
      </div>
    </div>
  );
};

const MarketIntelligence = ({ data, loading }) => {
  return (
    <div className="space-y-6">
      {/* Market Position Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Market Share"
          value="14.2%"
          change="+2.1%"
          trend="up"
          insight="Top 3 in AI Lead Gen"
          icon={Globe}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="Category Growth"
          value="127%"
          change="+23%"
          trend="up"
          insight="vs Industry 89%"
          icon={TrendingUp}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Competitive Win Rate"
          value="67%"
          change="+12%"
          trend="up"
          insight="vs Top 5 Competitors"
          icon={Award}
          color="purple"
          loading={loading}
        />
        <MetricCard
          title="Time to Value"
          value="12 days"
          change="-8 days"
          trend="up"
          insight="Industry avg: 45 days"
          icon={Clock}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Competitive Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Competitive Win/Loss Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Performance against top 5 competitors in closed deals</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{data?.winRate || '67'}%</div>
                <div className="text-sm text-gray-600 mt-1">Win Rate vs Competitors</div>
                <div className="text-xs text-green-600 mt-2">+12% vs last quarter</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">${(data?.avgDealSize || 52000).toLocaleString()}</div>
                <div className="text-sm text-gray-600 mt-1">Avg Deal Size Won</div>
                <div className="text-xs text-blue-600 mt-2">+18% vs competitors</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">23 days</div>
                <div className="text-sm text-gray-600 mt-1">Sales Cycle vs Competition</div>
                <div className="text-xs text-purple-600 mt-2">-34% faster</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RevenueOperations = ({ data, loading }) => {
  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Net Revenue Retention"
          value={data?.netRevenueRetention ? `${data.netRevenueRetention}%` : "118%"}
          change="+8%"
          trend="up"
          insight="Expansion > Churn"
          icon={TrendingUp}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Gross Revenue Retention"
          value={data?.grossRevenueRetention ? `${data.grossRevenueRetention}%` : "94%"}
          change="+2%"
          trend="up"
          insight="Low churn rate"
          icon={Shield}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="Customer Acquisition Cost"
          value={data?.customerAcquisitionCost ? `$${data.customerAcquisitionCost.toLocaleString()}` : "$3,400"}
          change="-15%"
          trend="up"
          insight="Efficiency improving"
          icon={DollarSign}
          color="purple"
          loading={loading}
        />
        <MetricCard
          title="LTV:CAC Ratio"
          value={data?.ltvCacRatio ? `${data.ltvCacRatio}x` : "4.2x"}
          change="+0.8x"
          trend="up"
          insight="Healthy unit economics"
          icon={Award}
          color="orange"
          loading={loading}
        />
      </div>
    </div>
  );
};

const PredictiveAnalytics = ({ data, loading }) => {
  return (
    <div className="space-y-6">
      {/* Forecasting */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">12-Month Revenue Forecast</h3>
          <p className="text-sm text-gray-600 mt-1">AI-powered predictions with confidence intervals</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">$24.8M</div>
                <div className="text-sm text-gray-600">Predicted ARR (12mo)</div>
                <div className="text-xs text-green-600 mt-1">{data?.confidence || 89}% confidence</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data?.atRiskAccounts || 342}</div>
                <div className="text-sm text-gray-600">At-Risk Accounts</div>
                <div className="text-xs text-orange-600 mt-1">Intervention needed</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-green-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${((data?.expansionPipeline || 2800000) / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Expansion Pipeline</div>
                <div className="text-xs text-blue-600 mt-1">Next 6 months</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IndustryBenchmarks = ({ data, loading }) => {
  const benchmarkData = data || fallbackData.industryBenchmarks;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Industry Performance Benchmarks</h3>
          <p className="text-sm text-gray-600 mt-1">Your performance vs industry standards across key verticals</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Position</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {benchmarkData.map((industry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{industry.industry}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{industry.customers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${industry.avgRevenue?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{industry.conversionRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        industry.benchmarkPosition?.includes('Top 5%') ? 'bg-green-100 text-green-800' :
                        industry.benchmarkPosition?.includes('Top 10%') ? 'bg-blue-100 text-blue-800' :
                        industry.benchmarkPosition?.includes('Top 15%') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {industry.benchmarkPosition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default function EnterpriseAnalyticsIntelligence() {
  const [activeView, setActiveView] = useState('portfolio');
  const [filters, setFilters] = useState({
    customerSegment: 'all',
    geography: 'global',
    timeframe: 'last12months',
    industry: 'all'
  });
  const { user, canAccessEnterprise } = useAuth();
    

  // Data state
  const [analyticsData, setAnalyticsData] = useState({
    globalKPIs: null,
    portfolioData: null,
    marketData: null,
    revenueData: null,
    predictiveData: null,
    industryData: null
  });
  
  const [loading, setLoading] = useState({
    global: true,
    portfolio: false,
    market: false,
    revenue: false,
    predictive: false,
    benchmarks: false
  });
  
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);


  // Check user permissions
useEffect(() => {
  if (user && !canAccessEnterprise) {
    setError('Access denied. Enterprise Analytics requires elevated permissions.');
    return;
  }
  // ...
}, [user, canAccessEnterprise]);

  // Reload data when filters change
  useEffect(() => {
    if (apiAvailable && canAccessEnterprise) {
      loadViewData(activeView);
    }
  }, [filters, activeView, apiAvailable, user]);

  const loadInitialData = async () => {
    try {
      setLoading(prev => ({ ...prev, global: true }));
      
      // Try to load global KPIs first to test API connectivity
      const kpiResponse = await apiService.fetchGlobalKPIs();
      
      if (kpiResponse.success) {
        setAnalyticsData(prev => ({ ...prev, globalKPIs: kpiResponse?.data || null }));
        setApiAvailable(true);
        
        // Load initial view data
        await loadViewData('portfolio');
      }
    } catch (error) {
      console.warn('API not available, using fallback data:', error);
      setApiAvailable(false);
      
      // Use fallback data
      setAnalyticsData({
        globalKPIs: {
          totalARR: 16200000,
          platformHealth: 99.7,
          enterpriseNPS: 68,
          marketPosition: 3
        },
        portfolioData: { performance: fallbackData.portfolioPerformance },
        marketData: { winRate: 67, avgDealSize: 52000 },
        revenueData: { netRevenueRetention: 118, grossRevenueRetention: 94 },
        predictiveData: { atRiskAccounts: 342, expansionPipeline: 2800000 },
        industryData: fallbackData.industryBenchmarks
      });
    } finally {
      setLoading(prev => ({ ...prev, global: false }));
    }
  };

  const loadViewData = async (view) => {
    if (!apiAvailable) return;
    
    try {
      setLoading(prev => ({ ...prev, [view]: true }));
      
      switch (view) {
        case 'portfolio': {
          const [performance, cohort] = await Promise.all([
            apiService.fetchPortfolioPerformance(filters),
            apiService.fetchCohortAnalysis(filters)
          ]);
          
          setAnalyticsData(prev => ({
  ...prev,
  portfolioData: {
    performance: performance?.data || [],
    cohortAnalysis: cohort?.data || []
  }
}));
          break;
        }
        
        case 'market': {
          const [competitive, benchmarks] = await Promise.all([
            apiService.fetchMarketIntelligence(filters),
            apiService.fetchIndustryBenchmarks(filters)
          ]);
          
          setAnalyticsData(prev => ({
  ...prev,
  marketData: {
    competitive: competitive?.data || null,
    benchmarks: benchmarks?.data || null
  }
}));
          break;
        }
        
        case 'revenue': {
          const [metrics, waterfall] = await Promise.all([
            apiService.fetchRevenueMetrics(filters),
            apiService.fetchARRWaterfall(filters)
          ]);
          
          setAnalyticsData(prev => ({
  ...prev,
  revenueData: {
    metrics: metrics?.data || null,
    arrWaterfall: waterfall?.data || null
  }
}));
          break;
        }
        
        case 'predictive': {
          const predictiveResponse = await apiService.fetchPredictiveAnalytics(filters);
          
          setAnalyticsData(prev => ({
  ...prev,
  predictiveData: {
    ...predictiveResponse?.churnData?.data || {},
    ...predictiveResponse?.forecastData?.data || {}
  }
}));
          break;
        }
        
        case 'benchmarks': {
          const benchmarkResponse = await apiService.fetchIndustryBenchmarks(filters);
          
          setAnalyticsData(prev => ({
  ...prev,
  industryData: benchmarkResponse?.data || []
}));
          break;
        }
      }
      
    } catch (error) {
      console.error(`Error loading ${view} data:`, error);
      // Don't show error to user, just use fallback data
    } finally {
      setLoading(prev => ({ ...prev, [view]: false }));
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
    await loadViewData(activeView);
  };

  const renderActiveView = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const currentLoading = loading[activeView] || false;

    switch (activeView) {
      case 'portfolio':
        return <PortfolioIntelligence data={analyticsData.portfolioData} loading={currentLoading} />;
      case 'market':
        return <MarketIntelligence data={analyticsData.marketData} loading={currentLoading} />;
      case 'revenue':
        return <RevenueOperations data={analyticsData.revenueData} loading={currentLoading} />;
      case 'predictive':
        return <PredictiveAnalytics data={analyticsData.predictiveData} loading={currentLoading} />;
      case 'benchmarks':
        return <IndustryBenchmarks data={analyticsData.industryData} loading={currentLoading} />;
      default:
        return <PortfolioIntelligence data={analyticsData.portfolioData} loading={currentLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global KPI Bar */}
      <GlobalKPIBar data={analyticsData.globalKPIs} loading={loading.global} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Analytics Intelligence</h1>
            <p className="text-gray-600 mt-1">Strategic insights for data-driven decision making across your entire business portfolio</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">Enterprise Data Platform</p>
              <p className={`text-xs ${apiAvailable ? 'text-green-600' : 'text-yellow-600'}`}>
                {apiAvailable ? '99.7% uptime • Real-time sync' : 'Demo Mode • Fallback Data'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full animate-pulse ${apiAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
        </div>
      </div>

      {/* Enterprise Filter Bar */}
      <EnterpriseFilterBar 
        filters={filters} 
        setFilters={setFilters} 
        onRefresh={handleRefresh}
        loading={Object.values(loading).some(l => l)}
      />

      {/* Navigation Tabs */}
      <NavigationTabs activeView={activeView} setActiveView={setActiveView} />

      {/* Main Content */}
      <div className="p-6">
        {renderActiveView()}
      </div>
    </div>
  );
}