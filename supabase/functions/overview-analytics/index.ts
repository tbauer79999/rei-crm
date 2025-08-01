
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFeatureValue } from '../../lib/plans';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';
import { 
  X, TrendingUp, Users, Calendar, Mail, BarChart3, Target, 
  MessageSquare, Activity, Clock, CheckCircle, Send, Inbox,
  AlertTriangle, Lock
} from 'lucide-react';

// Updated Edge Function URL - Now points to sync_sales_metrics
const BASE_EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/sync_sales_metrics';

// Helper function to build API URL
const buildApiUrl = (component, tenantId, period = '30days') => {
  return `${BASE_EDGE_FUNCTION_URL}?action=fetch&component=${component}&tenant_id=${tenantId}&period=${period}`;
};

// Modal configuration for each metric
const MODAL_CONFIG = {
  totalLeads: {
    title: 'Total Leads Overview & Trends',
    subtitle: 'Comprehensive insights into your lead generation performance',
    icon: BarChart3,
    iconColor: 'text-blue-600',
    features: ['trend', 'sources', 'topSales', 'recentSignups']
  },
  weeklyLeads: {
    title: 'Weekly Leads Performance & Trends',
    subtitle: 'Week-over-week performance analysis and patterns',
    icon: TrendingUp,
    iconColor: 'text-green-600',
    features: ['weeklyTrend', 'weeklySourceBreakdown', 'hotLeadCorrelation', 'weeklyInsights']
  },
  hotLeadRate: {
    title: 'Hot Lead Conversion Performance & Optimization',
    subtitle: 'Analyze and optimize your lead qualification rates',
    icon: Target,
    iconColor: 'text-orange-600',
    features: ['hotRateTrend', 'hotRateByChannel', 'hotRateByTopic', 'timeToHot', 'hotLeadFunnel', 'optimizationTips']
  },
  replyRate: {
    title: 'Reply Rate Insights',
    subtitle: 'Message engagement and response analytics',
    icon: MessageSquare,
    iconColor: 'text-purple-600',
    features: ['trend', 'responseTime', 'messageBreakdown']
  },
  activeLeads: {
    title: 'Active Leads Management & Distribution',
    subtitle: 'Current leads in your sales pipeline',
    icon: Activity,
    iconColor: 'text-cyan-600',
    features: ['activeTrend', 'stageDistribution', 'stagnantLeads', 'ownerDistribution']
  },
  completedLeads: {
    title: 'Completed Leads Analysis & Outcomes',
    subtitle: 'Successfully closed leads and conversion insights',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    features: ['completedTrend', 'outcomeDistribution', 'disqualificationReasons', 'avgCompletionTime']
  },
  messagesSent: {
    title: 'Outbound Message Performance',
    subtitle: 'AI and system message analytics',
    icon: Send,
    iconColor: 'text-blue-600',
    features: ['messageTrend', 'messageTypeDistribution', 'deliveryStats', 'engagementByType']
  },
  messagesReceived: {
    title: 'Inbound Message & Intent Analysis',
    subtitle: 'Customer communication insights',
    icon: Inbox,
    iconColor: 'text-purple-600',
    features: ['messageTrend', 'sourceDistribution', 'topIntents', 'sentimentAnalysis', 'unhandledMessages']
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
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] m-2 lg:m-4 overflow-hidden">
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
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
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

// Reusable Chart Components
const TrendChart = ({ data, title, icon: Icon, iconColor }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.count));
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Icon className={`w-4 lg:w-5 h-4 lg:h-5 mr-2 ${iconColor}`} />
        <span className="truncate">{title}</span>
      </h3>
      <div className="h-48 lg:h-64 relative w-full min-w-0">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="40"
              y1={40 + i * 30}
              x2="760"
              y2={40 + i * 30}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}
          
          <path
            d={`M ${data.map((d, i) => 
              `${40 + (i * 720 / (data.length - 1))},${160 - (d.count / maxValue) * 120}`
            ).join(' L ')}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
          />
          
          {data.map((d, i) => (
            <circle
              key={i}
              cx={40 + (i * 720 / (data.length - 1))}
              cy={160 - (d.count / maxValue) * 120}
              r="3"
              fill="#3B82F6"
            >
              <title>{`${d.date}: ${d.count}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};

const SourceDistribution = ({ data, title = "Lead Sources" }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">{title}</h3>
      <div className="space-y-3">
        {data.map((source, i) => (
          <div key={i} className="flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: source.color }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">{source.source || source.name}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(source.count / total) * 100}%`,
                    backgroundColor: source.color
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-8 lg:w-12 text-right">{source.count}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-sm font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
};

// Modal Content Components
const MetricModalContent = ({ metricType, data, selectedPeriod, onPeriodChange }) => {
  const config = MODAL_CONFIG[metricType];
  if (!config) return null;

  return (
    <>
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={onPeriodChange}
      />
      
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 w-full min-w-0">
        {data.trendData && (
          <TrendChart 
            data={data.trendData} 
            title="Trend Analysis" 
            icon={config.icon} 
            iconColor={config.iconColor} 
          />
        )}
        
        {data.sourceData && (
          <SourceDistribution data={data.sourceData} />
        )}
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Raw Data (Debug)</h3>
          <pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    </>
  );
};

// Updated MetricCard Component
const MetricCard = ({ title, value, subtext, trend, onClick, isClickable = false, canAccessDetailed = true }) => {
  return (
    <div 
      className={`bg-white p-3 lg:p-4 rounded-xl shadow border text-center relative w-full min-w-0 ${
        isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      } ${!canAccessDetailed ? 'opacity-90' : ''}`}
      onClick={onClick}
    >
      <h3 className="text-xs lg:text-sm text-gray-500 mb-1 truncate">{title}</h3>
      <p className="text-lg lg:text-2xl font-bold text-gray-800 truncate">{value}</p>
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
      {!canAccessDetailed && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Mobile Metric Card Component
const MobileMetricCard = ({ title, value, subtext, trend, onClick, isClickable = false, canAccessDetailed = true, icon: Icon }) => {
  return (
    <div 
      className={`bg-white p-3 rounded-xl shadow border relative w-full min-w-0 ${
        isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      } ${!canAccessDetailed ? 'opacity-90' : ''}`}
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
      
      <div className="space-y-1">
        <h3 className="text-xs text-gray-500 font-medium truncate">{title}</h3>
        <p className="text-lg font-bold text-gray-800 truncate">{value}</p>
        {subtext && <p className="text-xs text-gray-400 truncate">{subtext}</p>}
      </div>
      
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
          <p>✓ Interactive metric cards</p>
          <p>✓ Detailed trend analysis</p>
          <p>✓ Historical comparisons</p>
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
const generateMockData = (metricType) => {
  return {
    trendData: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 30 + i
      };
    }),
    sourceData: [
      { source: 'Website', count: 145, color: '#3B82F6' },
      { source: 'Paid Ads', count: 89, color: '#10B981' },
      { source: 'Referral', count: 67, color: '#F59E0B' },
      { source: 'Cold Outreach', count: 43, color: '#8B5CF6' },
      { source: 'Social Media', count: 31, color: '#EF4444' }
    ]
  };
};

// Main Component
export default function OverviewMetrics() {
  const { user, currentPlan } = useAuth();
  
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  console.log('📊 OverviewMetrics Access:', {
    currentPlan,
    controlRoomAccess,
    canAccessDetailedAnalytics
  });
  
  const [activeModal, setActiveModal] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptMetric, setUpgradePromptMetric] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    weeklyLeads: 0,
    hotLeadRate: '0%',
    replyRate: '0%',
    activeLeads: 0,
    completedLeads: 0,
    messagesSent: 0,
    messagesReceived: 0,
    trends: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleMetricClick = (metricType, metricName) => {
    if (!canAccessDetailedAnalytics) {
      setUpgradePromptMetric(metricName);
      setShowUpgradePrompt(true);
      return;
    }
    
    openModal(metricType);
  };

  const openModal = async (metricType) => {
    setActiveModal(metricType);
    setLoadingModal(true);
    setModalData(null);
    
    try {
      const detailUrl = buildApiUrl('overview', user.tenant_id, selectedPeriod);
      console.log(`🔍 Calling detailed endpoint: ${detailUrl}`);
      
      const data = await callEdgeFunction(detailUrl);
      console.log(`📊 Detailed data returned for ${metricType}:`, data);
      
      if (data.error) {
        console.error('API Error:', data.error);
        throw new Error(data.error.details || data.error || 'API returned an error');
      }
      
      setModalData(data);
      
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateMockData(metricType));
    } finally {
      setLoadingModal(false);
    }
  };

  const handlePeriodChange = async (newPeriod) => {
    setSelectedPeriod(newPeriod);
    
    if (activeModal) {
      setLoadingModal(true);
      
      try {
        const detailUrl = buildApiUrl('overview', user.tenant_id, newPeriod);
        const data = await callEdgeFunction(detailUrl);
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
      console.log('No active user or tenant_id found, skipping fetch for OverviewMetrics.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = buildApiUrl('overview', user.tenant_id, '30days');
        console.log('🔍 Fetching overview metrics from:', apiUrl);
        
        const data = await callEdgeFunction(apiUrl);
        console.log('📊 Raw API Response:', data);

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid API response format');
        }

        if (data.error) {
          throw new Error(data.error.details || data.error || 'API returned an error');
        }

        const safeGetNumber = (value) => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        const safeGetPercentage = (value) => {
          const num = Number(value);
          return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
        };

        const weeklyChange = (curr, prev) => {
          const currentNum = safeGetNumber(curr);
          const prevNum = safeGetNumber(prev);
          
          if (prevNum === 0) return currentNum > 0 ? '+100%' : '+0%';
          const change = ((currentNum - prevNum) / prevNum) * 100;
          const sign = change >= 0 ? '+' : '';
          return `${sign}${change.toFixed(1)}%`;
        };

        const newMetrics = {
          totalLeads: safeGetNumber(data.totalLeads),
          weeklyLeads: safeGetNumber(data.weeklyLeads),
          hotLeadRate: safeGetPercentage(data.hotLeadRate),
          replyRate: safeGetPercentage(data.replyRate),
          activeLeads: safeGetNumber(data.activeLeads),
          completedLeads: safeGetNumber(data.completedLeads),
          messagesSent: safeGetNumber(data.messagesSent),
          messagesReceived: safeGetNumber(data.messagesReceived),
          trends: {
            weeklyLeads: weeklyChange(data.weeklyLeads, 25),
            hotLeadRate: weeklyChange(data.hotLeadRate, 12.0),
            replyRate: weeklyChange(data.replyRate, 35.0),
            completedLeads: weeklyChange(data.completedLeads, 7),
            messagesSent: weeklyChange(data.messagesSent, 210),
            messagesReceived: weeklyChange(data.messagesReceived, 110),
          },
        };

        console.log('✅ Processed metrics:', newMetrics);
        setMetrics(newMetrics);
        
      } catch (error) {
        console.error('❌ Error fetching overview metrics:', error);
        setError(error.message);
        
        setMetrics({
          totalLeads: 0,
          weeklyLeads: 0,
          hotLeadRate: '0%',
          replyRate: '0%',
          activeLeads: 0,
          completedLeads: 0,
          messagesSent: 0,
          messagesReceived: 0,
          trends: {},
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="lg:hidden grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white p-3 rounded-xl shadow border min-w-0">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="hidden lg:block space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
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
        <p className="text-red-600 font-medium">Failed to load metrics</p>
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

  const t = metrics.trends;

  const metricData = [
    {
      key: 'totalLeads',
      title: 'Total Leads',
      value: metrics.totalLeads,
      icon: BarChart3,
      trend: null
    },
    {
      key: 'weeklyLeads',
      title: 'Leads This Week',
      value: metrics.weeklyLeads,
      icon: TrendingUp,
      trend: t.weeklyLeads
    },
    {
      key: 'hotLeadRate',
      title: 'Hot Lead Rate',
      value: metrics.hotLeadRate,
      icon: Target,
      trend: t.hotLeadRate
    },
    {
      key: 'replyRate',
      title: 'Reply Rate',
      value: metrics.replyRate,
      icon: MessageSquare,
      trend: t.replyRate
    },
    {
      key: 'activeLeads',
      title: 'Active Leads',
      value: metrics.activeLeads,
      icon: Activity,
      trend: null
    },
    {
      key: 'completedLeads',
      title: 'Completed Leads',
      value: metrics.completedLeads,
      icon: CheckCircle,
      trend: t.completedLeads
    },
    {
      key: 'messagesSent',
      title: 'Messages Sent',
      value: metrics.messagesSent,
      icon: Send,
      trend: t.messagesSent
    },
    {
      key: 'messagesReceived',
      title: 'Messages Received',
      value: metrics.messagesReceived,
      icon: Inbox,
      trend: t.messagesReceived
    }
  ];

  return (
    <div className="w-full min-w-0">
      <div className="lg:hidden w-full min-w-0">
        <div className="grid grid-cols-2 gap-2 w-full">
          {metricData.map((metric) => (
            <MobileMetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value}
              trend={metric.trend}
              icon={metric.icon}
              onClick={() => handleMetricClick(metric.key, metric.title)}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
          ))}
        </div>
      </div>

      <div className="hidden lg:block w-full">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Leads" 
              value={metrics.totalLeads} 
              onClick={() => handleMetricClick('totalLeads', 'Total Leads')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Leads This Week" 
              value={metrics.weeklyLeads} 
              trend={t.weeklyLeads}
              onClick={() => handleMetricClick('weeklyLeads', 'Weekly Leads')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Hot Lead Conversion Rate" 
              value={metrics.hotLeadRate} 
              trend={t.hotLeadRate}
              onClick={() => handleMetricClick('hotLeadRate', 'Hot Lead Rate')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Reply Rate" 
              value={metrics.replyRate} 
              trend={t.replyRate}
              onClick={() => handleMetricClick('replyRate', 'Reply Rate')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Active Leads" 
              value={metrics.activeLeads}
              onClick={() => handleMetricClick('activeLeads', 'Active Leads')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Completed Leads" 
              value={metrics.completedLeads} 
              trend={t.completedLeads}
              onClick={() => handleMetricClick('completedLeads', 'Completed Leads')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Messages Sent" 
              value={metrics.messagesSent} 
              trend={t.messagesSent}
              onClick={() => handleMetricClick('messagesSent', 'Messages Sent')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
            <MetricCard 
              title="Messages Received" 
              value={metrics.messagesReceived} 
              trend={t.messagesReceived}
              onClick={() => handleMetricClick('messagesReceived', 'Messages Received')}
              isClickable={true}
              canAccessDetailed={canAccessDetailedAnalytics}
            />
          </div>
        </div>
      </div>

      {showUpgradePrompt && (
        <UpgradePrompt 
          metricName={upgradePromptMetric}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}

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
          <MetricModalContent 
            metricType={activeModal}
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
    </div>
  );
}