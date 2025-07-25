import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getFeatureValue } from '../../lib/plans';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';
import { X, TrendingUp, DollarSign, Target, Lock } from 'lucide-react';

// Edge Function URL - Update this with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/overview-analytics/analytics-trend-cost';

// Modal configuration for detailed analytics
const MODAL_CONFIG = {
  messageCost: {
    title: 'Message Cost Analytics & Optimization',
    subtitle: 'Detailed breakdown of messaging costs and ROI optimization',
    icon: DollarSign,
    iconColor: 'text-green-600',
    features: ['costTrend', 'messageTypeBreakdown', 'costEfficiency', 'budgetTracking']
  },
  costPerLead: {
    title: 'Cost Per Hot Lead Analysis',
    subtitle: 'Lead acquisition cost optimization and conversion insights',
    icon: Target,
    iconColor: 'text-orange-600',
    features: ['costPerLeadTrend', 'channelEfficiency', 'conversionOptimization', 'historicalComparison']
  },
  hotLeadTrend: {
    title: 'Hot Lead Conversion Trends',
    subtitle: 'Interactive hot lead rate analysis and forecasting',
    icon: TrendingUp,
    iconColor: 'text-blue-600',
    features: ['interactiveTrend', 'forecasting', 'seasonalPatterns', 'benchmarking']
  }
};

// Shared Modal Wrapper Component
const ModalWrapper = ({ isOpen, onClose, title, subtitle, children }) => {
  // Handle ESC key
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
      {/* Backdrop */}
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

// Time Period Selector
const TimePeriodSelector = ({ selectedPeriod, onPeriodChange }) => {
  const periods = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="border-b border-gray-200 px-4 lg:px-6 py-3 bg-gray-50">
      <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
        <span className="text-sm font-medium text-gray-700">Time Period:</span>
        <div className="flex flex-wrap gap-2">
          {periods.map(period => (
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

// Cost Trend Chart Component
const CostTrendChart = ({ data, title, icon: Icon, iconColor }) => {
  const maxValue = Math.max(...data.map(d => d.cost || d.value || 0));
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Icon className={`w-4 lg:w-5 h-4 lg:h-5 mr-2 ${iconColor}`} />
        <span className="truncate">{title}</span>
      </h3>
      <div className="h-48 lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis tickFormatter={(v) => `$${v}`} fontSize={10} />
            <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Message Type Breakdown Component
const MessageTypeBreakdown = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.cost, 0);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Cost by Message Type</h3>
      <div className="space-y-3">
        {data.map((type, i) => (
          <div key={i} className="flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: type.color }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">{type.type}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(type.cost / total) * 100}%`,
                    backgroundColor: type.color
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 lg:w-16 text-right">${type.cost.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-700">Total Cost</span>
          <span className="text-sm font-bold text-gray-900">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// Channel Efficiency Component
const ChannelEfficiency = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Cost Efficiency by Channel</h3>
      <div className="space-y-3">
        {data.map((channel, i) => (
          <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-900 truncate">{channel.channel}</span>
              <span className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                channel.efficiency === 'High' ? 'bg-green-100 text-green-800' :
                channel.efficiency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {channel.efficiency}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">${channel.costPerLead.toFixed(2)}</p>
              <p className="text-xs text-gray-500">per hot lead</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Budget Tracking Component
const BudgetTracking = ({ data }) => {
  const { monthlyBudget, currentSpend, projectedSpend } = data;
  const spendPercentage = (currentSpend / monthlyBudget) * 100;
  const projectedPercentage = (projectedSpend / monthlyBudget) * 100;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Monthly Budget Tracking</h3>
      
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Current Spend</span>
          <span>${currentSpend.toFixed(2)} / ${monthlyBudget.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${Math.min(spendPercentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{spendPercentage.toFixed(1)}% of budget used</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 text-center">
        <div className="p-2 lg:p-3 bg-blue-50 rounded-lg">
          <p className="text-base lg:text-lg font-bold text-blue-700">${currentSpend.toFixed(2)}</p>
          <p className="text-xs text-blue-600">Current Spend</p>
        </div>
        <div className="p-2 lg:p-3 bg-orange-50 rounded-lg">
          <p className="text-base lg:text-lg font-bold text-orange-700">${projectedSpend.toFixed(2)}</p>
          <p className="text-xs text-orange-600">Projected Month</p>
        </div>
        <div className="p-2 lg:p-3 bg-gray-50 rounded-lg">
          <p className="text-base lg:text-lg font-bold text-gray-700">${(monthlyBudget - currentSpend).toFixed(2)}</p>
          <p className="text-xs text-gray-600">Remaining</p>
        </div>
      </div>
      
      {projectedPercentage > 100 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">⚠️ Budget Alert</p>
          <p className="text-xs text-red-600 mt-1 break-words">
            Projected to exceed budget by ${(projectedSpend - monthlyBudget).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};

// Modal Content Component
const DetailedAnalyticsContent = ({ modalType, data, selectedPeriod, onPeriodChange }) => {
  const config = MODAL_CONFIG[modalType];
  if (!config) return null;

  const { features, icon, iconColor } = config;

  return (
    <>
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={onPeriodChange}
      />
      
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 w-full min-w-0">
        {/* Cost Trend Features */}
        {features.includes('costTrend') && data?.costTrend && (
          <CostTrendChart 
            data={data.costTrend} 
            title="Daily Cost Trend" 
            icon={icon} 
            iconColor={iconColor} 
          />
        )}

        {features.includes('messageTypeBreakdown') && data?.messageTypeBreakdown && (
          <MessageTypeBreakdown data={data.messageTypeBreakdown} />
        )}

        {features.includes('costEfficiency') && data?.channelEfficiency && (
          <ChannelEfficiency data={data.channelEfficiency} />
        )}

        {features.includes('budgetTracking') && data?.budgetTracking && (
          <BudgetTracking data={data.budgetTracking} />
        )}

        {/* Interactive Trend for Hot Lead Analytics */}
        {features.includes('interactiveTrend') && data?.hotLeadTrend && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-blue-600" />
              <span className="truncate">Interactive Hot Lead Trend</span>
            </h3>
            <div className="h-64 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.hotLeadTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Hot Rate']} />
                  <Line
                    type="monotone"
                    dataKey="hotRate"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Forecasting */}
        {features.includes('forecasting') && data?.forecast && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">30-Day Forecast</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 text-center">
              <div className="p-3 lg:p-4 bg-blue-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-blue-700">{data.forecast.expectedHotLeads}</p>
                <p className="text-sm text-blue-600">Expected Hot Leads</p>
              </div>
              <div className="p-3 lg:p-4 bg-green-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-green-700">{data.forecast.expectedHotRate}%</p>
                <p className="text-sm text-green-600">Predicted Hot Rate</p>
              </div>
              <div className="p-3 lg:p-4 bg-purple-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-purple-700">${data.forecast.projectedCost}</p>
                <p className="text-sm text-purple-600">Projected Cost</p>
              </div>
            </div>
          </div>
        )}

        {/* Cost Per Lead Trend */}
        {features.includes('costPerLeadTrend') && data?.costPerLeadTrend && (
          <CostTrendChart 
            data={data.costPerLeadTrend} 
            title="Cost Per Hot Lead Trend" 
            icon={Target} 
            iconColor="text-orange-600" 
          />
        )}

        {/* Optimization Recommendations */}
        {data?.optimizationTips && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 w-full min-w-0">
            <h4 className="font-medium text-blue-900 mb-2">💡 Optimization Recommendations</h4>
            <ul className="space-y-1">
              {data.optimizationTips.map((tip, i) => (
                <li key={i} className="text-sm text-blue-800 flex items-start">
                  <span className="mr-2 flex-shrink-0">•</span>
                  <span className="break-words">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
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
          Unlock detailed cost breakdowns, interactive charts, and optimization insights with a plan upgrade.
        </p>
        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <p>✓ Interactive cost trend analysis</p>
          <p>✓ Message type breakdowns</p>
          <p>✓ Budget tracking & alerts</p>
          <p>✓ Optimization recommendations</p>
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

// Enhanced MetricCard Component with RBAC and mobile optimization
const MetricCard = ({ title, value, subtext, trend, empty, onClick, isClickable = false, canAccessDetailed = true }) => {
  return (
    <div
      className={`p-3 lg:p-4 rounded-xl text-center shadow relative transition-all duration-200 w-full min-w-0 ${
        empty
          ? 'bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400'
          : 'bg-white border text-gray-800'
      } ${
        isClickable && canAccessDetailed 
          ? 'cursor-pointer hover:shadow-lg hover:scale-105' 
          : isClickable && !canAccessDetailed
          ? 'cursor-pointer hover:shadow-md'
          : ''
      } ${!canAccessDetailed && isClickable ? 'opacity-90' : ''}`}
      onClick={onClick}
    >
      <h3 className="text-xs lg:text-sm text-gray-500 mb-1 truncate">{title}</h3>
      {empty ? (
        <>
          <p className="text-base lg:text-lg font-medium truncate">🚫 Not enough data</p>
          {subtext && <p className="text-xs mt-1 truncate">{subtext}</p>}
        </>
      ) : (
        <>
          <p className="text-lg lg:text-2xl font-bold truncate">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1 truncate">{subtext}</p>}
          {trend && (
            <p
              className={`text-xs mt-1 font-medium ${
                trend.startsWith('+') ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trend.startsWith('+') ? '▲' : '▼'} {trend.replace(/^[+-]/, '')}
            </p>
          )}
        </>
      )}
      
      {/* Show lock icon for restricted users on clickable cards */}
      {!canAccessDetailed && isClickable && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 lg:w-4 h-3 lg:h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Mobile Trend Chart Component for the Hot Lead Trend
const MobileTrendChart = ({ data, title, onClick, canAccessDetailed }) => {
  return (
    <div 
      className={`bg-white p-3 rounded-xl shadow border relative transition-all duration-200 w-full min-w-0 ${
        canAccessDetailed 
          ? 'cursor-pointer hover:shadow-lg hover:scale-105' 
          : 'cursor-pointer hover:shadow-md opacity-90'
      }`}
      onClick={onClick}
    >
      <h3 className="text-xs text-gray-500 mb-2 truncate">{title}</h3>
      {data && data.length > 0 ? (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" fontSize={8} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={8} axisLine={false} tickLine={false} />
              <Line
                type="monotone"
                dataKey="hotRate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center">
          <p className="text-xs text-gray-400">No trend data</p>
        </div>
      )}
      
      {!canAccessDetailed && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Mock data generator for detailed analytics
const generateMockData = (modalType) => {
  const baseData = {
    costTrend: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 20 + 10 + i * 0.5
      };
    }),
    messageTypeBreakdown: [
      { type: 'Initial Outreach', cost: 125.50, color: '#3B82F6' },
      { type: 'Follow-up', cost: 89.20, color: '#10B981' },
      { type: 'Qualification', cost: 67.80, color: '#F59E0B' },
      { type: 'Nurture', cost: 43.10, color: '#8B5CF6' }
    ],
    channelEfficiency: [
      { channel: 'Website Chat', costPerLead: 12.50, efficiency: 'High' },
      { channel: 'Cold SMS', costPerLead: 18.75, efficiency: 'Medium' },
      { channel: 'Paid Ads', costPerLead: 25.30, efficiency: 'Medium' },
      { channel: 'Cold Email', costPerLead: 35.80, efficiency: 'Low' }
    ],
    budgetTracking: {
      monthlyBudget: 500,
      currentSpend: 325.60,
      projectedSpend: 485.20
    },
    optimizationTips: [
      "Website chat shows 45% lower cost per lead - consider increasing chat widget prominence",
      "Cold email has highest cost per lead at $35.80 - review messaging strategy",
      "Current pace is under budget - opportunity to increase lead volume"
    ]
  };

  if (modalType === 'hotLeadTrend') {
    return {
      ...baseData,
      hotLeadTrend: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          hotRate: Math.random() * 15 + 10 // 10-25% range
        };
      }),
      forecast: {
        expectedHotLeads: 85,
        expectedHotRate: 16.2,
        projectedCost: 485.20
      }
    };
  }

  if (modalType === 'costPerLead') {
    return {
      ...baseData,
      costPerLeadTrend: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          cost: Math.random() * 10 + 15 // $15-$25 range
        };
      })
    };
  }

  return baseData;
};

export default function OverviewTrendAndCost() {
  const { user, currentPlan } = useAuth();
  
  // Get AI Control Room access level from plan
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  console.log('📊 OverviewTrendAndCost Access:', {
    currentPlan,
    controlRoomAccess,
    canAccessDetailedAnalytics
  });

  // State management
  const [hotLeadTrend, setHotLeadTrend] = useState([]);
  const [messagesSent, setMessagesSent] = useState(0);
  const [hotLeadCount, setHotLeadCount] = useState(0);
  const [previousHotLeadCount, setPreviousHotLeadCount] = useState(0);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [activeModal, setActiveModal] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptMetric, setUpgradePromptMetric] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const COST_PER_MESSAGE = 0.01;

  // Handle metric card click with plan gating
  const handleMetricClick = (modalType, metricName) => {
    if (!canAccessDetailedAnalytics) {
      setUpgradePromptMetric(metricName);
      setShowUpgradePrompt(true);
      return;
    }
    
    openModal(modalType);
  };

  // Open detailed modal
  const openModal = async (modalType) => {
    setActiveModal(modalType);
    setLoadingModal(true);
    setModalData(null);
    
    try {
      // For now, use mock data. In production, you'd call the edge function
      // const data = await callEdgeFunction(`${EDGE_FUNCTION_URL}/details/${modalType}?period=${selectedPeriod}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = generateMockData(modalType);
      setModalData(data);
      
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateMockData(modalType));
    } finally {
      setLoadingModal(false);
    }
  };

  // Handle period change
  const handlePeriodChange = async (newPeriod) => {
    setSelectedPeriod(newPeriod);
    
    if (activeModal) {
      setLoadingModal(true);
      try {
        // Simulate API call with new period
        await new Promise(resolve => setTimeout(resolve, 300));
        const data = generateMockData(activeModal);
        setModalData(data);
      } catch (error) {
        console.error('Error fetching updated data:', error);
      } finally {
        setLoadingModal(false);
      }
    }
  };

  useEffect(() => {
    // Ensure there's an active user before trying to fetch data
    if (!user) {
      console.log('No active user found, skipping fetch for OverviewTrendAndCost.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await callEdgeFunction(EDGE_FUNCTION_URL);
        
        const {
          trend,
          totalMessagesSent,
          totalHotLeads,
          previousMessagesSent,
          previousHotLeads,
        } = data;

        setHotLeadTrend(trend || []);
        setMessagesSent(totalMessagesSent || 0);
        setHotLeadCount(totalHotLeads || 0);
        setPreviousMessageCount(previousMessagesSent || 0);
        setPreviousHotLeadCount(previousHotLeads || 0);
      } catch (error) {
        console.error('Error fetching overview trend and cost:', error);
        setError(error.message);
        
        // Set default values on error
        setHotLeadTrend([]);
        setMessagesSent(0);
        setHotLeadCount(0);
        setPreviousMessageCount(0);
        setPreviousHotLeadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const cost = messagesSent * COST_PER_MESSAGE;
  const costPerHotLead = hotLeadCount > 0 ? (cost / hotLeadCount).toFixed(2) : '—';

  const calcTrend = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+100%' : '+0%';
    const change = ((curr - prev) / prev) * 100;
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${Math.abs(change).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {/* Mobile Loading */}
        <div className="lg:hidden grid grid-cols-1 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-3 rounded-xl shadow border min-w-0">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl shadow border">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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
        <p className="text-red-600 font-medium">Failed to load trend data</p>
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

  return (
    <>
      <div className="w-full min-w-0">
        {/* Mobile Layout */}
        <div className="lg:hidden w-full min-w-0">
          <div className="space-y-2">
            {/* Hot Lead Trend Chart */}
            <MobileTrendChart
              data={hotLeadTrend}
              title="Hot Lead Trend (%)"
              onClick={() => handleMetricClick('hotLeadTrend', 'Hot Lead Trend')}
              canAccessDetailed={canAccessDetailedAnalytics}
            />

            {/* Messages Sent Cost */}
            <MetricCard
              title="Messages Sent Cost"
              value={`$${cost.toFixed(2)}`}
              subtext={`${messagesSent} messages × $0.01`}
              trend={calcTrend(messagesSent, previousMessageCount)}
              onClick={() => handleMetricClick('messageCost', 'Message Cost')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />

            {/* Cost Per Hot Lead */}
            <MetricCard
              title="Cost per Hot Lead"
              value={costPerHotLead === '—' ? '—' : `$${costPerHotLead}`}
              subtext={hotLeadCount ? `${hotLeadCount} hot leads` : 'No hot leads yet'}
              trend={
                hotLeadCount > 0
                  ? calcTrend(hotLeadCount, previousHotLeadCount)
                  : null
              }
              empty={hotLeadCount === 0}
              onClick={() => handleMetricClick('costPerLead', 'Cost Per Lead')}
              isClickable={hotLeadCount > 0}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hot Lead Trend (line chart) */}
            <div 
              className={`bg-white p-4 rounded-xl shadow border col-span-1 md:col-span-1 transition-all duration-200 ${
                canAccessDetailedAnalytics 
                  ? 'cursor-pointer hover:shadow-lg hover:scale-105' 
                  : 'cursor-pointer hover:shadow-md opacity-90'
              } relative`}
              onClick={() => handleMetricClick('hotLeadTrend', 'Hot Lead Trend')}
            >
              <h3 className="text-sm text-gray-500 mb-2">Hot Lead Trend (%)</h3>
              {hotLeadTrend && hotLeadTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={hotLeadTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line
                      type="monotone"
                      dataKey="hotRate"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-10">No trend data available.</p>
              )}
              
              {!canAccessDetailedAnalytics && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>

            {/* Messages Sent Cost */}
            <MetricCard
              title="Messages Sent Cost"
              value={`$${cost.toFixed(2)}`}
              subtext={`${messagesSent} messages × $0.01`}
              trend={calcTrend(messagesSent, previousMessageCount)}
              onClick={() => handleMetricClick('messageCost', 'Message Cost')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />

            {/* Cost Per Hot Lead */}
            <MetricCard
              title="Cost per Hot Lead"
              value={costPerHotLead === '—' ? '—' : `$${costPerHotLead}`}
              subtext={hotLeadCount ? `${hotLeadCount} hot leads` : 'No hot leads yet'}
              trend={
                hotLeadCount > 0
                  ? calcTrend(hotLeadCount, previousHotLeadCount)
                  : null
              }
              empty={hotLeadCount === 0}
              onClick={() => handleMetricClick('costPerLead', 'Cost Per Lead')}
              isClickable={hotLeadCount > 0}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
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

      {/* Detailed Analytics Modal */}
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
          <DetailedAnalyticsContent 
            modalType={activeModal}
            data={modalData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        ) : null}
      </ModalWrapper>
    </>
  );
}