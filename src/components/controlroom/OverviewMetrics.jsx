import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// Edge Function URL - Update this with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/overview-analytics';

const MetricCard = ({ title, value, subtext, trend }) => {
  // Debugging: Log what value each MetricCard receives
  console.log(`MetricCard: ${title}, Value:`, value); 

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

  // Debugging: Log user state when component renders
  console.log('OverviewMetrics component rendering. User:', user);

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

  // Debugging: Log the metrics state every time the component renders (after state updates)
  console.log('Current OverviewMetrics state (from render):', metrics);

  // Helper function to call edge function with auth
  const callEdgeFunction = async () => {
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('supabase.auth.token') || 
                   JSON.parse(localStorage.getItem('sb-wuuqrdlfgkasnwydyvgk-auth-token') || '{}')?.access_token;
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Edge function call failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Debugging: Log when useEffect runs
    console.log('OverviewMetrics useEffect running. User in useEffect:', user); 

    // Check for active user and tenant_id
    if (!user || !user.tenant_id) { 
      console.log('No active user or tenant_id found, skipping fetch for OverviewMetrics.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Debugging: Log before making the API call
        console.log('Fetching overview metrics...');

        const data = await callEdgeFunction();

        // Debugging: Log the raw data received from the API response
        console.log('API Response Data:', data);

        const weeklyChange = (curr, prev) => {
          if (prev === 0) return curr > 0 ? '+100%' : '+0%';
          const change = ((curr - prev) / prev) * 100;
          const sign = change >= 0 ? '+' : '-';
          return `${sign}${Math.abs(change).toFixed(1)}%`;
        };

        const newMetrics = { // Create a new object to log before setting state
          totalLeads: data.totalLeads,
          weeklyLeads: data.weeklyLeads,
          hotLeadRate: `${data.hotLeadRate.toFixed(1)}%`,
          replyRate: `${data.replyRate.toFixed(1)}%`,
          activeLeads: data.activeLeads,
          completedLeads: data.completedLeads,
          messagesSent: data.messagesSent,
          messagesReceived: data.messagesReceived,
          trends: {
            weeklyLeads: weeklyChange(data.weeklyLeads, 25),
            hotLeadRate: weeklyChange(data.hotLeadRate, 12.0),
            replyRate: weeklyChange(data.replyRate, 35.0),
            completedLeads: weeklyChange(data.completedLeads, 7),
            messagesSent: weeklyChange(data.messagesSent, 210),
            messagesReceived: weeklyChange(data.messagesReceived, 110),
          },
        };

        // Debugging: Log the object that will be used to update the state
        console.log('Metrics object to set state with:', newMetrics);
        setMetrics(newMetrics);
      } catch (error) {
        // Debugging: Log any errors from the API call
        console.error('Error fetching overview metrics:', error);
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
  }, [user]); // Depend on user to re-fetch if auth state changes

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