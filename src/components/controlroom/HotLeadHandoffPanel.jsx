import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';
import { 
  X, TrendingUp, Users, Calendar, Clock, CheckCircle, Phone, 
  AlertTriangle, BarChart3, Activity, Timer, Target, XCircle,
  PhoneCall, PhoneOff, UserCheck, UserX, MessageSquare
} from 'lucide-react';

// Edge Function URL - Update this with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/HotLeadHandoffPanel';

// Modal configuration for each card
const MODAL_CONFIG = {
  awaitingAction: {
    title: 'Hot Leads Requiring Immediate Attention',
    subtitle: 'Detailed view of leads awaiting sales follow-up',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    features: ['queueOverview', 'awaitingList', 'queueDistribution', 'historicalTrend']
  },
  timeLag: {
    title: 'AI-Sales Handoff Efficiency',
    subtitle: 'Response time analytics and performance metrics',
    icon: Timer,
    iconColor: 'text-blue-600',
    features: ['responseTimeTrend', 'performanceByRep', 'timeDistribution', 'slaCompliance']
  },
  salesOutcomes: {
    title: 'Hot Lead Sales Conversion & Outcomes',
    subtitle: 'Conversion rates and outcome analysis',
    icon: Target,
    iconColor: 'text-green-600',
    features: ['outcomesTrend', 'outcomeDistribution', 'performanceByRep', 'disqualificationReasons', 'conversionRate']
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
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] m-4 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
    <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Time Period:</span>
        <div className="flex space-x-2">
          {periods.map(period => (
            <button
              key={period.value}
              onClick={() => onPeriodChange(period.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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

// Filter Bar Component
const FilterBar = ({ filters, onFilterChange }) => {
  return (
    <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Filters:</span>
        <select 
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md"
        >
          <option value="all">All Statuses</option>
          <option value="voicemail">Voicemail</option>
          <option value="no_answer">No Answer</option>
          <option value="pending">Pending Acceptance</option>
        </select>
        <select 
          value={filters.team}
          onChange={(e) => onFilterChange({ ...filters, team: e.target.value })}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md"
        >
          <option value="all">All Teams</option>
          <option value="team_a">Team A</option>
          <option value="team_b">Team B</option>
        </select>
      </div>
    </div>
  );
};

// Queue Overview Component
// Queue Overview Component
const QueueOverview = ({ data }) => {
  // Add safety check
  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-500">No queue data available</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-orange-700">{data.totalAwaiting || 0}</p>
        <p className="text-sm text-orange-600">Total Awaiting</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-blue-700">{data.avgTimeInQueue || '—'}</p>
        <p className="text-sm text-blue-600">Avg. Time in Queue</p>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-yellow-700">{data.longestWaiting || '—'}</p>
        <p className="text-sm text-yellow-600">Longest Waiting</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-red-700">{data.criticalLeads || 0}</p>
        <p className="text-sm text-red-600">Critical (>2hrs)</p>
      </div>
    </div>
  );
};

// Awaiting Action List Component
const AwaitingActionList = ({ data }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-orange-600" />
        Leads Awaiting Action
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Lead Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Time in Queue</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Last Interaction</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Assigned To</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lead) => (
              <tr key={lead.leadId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{lead.name}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === 'Voicemail Left' ? 'bg-yellow-100 text-yellow-800' :
                    lead.status === 'No Answer' ? 'bg-gray-100 text-gray-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  <span className={lead.timeInQueue > '02:00' ? 'text-red-600 font-medium' : ''}>
                    {lead.timeInQueue}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{lead.lastAttempt}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{lead.assignedTo}</td>
                <td className="py-3 px-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Queue Distribution Chart
const QueueDistribution = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = {
    'Voicemail': '#F59E0B',
    'No Answer': '#6B7280',
    'Pending Acceptance': '#EF4444'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Distribution</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[item.type] || '#3B82F6' }}
              />
              <span className="text-sm font-medium text-gray-700">{item.type}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.count / total) * 100}%`,
                    backgroundColor: colors[item.type] || '#3B82F6'
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-16 text-right">
                {item.count} ({((item.count / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Response Time Trend Chart
// Response Time Trend Chart
const ResponseTimeTrend = ({ data }) => {
  // Add safety check for empty data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Average Response Time Trend
        </h3>
        <p className="text-gray-500 text-center py-8">No response time data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.avgResponseMinutes));
  const slaThreshold = 15; // 15 minutes SLA

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-blue-600" />
        Average Response Time Trend
      </h3>
      <div className="h-64 relative">
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
          
          {/* SLA line */}
          <line
            x1="40"
            y1={160 - (slaThreshold / maxValue) * 120}
            x2="760"
            y2={160 - (slaThreshold / maxValue) * 120}
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text
            x="770"
            y={160 - (slaThreshold / maxValue) * 120 + 4}
            className="text-xs fill-red-600"
          >
            SLA
          </text>
          
          {/* Trend line - Fixed path generation */}
          {data.length > 1 && (
            <path
              d={data.map((d, i) => {
                const x = 40 + (i * 720 / (data.length - 1));
                const y = 160 - (d.avgResponseMinutes / maxValue) * 120;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
            />
          )}
          
          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={40 + (i * 720 / (data.length - 1))}
              cy={160 - (d.avgResponseMinutes / maxValue) * 120}
              r="4"
              fill={d.avgResponseMinutes > slaThreshold ? '#EF4444' : '#3B82F6'}
            >
              <title>{`${d.date}: ${d.avgResponseMinutes} minutes`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};

// Performance by Sales Rep
const PerformanceByRep = ({ data, metricType = 'responseTime' }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {metricType === 'responseTime' ? 'Response Time by Sales Rep' : 'Outcomes by Sales Rep'}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sales Rep</th>
              {metricType === 'responseTime' ? (
                <>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Avg Response Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Leads Handled</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SLA Compliance</th>
                </>
              ) : (
                <>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Handled</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Closed Won</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Disqualified</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Conversion Rate</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((rep, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{rep.name}</td>
                {metricType === 'responseTime' ? (
                  <>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className={rep.avgResponseMinutes > 15 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {rep.avgResponseMinutes} min
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{rep.leadsHandled}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rep.slaCompliance >= 90 ? 'bg-green-100 text-green-800' :
                        rep.slaCompliance >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rep.slaCompliance}%
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-sm text-gray-600">{rep.totalHandled}</td>
                    <td className="py-3 px-4 text-sm text-green-600 font-medium">{rep.closedWon}</td>
                    <td className="py-3 px-4 text-sm text-red-600">{rep.disqualified}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rep.conversionRate >= 30 ? 'bg-green-100 text-green-800' :
                        rep.conversionRate >= 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rep.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// SLA Compliance Component
const SLACompliance = ({ data }) => {
  const complianceRate = (data.slaSatisfied / data.totalHandoffs) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Compliance Metrics</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Compliance Rate</p>
          <p className={`text-4xl font-bold ${
            complianceRate >= 90 ? 'text-green-600' : 
            complianceRate >= 75 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {complianceRate.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Handoffs</p>
          <p className="text-4xl font-bold text-gray-700">{data.totalHandoffs}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-green-700">SLA Met</span>
          <span className="text-lg font-bold text-green-800">{data.slaSatisfied}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <span className="text-sm text-red-700">SLA Violated</span>
          <span className="text-lg font-bold text-red-800">{data.slaViolated}</span>
        </div>
      </div>
    </div>
  );
};

// Outcomes Trend Chart (Stacked Bar)
// Outcomes Trend Chart (Stacked Bar)
const OutcomesTrend = ({ data }) => {
  // Add safety check
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Sales Outcomes Trend
        </h3>
        <p className="text-gray-500 text-center py-8">No outcomes data available</p>
      </div>
    );
  }

  const outcomes = ['Closed Won', 'Disqualified', 'Nurture'];
  const colors = {
    'Closed Won': '#10B981',
    'Disqualified': '#EF4444',
    'Nurture': '#F59E0B'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
        Sales Outcomes Trend
      </h3>
      <div className="h-64 relative">
        {/* Simple stacked bar visualization */}
        <div className="flex items-end justify-around h-full pb-8">
          {data.map((day, i) => {
            const total = outcomes.reduce((sum, outcome) => sum + (day.outcomes[outcome] || 0), 0);
            return (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 flex flex-col-reverse">
                  {outcomes.map(outcome => {
                    const value = day.outcomes[outcome] || 0;
                    const height = total > 0 ? (value / total) * 200 : 0;
                    return (
                      <div
                        key={outcome}
                        className="w-full transition-all duration-300"
                        style={{
                          height: `${height}px`,
                          backgroundColor: colors[outcome]
                        }}
                        title={`${outcome}: ${value}`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 mt-2">{day.date.split('-')[2]}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-center space-x-4 mt-4">
        {outcomes.map(outcome => (
          <div key={outcome} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors[outcome] }}
            />
            <span className="text-sm text-gray-600">{outcome}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Modal Content Component
const HandoffModalContent = ({ modalType, data, selectedPeriod, onPeriodChange }) => {
  const [filters, setFilters] = useState({ status: 'all', team: 'all' });
  const config = MODAL_CONFIG[modalType];
  if (!config) return null;

  const { features } = config;

  return (
    <>
      {modalType === 'awaitingAction' && (
        <FilterBar filters={filters} onFilterChange={setFilters} />
      )}
      
      {modalType !== 'awaitingAction' && (
        <TimePeriodSelector 
          selectedPeriod={selectedPeriod} 
          onPeriodChange={onPeriodChange}
        />
      )}
      
      <div className="p-6 space-y-6">
        {/* Awaiting Action features */}
{features.includes('queueOverview') && data && data.queueOverview && (
  <QueueOverview data={data.queueOverview} />
)}
        
        {features.includes('awaitingList') && (
          <AwaitingActionList data={data.awaitingList} />
        )}
        
        {features.includes('queueDistribution') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QueueDistribution data={data.queueDistribution} />
            
            {features.includes('historicalTrend') && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Size Trend</h3>
                {/* Trend chart would go here */}
              </div>
            )}
          </div>
        )}
        
        {/* Time Lag features */}
        {features.includes('responseTimeTrend') && data && data.responseTimeTrend && (
          <ResponseTimeTrend data={data.responseTimeTrend} />
        )}
        
{features.includes('performanceByRep') && modalType === 'timeLag' && data && data.performanceByRep && (
  <PerformanceByRep data={data.performanceByRep} metricType="responseTime" />
)}
        
        {features.includes('timeDistribution') && data && data.timeDistribution && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Distribution</h3>
            <div className="space-y-2">
              {data.timeDistribution.map((bin, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 w-20">{bin.bin}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${(bin.count / data.totalCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{bin.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {features.includes('slaCompliance') && data && data.slaCompliance && (
  <SLACompliance data={data.slaCompliance} />
)}
        
        {/* Sales Outcomes features */}
        {features.includes('outcomesTrend') && data && data.outcomesTrend && (
  <OutcomesTrend data={data.outcomesTrend} />
)}
        
        {features.includes('outcomeDistribution') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcome Distribution</h3>
            {/* Pie chart would go here */}
          </div>
        )}
        
        {features.includes('performanceByRep') && modalType === 'salesOutcomes' && (
          <PerformanceByRep data={data.performanceByRep} metricType="outcomes" />
        )}
        
        {features.includes('disqualificationReasons') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Disqualification Reasons</h3>
            <div className="space-y-2">
              {data.disqualificationReasons.map((reason, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{reason.reason}</span>
                  <span className="text-sm font-medium text-red-600">{reason.count} leads</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {features.includes('conversionRate') && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Hot Lead to Deal Conversion Rate</h3>
            <p className="text-5xl font-bold text-green-700">{data.conversionRate.toFixed(1)}%</p>
            <p className="text-sm text-green-600 mt-2">
              {data.closedWonDeals} closed won out of {data.totalHotLeads} hot leads
            </p>
          </div>
        )}
      </div>
    </>
  );
};

// Mock data generator
const generateModalMockData = (modalType) => {
  if (modalType === 'awaitingAction') {
    return {
      queueOverview: {
        totalAwaiting: 24,
        avgTimeInQueue: '1h 35m',
        longestWaiting: '4h 12m',
        criticalLeads: 5
      },
      awaitingList: [
        { leadId: '1', name: 'John Smith', status: 'Voicemail Left', timeInQueue: '02:45', lastAttempt: '2024-01-15 10:30', assignedTo: 'Sarah J.' },
        { leadId: '2', name: 'Jane Doe', status: 'No Answer', timeInQueue: '01:20', lastAttempt: '2024-01-15 11:45', assignedTo: 'Mike C.' },
        { leadId: '3', name: 'Bob Wilson', status: 'Pending Acceptance', timeInQueue: '00:45', lastAttempt: '2024-01-15 12:15', assignedTo: 'Team A' }
      ],
      queueDistribution: [
        { type: 'Voicemail', count: 12 },
        { type: 'No Answer', count: 8 },
        { type: 'Pending Acceptance', count: 4 }
      ]
    };
  }

  if (modalType === 'timeLag') {
    return {
      responseTimeTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgResponseMinutes: Math.floor(Math.random() * 20) + 5
      })),
      performanceByRep: [
        { name: 'Sarah Johnson', avgResponseMinutes: 8, leadsHandled: 45, slaCompliance: 95 },
        { name: 'Mike Chen', avgResponseMinutes: 12, leadsHandled: 38, slaCompliance: 85 },
        { name: 'Emily Davis', avgResponseMinutes: 18, leadsHandled: 32, slaCompliance: 72 }
      ],
      timeDistribution: [
        { bin: '0-5 min', count: 45 },
        { bin: '5-15 min', count: 78 },
        { bin: '15-30 min', count: 32 },
        { bin: '30+ min', count: 15 }
      ],
      totalCount: 170,
      slaCompliance: {
        totalHandoffs: 170,
        slaSatisfied: 142,
        slaViolated: 28
      }
    };
  }

  if (modalType === 'salesOutcomes') {
    return {
      outcomesTrend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        outcomes: {
          'Closed Won': Math.floor(Math.random() * 5) + 1,
          'Disqualified': Math.floor(Math.random() * 3) + 1,
          'Nurture': Math.floor(Math.random() * 2)
        }
      })),
      performanceByRep: [
        { name: 'Sarah Johnson', totalHandled: 28, closedWon: 12, disqualified: 8, conversionRate: 42.9 },
        { name: 'Mike Chen', totalHandled: 24, closedWon: 8, disqualified: 10, conversionRate: 33.3 },
        { name: 'Emily Davis', totalHandled: 22, closedWon: 5, disqualified: 12, conversionRate: 22.7 }
      ],
      disqualificationReasons: [
        { reason: 'Not decision maker', count: 15 },
        { reason: 'No budget', count: 12 },
        { reason: 'Wrong timing', count: 8 },
        { reason: 'Competitor chosen', count: 5 }
      ],
      conversionRate: 32.5,
      totalHotLeads: 120,
      closedWonDeals: 39
    };
  }

  return {};
};

const HotLeadHandoffPanel = () => {
  const { user } = useAuth();
  const [hotLeads, setHotLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [pipelineValue, setPipelineValue] = useState('');
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.tenant_id) {
      console.error('No tenant_id available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching hot leads data for tenant:', user.tenant_id);

      // Single call to get all hot lead data
      const data = await callEdgeFunction(EDGE_FUNCTION_URL);
      console.log('Hot leads response:', data);
      
      setHotLeads(data.hotLeads || []);
      setStats(data.hotSummary || {});

    } catch (error) {
      console.error('Error fetching hot leads data:', error);
      setError(error.message);
      // Set empty states on error
      setHotLeads([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

const handleCallLead = async (leadId) => {
  if (!user?.tenant_id) {
    console.error('No tenant_id available for call logging');
    return;
  }

  try {
    console.log('Preparing to call lead:', leadId);
    
    // DON'T log the call yet - just show the outcome modal
    const lead = hotLeads.find(l => l.id === leadId);
    setSelectedLead(lead);
    setShowOutcomeModal(true);
    // Reset state when opening modal
    setSelectedOutcome(null);
    setPipelineValue('');

    console.log('Showing outcome modal for lead:', leadId);

  } catch (error) {
    console.error('Error preparing call:', error);
    alert('Failed to prepare call. Please try again.');
  }
};


const handleOutcomeSelection = async (outcome, pipelineValue = null) => {
  console.log('handleOutcomeSelection called with:', { outcome, pipelineValue });
  
  if (!selectedLead || !user?.tenant_id) return;

  // If selecting qualified, show the value input
  if (outcome === 'qualified' && !pipelineValue) {
    setSelectedOutcome('qualified');
    return; // Don't submit yet
  }

  try {
    // FIRST log the call
    console.log('Logging call for lead:', selectedLead.id);
    
    const logResponse = await callEdgeFunction(`${EDGE_FUNCTION_URL}?action=log-call`, {
      method: 'POST',
      body: {
        lead_id: selectedLead.id
      }
    });

    if (!logResponse.success) {
      throw new Error('Failed to log call');
    }

    // THEN update the outcome
    const outcomeData = {
      lead_id: selectedLead.id,
      outcome: outcome
    };
    
    // Add pipeline value if this is a qualified lead
    if (outcome === 'qualified' && pipelineValue) {
      // Ensure we're sending a valid number
      const cleanValue = pipelineValue.toString().replace(/,/g, '');
      const numericValue = parseFloat(cleanValue);
      
      if (!isNaN(numericValue) && numericValue > 0) {
        outcomeData.estimated_pipeline_value = numericValue;
      } else {
        console.error('Invalid pipeline value:', pipelineValue);
        throw new Error('Invalid pipeline value');
      }
    }
    
    console.log('Sending outcome data:', outcomeData);
    
    const outcomeResponse = await callEdgeFunction(`${EDGE_FUNCTION_URL}?action=update-outcome`, {
      method: 'POST',
      body: outcomeData
    });

    if (outcomeResponse.success) {
      console.log('Call logged and outcome updated successfully!');
      setShowOutcomeModal(false);
      setSelectedLead(null);
      setSelectedOutcome(null);
      setPipelineValue('');
      
      // Refresh data to get updated stats
      fetchData();
    }

  } catch (error) {
    console.error('Error updating call outcome:', error);
    alert('Failed to log call. Please try again.');
  }
};

const handleQualifiedSubmit = async () => {
  console.log('handleQualifiedSubmit called with pipelineValue:', pipelineValue);
  
  // Remove commas before parsing
  const cleanValue = pipelineValue.replace(/,/g, '');
  const numericValue = parseFloat(cleanValue);
  
  if (!cleanValue || numericValue <= 0 || isNaN(numericValue)) {
    alert('Please enter a valid pipeline value');
    return;
  }
  
  // Pass the pipeline value to handleOutcomeSelection
  await handleOutcomeSelection('qualified', numericValue);
};

  const handleViewChat = (leadId) => {
    // Navigate to the lead's chat/messages view
    console.log('Viewing chat for lead:', leadId);
    // You could navigate to a messages page or open a modal
  };

  // Handle modal opening
// Replace the openModal function (around line 515)
const openModal = async (modalType) => {
  setActiveModal(modalType);
  setLoadingModal(true);
  setModalData(null);
  
  try {
    let endpoint = '';
    
    switch (modalType) {
      case 'awaitingAction':
        endpoint = '/awaiting-action';
        break;
        
      case 'timeLag':
        endpoint = '/time-lag';
        break;
        
      case 'salesOutcomes':
        endpoint = '/sales-outcomes';
        break;
        
      default:
        console.error('Unknown modal type:', modalType);
        setLoadingModal(false);
        return;
    }
    
    const params = modalType !== 'awaitingAction' ? `?period=${selectedPeriod}` : '';
    const data = await callEdgeFunction(`${EDGE_FUNCTION_URL}${endpoint}${params}`);
    
    setModalData(data);
    
  } catch (error) {
    console.error('Error fetching modal data:', error);
    setModalData(generateModalMockData(modalType));
  } finally {
    setLoadingModal(false);
  }
};

// Add this after the openModal function
const handlePeriodChange = async (newPeriod) => {
  setSelectedPeriod(newPeriod);
  
  // If modal is open and not awaitingAction, refetch data with new period
  if (activeModal && activeModal !== 'awaitingAction') {
    setLoadingModal(true);
    
    try {
      const endpoint = activeModal === 'timeLag' ? '/time-lag' : '/sales-outcomes';
      const data = await callEdgeFunction(`${EDGE_FUNCTION_URL}${endpoint}?period=${newPeriod}`);
      setModalData(data);
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData(generateModalMockData(activeModal));
    } finally {
      setLoadingModal(false);
    }
  }
};

  // Show loading or auth state
  if (!user) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
          <div className="text-center text-gray-500">
            Please log in to view hot leads
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Failed to load hot leads data</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button 
          onClick={fetchData} 
          className="mt-2 text-sm text-red-600 underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const uncalledLeads = hotLeads.filter((lead) => !lead.call_logged);
  const previewLeads = uncalledLeads.slice(0, 3);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Hot Leads Awaiting Action - Now Clickable */}
        <div 
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => openModal('awaitingAction')}
        >
          <div className="text-lg font-semibold mb-2">
            🔥 Hot Leads Awaiting Action ({uncalledLeads.length} uncalled)
          </div>
          <div className="text-sm text-gray-500 mb-4">
            AI-flagged leads within the last 48 hours still waiting for a sales follow-up
          </div>

          {previewLeads.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <div className="text-2xl mb-2">🎉</div>
              <div>No hot leads awaiting calls!</div>
            </div>
          ) : (
            previewLeads.map((lead) => (
              <div key={lead.id} className="border-t pt-3 mt-3">
                <div className="font-medium text-sm">
                  {lead.name} - Marked Hot: {lead.marked_hot_time_ago}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {lead.snippet}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Campaign: {lead.campaign || 'Unknown'}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallLead(lead.id);
                    }}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                  >
                    📞 Call
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewChat(lead.id);
                    }}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                  >
                    💬 View Chat
                  </button>
                </div>
              </div>
            ))
          )}

          {uncalledLeads.length > 3 && (
            <button className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full">
              View Full Queue ({uncalledLeads.length - 3} more)
            </button>
          )}
          
          <div className="mt-4 text-xs text-gray-400 text-center">
            Click card for detailed view
          </div>
        </div>

        {/* Card 2: AI → Sales Time Lag - Now Clickable */}
        <div 
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => openModal('timeLag')}
        >
          <div className="text-lg font-semibold mb-2">⏱️ AI → Sales Time Lag</div>
          <div className="text-sm text-gray-500 mb-4">
            Time elapsed between AI marking a lead hot and first human follow-up
          </div>
          <ul className="text-sm space-y-2">
            <li><strong>Avg Response Time:</strong> <span className="text-blue-600">{stats.avg_response || '—'}</span></li>
            <li><strong>Fastest:</strong> <span className="text-green-600">{stats.fastest_response || '—'}</span></li>
            <li><strong>Slowest:</strong> <span className="text-red-600">{stats.slowest_response || '—'}</span></li>
          </ul>
          
          {stats.avg_response === '—' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              💡 Start logging calls to see response time metrics
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-400 text-center">
            Click card for detailed analytics
          </div>
        </div>

        {/* Card 3: Sales Outcomes (Last 7 Days) - Now Clickable */}
        <div 
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => openModal('salesOutcomes')}
        >
          <div className="text-lg font-semibold mb-2">📊 Sales Outcomes (Last 7 Days)</div>
          <div className="text-sm text-gray-500 mb-4">Results from sales outreach on hot leads</div>
          <ul className="text-sm space-y-1">
            <li>✅ Connected: <strong className="text-green-600">{stats.connected || 0}</strong></li>
            <li>📞 Voicemail: <strong className="text-yellow-600">{stats.voicemail || 0}</strong></li>
            <li>📵 No Answer: <strong className="text-gray-600">{stats.no_answer || 0}</strong></li>
            <li>⛔ Not a Fit: <strong className="text-red-600">{stats.not_fit || 0}</strong></li>
            <li>🎯 Qualified: <strong className="text-blue-600">{stats.qualified || 0}</strong></li>
          </ul>

          {(stats.connected || 0) === 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              💡 Call outcomes will appear here as you log calls
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-400 text-center">
            Click card for conversion analysis
          </div>
        </div>
      </div>

      {/* Call Outcome Modal */}
{showOutcomeModal && selectedLead && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
      {/* Modal Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Log Call Outcome
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedLead.name}
              {selectedLead.requires_immediate_attention && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  CRITICAL
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              setShowOutcomeModal(false);
              setSelectedLead(null);
              setSelectedOutcome(null);
              setPipelineValue('');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <div className="p-6">
        <p className="text-sm font-medium text-gray-700 mb-4">
          Select call outcome <span className="text-red-500">*</span>
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Voicemail */}
          <button 
            onClick={() => handleOutcomeSelection('voicemail')}
            className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
          >
            <MessageSquare className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-yellow-700">Left Voicemail</p>
              <p className="text-xs text-gray-500 mt-0.5">Left a message</p>
            </div>
          </button>

          {/* No Answer */}
          <button 
            onClick={() => handleOutcomeSelection('no_answer')}
            className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all group"
          >
            <PhoneOff className="w-5 h-5 text-gray-600 mt-0.5 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-gray-700">No Answer</p>
              <p className="text-xs text-gray-500 mt-0.5">No response</p>
            </div>
          </button>

          {/* Not Qualified */}
          <button 
            onClick={() => handleOutcomeSelection('not_fit')}
            className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
          >
            <UserX className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-red-700">Not Qualified</p>
              <p className="text-xs text-gray-500 mt-0.5">Not a good fit</p>
            </div>
          </button>

          {/* Qualified */}
          <button 
            onClick={() => handleOutcomeSelection('qualified')}
            className={`flex items-start p-4 border-2 rounded-lg transition-all group ${
              selectedOutcome === 'qualified' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div className="text-left">
              <p className={`font-medium ${
                selectedOutcome === 'qualified' ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'
              }`}>Qualified Lead</p>
              <p className="text-xs text-gray-500 mt-0.5">Ready to proceed</p>
            </div>
          </button>
        </div>

        {/* Pipeline Value Input - Shows when Qualified is selected */}
        {selectedOutcome === 'qualified' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 mb-1">
                💰 What's this lead worth to you if closed? <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-600 italic">
                We use this to track ROI on AI-surfaced leads.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-gray-700">$</span>
              <input
                type="text"
                value={pipelineValue}
                onChange={(e) => {
                  // Allow only numbers, commas, and decimals
                  const value = e.target.value.replace(/[^0-9.,]/g, '');
                  setPipelineValue(value);
                }}
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              onClick={handleQualifiedSubmit}
              disabled={!pipelineValue || parseFloat(pipelineValue.replace(/,/g, '')) <= 0}
              className={`mt-3 w-full py-2 px-4 rounded-md font-medium transition-colors ${
                pipelineValue && parseFloat(pipelineValue.replace(/,/g, '')) > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Qualified Lead
            </button>
          </div>
        )}

        {/* Future enhancement area */}
        {!selectedOutcome && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Coming soon:</span> Call notes, follow-up scheduling, and disposition codes
            </p>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Lead marked {selectedLead.requires_immediate_attention ? 'critical' : 'hot'}: {selectedLead.marked_hot_time_ago}
          </p>
          <button 
            onClick={() => {
              setShowOutcomeModal(false);
              setSelectedLead(null);
              setSelectedOutcome(null);
              setPipelineValue('');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel - I didn't call yet
          </button>
        </div>
      </div>
    </div>
  </div>
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
          <HandoffModalContent 
            modalType={activeModal}
            data={modalData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        ) : null}
      </ModalWrapper>
    </>
  );
};

export default HotLeadHandoffPanel;