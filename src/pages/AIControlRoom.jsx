import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);


export default function AIControlRoom() {
  const [pipelineStats, setPipelineStats] = useState({ total: 0, engaged: 0, hot: 0 });
  const [hotLeads, setHotLeads] = useState([]);
  const [nextQueued, setNextQueued] = useState(null);
  const [funnelStats, setFunnelStats] = useState({});

  useEffect(() => {
    fetchPipelineStats();
    fetchHotLeads();
    fetchNextQueued();
    fetchFunnelStats();
  }, []);

  const fetchPipelineStats = async () => {
    const { data, error } = await supabase.from('properties').select('ai_status');
    if (error) return console.error(error);

    const total = data.length;
    const engaged = data.filter(p => p.ai_status?.toLowerCase() === 'engaged').length;
    const hot = data.filter(p => p.ai_status?.toLowerCase() === 'hot').length;
    setPipelineStats({ total, engaged, hot });
  };

  const fetchHotLeads = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, owner_name, property_address, last_contacted')
      .eq('ai_status', 'HOT')
      .order('last_contacted', { ascending: false })
      .limit(3);
    if (error) return console.error(error);
    setHotLeads(data);
  };

  const fetchNextQueued = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('timestamp, phone, property_id, message_body')
      .eq('queued', true)
      .order('timestamp', { ascending: true })
      .limit(1);
    if (error) return console.error(error);
    setNextQueued(data?.[0] || null);
  };

  const fetchFunnelStats = async () => {
    const { data, error } = await supabase.from('properties').select('status');
    if (error) return console.error(error);

    const summary = {};
    data.forEach(p => {
      const key = p.status || 'Unknown';
      summary[key] = (summary[key] || 0) + 1;
    });
    setFunnelStats(summary);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Pipeline Overview */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-2">AI Pipeline</h2>
        <p>Total Leads: {pipelineStats.total}</p>
        <p>Engaged: {pipelineStats.engaged}</p>
        <p>Hot: {pipelineStats.hot}</p>
      </div>

      {/* Hot Leads */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-2">Recent Hot Leads</h2>
        {hotLeads.map(lead => (
          <div key={lead.id} className="mb-2">
            <p className="font-medium">{lead.owner_name}</p>
            <p className="text-sm text-gray-600">{lead.property_address}</p>
            <p className="text-xs text-gray-400">{new Date(lead.last_contacted).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Queued AI Task */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-2">Next Queued Message</h2>
        {nextQueued ? (
          <>
            <p><strong>Phone:</strong> {nextQueued.phone}</p>
            <p><strong>Message:</strong> {nextQueued.message_body.slice(0, 60)}...</p>
            <p className="text-xs text-gray-500">Scheduled: {new Date(nextQueued.timestamp).toLocaleString()}</p>
          </>
        ) : (
          <p>No queued messages.</p>
        )}
      </div>

      {/* Funnel Summary */}
      <div className="bg-white rounded-2xl shadow-md p-6 col-span-1 md:col-span-2 xl:col-span-3">
        <h2 className="text-lg font-semibold mb-2">Lead Funnel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(funnelStats).map(([status, count]) => (
            <div key={status} className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="font-bold text-indigo-600 text-lg">{count}</p>
              <p className="text-sm text-gray-700">{status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
