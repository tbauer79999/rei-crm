// src/components/controlroom/HotLeadHandoffPanel.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const HotLeadHandoffPanel = () => {
  const [hotLeads, setHotLeads] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    axios.get('/api/hot').then((res) => {
      setHotLeads(res.data || []);
    });

    axios.get('/api/hot-summary').then((res) => {
      setStats(res.data || {});
    });
  }, []);

  const uncalledLeads = hotLeads.filter((lead) => !lead.call_logged);
  const previewLeads = uncalledLeads.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Hot Leads Awaiting Action */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">🔥 Hot Leads Awaiting Action ({uncalledLeads.length} uncalled)</div>
        <div className="text-sm text-gray-500 mb-4">
          AI-flagged leads within the last 48 hours still waiting for a sales follow-up
        </div>

        {previewLeads.map((lead) => (
          <div key={lead.id} className="border-t pt-3 mt-3">
            <div className="font-medium text-sm">{lead.name || 'Unnamed Lead'} - Marked Hot: {lead.marked_hot_time_ago || '—'}</div>
            <div className="text-xs text-gray-500 mb-2">{lead.snippet || 'No message context available'}</div>
            <div className="flex gap-2">
              <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">📞 Call</button>
              <button className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">💬 View Chat</button>
            </div>
          </div>
        ))}

        {uncalledLeads.length > 3 && (
          <button className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">
            View Full Queue
          </button>
        )}
      </div>

      {/* Card 2: AI → Sales Time Lag */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">AI → Sales Time Lag</div>
        <div className="text-sm text-gray-500 mb-4">
          Time elapsed between AI marking a lead hot and first human follow-up
        </div>
        <ul className="text-sm space-y-2">
          <li><strong>Avg Response Time:</strong> {stats.avg_response || '—'}</li>
          <li><strong>Fastest:</strong> {stats.fastest_response || '—'}</li>
          <li><strong>Slowest:</strong> {stats.slowest_response || '—'}</li>
        </ul>
      </div>

      {/* Card 3: Sales Outcomes (Last 7 Days) */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Sales Outcomes (Last 7 Days)</div>
        <div className="text-sm text-gray-500 mb-4">Results from sales outreach on hot leads</div>
        <ul className="text-sm space-y-1">
          <li>✅ Connected: <strong>{stats.connected || 0}</strong></li>
          <li>📞 Voicemail: <strong>{stats.voicemail || 0}</strong></li>
          <li>📵 No Answer: <strong>{stats.no_answer || 0}</strong></li>
          <li>⛔ Not a Fit: <strong>{stats.not_fit || 0}</strong></li>
          <li>🎯 Qualified: <strong>{stats.qualified || 0}</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default HotLeadHandoffPanel;
