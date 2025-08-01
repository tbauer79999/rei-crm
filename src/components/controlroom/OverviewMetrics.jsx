import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFeatureValue } from '../../lib/plans';
import { 
  X, TrendingUp, Users, Calendar, Mail, BarChart3, Target, 
  MessageSquare, Activity, Clock, CheckCircle, Send, Inbox,
  AlertTriangle, Lock
} from 'lucide-react';
import { isDemoTenant, generateDemoOverviewMetrics, generateDemoDetailedMetrics } from '../../lib/demo';

const supabase = require('../../lib/supabaseClient');


// Database query functions (ONLY CHANGE - replacing edge function calls)
const fetchOverviewMetrics = async (tenantId, userId = null, period = '30days') => {
    // 🎭 CHECK FOR DEMO TENANT FIRST
  if (await isDemoTenant(tenantId)) {
    console.log('🎭 Demo mode: returning demo overview metrics');
    return generateDemoOverviewMetrics(period);
  }

  const daysBack = period === '7days' ? 7 : period === '90days' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

let query = supabase
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: false });

  // If userId is provided, filter for that specific user, otherwise get tenant-level data
  if (userId) {
    query = query.eq('user_profile_id', userId);
  } else {
    query = query.is('user_profile_id', null);
  }

  const { data: salesMetrics, error } = await query;

  if (error) throw error;

  // Aggregate the data
  const latestMetric = salesMetrics[0];
  const totalLeads = latestMetric?.total_leads_assigned || 0;
  const hotLeads = latestMetric?.hot_leads || 0;
  const messagesSent = salesMetrics.reduce((sum, row) => sum + (row.messages_sent_count || 0), 0);
  const messagesReceived = salesMetrics.reduce((sum, row) => sum + (row.messages_received_count || 0), 0);
  const conversions = salesMetrics.reduce((sum, row) => sum + (row.conversion_count || 0), 0);
  const disqualifiedAI = salesMetrics.reduce((sum, row) => sum + (row.disqualified_by_ai || 0), 0);
  const disqualifiedHuman = salesMetrics.reduce((sum, row) => sum + (row.disqualified_by_human || 0), 0);
  const activeLeads = latestMetric?.active_leads_count || 0;

  // Weekly leads (last 7 days)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyLeads = salesMetrics
    .filter(row => new Date(row.metric_date) >= weekStart)
    .reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0);

  // Calculate rates
  const hotLeadRate = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : '0.0';
  const avgReplyRate = salesMetrics.length > 0 
    ? (salesMetrics.reduce((sum, row) => sum + (row.reply_rate || 0), 0) / salesMetrics.length).toFixed(1)
    : '0.0';

  const completedLeads = conversions + disqualifiedAI + disqualifiedHuman;

  return {
    totalLeads,
    weeklyLeads,
    hotLeadRate: `${hotLeadRate}%`,
    replyRate: `${avgReplyRate}%`,
    activeLeads,
    completedLeads,
    messagesSent,
    messagesReceived,
    trends: {
      weeklyLeads: latestMetric?.weekly_comparison?.weeklyLeads || '+0%',
      hotLeadRate: latestMetric?.weekly_comparison?.hotLeadRate || '+0%',
      replyRate: latestMetric?.weekly_comparison?.replyRate || '+0%',
      completedLeads: latestMetric?.weekly_comparison?.completedLeads || '+0%',
      messagesSent: latestMetric?.weekly_comparison?.messagesSent || '+0%',
      messagesReceived: latestMetric?.weekly_comparison?.messagesReceived || '+0%',
    }
  };
};

const fetchDetailedMetrics = async (tenantId, userId = null, metricType, period = '30days') => {
    // 🎭 CHECK FOR DEMO TENANT FIRST
  if (await isDemoTenant(tenantId)) {
    console.log('🎭 Demo mode: returning demo detailed metrics for', metricType);
    return generateDemoDetailedMetrics(metricType);
  }
  const daysBack = period === '7days' ? 7 : period === '90days' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Fetch real data from both tables
let salesQuery = supabase
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (userId) {
    salesQuery = salesQuery.eq('user_profile_id', userId);
  } else {
    salesQuery = salesQuery.is('user_profile_id', null);
  }

  const { data: salesMetrics, error: salesError } = await salesQuery;

  if (salesError) throw salesError;

  const { data: conversationData, error: convError } = await supabase
    .from('conversation_analytics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('sales_metric_date', startDate.toISOString().split('T')[0])
    .order('sales_metric_date', { ascending: true });

  if (convError) throw convError;

  // Process the real data based on metric type
  return processRealData(salesMetrics || [], conversationData || [], metricType);
};

function processRealData(salesMetrics, conversationData, metricType) {
  // Create trend data from sales metrics
  const trendData = salesMetrics.map(row => ({
    date: row.metric_date,
    count: getCountForMetricType(row, metricType)
  }));

  // Extract lead sources from custom_metrics
  const sourceData = extractSourceData(salesMetrics);

  // Create basic structure that all metrics need
const baseData = {
  trendData: trendData.length > 0 ? trendData : generateEmptyTrend(),
  sourceData: sourceData.length > 0 ? sourceData : generateDefaultSources(),
  topSalespersons: generateTopSalespersons(salesMetrics)
};

  // Add metric-specific data
  switch (metricType) {
    case 'totalLeads':
      return {
        ...baseData,
        // Add any totalLeads-specific data here
      };

    case 'weeklyLeads':
      return {
        ...baseData,
        weeklyTrendData: generateWeeklyTrend(salesMetrics),
        weeklySourceData: generateWeeklySourceData(salesMetrics),
        avgHotRate: calculateAvgHotRate(salesMetrics),
        totalHotLeads: salesMetrics.reduce((sum, row) => sum + (row.hot_leads || 0), 0),
        bestWeek: findBestWeek(salesMetrics),
        weeklyInsights: generateWeeklyInsights(salesMetrics)
      };

    case 'hotLeadRate':
      return {
        ...baseData,
        hotRateTrendData: generateHotRateTrend(salesMetrics),
        targetHotRate: 15,
        hotRateByChannelData: generateHotRateByChannel(salesMetrics),
        hotRateByTopicData: generateHotRateByTopic(conversationData),
        timeToHotData: generateTimeToHotData(salesMetrics),
        funnelData: generateHotLeadFunnel(salesMetrics),
        optimizationTips: generateOptimizationTips(salesMetrics)
      };

    case 'activeLeads':
      return {
        ...baseData,
        stageData: generateStageData(salesMetrics),
        ownerData: generateOwnerData(salesMetrics),
        stagnantLeads: generateStagnantLeads(salesMetrics)
      };

    case 'completedLeads':
      return {
        ...baseData,
        outcomeData: generateOutcomeData(salesMetrics),
        disqualificationReasons: generateDisqualificationReasons(salesMetrics),
        avgCompletionTime: calculateAvgCompletionTime(salesMetrics)
      };

    case 'messagesSent':
      return {
        ...baseData,
        messageTypeData: generateMessageTypeData(salesMetrics),
        deliveryStats: generateDeliveryStats(salesMetrics),
        engagementData: generateEngagementData(salesMetrics)
      };

    case 'messagesReceived':
      return {
        ...baseData,
        topIntents: generateTopIntents(conversationData),
        sentimentData: generateSentimentData(conversationData),
        unhandledMessages: generateUnhandledMessages(conversationData)
      };

    default:
      return baseData;
  }
}

// Helper functions to extract real data
function getCountForMetricType(row, metricType) {
  switch (metricType) {
    case 'totalLeads': return row.total_leads_assigned || 0;
    case 'weeklyLeads': return row.total_leads_assigned || 0;
    case 'hotLeadRate': 
      return row.total_leads_assigned > 0 ? 
        ((row.hot_leads || 0) / row.total_leads_assigned) * 100 : 0;
    case 'activeLeads': return row.active_leads_count || 0;
    case 'completedLeads': 
      return (row.conversion_count || 0) + 
             (row.disqualified_by_ai || 0) + 
             (row.disqualified_by_human || 0);
    case 'messagesSent': return row.messages_sent_count || 0;
    case 'messagesReceived': return row.messages_received_count || 0;
    default: return 0;
  }
}

function extractSourceData(salesMetrics) {
  const sourceMap = {};
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
  let colorIndex = 0;

  salesMetrics.forEach(row => {
    if (row.lead_sources) {
      try {
        const leadSources = typeof row.lead_sources === 'string' 
          ? JSON.parse(row.lead_sources) 
          : row.lead_sources;
        
        Object.entries(leadSources).forEach(([source, count]) => {
          if (!sourceMap[source]) {
            sourceMap[source] = {
              source,
              count: 0,
              color: colors[colorIndex % colors.length]
            };
            colorIndex++;
          }
          sourceMap[source].count += count;
        });
      } catch (e) {
        console.warn('Error parsing lead_sources JSON:', e);
      }
    }
  });

  return Object.values(sourceMap);
}

// FIND THIS FUNCTION:
function generateTopSalespersons(salesMetrics) {
  // Since we don't have individual salesperson data, create a placeholder
  return [
    { id: '1', name: 'AI Agent', totalLeads: salesMetrics.reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0), avatar: '🤖' }
  ];
}

// REPLACE WITH THIS:
async function getTopSalespersons(tenantId, startDate) {
  // Get individual user metrics (not tenant-level)
  const { data: userMetrics, error } = await supabase
    .from('sales_metrics')
    .select('user_profile_id, total_leads_assigned, hot_leads, conversion_count')
    .eq('tenant_id', tenantId)
    .not('user_profile_id', 'is', null) // Only individual user metrics
    .gte('metric_date', startDate)
    .order('total_leads_assigned', { ascending: false });
  
  if (error || !userMetrics) return [];

  // Get user profile information
  const userIds = [...new Set(userMetrics.map(m => m.user_profile_id))];
  if (userIds.length === 0) return [];
  
  const { data: userProfiles } = await supabase
    .from('users_profiles') // or whatever your users table is called
    .select('id, name, email, avatar')
    .in('id', userIds);

  // Aggregate metrics by user and combine with profile data
  const userAggregates = {};
  userMetrics.forEach(metric => {
    const userId = metric.user_profile_id;
    if (!userAggregates[userId]) {
      userAggregates[userId] = {
        totalLeads: 0,
        hotLeads: 0,
        conversions: 0
      };
    }
    userAggregates[userId].totalLeads += metric.total_leads_assigned || 0;
    userAggregates[userId].hotLeads += metric.hot_leads || 0;
    userAggregates[userId].conversions += metric.conversion_count || 0;
  });

  // Create top salespeople list
  const topSalespersons = Object.entries(userAggregates)
    .map(([userId, metrics]: [string, any]) => {
      const profile = userProfiles?.find(p => p.id === userId);
      return {
        id: userId,
        name: profile?.name || profile?.email || 'Unknown User',
        totalLeads: metrics.totalLeads,
        hotLeads: metrics.hotLeads,
        conversions: metrics.conversions,
        avatar: profile?.avatar || '👤'
      };
    })
    .sort((a, b) => b.totalLeads - a.totalLeads)
    .slice(0, 5);

  return topSalespersons;
}

function generateWeeklyTrend(salesMetrics) {
  const weeklyData = [];
  for (let i = 0; i < salesMetrics.length; i += 7) {
    const weekData = salesMetrics.slice(i, i + 7);
    const currentWeekLeads = weekData.reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0);
    const previousWeekData = salesMetrics.slice(Math.max(0, i - 7), i);
    const previousWeekLeads = previousWeekData.reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0);
    
    weeklyData.push({
      weekStartDate: weekData[0]?.metric_date || '',
      currentWeekLeads,
      previousWeekLeads,
      growthPercentage: previousWeekLeads > 0 ? 
        Math.round(((currentWeekLeads - previousWeekLeads) / previousWeekLeads) * 100) : 0
    });
  }
  return weeklyData;
}

function generateHotRateTrend(salesMetrics) {
  return salesMetrics.map(row => ({
    date: row.metric_date,
    hotRate: row.total_leads_assigned > 0 ? 
      ((row.hot_leads || 0) / row.total_leads_assigned) * 100 : 0
  }));
}

function generateHotRateByChannel(salesMetrics) {
  const channels = ['Website', 'Paid Ads', 'Referral', 'Cold Outreach', 'Social Media'];
  return channels.map(channel => ({
    channel,
    hotRate: Math.random() * 0.2 + 0.1 // 10-30% range for now
  }));
}

function generateSentimentData(conversationData) {
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  
  conversationData.forEach(conv => {
    const sentiment = conv.sentiment_classification || 'neutral';
    if (sentiments.hasOwnProperty(sentiment)) {
      sentiments[sentiment]++;
    }
  });

  return Object.entries(sentiments).map(([sentiment, count]) => ({
    sentiment: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    count
  }));
}

function generateTopIntents(conversationData) {
  const intents = {};
  
  conversationData.forEach(conv => {
    const intent = conv.intent_classification || 'general';
    intents[intent] = (intents[intent] || 0) + 1;
  });

  return Object.entries(intents)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// Fallback functions for when we have no data
function generateEmptyTrend() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: 0
    };
  });
}

function generateDefaultSources() {
  return [
    { source: 'Direct', count: 1, color: '#3B82F6' },
    { source: 'Website', count: 1, color: '#10B981' }
  ];
}

// Add more helper functions as needed...
function calculateAvgHotRate(salesMetrics) {
  const rates = salesMetrics.map(row => 
    row.total_leads_assigned > 0 ? 
      ((row.hot_leads || 0) / row.total_leads_assigned) * 100 : 0
  ).filter(rate => rate > 0);
  
  return rates.length > 0 ? 
    (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(1) : '0.0';
}

function findBestWeek(salesMetrics) {
  // Find the week with the highest lead count
  let maxLeads = 0;
  let bestWeekIndex = 0;
  
  for (let i = 0; i < salesMetrics.length; i += 7) {
    const weekData = salesMetrics.slice(i, i + 7);
    const weekLeads = weekData.reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0);
    if (weekLeads > maxLeads) {
      maxLeads = weekLeads;
      bestWeekIndex = Math.floor(i / 7) + 1;
    }
  }
  
  return `Week ${bestWeekIndex}`;
}

function generateWeeklyInsights(salesMetrics) {
  const totalLeads = salesMetrics.reduce((sum, row) => sum + (row.total_leads_assigned || 0), 0);
  const avgLeadsPerDay = totalLeads / salesMetrics.length;
  
  return `Average of ${avgLeadsPerDay.toFixed(1)} leads per day. ${
    totalLeads > 0 ? 'System is actively processing leads.' : 'No significant lead activity detected.'
  }`;
}

// Add placeholder implementations for other functions
function generateWeeklySourceData(salesMetrics) { return []; }
function generateHotRateByTopic(conversationData) { return []; }
function generateTimeToHotData(salesMetrics) { return null; }
function generateHotLeadFunnel(salesMetrics) { return []; }
function generateOptimizationTips(salesMetrics) { return []; }
function generateStageData(salesMetrics) { return []; }
function generateOwnerData(salesMetrics) { return []; }
function generateStagnantLeads(salesMetrics) { return []; }
function generateOutcomeData(salesMetrics) { return []; }
function generateDisqualificationReasons(salesMetrics) { return []; }
function calculateAvgCompletionTime(salesMetrics) { return null; }
function generateMessageTypeData(salesMetrics) { return []; }
function generateDeliveryStats(salesMetrics) { return []; }
function generateEngagementData(salesMetrics) { return []; }
function generateUnhandledMessages(conversationData) { return []; }
// Modal configuration for each metric
const MODAL_CONFIG = {
  totalLeads: {
    title: 'Total Leads Overview & Trends',
    subtitle: 'Comprehensive insights into your lead generation performance',
    icon: BarChart3,
    iconColor: 'text-blue-600',
    features: ['trend', 'sources', 'topSales']
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
          {/* Grid lines */}
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
          
          {/* Line */}
          <path
            d={`M ${data.map((d, i) => 
              `${40 + (i * 720 / (data.length - 1))},${160 - (d.count / maxValue) * 120}`
            ).join(' L ')}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
          />
          
          {/* Points */}
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

const TopSalespersons = ({ data }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <Users className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-green-600" />
      <span className="truncate">Top 5 Team Members</span>
    </h3>
    <div className="space-y-3">
      {data && data.length > 0 ? (
        data.map((person, i) => (
          <div key={person.id || i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors min-w-0">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <span className="text-xl lg:text-2xl flex-shrink-0">{person.avatar || '👤'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {person.name || 'Team Member'}
                </p>
                <p className="text-xs text-gray-500">Rank #{i + 1}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-base lg:text-lg font-bold text-gray-900">
                {person.totalLeads || 0}
              </p>
              <p className="text-xs text-gray-500">leads</p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No team performance data available.</p>
          <p className="text-xs text-gray-400 mt-1">Add team members to see rankings.</p>
        </div>
      )}
    </div>
  </div>
);

// Weekly Trend Chart with comparison
const WeeklyTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.currentWeekLeads, d.previousWeekLeads || 0))
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-green-600" />
        <span className="truncate">Weekly Lead Performance</span>
      </h3>
      <div className="h-48 lg:h-64 relative w-full min-w-0">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="60"
              y1={40 + i * 30}
              x2="760"
              y2={40 + i * 30}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}
          
          {/* Current period bars */}
          {data.map((d, i) => (
            <rect
              key={`current-${i}`}
              x={60 + (i * 700 / data.length)}
              y={160 - (d.currentWeekLeads / maxValue) * 120}
              width={700 / data.length / 2.5}
              height={(d.currentWeekLeads / maxValue) * 120}
              fill="#3B82F6"
              className="hover:opacity-80"
            >
              <title>{`Week ${d.weekStartDate}: ${d.currentWeekLeads} leads`}</title>
            </rect>
          ))}
          
          {/* Previous period bars */}
          {data.map((d, i) => d.previousWeekLeads && (
            <rect
              key={`prev-${i}`}
              x={60 + (i * 700 / data.length) + 700 / data.length / 2.5}
              y={160 - (d.previousWeekLeads / maxValue) * 120}
              width={700 / data.length / 2.5}
              height={(d.previousWeekLeads / maxValue) * 120}
              fill="#E5E7EB"
              className="hover:opacity-80"
            >
              <title>{`Previous period: ${d.previousWeekLeads} leads`}</title>
            </rect>
          ))}
          
          {/* Growth percentages */}
          {data.map((d, i) => (
            <text
              key={`growth-${i}`}
              x={60 + (i * 700 / data.length) + 700 / data.length / 2}
              y={30}
              textAnchor="middle"
              className={`text-xs font-medium ${d.growthPercentage >= 0 ? 'fill-green-600' : 'fill-red-600'}`}
            >
              {d.growthPercentage >= 0 ? '+' : ''}{d.growthPercentage}%
            </text>
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-center space-x-4 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span className="text-sm text-gray-600">Current Period</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Previous Period</span>
        </div>
      </div>
    </div>
  );
};

// Weekly Source Breakdown
const WeeklySourceBreakdown = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const sourceColors = {
    'Website': '#3B82F6',
    'Paid Ads': '#10B981',
    'Referral': '#F59E0B',
    'Cold Outreach': '#8B5CF6',
    'Social Media': '#EF4444'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Lead Sources by Week</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-0">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 lg:px-3 text-sm font-medium text-gray-700">Source</th>
              {data.map((week, i) => (
                <th key={i} className="text-center py-2 px-1 lg:px-3 text-sm font-medium text-gray-700">
                  W{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(sourceColors).map(source => (
              <tr key={source} className="border-b border-gray-100">
                <td className="py-2 px-2 lg:px-3 text-sm text-gray-900 flex items-center min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: sourceColors[source] }}
                  />
                  <span className="truncate">{source}</span>
                </td>
                {data.map((week, i) => {
                  const sourceData = week.sources.find(s => s.name === source);
                  return (
                    <td key={i} className="text-center py-2 px-1 lg:px-3 text-sm text-gray-600">
                      {sourceData?.count || 0}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Hot Lead Rate Trend with Target Line
const HotRateTrendChart = ({ data, targetRate = 15 }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.hotRate), targetRate) * 1.1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Target className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-orange-600" />
        <span className="truncate">Hot Lead Rate Trend</span>
      </h3>
      <div className="h-48 lg:h-64 relative w-full min-w-0">
        <svg className="w-full h-full" viewBox="0 0 800 200">
          {/* Grid lines */}
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
          
          {/* Target line */}
          <line
            x1="40"
            y1={160 - (targetRate / maxValue) * 120}
            x2="760"
            y2={160 - (targetRate / maxValue) * 120}
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text
            x="770"
            y={160 - (targetRate / maxValue) * 120 + 4}
            className="text-xs fill-red-600"
          >
            Target
          </text>
          
          {/* Trend line */}
          <path
            d={`M ${data.map((d, i) => 
              `${40 + (i * 720 / (data.length - 1))},${160 - (d.hotRate / maxValue) * 120}`
            ).join(' L ')}`}
            fill="none"
            stroke="#F97316"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={40 + (i * 720 / (data.length - 1))}
              cy={160 - (d.hotRate / maxValue) * 120}
              r="4"
              fill="#F97316"
              className="hover:r-5"
            >
              <title>{`${d.date}: ${d.hotRate.toFixed(1)}%`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};

// Hot Rate by Channel
const HotRateByChannel = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Hot Rate by Channel</h3>
      <div className="space-y-3">
        {data.map((channel, i) => (
          <div key={i} className="flex items-center justify-between min-w-0">
            <span className="text-sm font-medium text-gray-700 truncate flex-1">{channel.channel}</span>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500 bg-orange-500"
                  style={{ width: `${channel.hotRate * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">
                {(channel.hotRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Time to Hot Distribution
const TimeToHotMetrics = ({ data }) => {
  if (!data) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Clock className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-purple-600" />
        <span className="truncate">Time to Hot Lead Conversion</span>
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 lg:p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Average Time</p>
          <p className="text-xl lg:text-2xl font-bold text-purple-700">{data.avgMinutes} min</p>
        </div>
        <div className="text-center p-3 lg:p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Median Time</p>
          <p className="text-xl lg:text-2xl font-bold text-purple-700">{data.medianMinutes} min</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">Distribution</p>
        {data.distribution.map((item, i) => (
          <div key={i} className="flex items-center space-x-2 min-w-0">
            <span className="text-sm text-gray-600 w-16 lg:w-20 flex-shrink-0">{item.range}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3 lg:h-4 min-w-0">
              <div
                className="bg-purple-500 h-3 lg:h-4 rounded-full"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-8 lg:w-12 text-right flex-shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hot Lead Funnel
const HotLeadFunnel = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Hot Lead Conversion Funnel</h3>
      <div className="space-y-3">
        {data.map((stage, i) => (
          <div key={i} className="relative">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-400 text-white p-3 rounded-lg min-w-0"
              style={{ width: `${(stage.count / maxCount) * 100}%`, minWidth: '120px' }}
            >
              <p className="font-medium text-sm lg:text-base truncate">{stage.stage}</p>
              <p className="text-sm opacity-90">{stage.count} leads</p>
            </div>
            {i < data.length - 1 && (
              <div className="absolute -bottom-2 left-4 lg:left-8 text-xs text-gray-500">
                ↓ {stage.conversionToNext}% conversion
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Stagnant Leads Table
const StagnantLeadsTable = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-yellow-600" />
        <span className="truncate">Stagnant Leads Report</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Current Status</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Assigned To</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Last Interaction</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Days Stagnant</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lead) => (
              <tr key={lead.leadId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{lead.name}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.currentStatus}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.assignedTo || 'AI'}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{lead.lastInteraction}</td>
                <td className="py-3 px-2 lg:px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.daysStagnant > 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {lead.daysStagnant} days
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Outcome Distribution (for completed leads)
const OutcomeDistribution = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const getOutcomeColor = (status) => {
    const colors = {
      'Converted to Customer': '#10B981',
      'Disqualified': '#EF4444',
      'Archived': '#6B7280',
      'Long-Term Nurture': '#F59E0B'
    };
    return colors[status] || '#3B82F6';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Completion Status Distribution</h3>
      <div className="space-y-3">
        {data.map((outcome, i) => (
          <div key={i} className="flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getOutcomeColor(outcome.status) }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">{outcome.status}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(outcome.count / total) * 100}%`,
                    backgroundColor: getOutcomeColor(outcome.status)
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 lg:w-16 text-right">
                {outcome.count} ({((outcome.count / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Delivery Stats Component
const DeliveryStats = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Delivery & Open Rate Summary</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {data.map((stat, i) => (
          <div key={i} className="text-center p-2 lg:p-3 bg-gray-50 rounded-lg">
            <p className="text-lg lg:text-2xl font-bold text-gray-800 truncate">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1 truncate">{stat.label}</p>
            {stat.percentage && (
              <p className="text-xs text-gray-500 mt-1">({stat.percentage}%)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Sentiment Analysis Component
const SentimentAnalysis = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const getSentimentColor = (sentiment) => {
    const colors = {
      'Positive': '#10B981',
      'Neutral': '#6B7280',
      'Negative': '#EF4444'
    };
    return colors[sentiment];
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Message Sentiment Distribution</h3>
      <div className="flex justify-around items-center">
        {data.map((item, i) => (
          <div key={i} className="text-center">
            <div 
              className="w-16 h-16 lg:w-24 lg:h-24 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${getSentimentColor(item.sentiment)}20` }}
            >
              <span 
                className="text-xl lg:text-3xl font-bold"
                style={{ color: getSentimentColor(item.sentiment) }}
              >
                {((item.count / total) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700 truncate">{item.sentiment}</p>
            <p className="text-xs text-gray-500">{item.count} messages</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Top Intents Component
const TopIntents = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Top Inbound Intents/Topics</h3>
      <div className="space-y-2">
        {data.map((intent, i) => (
          <div key={i} className="flex items-center justify-between p-2 lg:p-3 hover:bg-gray-50 rounded-lg min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-800 flex-shrink-0">#{i + 1}</span>
              <span className="text-sm text-gray-700 truncate">{intent.intent}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-16 lg:w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${(intent.count / data[0].count) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-8 lg:w-12 text-right">{intent.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Modal Content Components
const MetricModalContent = ({ metricType, data, selectedPeriod, onPeriodChange }) => {
  const config = MODAL_CONFIG[metricType];
  if (!config) return null;

  const { features, icon, iconColor } = config;

  // Different period options for different metrics
  const periodOptions = metricType === 'weeklyLeads' ? [
    { value: '4weeks', label: 'Last 4 Weeks' },
    { value: '8weeks', label: 'Last 8 Weeks' },
    { value: '12weeks', label: 'Last 12 Weeks' },
    { value: 'custom', label: 'Custom Range' }
  ] : metricType === 'activeLeads' ? [
    { value: 'current', label: 'Current Snapshot' },
    { value: '7days', label: 'Last 7 Days Average' },
    { value: '30days', label: 'Last 30 Days Average' }
  ] : undefined;

  return (
    <>
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={onPeriodChange}
        periods={periodOptions}
      />
      
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 w-full min-w-0">
        {/* Existing features */}
        {features.includes('trend') && data.trendData && (
          <TrendChart 
            data={data.trendData} 
            title="Trend Analysis" 
            icon={icon} 
            iconColor={iconColor} 
          />
        )}

        {/* Weekly Leads features */}
        {features.includes('weeklyTrend') && data.weeklyTrendData && (
          <WeeklyTrendChart data={data.weeklyTrendData} />
        )}
        
        {features.includes('weeklySourceBreakdown') && data.weeklySourceData && (
          <WeeklySourceBreakdown data={data.weeklySourceData} />
        )}
        
        {features.includes('hotLeadCorrelation') && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Weekly Lead Quality Correlation</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-center">
              <div className="p-3 lg:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-gray-800">{data.avgHotRate}%</p>
                <p className="text-sm text-gray-600">Avg Hot Rate</p>
              </div>
              <div className="p-3 lg:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-gray-800">{data.totalHotLeads}</p>
                <p className="text-sm text-gray-600">Total Hot Leads</p>
              </div>
              <div className="p-3 lg:p-4 bg-gray-50 rounded-lg">
                <p className="text-xl lg:text-2xl font-bold text-gray-800">{data.bestWeek}</p>
                <p className="text-sm text-gray-600">Best Week</p>
              </div>
            </div>
          </div>
        )}
        
        {features.includes('weeklyInsights') && data.weeklyInsights && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 w-full min-w-0">
            <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
            <p className="text-sm text-blue-800 break-words">{data.weeklyInsights}</p>
          </div>
        )}

        {/* Hot Lead Rate features */}
        {features.includes('hotRateTrend') && data.hotRateTrendData && (
          <HotRateTrendChart data={data.hotRateTrendData} targetRate={data.targetHotRate} />
        )}

        {/* Active Leads features */}
        {features.includes('activeTrend') && data.trendData && (
          <TrendChart 
            data={data.trendData} 
            title="Active Leads Trend" 
            icon={Activity} 
            iconColor="text-cyan-600" 
          />
        )}
        
        {features.includes('stageDistribution') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {data.stageData && (
              <SourceDistribution data={data.stageData} title="Active Leads by Stage" />
            )}
            
            {features.includes('ownerDistribution') && data.ownerData && (
              <SourceDistribution data={data.ownerData} title="Distribution by Owner" />
            )}
          </div>
        )}
        
        {features.includes('stagnantLeads') && data.stagnantLeads && (
          <StagnantLeadsTable data={data.stagnantLeads} />
        )}

        {/* Completed Leads features */}
        {features.includes('completedTrend') && data.trendData && (
          <TrendChart 
            data={data.trendData} 
            title="Completed Leads Trend" 
            icon={CheckCircle} 
            iconColor="text-green-600" 
          />
        )}
        
        {features.includes('outcomeDistribution') && data.outcomeData && (
          <OutcomeDistribution data={data.outcomeData} />
        )}
        
        {features.includes('disqualificationReasons') && data.disqualificationReasons && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Top Disqualification Reasons</h3>
            <div className="space-y-2">
              {data.disqualificationReasons.map((reason, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded min-w-0">
                  <span className="text-sm text-gray-700 truncate flex-1">{reason.reason}</span>
                  <span className="text-sm font-medium text-red-600 flex-shrink-0">{reason.count} leads</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {features.includes('avgCompletionTime') && data.avgCompletionTime && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 lg:p-6 text-center w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-green-900 mb-2 truncate">Average Time to Completion</h3>
            <p className="text-3xl lg:text-4xl font-bold text-green-700">{data.avgCompletionTime} days</p>
            <p className="text-sm text-green-600 mt-2">From initial contact to completion</p>
          </div>
        )}

        {/* Messages Sent/Received features */}
        {features.includes('messageTrend') && data.trendData && (
          <TrendChart 
            data={data.trendData} 
            title={metricType === 'messagesSent' ? 'Outbound Message Trend' : 'Inbound Message Trend'} 
            icon={metricType === 'messagesSent' ? Send : Inbox} 
            iconColor={metricType === 'messagesSent' ? 'text-blue-600' : 'text-purple-600'} 
          />
        )}
        
        {features.includes('messageTypeDistribution') && data.messageTypeData && (
          <SourceDistribution data={data.messageTypeData} title="Message Type Distribution" />
        )}
        
        {features.includes('deliveryStats') && data.deliveryStats && (
          <DeliveryStats data={data.deliveryStats} />
        )}
        
        {features.includes('engagementByType') && data.engagementData && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Engagement Rate by Message Type</h3>
            <div className="space-y-3">
              {data.engagementData.map((item, i) => (
                <div key={i} className="flex items-center justify-between min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{item.type}</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="w-20 lg:w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${item.rate * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {(item.rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Messages Received specific features */}
        {features.includes('sourceDistribution') && data.sourceData && (
          <SourceDistribution data={data.sourceData} title="Inbound Message Sources" />
        )}
        
        {features.includes('topIntents') && data.topIntents && (
          <TopIntents data={data.topIntents} />
        )}
        
        {features.includes('sentimentAnalysis') && data.sentimentData && (
          <SentimentAnalysis data={data.sentimentData} />
        )}
        
        {features.includes('unhandledMessages') && data.unhandledMessages && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-yellow-600" />
              <span className="truncate">AI Unhandled Messages</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Message ID</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Content Excerpt</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unhandledMessages.map((msg) => (
                    <tr key={msg.messageId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-900">{msg.messageId.slice(0, 8)}...</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{msg.content.slice(0, 50)}...</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{msg.date}</td>
                      <td className="py-3 px-2 lg:px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          msg.confidence < 0.5 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(msg.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {features.includes('sources') && data.sourceData && (
            <SourceDistribution data={data.sourceData} />
          )}
          
          {features.includes('topSales') && data.topSalespersons && (
            <TopSalespersons data={data.topSalespersons} />
          )}
          
          {features.includes('hotRateByChannel') && data.hotRateByChannelData && (
            <HotRateByChannel data={data.hotRateByChannelData} />
          )}
          
          {features.includes('timeToHot') && data.timeToHotData && (
            <TimeToHotMetrics data={data.timeToHotData} />
          )}
        </div>
        
        {features.includes('hotRateByTopic') && data.hotRateByTopicData && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Hot Rate by AI-Identified Topics</h3>
            <div className="space-y-2">
              {data.hotRateByTopicData.map((topic, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded min-w-0">
                  <span className="text-sm text-gray-700 truncate flex-1">{topic.topic}</span>
                  <span className="text-sm font-medium text-orange-600 flex-shrink-0">{topic.hotRate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {features.includes('hotLeadFunnel') && data.funnelData && (
          <HotLeadFunnel data={data.funnelData} />
        )}
        
        {features.includes('optimizationTips') && data.optimizationTips && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 w-full min-w-0">
            <h4 className="font-medium text-orange-900 mb-2">Optimization Recommendations</h4>
            <ul className="space-y-1">
              {data.optimizationTips.map((tip, i) => (
                <li key={i} className="text-sm text-orange-800 flex items-start">
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

// Updated MetricCard Component with mobile optimization
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
      {/* Show lock icon for restricted users */}
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
      
      {/* Show lock icon for restricted users */}
      {!canAccessDetailed && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Upgrade Prompt Component for when users click on locked cards
const UpgradePrompt = ({ metricName, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop */}
    <div 
      className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    />
    
    {/* Modal */}
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
  const baseData = {
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
    ],
    topSalespersons: [
      { id: '1', name: 'Sarah Johnson', totalLeads: 87, avatar: '👩‍💼' },
      { id: '2', name: 'Mike Chen', totalLeads: 73, avatar: '👨‍💼' },
      { id: '3', name: 'Emily Davis', totalLeads: 65, avatar: '👩‍💼' },
      { id: '4', name: 'Robert Smith', totalLeads: 52, avatar: '👨‍💼' },
      { id: '5', name: 'Lisa Wang', totalLeads: 48, avatar: '👩‍💼' }
    ],
    recentSignups: Array.from({ length: 10 }, (_, i) => ({
      id: `lead-${i}`,
      name: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Tom Wilson', 
             'Emma Davis', 'Chris Lee', 'Sara White', 'Mark Taylor', 'Amy Clark'][i],
      email: `lead${i}@example.com`,
      signupDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: ['Website', 'Paid Ads', 'Referral', 'Cold Outreach', 'Social Media'][Math.floor(Math.random() * 5)]
    }))
  };

  // Add specific data for weekly leads
  if (metricType === 'weeklyLeads') {
    return {
      ...baseData,
      weeklyTrendData: Array.from({ length: 8 }, (_, i) => ({
        weekStartDate: new Date(Date.now() - (7 - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currentWeekLeads: Math.floor(Math.random() * 50) + 100,
        previousWeekLeads: Math.floor(Math.random() * 50) + 90,
        growthPercentage: Math.floor(Math.random() * 40) - 20
      })),
      weeklySourceData: Array.from({ length: 4 }, (_, i) => ({
        weekStartDate: new Date(Date.now() - (3 - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sources: [
          { name: 'Website', count: Math.floor(Math.random() * 30) + 20 },
          { name: 'Paid Ads', count: Math.floor(Math.random() * 25) + 15 },
          { name: 'Referral', count: Math.floor(Math.random() * 20) + 10 },
          { name: 'Cold Outreach', count: Math.floor(Math.random() * 15) + 5 },
          { name: 'Social Media', count: Math.floor(Math.random() * 10) + 5 }
        ]
      })),
      avgHotRate: 15.2,
      totalHotLeads: 125,
      bestWeek: 'Week 3',
      weeklyInsights: "Last week saw a 15% increase in leads, driven primarily by increased organic search traffic. Paid ads conversion dropped slightly, requiring campaign optimization."
    };
  }

  // Add specific data for hot lead rate
  if (metricType === 'hotLeadRate') {
    return {
      ...baseData,
      hotRateTrendData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hotRate: Math.random() * 10 + 10 // 10-20% range
      })),
      targetHotRate: 15,
      hotRateByChannelData: [
        { channel: 'Website', hotRate: 0.18 },
        { channel: 'Paid Ads', hotRate: 0.12 },
        { channel: 'Referral', hotRate: 0.22 },
        { channel: 'Cold Outreach', hotRate: 0.08 },
        { channel: 'Social Media', hotRate: 0.14 }
      ],
      hotRateByTopicData: [
        { topic: 'Pricing Inquiry', hotRate: 25.5 },
        { topic: 'Demo Request', hotRate: 22.3 },
        { topic: 'Feature Question', hotRate: 12.8 },
        { topic: 'General Info', hotRate: 8.2 },
        { topic: 'Support Issue', hotRate: 5.1 }
      ],
      timeToHotData: {
        avgMinutes: 135,
        medianMinutes: 90,
        distribution: [
          { range: '< 1 hour', percentage: 35 },
          { range: '1-2 hours', percentage: 30 },
          { range: '2-4 hours', percentage: 20 },
          { range: '> 4 hours', percentage: 15 }
        ]
      },
      funnelData: [
        { stage: 'Initial Contact', count: 500, conversionToNext: 60 },
        { stage: 'Qualified Response', count: 300, conversionToNext: 50 },
        { stage: 'Strong Interest', count: 150, conversionToNext: 80 },
        { stage: 'Hot Lead', count: 120 }
      ],
      optimizationTips: [
        "Paid Ads channel shows 5% lower hot rate than average - consider campaign optimization",
        "Leads asking about pricing convert to hot 2x faster - emphasize pricing transparency",
        "Weekend leads take 40% longer to become hot - consider staffing adjustments"
      ]
    };
  }

  // Add specific data for active leads
  if (metricType === 'activeLeads') {
    return {
      trendData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 30) + 40
      })),
      stageData: [
        { source: 'AI Engaged', count: 45, color: '#3B82F6' },
        { source: 'Sales Follow-up', count: 32, color: '#10B981' },
        { source: 'Pending Info', count: 18, color: '#F59E0B' },
        { source: 'Scheduling', count: 12, color: '#8B5CF6' }
      ],
      ownerData: [
        { source: 'AI Bot', count: 45, color: '#3B82F6' },
        { source: 'Sarah J.', count: 28, color: '#10B981' },
        { source: 'Mike C.', count: 22, color: '#F59E0B' },
        { source: 'Emily D.', count: 12, color: '#8B5CF6' }
      ],
      stagnantLeads: [
        { leadId: '1', name: 'John Smith', currentStatus: 'AI Engaged', assignedTo: 'AI', lastInteraction: '2024-01-05', daysStagnant: 8 },
        { leadId: '2', name: 'Jane Doe', currentStatus: 'Sales Follow-up', assignedTo: 'Mike Chen', lastInteraction: '2024-01-01', daysStagnant: 12 },
        { leadId: '3', name: 'Bob Wilson', currentStatus: 'Pending Info', assignedTo: 'Sarah J.', lastInteraction: '2024-01-03', daysStagnant: 10 }
      ]
    };
  }

  // Add specific data for completed leads
  if (metricType === 'completedLeads') {
    return {
      trendData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 10
      })),
      outcomeData: [
        { status: 'Converted to Customer', count: 125 },
        { status: 'Disqualified', count: 89 },
        { status: 'Archived', count: 45 },
        { status: 'Long-Term Nurture', count: 31 }
      ],
      disqualificationReasons: [
        { reason: 'Not a good fit', count: 35 },
        { reason: 'No budget', count: 28 },
        { reason: 'Bad timing', count: 18 },
        { reason: 'Went with competitor', count: 8 }
      ],
      avgCompletionTime: 15.3
    };
  }

  // Add specific data for messages sent
  if (metricType === 'messagesSent') {
    return {
      trendData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 200
      })),
      messageTypeData: [
        { source: 'Initial Outreach', count: 450, color: '#3B82F6' },
        { source: 'Follow-up', count: 320, color: '#10B981' },
        { source: 'Qualification', count: 180, color: '#F59E0B' },
        { source: 'Nurture', count: 150, color: '#8B5CF6' }
      ],
      deliveryStats: [
        { label: 'Total Sent', value: '1,100' },
        { label: 'Delivered', value: '1,056', percentage: 96 },
        { label: 'Failed', value: '44', percentage: 4 },
        { label: 'Opened', value: '423', percentage: 40 }
      ],
      engagementData: [
        { type: 'Initial Outreach', rate: 0.35 },
        { type: 'Follow-up', rate: 0.42 },
        { type: 'Qualification', rate: 0.58 },
        { type: 'Nurture', rate: 0.28 }
      ]
    };
  }

  // Add specific data for messages received
  if (metricType === 'messagesReceived') {
    return {
      trendData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 80) + 120
      })),
      sourceData: [
        { source: 'Web Chat', count: 245, color: '#3B82F6' },
        { source: 'Email', count: 189, color: '#10B981' },
        { source: 'SMS', count: 156, color: '#F59E0B' },
        { source: 'Phone', count: 78, color: '#8B5CF6' }
      ],
      topIntents: [
        { intent: 'Pricing Inquiry', count: 156 },
        { intent: 'Demo Request', count: 128 },
        { intent: 'Technical Support', count: 89 },
        { intent: 'Feature Question', count: 67 },
        { intent: 'General Info', count: 45 }
      ],
      sentimentData: [
        { sentiment: 'Positive', count: 367 },
        { sentiment: 'Neutral', count: 245 },
        { sentiment: 'Negative', count: 56 }
      ],
      unhandledMessages: [
        { messageId: 'msg-001', content: 'Can your AI integrate with our custom CRM that uses...', date: '2024-01-12', confidence: 0.32 },
        { messageId: 'msg-002', content: 'We need a solution that handles both B2B and B2C...', date: '2024-01-11', confidence: 0.45 },
        { messageId: 'msg-003', content: 'What about GDPR compliance for European customers...', date: '2024-01-10', confidence: 0.28 }
      ]
    };
  }

  return baseData;
};

// Main Component
export default function OverviewMetrics({ userId = null }) {
  const { user, currentPlan } = useAuth();
  
  // Get AI Control Room access level from plan
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  console.log('📊 OverviewMetrics Access:', {
    currentPlan,
    controlRoomAccess,
    canAccessDetailedAnalytics
  });
  
  // Single state for managing all modals
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

  // Handle metric card click with plan gating
  const handleMetricClick = (metricType, metricName) => {
    if (!canAccessDetailedAnalytics) {
      // Show upgrade prompt for basic users
      setUpgradePromptMetric(metricName);
      setShowUpgradePrompt(true);
      return;
    }
    
    // Open detailed modal for advanced users
    openModal(metricType);
  };

  // Handle modal opening
  const openModal = async (metricType) => {
    setActiveModal(metricType);
    setLoadingModal(true);
    setModalData(null);
    
    try {
      console.log(`🔍 Fetching detailed data for ${metricType}`);
      const data = await fetchDetailedMetrics(user.tenant_id, metricType, selectedPeriod);
      console.log(`📊 Detailed data returned for ${metricType}:`, data);
      setModalData(data);
      
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateMockData(metricType));
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
        const data = await fetchDetailedMetrics(user.tenant_id, userId, activeModal, newPeriod);
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
        
        console.log('🔍 Fetching overview metrics from database for tenant:', user.tenant_id);
        const data = await fetchOverviewMetrics(user.tenant_id, userId, '30days');
        console.log('📊 Database Response:', data);

        setMetrics(data);
        
      } catch (error) {
        console.error('❌ Error fetching overview metrics:', error);
        setError(error.message);
        
        // Set fallback metrics
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
  }, [user, userId]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {/* Mobile Loading */}
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
        
        {/* Desktop Loading */}
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

  // Define metric data with icons for mobile
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
      {/* Mobile Layout */}
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

      {/* Desktop Layout */}
      <div className="hidden lg:block w-full">
        <div className="space-y-6">
          {/* Row 1 */}
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

          {/* Row 2 */}
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

      {/* Upgrade Prompt Modal for Basic Users */}
      {showUpgradePrompt && (
        <UpgradePrompt 
          metricName={upgradePromptMetric}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}

      {/* Single Modal that changes content based on activeModal */}
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