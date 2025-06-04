import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // adjust path as needed
import apiClient from '../../lib/apiClient';

const MetricCard = ({ title, value, subtext, trend }) => (
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

export default function OverviewMetrics() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

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

  useEffect(() => {
    if (!tenantId) return;

    apiClient.get('/overview', {
  params: { tenant_id: tenantId },
})
      .then((res) => {
        const data = res.data;

        const weeklyChange = (curr, prev) => {
          if (prev === 0) return curr > 0 ? '+100%' : '+0%';
          const change = ((curr - prev) / prev) * 100;
          const sign = change >= 0 ? '+' : '-';
          return `${sign}${Math.abs(change).toFixed(1)}%`;
        };

        setMetrics({
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
        });
      });
  }, [tenantId]);

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
