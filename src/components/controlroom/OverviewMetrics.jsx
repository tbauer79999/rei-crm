import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
    axios.get('/api/analytics').then((res) => {
      const leads = res.data?.raw || [];

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 7);
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - 14);

      const weeklyLeads = leads.filter((l) => new Date(l.Created) > thisWeekStart).length;
      const previousWeeklyLeads = leads.filter((l) => {
        const created = new Date(l.Created);
        return created > lastWeekStart && created <= thisWeekStart;
      }).length;

      const totalLeads = leads.length;
      const hotLeads = leads.filter((l) => l.Status === 'Hot Lead').length;
      const repliedLeads = leads.filter((l) => (l.Messages || []).some((m) => m.direction === 'inbound')).length;
      const activeLeads = leads.filter((l) => ['Engaging', 'Responding'].includes(l.Status)).length;
      const completedLeads = leads.filter((l) => ['Hot Lead', 'Opted Out', 'Unsubscribed', 'Disqualified'].includes(l.Status)).length;

      let messagesSent = 0;
      let messagesReceived = 0;
      leads.forEach((lead) => {
        (lead.Messages || []).forEach((msg) => {
          if (msg.direction === 'outbound') messagesSent++;
          if (msg.direction === 'inbound') messagesReceived++;
        });
      });

      const hotLeadRate = totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0;
      const replyRate = totalLeads > 0 ? (repliedLeads / totalLeads) * 100 : 0;

      const weeklyChange = (curr, prev) => {
        if (prev === 0) return curr > 0 ? '+100%' : '+0%';
        const change = ((curr - prev) / prev) * 100;
        const sign = change >= 0 ? '+' : '-';
        return `${sign}${Math.abs(change).toFixed(1)}%`;
      };

      setMetrics({
        totalLeads,
        weeklyLeads,
        hotLeadRate: `${hotLeadRate.toFixed(1)}%`,
        replyRate: `${replyRate.toFixed(1)}%`,
        activeLeads,
        completedLeads,
        messagesSent,
        messagesReceived,
        trends: {
          weeklyLeads: weeklyChange(weeklyLeads, previousWeeklyLeads),
          hotLeadRate: weeklyChange(hotLeadRate, 12.0), // placeholder
          replyRate: weeklyChange(replyRate, 35.0),     // placeholder
          completedLeads: weeklyChange(completedLeads, 7), // example
          messagesSent: weeklyChange(messagesSent, 210),   // example
          messagesReceived: weeklyChange(messagesReceived, 110), // example
        },
      });
    });
  }, []);

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
