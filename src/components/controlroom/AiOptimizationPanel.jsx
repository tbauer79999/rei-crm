import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFeatureValue } from '../../lib/plans';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, Legend,
  AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  X, TrendingUp, Users, Calendar, Clock, Filter, AlertTriangle,
  BarChart3, Activity, Target, ArrowRight, Upload, Shuffle,
  MessageSquare, Brain, ThumbsDown, UserCheck, Zap, Lock
} from 'lucide-react';

// Edge Function URL - Updated to use unified analytics endpoint
const buildApiUrl = (component, tenantId, period = '30days') => {
  return `https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/sync_sales_metrics?action=fetch&component=${component}&tenant_id=${tenantId}&period=${period}`;
};

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f97316', '#14b8a6', '#f43f5e', '#8b5cf6', '#ef4444'];

// Modal configuration for each card
const MODAL_CONFIG = {
  sentimentBreakdown: {
    title: 'Conversation Sentiment Analysis',
    subtitle: 'Detailed sentiment patterns across all AI conversations',
    icon: Brain,
    iconColor: 'text-blue-600',
    features: ['sentimentChart', 'sentimentTrend', 'sentimentByTopic', 'negativeConversations']
  },
  timeToHot: {
    title: 'AI Qualification Efficiency Analysis',
    subtitle: 'Time and message metrics for lead qualification',
    icon: Clock,
    iconColor: 'text-green-600',
    features: ['efficiencyTrend', 'timeDistribution', 'messageDistribution', 'efficiencyByTopic']
  },
  highIntentKeywords: {
    title: 'High Intent Keyword Analysis',
    subtitle: 'Keywords that signal strong purchase intent',
    icon: Zap,
    iconColor: 'text-yellow-600',
    features: ['keywordCloud', 'keywordTrend', 'keywordConversion', 'keywordConversations']
  },
  hotTriggerPhrases: {
    title: 'Hot Lead Trigger Phrase Performance',
    subtitle: 'Phrases that directly indicate hot lead status',
    icon: Target,
    iconColor: 'text-red-600',
    features: ['phraseFrequency', 'phraseEffectiveness', 'phraseTrend', 'phraseConversations']
  },
  optOutReasons: {
    title: 'Conversation Opt-Out Analysis',
    subtitle: 'Understanding why leads disengage from AI conversations',
    icon: ThumbsDown,
    iconColor: 'text-orange-600',
    features: ['optOutDistribution', 'optOutTrend', 'optOutByReason', 'optOutConversations']
  },
  manualOverrides: {
    title: 'AI Manual Override & Escalation Log',
    subtitle: 'Human interventions and corrections to AI actions',
    icon: UserCheck,
    iconColor: 'text-purple-600',
    features: ['overrideTrend', 'overrideTypes', 'overridesByUser', 'overrideLog']
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

// Sentiment Distribution Chart
const SentimentChart = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Brain className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-blue-600" />
        <span className="truncate">Overall Sentiment Distribution</span>
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
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} conversations`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Sentiment Trend Chart
const SentimentTrendChart = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Sentiment Trend Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            fontSize={10}
          />
          <YAxis tickFormatter={(value) => `${value}%`} fontSize={10} />
          <Tooltip 
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value) => [`${value}%`, '']}
          />
          <Area type="monotone" dataKey="positive" stackId="1" stroke="#10b981" fill="#10b981" />
          <Area type="monotone" dataKey="neutral" stackId="1" stroke="#fbbf24" fill="#fbbf24" />
          <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Negative Conversations Table
const NegativeConversationsTable = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5 mr-2 text-red-600" />
        <span className="truncate">Recent Negative Conversations</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Conversation Snippet</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Sentiment Score</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.map((conv) => (
              <tr key={conv.conversationId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{conv.leadName}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">
                  <span className="line-clamp-2">{conv.snippet}</span>
                </td>
                <td className="py-3 px-2 lg:px-4">
                  <span className="inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {conv.sentimentScore.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">
                  {new Date(conv.timestamp).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Efficiency Trend Chart
const EfficiencyTrendChart = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Average Time & Messages to Hot Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            fontSize={10}
          />
          <YAxis yAxisId="left" fontSize={10} />
          <YAxis yAxisId="right" orientation="right" fontSize={10} />
          <Tooltip 
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <Bar yAxisId="left" dataKey="avgMessages" fill="#3b82f6" />
          <Line yAxisId="right" type="monotone" dataKey="avgTimeMinutes" stroke="#10b981" strokeWidth={2} />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Keyword Trend Chart
const KeywordTrendChart = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Keyword Frequency Trend</h3>
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
          />
          {Object.keys(data[0] || {}).filter(key => key !== 'date').map((keyword, index) => (
            <Line 
              key={keyword}
              type="monotone" 
              dataKey={keyword} 
              stroke={COLORS[index % COLORS.length]} 
              strokeWidth={2}
            />
          ))}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Override Log Table
const OverrideLogTable = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Manual Override Log</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Lead Name</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Override Type</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Reason</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Overridden By</th>
              <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.map((override) => (
              <tr key={override.overrideId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{override.leadName}</td>
                <td className="py-3 px-2 lg:px-4">
                  <span className="inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {override.action}
                  </span>
                </td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{override.reason}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">{override.overriddenBy}</td>
                <td className="py-3 px-2 lg:px-4 text-sm text-gray-600">
                  {new Date(override.timestamp).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Modal Content Component
const AiOptimizationModalContent = ({ modalType, data, selectedPeriod, onPeriodChange }) => {
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const config = MODAL_CONFIG[modalType];
  
  if (!config) return null;

  const { features } = config;

  return (
    <>
      <TimePeriodSelector 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={onPeriodChange}
      />
      
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 w-full min-w-0">
        {/* Sentiment Breakdown features */}
        {features.includes('sentimentChart') && data.sentimentDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <SentimentChart data={data.sentimentDistribution} />
            {features.includes('sentimentTrend') && data.sentimentTrend && (
              <SentimentTrendChart data={data.sentimentTrend} />
            )}
          </div>
        )}
        
        {features.includes('sentimentByTopic') && data.sentimentByTopic && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Sentiment by Topic</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.sentimentByTopic}>
                <XAxis dataKey="topic" fontSize={10} />
                <YAxis tickFormatter={(value) => `${value}%`} fontSize={10} />
                <Tooltip />
                <Bar dataKey="positive" fill="#10b981" />
                <Bar dataKey="negative" fill="#ef4444" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('negativeConversations') && data.negativeConversations && (
          <NegativeConversationsTable data={data.negativeConversations} />
        )}
        
        {/* Time to Hot features */}
        {features.includes('efficiencyTrend') && data.efficiencyTrend && (
          <EfficiencyTrendChart data={data.efficiencyTrend} />
        )}
        
        {features.includes('timeDistribution') && data.timeDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Distribution of Time to Hot</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.timeDistribution}>
                  <XAxis dataKey="bin" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {features.includes('messageDistribution') && data.messageDistribution && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Distribution of Messages to Hot</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.messageDistribution}>
                    <XAxis dataKey="bin" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        
        {features.includes('efficiencyByTopic') && data.efficiencyByTopic && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Qualification Efficiency by Topic</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Topic</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Avg Messages</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Avg Time (min)</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.efficiencyByTopic.map((topic, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{topic.topic}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{topic.avgMessages}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{topic.avgTime}</td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          topic.successRate >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(topic.successRate * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* High Intent Keywords features */}
        {features.includes('keywordCloud') && data.topKeywords && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Top High Intent Keywords</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topKeywords}>
                <XAxis dataKey="keyword" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('keywordTrend') && data.keywordTrend && (
          <KeywordTrendChart data={data.keywordTrend} />
        )}
        
        {features.includes('keywordConversion') && data.keywordConversion && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Hot Lead Rate by Keyword</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Keyword</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Conversations</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Hot Rate</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keywordConversion.map((kw, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{kw.keyword}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{kw.conversations}</td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          kw.hotRate >= 0.5 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(kw.hotRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className={`text-sm font-medium ${
                          kw.trend > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {kw.trend > 0 ? '+' : ''}{kw.trend}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Hot Trigger Phrases features */}
        {features.includes('phraseFrequency') && data.topPhrases && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Top Hot Trigger Phrases</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topPhrases} layout="horizontal">
                <XAxis type="number" fontSize={10} />
                <YAxis dataKey="phrase" type="category" width={120} fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('phraseEffectiveness') && data.phraseEffectiveness && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Trigger Phrase Effectiveness</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Trigger Phrase</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Frequency</th>
                    <th className="text-right py-3 px-2 lg:px-4 text-sm font-medium text-gray-700">Hot Lead Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.phraseEffectiveness.map((phrase, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 lg:px-4 text-sm font-medium text-gray-900">{phrase.phrase}</td>
                      <td className="py-3 px-2 lg:px-4 text-sm text-gray-600 text-right">{phrase.frequency}</td>
                      <td className="py-3 px-2 lg:px-4 text-right">
                        <span className="inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {(phrase.conversionRate * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Opt-Out features */}
        {features.includes('optOutDistribution') && data.optOutReasons && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Opt-Out Reasons Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={data.optOutReasons} 
                  dataKey="count" 
                  nameKey="reason" 
                  outerRadius={80}
                  label={({ reason, percent }) => `${reason}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.optOutReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('optOutTrend') && data.optOutTrend && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Opt-Out Rate Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.optOutTrend}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  fontSize={10}
                />
                <YAxis tickFormatter={(value) => `${value}%`} fontSize={10} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [`${value}%`, 'Opt-out Rate']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Manual Overrides features */}
        {features.includes('overrideTrend') && data.overrideTrend && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Manual Overrides Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.overrideTrend}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  fontSize={10}
                />
                <YAxis fontSize={10} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {features.includes('overrideTypes') && data.overrideTypes && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Override Type Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie 
                    data={data.overrideTypes} 
                    dataKey="count" 
                    nameKey="type" 
                    outerRadius={60}
                    label
                  >
                    {data.overrideTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {features.includes('overridesByUser') && data.overridesByUser && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 w-full min-w-0">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 truncate">Overrides by Salesperson</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.overridesByUser}>
                    <XAxis dataKey="user" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        
        {features.includes('overrideLog') && data.overrideLog && (
          <OverrideLogTable data={data.overrideLog} />
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
const MobileCard = ({ title, subtitle, onClick, children, icon: Icon, trend, canAccessDetailed = true }) => {
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
          Unlock detailed AI optimization insights, sentiment analysis, and conversation analytics with a plan upgrade.
        </p>
        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <p>✓ Advanced sentiment analysis</p>
          <p>✓ Keyword performance tracking</p>
          <p>✓ Hot trigger phrase analytics</p>
          <p>✓ AI optimization insights</p>
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
  if (modalType === 'sentimentBreakdown') {
    return {
      sentimentDistribution: [
        { name: 'Positive', value: 245 },
        { name: 'Neutral', value: 89 },
        { name: 'Negative', value: 56 }
      ],
      sentimentTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        positive: Math.floor(Math.random() * 20) + 60,
        neutral: Math.floor(Math.random() * 10) + 20,
        negative: Math.floor(Math.random() * 10) + 10
      })),
      sentimentByTopic: [
        { topic: 'Pricing', positive: 65, negative: 15 },
        { topic: 'Features', positive: 78, negative: 8 },
        { topic: 'Support', positive: 45, negative: 25 },
        { topic: 'Integration', positive: 72, negative: 12 }
      ],
      negativeConversations: [
        { conversationId: '1', leadName: 'John Smith', snippet: 'This is too expensive for what it offers...', sentimentScore: -0.85, timestamp: new Date().toISOString() },
        { conversationId: '2', leadName: 'Jane Doe', snippet: 'I had a terrible experience with support...', sentimentScore: -0.92, timestamp: new Date().toISOString() },
        { conversationId: '3', leadName: 'Bob Wilson', snippet: 'The integration process is confusing...', sentimentScore: -0.78, timestamp: new Date().toISOString() }
      ]
    };
  }

  if (modalType === 'timeToHot') {
    return {
      efficiencyTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgMessages: Math.floor(Math.random() * 5) + 3,
        avgTimeMinutes: Math.floor(Math.random() * 30) + 15
      })),
      timeDistribution: [
        { bin: '0-5 min', count: 45 },
        { bin: '5-15 min', count: 78 },
        { bin: '15-30 min', count: 92 },
        { bin: '30-60 min', count: 56 },
        { bin: '60+ min', count: 23 }
      ],
      messageDistribution: [
        { bin: '1-3 msg', count: 67 },
        { bin: '4-6 msg', count: 89 },
        { bin: '7-10 msg', count: 45 },
        { bin: '10+ msg', count: 23 }
      ],
      efficiencyByTopic: [
        { topic: 'Pricing Inquiry', avgMessages: 3.2, avgTime: 12, successRate: 0.85 },
        { topic: 'Demo Request', avgMessages: 2.8, avgTime: 8, successRate: 0.92 },
        { topic: 'Feature Questions', avgMessages: 5.6, avgTime: 25, successRate: 0.68 },
        { topic: 'Integration Help', avgMessages: 4.3, avgTime: 18, successRate: 0.75 }
      ]
    };
  }

  if (modalType === 'highIntentKeywords') {
    const keywords = ['pricing', 'demo', 'integration', 'trial', 'enterprise'];
    return {
      topKeywords: keywords.map(kw => ({ 
        keyword: kw, 
        count: Math.floor(Math.random() * 100) + 50,
        trend: Math.floor(Math.random() * 20) - 10
      })),
      keywordTrend: Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const data = { date };
        keywords.forEach(kw => {
          data[kw] = Math.floor(Math.random() * 20) + 10;
        });
        return data;
      }),
      keywordConversion: keywords.map(kw => ({
        keyword: kw,
        conversations: Math.floor(Math.random() * 200) + 100,
        hotRate: Math.random() * 0.5 + 0.3,
        trend: Math.floor(Math.random() * 20) - 10
      }))
    };
  }

  if (modalType === 'hotTriggerPhrases') {
    return {
      topPhrases: [
        { phrase: 'What\'s the price?', count: 145 },
        { phrase: 'Can I see a demo?', count: 123 },
        { phrase: 'How does integration work?', count: 98 },
        { phrase: 'Do you have enterprise plans?', count: 87 },
        { phrase: 'What\'s included in the trial?', count: 76 }
      ],
      phraseEffectiveness: [
        { phrase: 'What\'s the price?', frequency: 145, conversionRate: 0.82 },
        { phrase: 'Can I see a demo?', frequency: 123, conversionRate: 0.91 },
        { phrase: 'How does integration work?', frequency: 98, conversionRate: 0.75 },
        { phrase: 'Do you have enterprise plans?', frequency: 87, conversionRate: 0.88 }
      ],
      phraseTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        detections: Math.floor(Math.random() * 50) + 20
      }))
    };
  }

  if (modalType === 'optOutReasons') {
    return {
      optOutReasons: [
        { reason: 'Not Interested', count: 125 },
        { reason: 'Already Solved', count: 89 },
        { reason: 'Too Expensive', count: 67 },
        { reason: 'Went with Competitor', count: 45 },
        { reason: 'Bad Timing', count: 34 }
      ],
      optOutTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rate: Math.random() * 5 + 10
      })),
      optOutByReason: [
        { reason: 'Not Interested', trend: 'increasing', weeklyChange: '+5%' },
        { reason: 'Too Expensive', trend: 'stable', weeklyChange: '+1%' },
        { reason: 'Bad Timing', trend: 'decreasing', weeklyChange: '-3%' }
      ]
    };
  }

  if (modalType === 'manualOverrides') {
    return {
      overrideTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10) + 5
      })),
      overrideTypes: [
        { type: 'Status Change', count: 45 },
        { type: 'Response Correction', count: 32 },
        { type: 'Escalation', count: 28 },
        { type: 'Data Update', count: 15 }
      ],
      overridesByUser: [
        { user: 'Sarah Johnson', count: 35 },
        { user: 'Mike Chen', count: 28 },
        { user: 'Lisa Brown', count: 22 },
        { user: 'Tom Wilson', count: 18 }
      ],
      overrideLog: [
        { overrideId: '1', leadName: 'John Smith', action: 'Status Change', reason: 'Explicitly asked for demo', overriddenBy: 'Sarah Johnson', timestamp: new Date().toISOString() },
        { overrideId: '2', leadName: 'Jane Doe', action: 'Response Correction', reason: 'Misunderstood intent', overriddenBy: 'Mike Chen', timestamp: new Date().toISOString() },
        { overrideId: '3', leadName: 'Bob Wilson', action: 'Escalation', reason: 'Complex technical question', overriddenBy: 'Lisa Brown', timestamp: new Date().toISOString() }
      ]
    };
  }

  return {};
};

export default function AiOptimizationPanel() {
  const { user, currentPlan } = useAuth();
  
  // Get AI Control Room access level from plan
  const controlRoomAccess = getFeatureValue(currentPlan, 'aiControlRoomAccess');
  const canAccessDetailedAnalytics = controlRoomAccess === 'full' || controlRoomAccess === 'team_metrics';

  console.log('🤖 AiOptimizationPanel Access:', {
    currentPlan,
    controlRoomAccess,
    canAccessDetailedAnalytics
  });

  // State management
  const [aiData, setAiData] = useState({
    sentimentBreakdown: { positive: 65, neutral: 20, negative: 15 },
    timeToHot: { avgMessages: 0, avgTimeHours: 0, fastestMessages: 0, fastestTimeMinutes: 0 },
    keywords: [],
    hotTriggerPhrases: [],
    optOutReasons: [],
    manualOverrides: { last7Days: 12, thisMonth: 43, allTime: 184 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      const detailUrl = buildApiUrl(`ai_${modalType}`, user.tenant_id, selectedPeriod);
      console.log(`🔍 Calling detailed endpoint: ${detailUrl}`);
      
      const data = await callEdgeFunction(detailUrl);
      console.log(`🤖 Detailed data returned for ${modalType}:`, data);
      
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
        const detailUrl = buildApiUrl(`ai_${activeModal}`, user.tenant_id, newPeriod);
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
      console.log('No active user or tenant_id found, skipping fetch for AiOptimizationPanel.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = buildApiUrl('ai_optimization', user.tenant_id, '30days');
        console.log('🔍 Fetching AI optimization data from:', apiUrl);
        const data = await callEdgeFunction(apiUrl);
        console.log('🤖 Raw API Response:', data);

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid API response format');
        }

        if (data.error) {
          throw new Error(data.error.details || data.error || 'API returned an error');
        }

        setAiData({
          sentimentBreakdown: data.sentimentBreakdown || { positive: 65, neutral: 20, negative: 15 },
          timeToHot: data.hotSummary?.metrics || {
            avgMessages: 0,
            avgTimeHours: 0,
            fastestMessages: 0,
            fastestTimeMinutes: 0
          },
          keywords: data.keywords || [],
          hotTriggerPhrases: data.hotSummary?.triggerPhrases || [],
          optOutReasons: data.hotSummary?.optOutReasons || [],
          manualOverrides: data.manualOverrides || { last7Days: 12, thisMonth: 43, allTime: 184 }
        });

      } catch (error) {
        console.error('❌ Error fetching AI optimization data:', error);
        setError(error.message);
        
        // Set default data on error
        setAiData({
          sentimentBreakdown: { positive: 65, neutral: 20, negative: 15 },
          timeToHot: { avgMessages: 0, avgTimeHours: 0, fastestMessages: 0, fastestTimeMinutes: 0 },
          keywords: [],
          hotTriggerPhrases: [],
          optOutReasons: [],
          manualOverrides: { last7Days: 12, thisMonth: 43, allTime: 184 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Show loading or auth state
  if (!user) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="bg-white p-6 rounded shadow">
          <div className="text-center text-gray-500">
            Please log in to view AI optimization data
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {/* Mobile Loading */}
        <div className="lg:hidden space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-3 rounded-xl shadow border min-w-0">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-4 rounded shadow">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
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
        <p className="text-red-600 font-medium">Failed to load AI optimization data</p>
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

  const { sentimentBreakdown, timeToHot, keywords, hotTriggerPhrases, optOutReasons, manualOverrides } = aiData;

  // Convert sentiment object to array for pie chart
  const sentimentData = [
    { name: 'Positive', value: sentimentBreakdown.positive },
    { name: 'Neutral', value: sentimentBreakdown.neutral },
    { name: 'Negative', value: sentimentBreakdown.negative }
  ];

  return (
    <>
      <div className="w-full min-w-0">
        {/* Mobile Layout */}
        <div className="lg:hidden w-full min-w-0">
          <div className="space-y-3">
            {/* Sentiment Breakdown */}
            <MobileCard
              title="Sentiment Breakdown"
              subtitle="Percentage of all AI conversations by tone"
              onClick={() => handleCardClick('sentimentBreakdown', 'Sentiment Analysis')}
              icon={Brain}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie 
                    data={sentimentData} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={40}
                    label={false}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </MobileCard>

            {/* Time & Messages to Hot */}
            <MobileCard
              title="Time & Messages to Hot"
              subtitle="Average effort required to surface a hot lead"
              onClick={() => handleCardClick('timeToHot', 'AI Qualification Efficiency')}
              icon={Clock}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Avg. Messages:</span>
                  <span className="font-medium">{timeToHot.avgMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Time:</span>
                  <span className="font-medium">{
                    timeToHot.avgTimeHours >= 24 
                      ? `${Math.floor(timeToHot.avgTimeHours / 24)}d ${timeToHot.avgTimeHours % 24}h`
                      : `${timeToHot.avgTimeHours}h`
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span>Fastest:</span>
                  <span className="font-medium">{timeToHot.fastestMessages} msg, {
                    timeToHot.fastestTimeMinutes >= 1440 
                      ? `${Math.floor(timeToHot.fastestTimeMinutes / 1440)}d`
                      : timeToHot.fastestTimeMinutes >= 60 
                        ? `${Math.floor(timeToHot.fastestTimeMinutes / 60)}h`
                        : `${timeToHot.fastestTimeMinutes}m`
                  }</span>
                </div>
              </div>
            </MobileCard>

            {/* High Intent Keywords */}
            <MobileCard
              title="High-Intent Keywords"
              subtitle="From inbound lead messages"
              onClick={() => handleCardClick('highIntentKeywords', 'High Intent Keywords')}
              icon={Zap}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <div className="flex flex-wrap gap-1">
                {keywords.slice(0, 6).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200 text-xs"
                  >
                    {kw}
                  </span>
                ))}
                {keywords.length > 6 && (
                  <span className="px-2 py-1 text-xs text-gray-500">+{keywords.length - 6} more</span>
                )}
              </div>
            </MobileCard>

            {/* Hot Trigger Phrases */}
            <MobileCard
              title="Hot Trigger Phrases"
              subtitle="Most common phrases said just before becoming a hot lead"
              onClick={() => handleCardClick('hotTriggerPhrases', 'Hot Trigger Phrases')}
              icon={Target}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <div className="text-sm space-y-1">
                {hotTriggerPhrases.slice(0, 3).map((phrase, idx) => (
                  <div key={idx} className="flex items-center truncate">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span className="truncate">"{phrase}"</span>
                  </div>
                ))}
                {hotTriggerPhrases.length > 3 && (
                  <div className="text-gray-500 ml-4 text-xs">+{hotTriggerPhrases.length - 3} more phrases</div>
                )}
              </div>
            </MobileCard>

            {/* Opt-Out Reasons */}
            <MobileCard
              title="Opt-Out Reasons"
              subtitle="Top reasons leads stop engaging"
              onClick={() => handleCardClick('optOutReasons', 'Opt-Out Analysis')}
              icon={ThumbsDown}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <div className="text-sm space-y-1">
                {optOutReasons.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2 flex-shrink-0"></span>
                      <span className="truncate">{item.reason}</span>
                    </div>
                    <span className="text-gray-400 font-medium flex-shrink-0">{item.count}</span>
                  </div>
                ))}
                {optOutReasons.length === 0 && (
                  <div className="text-gray-400 italic text-xs">No opt-out data yet</div>
                )}
              </div>
            </MobileCard>

            {/* Manual Overrides */}
            <MobileCard
              title="Manual Overrides"
              subtitle="Total times a human stepped in or adjusted AI conversation"
              onClick={() => handleCardClick('manualOverrides', 'Manual Overrides')}
              icon={UserCheck}
              canAccessDetailed={canAccessDetailedAnalytics}
            >
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Last 7 Days:</span>
                  <span className="font-medium">{manualOverrides.last7Days}</span>
                </div>
                <div className="flex justify-between">
                  <span>This Month:</span>
                  <span className="font-medium">{manualOverrides.thisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span>All-Time:</span>
                  <span className="font-medium">{manualOverrides.allTime}</span>
                </div>
              </div>
            </MobileCard>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block w-full">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sentiment Breakdown - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('sentimentBreakdown', 'Sentiment Analysis')}
              >
                <h3 className="text-lg font-semibold mb-1">Sentiment Breakdown</h3>
                <p className="text-sm text-gray-500 mb-4">Percentage of all AI conversations by tone</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie 
                      data={sentimentData} 
                      dataKey="value" 
                      nameKey="name" 
                      outerRadius={60}
                      label={false}
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 text-center mt-2">Click for detailed analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Time & Messages to Hot - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('timeToHot', 'AI Qualification Efficiency')}
              >
                <h3 className="text-lg font-semibold mb-1">Time & Messages to Hot</h3>
                <p className="text-sm text-gray-500 mb-4">Average effort required to surface a hot lead</p>
                <ul className="text-sm space-y-2">
                  <li><strong>Avg. Messages:</strong> {timeToHot.avgMessages}</li>
                  <li><strong>Avg. Time:</strong> {
                    timeToHot.avgTimeHours >= 24 
                      ? `${Math.floor(timeToHot.avgTimeHours / 24)} days ${timeToHot.avgTimeHours % 24} hrs`
                      : `${timeToHot.avgTimeHours} hrs`
                  }</li>
                  <li><strong>Fastest Hot Lead:</strong> {timeToHot.fastestMessages} messages, {
                    timeToHot.fastestTimeMinutes >= 1440 
                      ? `${Math.floor(timeToHot.fastestTimeMinutes / 1440)} days`
                      : timeToHot.fastestTimeMinutes >= 60 
                        ? `${Math.floor(timeToHot.fastestTimeMinutes / 60)} hrs ${timeToHot.fastestTimeMinutes % 60} min`
                        : `${timeToHot.fastestTimeMinutes} min`
                  }</li>
                </ul>
                <p className="text-xs text-gray-400 text-center mt-4">Click for efficiency analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* High Intent Keywords - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('highIntentKeywords', 'High Intent Keywords')}
              >
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" /> High-Intent Keywords
                </h3>
                <p className="text-sm text-gray-500 mb-3">From inbound lead messages</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200 text-sm"
                    >
                      {kw}
                    </span>
                  ))}
                  {keywords.length > 6 && (
                    <span className="px-2 py-1 text-sm text-gray-500">+{keywords.length - 6} more</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 text-center mt-4">Click for keyword analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hot Trigger Phrases - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('hotTriggerPhrases', 'Hot Trigger Phrases')}
              >
                <h3 className="text-lg font-semibold mb-2">Hot Trigger Phrases</h3>
                <p className="text-sm text-gray-500 mb-3">Most common phrases said just before becoming a hot lead</p>
                <ul className="text-sm space-y-1">
                  {hotTriggerPhrases.slice(0, 4).map((phrase, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      "{phrase}"
                    </li>
                  ))}
                  {hotTriggerPhrases.length > 4 && (
                    <li className="text-gray-500 ml-4">+{hotTriggerPhrases.length - 4} more phrases</li>
                  )}
                </ul>
                <p className="text-xs text-gray-400 text-center mt-4">Click for phrase performance</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Opt-Out Reasons - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('optOutReasons', 'Opt-Out Analysis')}
              >
                <h3 className="text-lg font-semibold mb-2">Opt-Out Reasons</h3>
                <p className="text-sm text-gray-500 mb-3">Top reasons leads stop engaging</p>
                <ul className="text-sm space-y-2">
                  {optOutReasons.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                        {item.reason}
                      </span>
                      <span className="text-gray-400 font-medium">{item.count}</span>
                    </li>
                  ))}
                  {optOutReasons.length === 0 && (
                    <li className="text-gray-400 italic">No opt-out data yet</li>
                  )}
                </ul>
                <p className="text-xs text-gray-400 text-center mt-4">Click for opt-out analysis</p>
                {!canAccessDetailedAnalytics && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Manual Overrides - Now Clickable */}
              <div 
                className={`bg-white p-4 rounded shadow transition-shadow relative ${
                  canAccessDetailedAnalytics ? 'cursor-pointer hover:shadow-lg' : 'opacity-90'
                }`}
                onClick={() => handleCardClick('manualOverrides', 'Manual Overrides')}
              >
                <h3 className="text-lg font-semibold mb-2">Manual Overrides</h3>
                <p className="text-sm text-gray-500 mb-3">Total times a human stepped in or adjusted AI conversation</p>
                <ul className="text-sm space-y-2">
                  <li><strong>Last 7 Days:</strong> {manualOverrides.last7Days}</li>
                  <li><strong>This Month:</strong> {manualOverrides.thisMonth}</li>
                  <li><strong>All-Time:</strong> {manualOverrides.allTime}</li>
                </ul>
                <p className="text-xs text-gray-400 text-center mt-4">Click for override log</p>
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
          <AiOptimizationModalContent 
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