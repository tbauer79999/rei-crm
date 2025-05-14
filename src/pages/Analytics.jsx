import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f97316', '#14b8a6', '#facc15'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, percent } = payload[0].payload;
    return (
      <div className="bg-white p-2 border rounded shadow text-sm">
        <strong>{name}</strong><br />
        {value} leads ({percent}%)
      </div>
    );
  }
  return null;
};

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState(['All']);
  const [statusData, setStatusData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [furthestStatus, setFurthestStatus] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [progressionFiltered, setProgressionFiltered] = useState([]);
  const [responseSummary, setResponseSummary] = useState({ respondedOnce: 0, respondedMultiple: 0, noResponse: 0 });
  const [avgResponseTime, setAvgResponseTime] = useState(null);
  const [hotOverTime, setHotOverTime] = useState([]);

  useEffect(() => {
    axios.get('/api/analytics')
      .then((res) => {
        setAnalytics(res.data);
      });
  }, []);

  useEffect(() => {
    if (!analytics) return;
    setLoading(true);
    const selected = selectedCampaigns.includes('All') ? Object.keys(analytics.byCampaign) : selectedCampaigns;
    const leads = analytics.raw.filter(l => selected.includes(l.Campaign || 'Unlabeled'));
    setTotalLeads(leads.length);

    let respondedOnce = 0;
    let respondedMultiple = 0;
    let noResponse = 0;
    let totalMinutes = 0;
    let responders = 0;
    const hotByDate = {};
    const statusMap = {};
    const pieMap = {};
    const furthestMap = {};
    const progressionMap = {};
    let leadsWithHistory = 0;
    const dateMap = {};

    leads.forEach(lead => {
      const inbound = lead.Messages?.filter(m => m.direction === 'inbound') || [];
      const outbound = lead.Messages?.filter(m => m.direction === 'outbound') || [];

      if (inbound.length === 0) noResponse++;
      else if (inbound.length === 1) respondedOnce++;
      else respondedMultiple++;

      if (inbound.length && outbound.length) {
        const firstOut = new Date(outbound[0].timestamp);
        const firstIn = new Date(inbound[0].timestamp);
        if (!isNaN(firstOut) && !isNaN(firstIn)) {
          const diff = (firstIn - firstOut) / (1000 * 60);
          if (diff > 0) {
            totalMinutes += diff;
            responders++;
          }
        }
      }

      const history = lead['Status History'];
      if (history) {
        leadsWithHistory++;
        const lines = history.trim().split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('Hot Lead')) {
            const [ts] = line.split(':');
            const date = new Date(ts).toISOString().split('T')[0];
            hotByDate[date] = (hotByDate[date] || 0) + 1;
          }
          if (idx > 0) {
            const prev = lines[idx - 1].split(': ').slice(1).join(': ');
            const curr = line.split(': ').slice(1).join(': ');
            if (prev && curr && prev !== curr) {
              const key = `${prev} → ${curr}`;
              progressionMap[key] = (progressionMap[key] || 0) + 1;
            }
          }
        });

        const lastLine = lines[lines.length - 1];
        const lastStatus = lastLine.split(': ').slice(1).join(': ');
        furthestMap[lastStatus] = (furthestMap[lastStatus] || 0) + 1;
      }

      const status = lead.Status || 'Unknown';
      const campaign = lead.Campaign || 'Unlabeled';
      if (!statusMap[status]) statusMap[status] = {};
      statusMap[status][campaign] = (statusMap[status][campaign] || 0) + 1;
      pieMap[status] = (pieMap[status] || 0) + 1;

      const created = lead.Created;
      if (created) {
        const dateKey = new Date(created).toISOString().split('T')[0];
        if (!dateMap[dateKey]) dateMap[dateKey] = {};
        dateMap[dateKey][campaign] = (dateMap[dateKey][campaign] || 0) + 1;
      }
    });

    setResponseSummary({ respondedOnce, respondedMultiple, noResponse });
    const avg = responders > 0 ? (totalMinutes / responders).toFixed(1) : null;
    setAvgResponseTime(avg);
    setHotOverTime(Object.entries(hotByDate).sort().map(([date, count]) => ({ date, count })));
    setPieData(Object.entries(pieMap).map(([name, value]) => ({ name, value })));
    setFurthestStatus(Object.entries(furthestMap).map(([status, count]) => {
      const percent = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0.0';
      return { name: status, value: count, percent };
    }));
    setStatusData(Object.keys(statusMap).map((status) => {
      const row = { status };
      selected.forEach((c) => {
        row[c] = statusMap[status][c] || 0;
      });
      return row;
    }));
    setLineData(Object.keys(dateMap).sort().map((date) => {
      const row = { date };
      selected.forEach((c) => {
        row[c] = dateMap[date][c] || 0;
      });
      return row;
    }));
    setProgressionFiltered(Object.entries(progressionMap).map(([t, count]) => {
      const percent = leadsWithHistory > 0 ? ((count / leadsWithHistory) * 100).toFixed(1) : '0.0';
      return { transition: t, count, percent };
    }));

    if (selected.length === 1) {
      const stages = ['New Lead', 'Nurtured', 'Warm Lead', 'Hot Lead', 'Cold Lead', 'Unsubscribed'];
      setFunnelData(stages.map(stage => ({
        stage,
        count: leads.filter(l => l.Status === stage).length
      })));
    } else {
      setFunnelData([]);
    }

    setLoading(false);
  }, [analytics, selectedCampaigns]);

  if (!analytics) return <div className="p-6">Loading full analytics...</div>;

  const allCampaigns = Object.keys(analytics.byCampaign);
  const handleCampaignChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(o => o.value);
    setSelectedCampaigns(options.includes('All') ? ['All'] : options);
  };

  const isMulti = selectedCampaigns.length > 1 || selectedCampaigns.includes('All');
  const maxStageCount = Math.max(...funnelData.map(f => f.count || 0), 1);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-700">
        <div className="animate-pulse text-lg">Processing campaign analytics...</div>
        <div className="mt-4 h-1 w-48 mx-auto bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-ping"></div>
        </div>
      </div>
    );
  }

  // 👇 The rest of the file (chart render layout) stays the same. Let me know if you want me to reshare that block too.
  return (
    <div className="p-6 bg-gray-100 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">Campaign Analytics</h1>
        <Link to="/dashboard" className="text-blue-600 underline text-sm hover:text-blue-800">← Back to Dashboard</Link>
      </div>

      {/* Campaign Filter */}
      <div className="bg-white p-4 rounded shadow">
        <label className="block mb-1 font-medium text-sm">Select Campaign(s):</label>
        <select
          multiple
          value={selectedCampaigns}
          onChange={handleCampaignChange}
          className="border p-2 rounded w-full max-w-lg h-28 text-sm"
        >
          <option value="All">All Campaigns</option>
          {allCampaigns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Command (Mac) to multi-select.</p>
      </div>

      {/* Response Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow text-center">
          <h3 className="text-sm text-gray-500 mb-1">No Response</h3>
          <p className="text-2xl font-bold text-red-600">{responseSummary.noResponse}</p>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <h3 className="text-sm text-gray-500 mb-1">1 Response</h3>
          <p className="text-2xl font-bold text-yellow-500">{responseSummary.respondedOnce}</p>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <h3 className="text-sm text-gray-500 mb-1">Multiple Responses</h3>
          <p className="text-2xl font-bold text-green-600">{responseSummary.respondedMultiple}</p>
        </div>
      </div>

      {/* Avg. Response Time */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Avg. Time to First Response</h3>
        <p className="text-xl">
          {avgResponseTime ? formatDuration(avgResponseTime) : 'No replies yet'}
        </p>
      </div>

      {/* Hot Leads Over Time */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Hot Leads Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hotOverTime}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} />
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
            {progressionFiltered.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{item.transition}</td>
                <td className="px-4 py-2">{item.count} ({item.percent}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Furthest Status */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Furthest Status Reached</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={furthestStatus}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value">
              {furthestStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status Breakdown by Campaign */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Status Breakdown by Campaign</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusData}>
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            {(isMulti ? allCampaigns : selectedCampaigns).map((c, i) => (
              <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leads Pie Chart */}
      {!isMulti && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Leads by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leads Over Time */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Leads Added Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            {(isMulti ? allCampaigns : selectedCampaigns).map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel */}
      {!isMulti && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Lead Status Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((item) => (
              <div key={item.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.stage}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div
                    className="bg-green-500 h-3 rounded"
                    style={{ width: `${(item.count / maxStageCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
