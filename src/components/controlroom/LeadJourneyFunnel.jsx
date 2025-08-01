import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFeatureValue } from '../../lib/plans';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, Legend,
  ComposedChart, Area
} from 'recharts';
import { 
  X, TrendingUp, Users, Calendar, Clock, Filter, AlertTriangle,
  BarChart3, Activity, Target, ArrowRight, Upload, Shuffle,
  Lock
} from 'lucide-react';
import { isDemoTenant, generateDemoJourneyData } from '../../lib/demo';

const supabase = require('../../lib/supabaseClient');

// Edge Function URL - Updated to use unified analytics endpoint
// Database query functions for lead journey data
const fetchLeadJourneyData = async (tenantId, userId = null, dateRange = 30) => {
    // 🎭 CHECK FOR DEMO TENANT FIRST
  if (await isDemoTenant(tenantId)) {
    console.log('🎭 Demo mode: returning demo journey data');
    return generateDemoJourneyData(tenantId, dateRange);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  // Get latest sales metrics for status distribution and funnel data
  let salesQuery = supabase
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('metric_date', { ascending: false })
    .limit(1);

  if (userId) {
    salesQuery = salesQuery.eq('user_profile_id', userId);
  } else {
    salesQuery = salesQuery.is('user_profile_id', null);
  }

  const { data: salesMetrics, error: salesError } = await salesQuery;
  if (salesError) throw salesError;

  // Get conversation analytics for trend data
  const { data: conversations, error: convError } = await supabase
    .from('conversation_analytics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('analyzed_at', startDate.toISOString())
    .order('analyzed_at', { ascending: true });

  if (convError) throw convError;

  const latestMetrics = salesMetrics[0] || {};
  
  // Process status distribution from lead_status_distribution
  const statusDistribution = latestMetrics.lead_status_distribution 
    ? processStatusDistribution(latestMetrics.lead_status_distribution)
    : [];

  // Process funnel data from funnel_conversion_data
  const funnelData = latestMetrics.funnel_conversion_data 
    ? processFunnelData(latestMetrics.funnel_conversion_data)
    : [];

  // Process transition data from status_transition_data
  const transitionData = latestMetrics.status_transition_data 
    ? processTransitionData(latestMetrics.status_transition_data)
    : [];

  // Generate trend data from conversations
  const trendData = generateTrendFromConversations(conversations || [], dateRange);

  return {
    statusDistribution,
    funnelData,
    transitionData,
    totalLeads: latestMetrics.total_leads_assigned || 0,
    trends: trendData,
    trendData
  };
};

// Helper functions to process JSON data from sales_metrics
const processStatusDistribution = (statusData) => {
  try {
    const parsed = typeof statusData === 'string' ? JSON.parse(statusData) : statusData;
    return Object.entries(parsed).map(([name, value]) => ({ name, value }));
  } catch (e) {
    console.warn('Error parsing lead_status_distribution:', e);
    return [];
  }
};

const processFunnelData = (funnelData) => {
  try {
    const parsed = typeof funnelData === 'string' ? JSON.parse(funnelData) : funnelData;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error parsing funnel_conversion_data:', e);
    return [];
  }
};

const processTransitionData = (transitionData) => {
  try {
    const parsed = typeof transitionData === 'string' ? JSON.parse(transitionData) : transitionData;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error parsing status_transition_data:', e);
    return [];
  }
};

const generateTrendFromConversations = (conversations, dateRange) => {
  const dailyCounts = {};
  
  // Count conversations by date
  conversations.forEach(conv => {
    const date = new Date(conv.analyzed_at).toISOString().split('T')[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });

  // Fill in missing dates with 0
  const trend = [];
  for (let i = dateRange - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trend.push({
      date: dateStr,
      leads: dailyCounts[dateStr] || 0
    });
  }

  return trend;
};

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f97316', '#14b8a6', '#f43f5e', '#8b5cf6', '#ef4444'];

// Modal configuration for each card
const MODAL_CONFIG = {
  statusDistribution: {
    title: 'Current Lead Status Breakdown',
    subtitle: 'Detailed view of lead distribution across all stages',
    icon: BarChart3,
    iconColor: 'text-blue-600',
    features: ['statusChart', 'statusTrend', 'stuckLeads', 'statusMetrics']
  },
  progressionFunnel: {
    title: 'Full Funnel Conversion Analytics',
    subtitle: 'Conversion rates and drop-off analysis through your funnel',
    icon: Target,
    iconColor: 'text-green-600',
    features: ['visualFunnel', 'conversionTable', 'timeInStage', 'dropoffReasons']
  },
  uploadTrend: {
    title: 'New Lead Acquisition Trend',
    subtitle: 'Lead volume and quality analysis over time',
    icon: Upload,
    iconColor: 'text-purple-600',
    features: ['volumeTrend', 'sourceBreakdown', 'qualityBySource', 'recentUploads', 'integrationStatus']
  },
  statusTransitions: {
    title: 'Lead Flow & Transition Analysis',
    subtitle: 'Movement patterns and bottlenecks in your lead pipeline',
    icon: Shuffle,
    iconColor: 'text-orange-600',
    features: ['transitionFlow', 'transitionMatrix', 'commonPaths', 'stuckTransitions']
  }
};

// Shared Modal Wrapper Component
const ModalWrapper = ({ isOpen, onClose, title, subtitle, children }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Mobile Optimized */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] m-2 lg:m-4 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Shared Time Period Selector
const TimePeriodSelector = ({ selectedPeriod, onPeriodChange, periods }) => {
  const defaultPeriods = [
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '12months', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const periodsToShow = periods || defaultPeriods;

  return (
    <div className="border-b border-gray-200 px-4 lg:px-6 py-3 bg-gray-50">
      <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
        <span className="text-sm font-medium text-gray-700">Time Period:</span>
        <div className="flex flex-wrap gap-2">
          {periodsToShow.map(period => (
            <button
              key={period.value}
              onClick={() => onPeriodChange(period.value)}
              className={`px-3 lg:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Enhanced Status Chart with Drill-down
const StatusChart = ({ data, onStatusClick }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-blue-600" />
        <span className="truncate">Lead Status Distribution</span>
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            onClick={(data) => onStatusClick(data.name)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} leads`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 text-center mt-2">Click on a segment to view trend</p>
    </div>
  );
};

// Status Trend Chart
const StatusTrendChart = ({ data, selectedStatus }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">
        {selectedStatus ? `${selectedStatus} Status Trend` : 'Select a Status to View Trend'}
      </h3>
      {selectedStatus && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              fontSize={10}
            />
            <YAxis fontSize={10} />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value) => [`${value} leads`, 'Count']}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <p className="text-sm text-center break-words">Click on a status in the pie chart to view its trend</p>
        </div>
      )}
    </div>
  );
};

// Stuck Leads Table
const StuckLeadsTable = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-yellow-600" />
        <span className="truncate">Leads Stuck in Status</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Current Status</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Days in Status</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lead) => (
              <tr key={lead.leadId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{lead.name}</td>
                <td className="py-3 px-2 lg:px-4">
                  <span className="inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {lead.currentStatus}
                  </span>
                </td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">
                  <span className={lead.daysInStatus > 30 ? 'text-red-600 font-medium' : ''}>
                    {lead.daysInStatus} days
                  </span>
                </td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Visual Funnel Component
const VisualFunnel = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.countEntered || d.count));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Target className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-green-600" />
        <span className="truncate">Lead Conversion Funnel</span>
      </h3>
      <div className="space-y-4">
        {data.map((stage, index) => {
          const count = stage.countEntered || stage.count;
          const width = (count / maxValue) * 100;
          const dropOff = stage.countEntered ? stage.countEntered - stage.countExited : 0;
          const dropOffPercent = stage.countEntered ? ((dropOff / stage.countEntered) * 100).toFixed(1) : '0';
          
          return (
            <div key={stage.fromStage || stage.stage} className="relative">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 w-20 lg:w-24 truncate">
                  {stage.fromStage || stage.stage}
                </span>
                <div className="flex-1 relative min-w-0">
                  <div className="bg-gray-200 rounded-full h-6 lg:h-8">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-6 lg:h-8 rounded-full flex items-center justify-end pr-2 lg:pr-3"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-white text-xs font-bold">{count}</span>
                    </div>
                  </div>
                  {index < data.length - 1 && stage.conversionRate && (
                    <div className="absolute -bottom-1 left-0 flex items-center text-xs text-gray-500">
                      <ArrowRight className="w-3 h-3 mr-1" />
                      <span className="truncate">{stage.conversionRate}% to next</span>
                      <span className="ml-2 text-red-500 truncate">({dropOffPercent}% drop-off)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Time in Stage Chart
const TimeInStageChart = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Clock className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-purple-600" />
        <span className="truncate">Average Time in Stage</span>
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="stage" fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip formatter={(value) => `${value} days`} />
          <Bar dataKey="avgDays" fill="#8b5cf6">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.avgDays > 7 ? '#ef4444' : '#8b5cf6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Volume Trend with Comparison
const VolumeTrendChart = ({ data, showComparison }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-purple-600" />
        <span className="truncate">New Lead Volume Trend</span>
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data}>
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            fontSize={10}
          />
          <YAxis fontSize={10} />
          <Tooltip 
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value, name) => [`${value} leads`, name]}
          />
          <Bar dataKey="count" fill="#8b5cf6" />
          {showComparison && (
            <Line 
              type="monotone" 
              dataKey="previousPeriod" 
              stroke="#e5e7eb" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {showComparison && (
        <div className="flex items-center justify-center mt-2 space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-600 mr-1"></div>
            <span>Current Period</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-2 border-gray-400 mr-1"></div>
            <span>Previous Period</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Source Quality Table
const SourceQualityTable = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Lead Quality by Source</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Source</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Volume</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Avg Score</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Hot Rate</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Quality Index</th>
            </tr>
          </thead>
          <tbody>
            {data.map((source, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{source.source}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{source.volume}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{source.avgScore.toFixed(2)}</td>
                <td className="py-3 px-2 lg:px-4">
                  <span className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    source.hotRate >= 0.2 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {(source.hotRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-2 lg:px-4">
                  <div className="flex items-center">
                    <div className="w-16 lg:w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${source.qualityIndex * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{(source.qualityIndex * 100).toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Transition Flow Visualization
const TransitionFlow = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Shuffle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-orange-600" />
        <span className="truncate">Lead Status Transitions</span>
      </h3>
      <div className="space-y-4">
        {data.map((transition, i) => {
          const maxCount = Math.max(...data.map(t => t.count));
          const width = (transition.count / maxCount) * 100;
          
          return (
            <div key={i} className="flex items-center space-x-2 lg:space-x-4 min-w-0">
              <div className="w-20 lg:w-24 text-sm font-medium text-gray-700 text-right truncate">{transition.from}</div>
              <div className="flex-1 relative min-w-0">
                <div className="bg-gray-200 rounded h-6">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-6 rounded flex items-center justify-center"
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-white text-xs font-bold">{transition.count}</span>
                  </div>
                </div>
              </div>
              <div className="w-20 lg:w-24 text-sm font-medium text-gray-700 truncate">{transition.to}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Modal Content Component
const JourneyModalContent = ({ modalType, data, selectedPeriod, onPeriodChange }) => {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const config = MODAL_CONFIG[modalType];
  
  if (!config) return null;

  const { features } = config;

  // Custom periods for different modals
  const customPeriods = modalType === 'statusDistribution' ? [
    { value: 'current', label: 'Current Snapshot' },
    { value: '7days', label: 'Daily Avg (7 Days)' },
    { value: '4weeks', label: 'Weekly Avg (4 Weeks)' }
  ] : modalType === 'uploadTrend' ? [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ] : null;

  return (
    <>
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={onPeriodChange}
        periods={customPeriods}
      />
      
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 w-full min-w-0">
        {/* Status Distribution features */}
        {features.includes('statusChart') && data.statusDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <StatusChart 
              data={data.statusDistribution} 
              onStatusClick={setSelectedStatus}
            />
            {features.includes('statusTrend') && data.statusTrend && (
              <StatusTrendChart 
                data={data.statusTrend} 
                selectedStatus={selectedStatus}
              />
            )}
          </div>
        )}
        
        {features.includes('statusMetrics') && data.metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-blue-700">{data.metrics.totalLeads}</p>
              <p className="text-sm text-blue-600">Total Leads</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-green-700">{data.metrics.hotLeads}</p>
              <p className="text-sm text-green-600">Hot Leads</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-yellow-700">{data.metrics.avgAge} days</p>
              <p className="text-sm text-yellow-600">Avg Lead Age</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-purple-700">{data.metrics.conversionRate}%</p>
              <p className="text-sm text-purple-600">Conversion Rate</p>
            </div>
          </div>
        )}
        
        {features.includes('stuckLeads') && data.stuckLeads && (
          <StuckLeadsTable data={data.stuckLeads} />
        )}
        
        {/* Progression Funnel features */}
        {features.includes('visualFunnel') && data.funnelData && (
          <VisualFunnel data={data.funnelData} />
        )}
        
        {features.includes('conversionTable') && data.funnelData && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Stage-by-Stage Conversion</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">From Stage</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">To Stage</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Entered</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Exited</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Conversion</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnelData.map((stage, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-900">{stage.fromStage}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-900">{stage.toStage}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{stage.countEntered}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{stage.countExited}</td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className="text-sm font-medium text-green-600">{stage.conversionRate}%</span>
                      </td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className="text-sm font-medium text-red-600">{stage.dropOffRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {features.includes('timeInStage') && data.timeInStage && (
          <TimeInStageChart data={data.timeInStage} />
        )}
        
        {features.includes('dropoffReasons') && data.dropoffReasons && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Top Drop-off Reasons</h3>
            <div className="space-y-2">
              {data.dropoffReasons.map((reason, i) => (
                <div key={i} className="flex items-center justify-between p-2 lg:p-3 hover:bg-gray-50 rounded min-w-0">
                  <span className="text-sm text-gray-700 truncate flex-1">{reason.reason}</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-red-500"
                        style={{ width: `${(reason.count / data.totalDropoffs) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 lg:w-12 text-right">{reason.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upload Trend features */}
        {features.includes('volumeTrend') && data.volumeTrend && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 truncate">Volume Analysis</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showComparison}
                  onChange={(e) => setShowComparison(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">Show previous period</span>
              </label>
            </div>
            <VolumeTrendChart data={data.volumeTrend} showComparison={showComparison} />
          </div>
        )}
        
        {features.includes('sourceBreakdown') && data.sourceBreakdown && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Leads by Source</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.sourceBreakdown}>
                <XAxis dataKey="source" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('qualityBySource') && data.qualityBySource && (
          <SourceQualityTable data={data.qualityBySource} />
        )}
        
        {features.includes('recentUploads') && data.recentUploads && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Recent Lead Uploads</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Source</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Upload Date</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Initial Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUploads.map((lead, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{lead.name}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.source}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.uploadDate}</td>
                      <td className="py-3 px-2 lg:px-4">
                        <span className="inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {lead.initialStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {features.includes('integrationStatus') && data.integrationStatus && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Integration Status</h3>
            <div className="space-y-3">
              {data.integrationStatus.map((integration, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{integration.name}</p>
                    <p className="text-xs text-gray-500 truncate">Last sync: {integration.lastSync}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    integration.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {integration.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Status Transitions features */}
        {features.includes('transitionFlow') && data.transitionFlow && (
          <TransitionFlow data={data.transitionFlow} />
        )}
        
        {features.includes('transitionMatrix') && data.matrix && data.statuses && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Transition Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left">From \ To</th>
                    {data.statuses.map(status => (
                      <th key={status} className="p-2 text-center font-medium">{status}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.statuses.map(fromStatus => (
                    <tr key={fromStatus}>
                      <td className="p-2 font-medium">{fromStatus}</td>
                      {data.statuses.map(toStatus => {
                        const value = data.matrix[fromStatus]?.[toStatus] || 0;
                        return (
                          <td key={toStatus} className="p-2 text-center">
                            {value > 0 && (
                              <span className={`inline-block px-2 py-1 rounded ${
                                value > 50 ? 'bg-green-100 text-green-800' :
                                value > 20 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {features.includes('commonPaths') && data.commonPaths && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Common Lead Paths</h3>
            <div className="space-y-2">
              {data.commonPaths.map((path, i) => (
                <div key={i} className="flex items-center justify-between p-2 lg:p-3 hover:bg-gray-50 rounded min-w-0">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-700 flex-shrink-0">#{i + 1}</span>
                    <span className="text-sm text-gray-600 truncate">{path.path}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 flex-shrink-0">{path.count} leads</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {features.includes('stuckTransitions') && data.stuckTransitions && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-yellow-600" />
              <span className="truncate">Stuck Transitions</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Current Status</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Expected Next</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Time Since Last</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stuckTransitions.map((lead, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{lead.name}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.currentStatus}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.expectedNext}</td>
                      <td className="py-3 px-2 lg:px-4">
                        <span className="text-sm font-medium text-red-600">{lead.timeSinceLast}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Raw Data (Debug)</h3>
          <pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    </>
  );
};

// Mobile Card Component - Updated to match OverviewMetrics style
const MobileCard = ({ title, children, onClick, subtitle, icon: Icon, trend, canAccessDetailed = true }) => {
  return (
    <div 
      className={`bg-white p-3 rounded-xl shadow border cursor-pointer hover:shadow-lg transition-shadow w-full min-w-0 relative ${
        !canAccessDetailed ? 'opacity-90' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        {Icon && <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />}
        {trend && (
          <div className={`flex items-center text-xs ${
            trend.startsWith('+') ? 'text-green-600' : 'text-red-500'
          }`}>
            <span className="mr-1">
              {trend.startsWith('+') ? '▲' : '▼'}
            </span>
            <span className="truncate">{trend.replace(/^[+-]/, '')}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1 mb-3">
        <h3 className="text-xs text-gray-500 font-medium truncate">{title}</h3>
        <div className="w-full min-w-0">
          {children}
        </div>
      </div>
      
      <p className="text-xs text-gray-400 text-center truncate">{subtitle}</p>
      
      {/* Show lock icon for restricted users */}
      {!canAccessDetailed && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Upgrade Prompt Component
const UpgradePrompt = ({ metricName, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div 
      className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    />
    
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden">
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Detailed {metricName} Analytics
        </h3>
        <p className="text-gray-600 mb-6">
          Unlock detailed breakdowns, interactive charts, and drill-down capabilities with a plan upgrade.
        </p>
        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <p>✓ Interactive journey analytics</p>
          <p>✓ Detailed funnel analysis</p>
          <p>✓ Status transition tracking</p>
          <p>✓ Advanced filtering</p>
        </div>
        <button 
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-3"
        >
          Upgrade to Growth Plan
        </button>
        <p className="text-xs text-gray-500">
          Starting at $397/month
        </p>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  </div>
);

// Mock data generator
const generateMockData = (modalType) => {
  if (modalType === 'statusDistribution') {
    return {
      statusDistribution: [
        { name: 'New', value: 125 },
        { name: 'Engaged', value: 89 },
        { name: 'Qualified', value: 67 },
        { name: 'Hot', value: 45 },
        { name: 'Converted', value: 23 },
        { name: 'Disqualified', value: 31 }
      ],
      statusTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 40
      })),
      stuckLeads: [
        { leadId: '1', name: 'John Smith', currentStatus: 'Engaged', daysInStatus: 45, lastActivity: '2024-01-01' },
        { leadId: '2', name: 'Jane Doe', currentStatus: 'New', daysInStatus: 32, lastActivity: '2024-01-05' },
        { leadId: '3', name: 'Bob Wilson', currentStatus: 'Qualified', daysInStatus: 28, lastActivity: '2024-01-10' }
      ],
      metrics: {
        totalLeads: 380,
        hotLeads: 45,
        avgAge: 12.5,
        conversionRate: 6.1
      }
    };
  }

  if (modalType === 'progressionFunnel') {
    return {
      funnelData: [
        { fromStage: 'New', toStage: 'Engaged', countEntered: 380, countExited: 285, conversionRate: 75, dropOffRate: 25 },
        { fromStage: 'Engaged', toStage: 'Qualified', countEntered: 285, countExited: 180, conversionRate: 63.2, dropOffRate: 36.8 },
        { fromStage: 'Qualified', toStage: 'Hot', countEntered: 180, countExited: 90, conversionRate: 50, dropOffRate: 50 },
        { fromStage: 'Hot', toStage: 'Converted', countEntered: 90, countExited: 23, conversionRate: 25.6, dropOffRate: 74.4 }
      ],
      timeInStage: [
        { stage: 'New', avgDays: 2.5, medianDays: 2 },
        { stage: 'Engaged', avgDays: 5.3, medianDays: 4 },
        { stage: 'Qualified', avgDays: 8.7, medianDays: 7 },
        { stage: 'Hot', avgDays: 3.2, medianDays: 2 }
      ],
      dropoffReasons: [
        { reason: 'No Response', count: 120 },
        { reason: 'Not Qualified', count: 85 },
        { reason: 'Wrong Timing', count: 60 },
        { reason: 'Chose Competitor', count: 35 }
      ],
      totalDropoffs: 300
    };
  }

  if (modalType === 'uploadTrend') {
    return {
      volumeTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 30) + 20,
        previousPeriod: Math.floor(Math.random() * 25) + 15
      })),
      sourceBreakdown: [
        { source: 'Website', count: 145 },
        { source: 'Paid Ads', count: 89 },
        { source: 'Referral', count: 67 },
        { source: 'Event', count: 45 },
        { source: 'Partner', count: 34 }
      ],
      qualityBySource: [
        { source: 'Referral', volume: 67, avgScore: 0.82, hotRate: 0.25, qualityIndex: 0.85 },
        { source: 'Website', volume: 145, avgScore: 0.68, hotRate: 0.15, qualityIndex: 0.72 },
        { source: 'Event', volume: 45, avgScore: 0.75, hotRate: 0.22, qualityIndex: 0.78 },
        { source: 'Paid Ads', volume: 89, avgScore: 0.55, hotRate: 0.10, qualityIndex: 0.58 }
      ],
      recentUploads: Array.from({ length: 10 }, (_, i) => ({
        name: `Lead ${i + 1}`,
        source: ['Website', 'Paid Ads', 'Referral'][Math.floor(Math.random() * 3)],
        uploadDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        initialStatus: 'New'
      })),
      integrationStatus: [
        { name: 'Salesforce', lastSync: '2 minutes ago', status: 'Healthy' },
        { name: 'HubSpot', lastSync: '15 minutes ago', status: 'Healthy' },
        { name: 'Zapier', lastSync: '2 hours ago', status: 'Warning' }
      ]
    };
  }

  if (modalType === 'statusTransitions') {
    return {
      transitionFlow: [
        { from: 'New', to: 'Engaged', count: 285 },
        { from: 'Engaged', to: 'Qualified', count: 180 },
        { from: 'Qualified', to: 'Hot', count: 90 },
        { from: 'Hot', to: 'Converted', count: 23 },
        { from: 'Engaged', to: 'Disqualified', count: 45 },
        { from: 'Qualified', to: 'Disqualified', count: 30 }
      ],
      statuses: ['New', 'Engaged', 'Qualified', 'Hot', 'Converted', 'Disqualified'],
      matrix: {
        'New': { 'Engaged': 285, 'Disqualified': 15 },
        'Engaged': { 'Qualified': 180, 'Disqualified': 45 },
        'Qualified': { 'Hot': 90, 'Disqualified': 30 },
        'Hot': { 'Converted': 23, 'Disqualified': 12 }
      },
      commonPaths: [
        { path: 'New → Engaged → Hot → Converted', count: 18 },
        { path: 'New → Engaged → Qualified → Hot → Converted', count: 15 },
        { path: 'New → Engaged → Disqualified', count: 32 },
        { path: 'New → Engaged → Qualified → Disqualified', count: 25 }
      ],
      stuckTransitions: [
        { name: 'John Smith', currentStatus: 'Engaged', expectedNext: 'Qualified', timeSinceLast: '5 days' },
        { name: 'Jane Doe', currentStatus: 'Qualified', expectedNext: 'Hot', timeSinceLast: '8 days' },
        { name: 'Bob Wilson', currentStatus: 'New', expectedNext: 'Engaged', timeSinceLast: '3 days' }
      ]
    };
  }

  return {};
};

export default function LeadJourneyFunnel() {
  const { user, currentPlan } = useAuth();
  
  // Get AI Control Room access level from plan
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  console.log('📊 LeadJourneyFunnel Access:', {
    currentPlan,
    controlRoomAccess,
    canAccessDetailedAnalytics
  });

  // State management
  const [journeyData, setJourneyData] = useState({
    statusDistribution: [],
    funnelData: [],
    transitionData: [],
    totalLeads: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(30);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptMetric, setUpgradePromptMetric] = useState('');

  // Handle metric card click with plan gating
  const handleCardClick = (modalType, metricName) => {
    if (!canAccessDetailedAnalytics) {
      setUpgradePromptMetric(metricName);
      setShowUpgradePrompt(true);
      return;
    }
    
    openModal(modalType);
  };

  // Handle modal opening
  const openModal = async (modalType) => {
    setActiveModal(modalType);
    setLoadingModal(true);
    setModalData(null);
    
    try {
console.log(`🔍 Fetching detailed ${modalType} data from database`);
// For now using mock data - would call fetchDetailedJourneyData(user.tenant_id, modalType, selectedPeriod) in production
const data = generateMockData(modalType);
      console.log(`📊 Detailed data returned for ${modalType}:`, data);
      
      if (data.error) {
        console.error('API Error:', data.error);
        throw new Error(data.error.details || data.error || 'API returned an error');
      }
      
      setModalData(data);
      
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateMockData(modalType));
    } finally {
      setLoadingModal(false);
    }
  };

// Handle period change in modal
const handlePeriodChange = async (newPeriod) => {
  setSelectedPeriod(newPeriod);
  
  if (activeModal) {
    setLoadingModal(true);
    
    try {
console.log(`🔍 Fetching updated ${activeModal} data from database`);
// For now using mock data - would call fetchDetailedJourneyData(user.tenant_id, activeModal, newPeriod) in production
const data = generateMockData(activeModal);
      setModalData(data);
      
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateMockData(activeModal));
    } finally {
      setLoadingModal(false);
    }
  }
};

  useEffect(() => {
    if (!user || !user.tenant_id) { 
      console.log('No active user or tenant_id found, skipping fetch for LeadJourneyFunnel.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching lead journey data from database for tenant:', user.tenant_id);
        const data = await fetchLeadJourneyData(user.tenant_id, null, dateRange);
        console.log('📊 Database Response:', data);

        setJourneyData({
          statusDistribution: data.statusDistribution || [],
          funnelData: data.funnelData || [],
          transitionData: data.transitionData || [],
          totalLeads: data.totalLeads || 0
        });

        setTrendData(data.trends || data.trendData || []);

      } catch (error) {
        console.error('❌ Error fetching lead journey data:', error);
        setError(error.message);
        
        setJourneyData({
          statusDistribution: [],
          funnelData: [],
          transitionData: [],
          totalLeads: 0
        });
        setTrendData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, user]);

  // Show loading or auth state
  if (!user) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <div className="text-center text-gray-500">
          Please log in to view analytics
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {/* Mobile Loading */}
        <div className="lg:hidden space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-3 rounded-xl shadow border min-w-0">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-4 rounded shadow">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center w-full min-w-0">
        <p className="text-red-600 font-medium">Failed to load lead journey data</p>
        <p className="text-red-500 text-sm mt-1 break-words">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-sm text-red-600 underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { statusDistribution, funnelData, transitionData } = journeyData;

  return (
    <>
      <div className="w-full min-w-0">
        {/* Mobile Layout */}
        <div className="lg:hidden w-full min-w-0">
          <div className="space-y-4">
            {/* Date Range Selector */}
            <div className="bg-white p-3 rounded-xl shadow border">
              <div className="flex flex-col space-y-3">
                <h2 className="text-lg font-semibold truncate">Lead Journey Analytics</h2>
                <div className="flex gap-2 overflow-x-auto">
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => setDateRange(days)}
                      className={`px-3 py-2 rounded text-sm transition-colors flex-shrink-0 ${
                        dateRange === days 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  Analyzing {journeyData.totalLeads || 0} leads over the last {dateRange} days
                </p>
              </div>
            </div>

            {/* Lead Status Distribution */}
            <MobileCard
              title="Lead Status Distribution"
              subtitle="Click for detailed breakdown"
              icon={BarChart3}
              onClick={() => handleCardClick('statusDistribution', 'Status Distribution')}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie 
                      data={statusDistribution} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={45}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-xl mb-1">📊</div>
                    <div className="text-xs">No lead data available</div>
                  </div>
                </div>
              )}
            </MobileCard>

            {/* Funnel */}
            <MobileCard
              title="Lead Progression Funnel"
              subtitle="Click for conversion analytics"
              icon={Target}
              onClick={() => handleCardClick('progressionFunnel', 'Progression Funnel')}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              {funnelData.length > 0 ? (
                <div className="space-y-2">
                  {funnelData.slice(0, 3).map((item, index) => {
                    const max = Math.max(...funnelData.map(i => i.count || i.countEntered), 1);
                    const count = item.count || item.countEntered;
                    const conversionRate = funnelData[0]?.count > 0 
                      ? Math.round((count / (funnelData[0].count || funnelData[0].countEntered)) * 100) 
                      : 0;
                    
                    return (
                      <div key={item.stage || item.fromStage}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{item.stage || item.fromStage}</span>
                          <span className="font-semibold text-blue-600 flex-shrink-0">
                            {count} ({conversionRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {funnelData.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{funnelData.length - 3} more stages
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-xl mb-1">📈</div>
                    <div className="text-xs">No funnel data available</div>
                  </div>
                </div>
              )}
            </MobileCard>

            {/* Upload Trend */}
            <MobileCard
              title="Lead Upload Trend"
              subtitle="Click for acquisition analysis"
              icon={Upload}
              onClick={() => handleCardClick('uploadTrend', 'Upload Trend')}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={trendData}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      fontSize={8}
                      hide
                    />
                    <YAxis fontSize={8} hide />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value) => [value, 'Leads']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="leads" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 2, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-xl mb-1">📊</div>
                    <div className="text-xs">No trend data available</div>
                  </div>
                </div>
              )}
            </MobileCard>

            {/* Status Transitions */}
            <MobileCard
              title="Lead Status Transitions"
              subtitle="Click for flow analysis"
              icon={Shuffle}
              onClick={() => handleCardClick('statusTransitions', 'Status Transitions')}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              {transitionData.length > 0 ? (
                <div className="space-y-1">
                  {transitionData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 min-w-0 flex-1">
                        <span className="text-xs text-gray-600 truncate">{item.transition}</span>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600">{item.count}</span>
                        <span className="text-xs text-gray-500">({item.percent})</span>
                      </div>
                    </div>
                  ))}
                  {transitionData.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{transitionData.length - 3} more transitions
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-xl mb-1">🔄</div>
                    <div className="text-xs">No transition data available</div>
                  </div>
                </div>
              )}
            </MobileCard>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block w-full">
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Lead Journey Analytics</h2>
                <div className="flex gap-2">
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => setDateRange(days)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        dateRange === days 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Analyzing {journeyData.totalLeads || 0} leads over the last {dateRange} days
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Lead Status Distribution - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow lg:col-span-1 transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('statusDistribution', 'Status Distribution')}
              >
                <h3 className="text-lg font-semibold mb-2">Lead Status Distribution</h3>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie 
                        data={statusDistribution} 
                        dataKey="value" 
                        nameKey="name" 
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <div>No lead data available</div>
                      <div className="text-xs mt-1">Add some leads to see analytics</div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">Click for detailed breakdown</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Funnel - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow lg:col-span-1 transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('progressionFunnel', 'Progression Funnel')}
              >
                <h3 className="text-lg font-semibold mb-4">Lead Progression Funnel</h3>
                {funnelData.length > 0 ? (
                  <div className="space-y-4">
                    {funnelData.map((item) => {
                      const max = Math.max(...funnelData.map(i => i.count || i.countEntered), 1);
                      const count = item.count || item.countEntered;
                      const conversionRate = funnelData[0]?.count || funnelData[0]?.countEntered > 0 
                        ? Math.round((count / (funnelData[0].count || funnelData[0].countEntered)) * 100) 
                        : 0;
                      
                      return (
                        <div key={item.stage || item.fromStage}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">{item.stage || item.fromStage}</span>
                            <span className="font-semibold text-blue-600">
                              {count} ({conversionRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                              style={{ width: `${(count / max) * 100}%` }}
                            >
                              {count > 0 && (
                                <span className="text-white text-xs font-bold">{count}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📈</div>
                      <div>No funnel data available</div>
                      <div className="text-xs mt-1">Lead progression will appear here</div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-4">Click for conversion analytics</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Trend - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow lg:col-span-2 xl:col-span-1 transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('uploadTrend', 'Upload Trend')}
              >
                <h3 className="text-lg font-semibold mb-2">Lead Upload Trend</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value) => [value, 'Leads']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="leads" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#3b82f6' }}
                        activeDot={{ r: 7, fill: '#1d4ed8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <div>No trend data available</div>
                      <div className="text-xs mt-1">Upload history will appear here</div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">Click for acquisition analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Status Transitions - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow lg:col-span-2 xl:col-span-1 transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('statusTransitions', 'Status Transitions')}
              >
                <h3 className="text-lg font-semibold mb-4">Lead Status Transitions</h3>
                {transitionData.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Transition</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {transitionData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-xs">
                              <div className="font-medium text-gray-900">{item.transition}</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-lg text-blue-600">{item.count}</span>
                                <span className="text-xs text-gray-500">{item.percent}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🔄</div>
                      <div>No transition data available</div>
                      <div className="text-xs mt-1">Status changes will appear here</div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-4">Click for flow analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt Modal for Basic Users */}
      {showUpgradePrompt && (
        <UpgradePrompt 
          metricName={upgradePromptMetric}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}

      {/* Analytics Modal */}
      <ModalWrapper 
        isOpen={!!activeModal}
        onClose={() => {
          setActiveModal(null);
          setModalData(null);
        }}
        title={MODAL_CONFIG[activeModal]?.title || ''}
        subtitle={MODAL_CONFIG[activeModal]?.subtitle || ''}
      >
        {loadingModal ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : modalData ? (
          <JourneyModalContent 
            modalType={activeModal}
            data={modalData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No data available</p>
          </div>
        )}
      </ModalWrapper>
    </>
  );
}