import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ScatterChart, Scatter, ComposedChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, Phone, DollarSign, Calendar, Filter, Download, RefreshCw, BarChart3, Activity, Brain, Handshake, Settings, ChevronDown, Search, Plus, Eye, Share, Clock, ArrowRight, Building2, Globe, Zap, Award, AlertTriangle, Star, Shield, Database, Crown, Layers } from 'lucide-react';

const industryBenchmarks = [
  { industry: 'Healthcare', customers: 234, avgRevenue: 45000, conversionRate: 18.2, benchmarkPosition: 'Top 10%' },
  { industry: 'Real Estate', customers: 567, avgRevenue: 28000, conversionRate: 22.1, benchmarkPosition: 'Top 5%' },
  { industry: 'Technology', customers: 445, avgRevenue: 52000, conversionRate: 15.8, benchmarkPosition: 'Top 15%' },
  { industry: 'Financial Services', customers: 189, avgRevenue: 78000, conversionRate: 12.4, benchmarkPosition: 'Top 20%' },
  { industry: 'Manufacturing', customers: 123, avgRevenue: 38000, conversionRate: 16.7, benchmarkPosition: 'Top 25%' }
];

<tbody className="bg-white divide-y divide-gray-200">
           {industryBenchmarks.map((industry, index) => (
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
// Enterprise-level mock data
const portfolioPerformance = [
  { segment: 'Enterprise (1000+ employees)', customers: 45, totalRevenue: 2800000, avgLTV: 95000, churnRate: 2.1, nps: 68 },
  { segment: 'Mid-Market (100-999 employees)', customers: 128, totalRevenue: 3200000, avgLTV: 42000, churnRate: 5.8, nps: 58 },
  { segment: 'SMB (10-99 employees)', customers: 890, totalRevenue: 4100000, avgLTV: 12500, churnRate: 12.4, nps: 52 },
  { segment: 'Startup (<10 employees)', customers: 1250, totalRevenue: 1900000, avgLTV: 3800, churnRate: 22.1, nps: 45 }
];

const cohortAnalysis = [
  { cohort: 'Q1 2024', month0: 100, month1: 94, month2: 89, month3: 85, month6: 78, month12: 71 },
  { cohort: 'Q2 2024', month0: 100, month1: 96, month2: 91, month3: 87, month6: 81, month12: null },
  { cohort: 'Q3 2024', month0: 100, month1: 98, month2: 93, month3: 89, month6: null, month12: null },
  { cohort: 'Q4 2024', month0: 100, month1: 97, month2: 92, month3: null, month6: null, month12: null }
];

const marketIntelligence = [
  { metric: 'Market Share', value: '14.2%', change: '+2.1%', benchmark: 'Top 3 in AI Lead Gen', trend: 'up' },
  { metric: 'Category Growth', value: '127%', change: '+23%', benchmark: 'vs Industry 89%', trend: 'up' },
  { metric: 'Competitive Win Rate', value: '67%', change: '+12%', benchmark: 'vs Top 5 Competitors', trend: 'up' },
  { metric: 'Time to Value', value: '12 days', change: '-8 days', benchmark: 'Industry avg: 45 days', trend: 'up' }
];

const revenueOptimization = [
  { month: '2024-11', arr: 12400000, newArr: 890000, expansion: 340000, contraction: -120000, churn: -180000, netGrowth: 930000 },
  { month: '2024-12', arr: 13200000, newArr: 950000, expansion: 380000, contraction: -140000, churn: -190000, netGrowth: 1000000 },
  { month: '2025-01', arr: 14100000, newArr: 1020000, expansion: 420000, contraction: -110000, churn: -210000, netGrowth: 1120000 },
  { month: '2025-02', arr: 15000000, newArr: 1100000, expansion: 450000, contraction: -130000, churn: -200000, netGrowth: 1220000 },
  { month: '2025-03', arr: 16200000, newArr: 1250000, expansion: 490000, contraction: -140000, churn: -180000, netGrowth: 1420000 },
];

const predictiveInsights = [
  { metric: 'Churn Risk Prediction', accuracy: '89.4%', trend: 'up', insight: '342 accounts flagged for intervention' },
  { metric: 'Expansion Opportunity', accuracy: '76.2%', trend: 'up', insight: '$2.8M pipeline identified' },
  { metric: 'Product-Market Fit Score', accuracy: '91.1%', trend: 'up', insight: 'Healthcare vertical showing 3.2x growth' },
  { metric: 'Pricing Elasticity', accuracy: '84.7%', trend: 'up', insight: '15% price increase viable for Enterprise' }
];



const GlobalKPIBar = ({ data }) => {
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
            <p className="text-2xl font-bold">${(kpis.totalARR / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-green-300">+22% QoQ</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Platform Health</p>
            <p className="text-2xl font-bold">{kpis.platformHealth}%</p>
            <p className="text-xs text-green-300">SLA Met</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Enterprise NPS</p>
            <p className="text-2xl font-bold">{kpis.enterpriseNPS}</p>
            <p className="text-xs text-green-300">+5 pts</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide opacity-80">Market Position</p>
            <p className="text-2xl font-bold">#{kpis.marketPosition}</p>
            <p className="text-xs text-yellow-300">AI Lead Gen</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs opacity-80">Data Freshness</p>
            <p className="text-sm">Real-time • Updated 2m ago</p>
          </div>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

const EnterpriseFilterBar = ({ filters, setFilters }) => (
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

const NavigationTabs = ({ activeView, setActiveView }) => {
  const tabs = [
    { id: 'portfolio', name: 'Portfolio Intelligence', icon: Building2 },
    { id: 'market', name: 'Market Intelligence', icon: Globe },
    { id: 'revenue', name: 'Revenue Operations', icon: DollarSign },
    { id: 'predictive', name: 'Predictive Analytics', icon: Brain },
    { id: 'benchmarks', name: 'Industry Benchmarks', icon: Award },
  ];

return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

const MetricCard = ({ title, value, change, trend, insight, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200",
    green: "from-green-50 to-green-100 border-green-200",
    purple: "from-purple-50 to-purple-100 border-purple-200",
    orange: "from-orange-50 to-orange-100 border-orange-200",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Icon className={`w-5 h-5 mr-2 ${color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : color === 'purple' ? 'text-purple-600' : 'text-orange-600'}`} />
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <div className="flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          </div>
          {insight && (
            <p className="text-xs text-gray-500 mt-2">{insight}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PortfolioIntelligence = ({ data }) => {
  const portfolioData = data || { performance: [], cohortAnalysis: [] };
  
  // Use real data or fallback to mock data
  const performanceData = portfolioData.performance.length > 0 ? 
    portfolioData.performance : portfolioPerformance;
  const cohortData = portfolioData.cohortAnalysis.length > 0 ? 
    portfolioData.cohortAnalysis : cohortAnalysis;

  return (
    <div className="space-y-6">
      {/* Customer Segment Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Customer Portfolio Performance</h3>
          <p className="text-sm text-gray-600 mt-1">Revenue, lifetime value, and health metrics by customer segment</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="segment" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="totalRevenue" fill="#3b82f6" name="Total Revenue ($)" />
              <Line yAxisId="right" type="monotone" dataKey="avgLTV" stroke="#10b981" strokeWidth={3} name="Avg LTV ($)" />
              <Line yAxisId="right" type="monotone" dataKey="churnRate" stroke="#ef4444" strokeWidth={2} name="Churn Rate (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cohort Retention Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Customer Cohort Retention Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Retention rates tracked from initial onboarding by acquisition quarter</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cohortData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="cohort" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="month1" stroke="#3b82f6" strokeWidth={3} name="Month 1" />
              <Line type="monotone" dataKey="month3" stroke="#10b981" strokeWidth={3} name="Month 3" />
              <Line type="monotone" dataKey="month6" stroke="#f59e0b" strokeWidth={3} name="Month 6" />
              <Line type="monotone" dataKey="month12" stroke="#ef4444" strokeWidth={3} name="Month 12" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
        />
        <MetricCard
          title="Expansion Pipeline"
          value="$2.8M"
          change="+34%"
          trend="up"
          insight="234 opportunities identified"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="At-Risk Revenue"
          value="$890K"
          change="-12%"
          trend="up"
          insight="42 accounts flagged"
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Customer Success Score"
          value="94%"
          change="+2%"
          trend="up"
          insight="Based on product adoption"
          icon={Star}
          color="purple"
        />
      </div>
    </div>
  );
};

const MarketIntelligence = ({ data }) => {
  const marketData = data || { competitive: {}, benchmarks: [] };
  
  return (
    <div className="space-y-6">
      {/* Market Position Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {marketIntelligence.map((item, index) => (
          <MetricCard
            key={index}
            title={item.metric}
            value={item.value}
            change={item.change}
            trend={item.trend}
            insight={item.benchmark}
            icon={Globe}
            color={index % 2 === 0 ? "blue" : "green"}
          />
        ))}
      </div>

      {/* Competitive Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Competitive Win/Loss Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Performance against top 5 competitors in closed deals</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{marketData.competitive.winRate || '67'}%</div>
              <div className="text-sm text-gray-600 mt-1">Win Rate vs Competitors</div>
              <div className="text-xs text-green-600 mt-2">+12% vs last quarter</div>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">${(marketData.competitive.avgDealSize || 52000).toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Avg Deal Size Won</div>
              <div className="text-xs text-blue-600 mt-2">+18% vs competitors</div>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">23 days</div>
              <div className="text-sm text-gray-600 mt-1">Sales Cycle vs Competition</div>
              <div className="text-xs text-purple-600 mt-2">-34% faster</div>
            </div>
          </div>
        </div>
      </div>

      {/* Total Addressable Market */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Market Opportunity Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Total addressable market penetration and expansion opportunities</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Current Market Share', value: 14.2, fill: '#3b82f6' },
                  { name: 'Addressable Market', value: 85.8, fill: '#e5e7eb' }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const RevenueOperations = ({ data }) => {
  const revenueData = data || { arrWaterfall: [], metrics: {} };
  const arrData = revenueData.arrWaterfall.length > 0 ? revenueData.arrWaterfall : revenueOptimization;
  
  return (
    <div className="space-y-6">
      {/* ARR Waterfall */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">ARR Growth Waterfall</h3>
          <p className="text-sm text-gray-600 mt-1">Monthly recurring revenue breakdown showing new, expansion, contraction, and churn</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={arrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value, name) => [`${(value/1000).toFixed(0)}K`, name]}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="newArr" stackId="a" fill="#10b981" name="New ARR" />
              <Bar dataKey="expansion" stackId="a" fill="#3b82f6" name="Expansion" />
              <Bar dataKey="contraction" stackId="a" fill="#f59e0b" name="Contraction" />
              <Bar dataKey="churn" stackId="a" fill="#ef4444" name="Churn" />
              <Line type="monotone" dataKey="arr" stroke="#8b5cf6" strokeWidth={3} name="Total ARR" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Net Revenue Retention"
          value="118%"
          change="+8%"
          trend="up"
          insight="Expansion > Churn"
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Gross Revenue Retention"
          value="94%"
          change="+2%"
          trend="up"
          insight="Low churn rate"
          icon={Shield}
          color="blue"
        />
        <MetricCard
          title="Customer Acquisition Cost"
          value="$3,400"
          change="-15%"
          trend="up"
          insight="Efficiency improving"
          icon={DollarSign}
          color="purple"
        />
        <MetricCard
          title="LTV:CAC Ratio"
          value="4.2x"
          change="+0.8x"
          trend="up"
          insight="Healthy unit economics"
          icon={Award}
          color="orange"
        />
      </div>
    </div>
  );
};

const PredictiveAnalytics = ({ data }) => {
  const predictiveData = data || { churnRisk: {}, forecasting: [] };
  
  return (
    <div className="space-y-6">
      {/* ML Model Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {predictiveInsights.map((insight, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{insight.metric}</h3>
                <div className="flex items-center">
                  <Brain className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-600">{insight.accuracy}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="text-2xl font-bold text-gray-900 mb-2">{insight.insight}</div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Model improving</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecasting */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">12-Month Revenue Forecast</h3>
          <p className="text-sm text-gray-600 mt-1">AI-powered predictions with confidence intervals</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">${((predictiveData.forecasting[11]?.predictedARR || 24800000) / 1000000).toFixed(1)}M</div>
              <div className="text-sm text-gray-600">Predicted ARR (12mo)</div>
              <div className="text-xs text-green-600 mt-1">{predictiveData.forecasting[11]?.confidence || 89}% confidence</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{predictiveData.churnRisk.atRiskAccounts || 342}</div>
              <div className="text-sm text-gray-600">At-Risk Accounts</div>
              <div className="text-xs text-orange-600 mt-1">Intervention needed</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-green-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">${((predictiveData.churnRisk.expansionPipeline || 2800000) / 1000000).toFixed(1)}M</div>
              <div className="text-sm text-gray-600">Expansion Pipeline</div>
              <div className="text-xs text-blue-600 mt-1">Next 6 months</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IndustryBenchmarks = ({ data }) => {
  const industryData = data || industryBenchmarks;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Industry Performance Benchmarks</h3>
          <p className="text-sm text-gray-600 mt-1">Your performance vs industry standards across key verticals</p>
        </div>
        <div className="overflow-x-auto">
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
              {industryBenchmarks.map((industry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{industry.industry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{industry.customers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${industry.avgRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{industry.conversionRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      industry.benchmarkPosition.includes('Top 5%') ? 'bg-green-100 text-green-800' :
                      industry.benchmarkPosition.includes('Top 10%') ? 'bg-blue-100 text-blue-800' :
                      industry.benchmarkPosition.includes('Top 15%') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {industry.benchmarkPosition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Share by Industry */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Market Share Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Competitive positioning within each vertical market</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryBenchmarks} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 25]} />
              <YAxis dataKey="industry" type="category" width={120} fontSize={12} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Conversion Rate']}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="conversionRate" fill="#3b82f6" name="Conversion Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competitive Intelligence Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Award className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Market Leadership</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Real Estate</span>
              <span className="text-sm font-semibold text-green-600">#1 Position</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Healthcare</span>
              <span className="text-sm font-semibold text-blue-600">#2 Position</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Technology</span>
              <span className="text-sm font-semibold text-blue-600">#3 Position</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Growth Opportunities</h3>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Healthcare:</span> 127% YoY growth potential
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">FinTech:</span> Emerging market entry
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Manufacturing:</span> Underserved segment
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Competitive Moats</h3>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-purple-600">AI Accuracy:</span> 23% above market avg
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-purple-600">Time to Value:</span> 73% faster deployment
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-purple-600">Integration:</span> 5x more APIs than competitors
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EnterpriseAnalyticsIntelligence({ data, onRefreshData, loading }) {
  const [activeView, setActiveView] = useState('portfolio');
  const [filters, setFilters] = useState({
    customerSegment: 'all',
    geography: 'global',
    timeframe: 'last12months',
    industry: 'all'
  });

  // Use real data when available, fallback to mock data for development
  const analyticsData = data || {
    globalKPIs: {
      totalARR: 16200000,
      platformHealth: 99.7,
      enterpriseNPS: 68,
      marketPosition: 3
    },
    portfolioData: { performance: [], cohortAnalysis: [] },
    marketData: { competitive: {}, benchmarks: [] },
    revenueData: { arrWaterfall: [], metrics: {} },
    predictiveData: { churnRisk: {}, forecasting: [] },
    industryData: []
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'portfolio':
        return <PortfolioIntelligence data={analyticsData.portfolioData} />;
      case 'market':
        return <MarketIntelligence data={analyticsData.marketData} />;
      case 'revenue':
        return <RevenueOperations data={analyticsData.revenueData} />;
      case 'predictive':
        return <PredictiveAnalytics data={analyticsData.predictiveData} />;
      case 'benchmarks':
        return <IndustryBenchmarks data={analyticsData.industryData} />;
      default:
        return <PortfolioIntelligence data={analyticsData.portfolioData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global KPI Bar */}
      <GlobalKPIBar data={analyticsData.globalKPIs} />

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
              <p className="text-xs text-blue-600">99.7% uptime • Real-time sync</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Enterprise Filter Bar */}
      <EnterpriseFilterBar filters={filters} setFilters={setFilters} />

      {/* Navigation Tabs */}
      <NavigationTabs activeView={activeView} setActiveView={setActiveView} />

      {/* Main Content */}
      <div className="p-6">
        {renderActiveView()}
      </div>
    </div>
  );
}