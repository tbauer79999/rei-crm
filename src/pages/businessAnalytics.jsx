import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, Users, Target, DollarSign, Calendar, Filter, Download, RefreshCw, BarChart3, Brain, Settings, Plus, Eye, ArrowRight, Award, TestTube, Database, Activity } from 'lucide-react';
import ABTestingDashboard from '../components/ABTestingDashboard';

// Mock data
const macroFunnelData = [
  { stage: 'Leads Uploaded', count: 5000, rate: 100, color: '#3b82f6' },
  { stage: 'AI Engaged', count: 4200, rate: 84, color: '#10b981' },
  { stage: 'Replied', count: 2100, rate: 42, color: '#f59e0b' },
  { stage: 'Hot Lead', count: 630, rate: 12.6, color: '#ef4444' },
  { stage: 'Sales Connected', count: 504, rate: 10.1, color: '#8b5cf6' },
  { stage: 'Qualified', count: 302, rate: 6.0, color: '#ec4899' },
  { stage: 'Deal Won', count: 91, rate: 1.8, color: '#06b6d4' }
];

const historicalTrends = [
  { period: 'Jan 2025', hotLeadRate: 11.2, replyRate: 38.5, costPerHot: 145 },
  { period: 'Feb 2025', hotLeadRate: 12.8, replyRate: 42.1, costPerHot: 132 },
  { period: 'Mar 2025', hotLeadRate: 14.1, replyRate: 45.2, costPerHot: 118 },
  { period: 'Apr 2025', hotLeadRate: 13.6, replyRate: 41.8, costPerHot: 125 },
  { period: 'May 2025', hotLeadRate: 15.3, replyRate: 47.9, costPerHot: 108 }
];

const leadSourceROI = [
  { source: 'Facebook Ads', leads: 1250, hotLeads: 156, cost: 18750, revenue: 467000, roi: 2390 },
  { source: 'LinkedIn Ads', leads: 890, hotLeads: 134, cost: 22250, revenue: 401000, roi: 1703 },
  { source: 'Google Ads', leads: 1100, hotLeads: 187, cost: 16500, revenue: 561000, roi: 3300 },
  { source: 'Referrals', leads: 450, hotLeads: 112, cost: 0, revenue: 336000, roi: null },
  { source: 'Website', leads: 780, hotLeads: 89, cost: 5200, revenue: 267000, roi: 5033 }
];

const aiConfidenceData = [
  { confidence: 0.9, actualHot: 0.85, count: 45 },
  { confidence: 0.8, actualHot: 0.72, count: 89 },
  { confidence: 0.7, actualHot: 0.61, count: 134 },
  { confidence: 0.6, actualHot: 0.45, count: 167 },
  { confidence: 0.5, actualHot: 0.31, count: 156 }
];

const salesRepPerformance = [
  { rep: 'Sarah Chen', hotLeadsReceived: 45, connected: 38, qualified: 23, won: 8, revenue: 240000 },
  { rep: 'Mike Rodriguez', hotLeadsReceived: 52, connected: 41, qualified: 28, won: 12, revenue: 360000 },
  { rep: 'Jennifer Kim', hotLeadsReceived: 38, connected: 35, qualified: 21, won: 7, revenue: 189000 },
  { rep: 'David Thompson', hotLeadsReceived: 41, connected: 33, qualified: 19, won: 6, revenue: 198000 }
];

const GlobalFilterBar = () => (
  <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
          <option>Last 30 Days</option>
          <option>Last 60 Days</option>
          <option>Last 90 Days</option>
          <option>This Quarter</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <Target className="w-4 h-4 text-gray-500" />
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
          <option>All Campaigns</option>
          <option>Q1 Real Estate Campaign</option>
          <option>Spring Outreach</option>
        </select>
      </div>
      <div className="ml-auto flex items-center space-x-3">
        <button className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm">
          <RefreshCw className="w-4 h-4 mr-1" />
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
    { id: 'abtesting', name: 'A/B Testing', icon: TestTube },
    { id: 'sales-outcomes', name: 'Sales Outcomes', icon: DollarSign },
    { id: 'custom-reports', name: 'Custom Reports', icon: Settings }
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

const OverviewReports = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Macro Conversion Funnel</h3>
        <p className="text-sm text-gray-600 mt-1">Complete lead journey from upload to deal closure</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {macroFunnelData.map((stage, index) => (
            <div key={stage.stage} className="p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">{stage.stage}</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">{stage.count.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 ml-2">({stage.rate}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="h-6 rounded-full transition-all duration-500"
                  style={{ width: `${stage.rate}%`, backgroundColor: stage.color }}
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
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={historicalTrends}>
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
            {leadSourceROI.map((source, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.source}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{source.leads.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{source.hotLeads}</td>
                <td className="px-6 py-4 text-sm text-gray-900">${source.revenue.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    source.roi === null ? 'bg-green-100 text-green-800' :
                    source.roi > 2000 ? 'bg-green-100 text-green-800' :
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

const AIPerformance = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">AI Confidence vs Actual Outcome</h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={aiConfidenceData}>
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
            <Tooltip />
            <Scatter dataKey="actualHot" fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const SalesOutcomes = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Sales Rep Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Rep</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hot Leads</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesRepPerformance.map((rep, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{rep.rep}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{rep.hotLeadsReceived}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{rep.won}</td>
                <td className="px-6 py-4 text-sm text-gray-900">${rep.revenue.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {((rep.won/rep.hotLeadsReceived)*100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Summary</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <DollarSign className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <span className="text-2xl font-bold text-blue-600">
              ${(salesRepPerformance.reduce((acc, rep) => acc + rep.revenue, 0)/1000).toFixed(0)}K
            </span>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Award className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <span className="text-2xl font-bold text-green-600">
              {salesRepPerformance.reduce((acc, rep) => acc + rep.won, 0)}
            </span>
            <p className="text-sm text-gray-600">Deals Won</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <TrendingUp className="w-8 h-8 mx-auto text-purple-600 mb-2" />
            <span className="text-2xl font-bold text-purple-600">
              {((salesRepPerformance.reduce((acc, rep) => acc + rep.won, 0) / 
                 salesRepPerformance.reduce((acc, rep) => acc + rep.hotLeadsReceived, 0)) * 100).toFixed(1)}%
            </span>
            <p className="text-sm text-gray-600">Win Rate</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

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
          <p className="text-gray-600 mb-6">Create personalized analytics dashboards</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 inline mr-2" />
            Create New Report
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default function BusinessAnalytics() {
  const [activeView, setActiveView] = useState('overview');

const renderActiveView = () => {
  switch (activeView) {
    case 'overview':
      return <OverviewReports />;
    case 'ai-performance':
      return <AIPerformance />;
    case 'abtesting':  // Add this case
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
      <NavigationTabs activeView={activeView} setActiveView={setActiveView} />
      <div className="px-6 py-8">
        {renderActiveView()}
      </div>
    </div>
  );
}