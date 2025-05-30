import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f97316', '#14b8a6', '#f43f5e', '#8b5cf6', '#ef4444'];

export default function LeadJourneyFunnel() {
  const [journeyData, setJourneyData] = useState({
    statusDistribution: [],
    funnelData: [],
    transitionData: []
  });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // Default 30 days

  // Get tenant_id from your auth context
  const getTenantId = () => {
    return '46f58bba-b709-4460-8df1-ee61f0d42c57';
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const tenantId = getTenantId();

      console.log('Fetching lead journey data for tenant:', tenantId);

      // Fetch journey data (status distribution, funnel, transitions)
      const journeyResponse = await axios.get(`/api/funnel-analytics?tenant_id=${tenantId}&days=${dateRange}`);
      console.log('Journey response:', journeyResponse.data);
      setJourneyData(journeyResponse.data);

      // Fetch trend data
      const trendsResponse = await axios.get(`/api/lead-trends?tenant_id=${tenantId}&days=${dateRange}`);
      console.log('Trends response:', trendsResponse.data);
      setTrendData(trendsResponse.data.trends || []);

    } catch (error) {
      console.error('Error fetching lead journey data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-4 rounded shadow">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { statusDistribution, funnelData, transitionData } = journeyData;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Lead Journey Analytics</h2>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  dateRange === days 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Analyzing {journeyData.totalLeads || 0} leads over the last {dateRange} days
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Lead Status Distribution */}
        <div className="bg-white p-4 rounded shadow lg:col-span-1">
          <h3 className="text-lg font-semibold mb-2">Lead Status Distribution</h3>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={statusDistribution} 
                  dataKey="value" 
                  nameKey="name" 
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No lead data available
            </div>
          )}
        </div>

        {/* Funnel */}
        <div className="bg-white p-4 rounded shadow lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Lead Progression Funnel</h3>
          {funnelData.length > 0 ? (
            <div className="space-y-4">
              {funnelData.map((item) => {
                const max = Math.max(...funnelData.map(i => i.count), 1);
                const conversionRate = funnelData[0]?.count > 0 
                  ? Math.round((item.count / funnelData[0].count) * 100) 
                  : 0;
                
                return (
                  <div key={item.stage}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{item.stage}</span>
                      <span className="font-semibold text-blue-600">
                        {item.count} ({conversionRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${(item.count / max) * 100}%` }}
                      >
                        {item.count > 0 && (
                          <span className="text-white text-xs font-bold">{item.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No funnel data available
            </div>
          )}
        </div>

        {/* Upload Trend - Takes 2 columns on large screens */}
        <div className="bg-white p-4 rounded shadow lg:col-span-2 xl:col-span-1">
          <h3 className="text-lg font-semibold mb-2">Lead Upload Trend</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [value, 'Leads']}
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#3b82f6' }}
                  activeDot={{ r: 7, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Status Transitions */}
        <div className="bg-white p-4 rounded shadow lg:col-span-2 xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Lead Status Transitions</h3>
          {transitionData.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Transition</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transitionData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs">
                        <div className="font-medium text-gray-900">{item.transition}</div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-lg text-blue-600">{item.count}</span>
                          <span className="text-xs text-gray-500">{item.percent}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No transition data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}