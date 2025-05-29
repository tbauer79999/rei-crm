import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f97316', '#14b8a6', '#f43f5e'];

const mockStatusData = [
  { name: 'New Lead', value: 400 },
  { name: 'Engaging', value: 300 },
  { name: 'Responding', value: 200 },
  { name: 'Hot', value: 100 },
  { name: 'Dormant', value: 50 },
  { name: 'Opted Out', value: 25 },
];

const mockFunnelData = [
  { stage: 'Uploaded', count: 500 },
  { stage: 'Engaged', count: 400 },
  { stage: 'Replied', count: 300 },
  { stage: 'Hot', count: 120 },
];

const mockTrendData = [
  { date: '2025-05-01', leads: 20 },
  { date: '2025-05-02', leads: 35 },
  { date: '2025-05-03', leads: 25 },
  { date: '2025-05-04', leads: 40 },
  { date: '2025-05-05', leads: 30 },
];

const mockTransitions = [
  { transition: 'New → Engaging', count: 120, percent: '24%' },
  { transition: 'Engaging → Responding', count: 90, percent: '18%' },
  { transition: 'Responding → Hot', count: 50, percent: '10%' },
];

export default function LeadJourneyFunnel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

      {/* Lead Status Distribution */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Lead Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={mockStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
              {mockStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Lead Progression Funnel</h3>
        <div className="space-y-3">
          {mockFunnelData.map((item) => {
            const max = Math.max(...mockFunnelData.map(i => i.count), 1);
            return (
              <div key={item.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.stage}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div
                    className="bg-indigo-500 h-3 rounded"
                    style={{ width: `${(item.count / max) * 100}%` }}

                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Trend */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Lead Upload Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockTrendData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Transitions */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Lead Status Transitions</h3>
        <table className="min-w-full text-sm text-left border">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-2 border-b">Transition</th><th className="px-4 py-2 border-b">Count (%)</th></tr>
          </thead>
          <tbody>
            {mockTransitions.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{item.transition}</td>
                <td className="px-4 py-2">{item.count} ({item.percent})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
