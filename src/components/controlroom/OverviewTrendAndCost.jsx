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

// Edge Function URL - Update this with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/overview-analytics';

const MetricCard = ({ title, value, subtext, trend, empty }) => (
  <div
    className={`p-4 rounded-xl text-center shadow ${
      empty
        ? 'bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400'
        : 'bg-white border text-gray-800'
    }`}
  >
    <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
    {empty ? (
      <>
        <p className="text-lg font-medium">🚫 Not enough data</p>
        {subtext && <p className="text-xs mt-1">{subtext}</p>}
      </>
    ) : (
      <>
        <p className="text-2xl font-bold">{value}</p>
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
      </>
    )}
  </div>
);

export default function OverviewTrendAndCost() {
  const { user } = useAuth();

  const [hotLeadTrend, setHotLeadTrend] = useState([]);
  const [messagesSent, setMessagesSent] = useState(0);
  const [hotLeadCount, setHotLeadCount] = useState(0);
  const [previousHotLeadCount, setPreviousHotLeadCount] = useState(0);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const COST_PER_MESSAGE = 0.01;

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
    // Ensure there's an active user before trying to fetch data
    if (!user) {
      console.log('No active user found, skipping fetch for OverviewTrendAndCost.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await callEdgeFunction();
        
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
  }, [user]); // Depend on user to re-fetch if auth state changes

  const cost = messagesSent * COST_PER_MESSAGE;
  const costPerHotLead =
    hotLeadCount > 0 ? (cost / hotLeadCount).toFixed(2) : '—';

  const calcTrend = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+100%' : '+0%';
    const change = ((curr - prev) / prev) * 100;
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${Math.abs(change).toFixed(1)}%`;
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Hot Lead Trend (line chart) */}
      <div className="bg-white p-4 rounded-xl shadow border col-span-1 md:col-span-1">
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
      </div>

      {/* Messages Sent Cost */}
      <MetricCard
        title="Messages Sent Cost"
        value={`$${cost.toFixed(2)}`}
        subtext={`${messagesSent} messages × $0.01`}
        trend={calcTrend(messagesSent, previousMessageCount)}
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
      />
    </div>
  );
}