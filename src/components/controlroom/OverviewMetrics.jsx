import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';

// Edge Function URL - Update this with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/overview-analytics';

const MetricCard = ({ title, value, subtext, trend }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow border text-center">
      <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      {trend && (
        <p
          className={`text-xs mt-1 font-medium ${
            trend.startsWith('+') ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {trend.startsWith('+') ? '▲' : '▼'} {trend.replace(/^[+-]/, '')}
        </p>
      )}
    </div>
  );
};

export default function OverviewMetrics() {
  const { user } = useAuth();

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

  useEffect(() => {
    // Check for active user and tenant_id
    if (!user || !user.tenant_id) { 
      console.log('No active user or tenant_id found, skipping fetch for OverviewMetrics.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching overview metrics...');
        const data = await callEdgeFunction(EDGE_FUNCTION_URL);
        console.log('API Response Data:', data);

        const weeklyChange = (curr, prev) => {
          if (prev === 0) return curr > 0 ? '+100%' : '+0%';
          const change = ((curr - prev) / prev) * 100;
          const sign = change >= 0 ? '+' : '-';
          return `${sign}${Math.abs(change).toFixed(1)}%`;
        };

        const newMetrics = {
          totalLeads: data.totalLeads || 0,
          weeklyLeads: data.weeklyLeads || 0,
          hotLeadRate: data.hotLeadRate ? `${data.hotLeadRate.toFixed(1)}%` : '0%',
          replyRate: data.replyRate ? `${data.replyRate.toFixed(1)}%` : '0%',
          activeLeads: data.activeLeads || 0,
          completedLeads: data.completedLeads || 0,
          messagesSent: data.messagesSent || 0,
          messagesReceived: data.messagesReceived || 0,
          trends: {
            weeklyLeads: weeklyChange(data.weeklyLeads || 0, 25),
            hotLeadRate: weeklyChange(data.hotLeadRate || 0, 12.0),
            replyRate: weeklyChange(data.replyRate || 0, 35.0),
            completedLeads: weeklyChange(data.completedLeads || 0, 7),
            messagesSent: weeklyChange(data.messagesSent || 0, 210),
            messagesReceived: weeklyChange(data.messagesReceived || 0, 110),
          },
        };

        setMetrics(newMetrics);
      } catch (error) {
        console.error('Error fetching overview metrics:', error);
        setError(error.message);
        
        // Set default values on error
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
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl shadow border">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Failed to load metrics</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
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

  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Leads" value={metrics.totalLeads} />
        <MetricCard title="Leads This Week" value={metrics.weeklyLeads} trend={t.weeklyLeads} />
        <MetricCard title="Hot Lead Conversion Rate" value={metrics.hotLeadRate} trend={t.hotLeadRate} />
        <MetricCard title="Reply Rate" value={metrics.replyRate} trend={t.replyRate} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Leads" value={metrics.activeLeads} />
        <MetricCard title="Completed Leads" value={metrics.completedLeads} trend={t.completedLeads} />
        <MetricCard title="Messages Sent" value={metrics.messagesSent} trend={t.messagesSent} />
        <MetricCard title="Messages Received" value={metrics.messagesReceived} trend={t.messagesReceived} />
      </div>
    </div>
  );
}