import React, { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed

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
  const tenantId = user?.tenant_id;

  const [hotLeadTrend, setHotLeadTrend] = useState([]);
  const [messagesSent, setMessagesSent] = useState(0);
  const [hotLeadCount, setHotLeadCount] = useState(0);
  const [previousHotLeadCount, setPreviousHotLeadCount] = useState(0);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  const COST_PER_MESSAGE = 0.01;

  useEffect(() => {
    if (!tenantId) return;

    apiClient.get('/overview/analytics-trend-cost', {
        params: { tenant_id: tenantId },
      })
      .then((res) => {
        const {
          trend,
          totalMessagesSent,
          totalHotLeads,
          previousMessagesSent,
          previousHotLeads,
        } = res.data;

        setHotLeadTrend(trend);
        setMessagesSent(totalMessagesSent);
        setHotLeadCount(totalHotLeads);
        setPreviousMessageCount(previousMessagesSent);
        setPreviousHotLeadCount(previousHotLeads);
      });
  }, [tenantId]);

  const cost = messagesSent * COST_PER_MESSAGE;
  const costPerHotLead =
    hotLeadCount > 0 ? (cost / hotLeadCount).toFixed(2) : '—';

  const calcTrend = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+100%' : '+0%';
    const change = ((curr - prev) / prev) * 100;
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${Math.abs(change).toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Hot Lead Trend (line chart) */}
      <div className="bg-white p-4 rounded-xl shadow border col-span-1 md:col-span-1">
        <h3 className="text-sm text-gray-500 mb-2">Hot Lead Trend (%)</h3>
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
