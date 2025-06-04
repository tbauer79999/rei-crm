// src/components/controlroom/HotLeadHandoffPanel.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../lib/apiClient';

const HotLeadHandoffPanel = () => {
  const { user } = useAuth();
  const [hotLeads, setHotLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.tenant_id) {
      console.error('No tenant_id available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching hot leads data for tenant:', user.tenant_id);

// Fetch hot leads
const hotLeadsResponse = await apiClient.get(`/hot?tenant_id=${user.tenant_id}`);
console.log('Hot leads response:', hotLeadsResponse.data);
setHotLeads(hotLeadsResponse.data.hotLeads || []);


// Fetch summary stats
const summaryResponse = await apiClient.get(`/hot-summary?tenant_id=${user.tenant_id}`);
console.log('Hot summary response:', summaryResponse.data);
setStats(summaryResponse.data || {});


    } catch (error) {
      console.error('Error fetching hot leads data:', error);
      // Set empty states on error
      setHotLeads([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleCallLead = async (leadId) => {
    if (!user?.tenant_id) {
      console.error('No tenant_id available for call logging');
      return;
    }

    try {
      console.log('Calling lead:', leadId);
      
      // Log the call in the database
      const response = await apiClient.post('/call-logging/log-call', {
  lead_id: leadId,
  tenant_id: user.tenant_id
});


      if (response.data.success) {
        // Update the local state
        setHotLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, call_logged: true }
              : lead
          )
        );

        // Show outcome selection modal
        const lead = hotLeads.find(l => l.id === leadId);
        setSelectedLead(lead);
        setShowOutcomeModal(true);

        console.log('Call logged successfully!');
      }

    } catch (error) {
      console.error('Error logging call:', error);
      alert('Failed to log call. Please try again.');
    }
  };

  const handleOutcomeSelection = async (outcome) => {
    if (!selectedLead || !user?.tenant_id) return;

 try {
  const response = await apiClient.post('/call-logging/update-outcome', {
    lead_id: selectedLead.id,
    tenant_id: user.tenant_id,
    outcome: outcome
  });

      if (response.data.success) {
        console.log('Outcome updated successfully!');
        setShowOutcomeModal(false);
        setSelectedLead(null);
        
        // Refresh data to get updated stats
        fetchData();
      }

    } catch (error) {
      console.error('Error updating outcome:', error);
      alert('Failed to update call outcome. Please try again.');
    }
  };

  const handleViewChat = (leadId) => {
    // Navigate to the lead's chat/messages view
    console.log('Viewing chat for lead:', leadId);
    // You could navigate to a messages page or open a modal
  };

  // Show loading or auth state
  if (!user) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
          <div className="text-center text-gray-500">
            Please log in to view hot leads
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const uncalledLeads = hotLeads.filter((lead) => !lead.call_logged);
  const previewLeads = uncalledLeads.slice(0, 3);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Hot Leads Awaiting Action */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
          <div className="text-lg font-semibold mb-2">
            🔥 Hot Leads Awaiting Action ({uncalledLeads.length} uncalled)
          </div>
          <div className="text-sm text-gray-500 mb-4">
            AI-flagged leads within the last 48 hours still waiting for a sales follow-up
          </div>

          {previewLeads.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <div className="text-2xl mb-2">🎉</div>
              <div>No hot leads awaiting calls!</div>
            </div>
          ) : (
            previewLeads.map((lead) => (
              <div key={lead.id} className="border-t pt-3 mt-3">
                <div className="font-medium text-sm">
                  {lead.name} - Marked Hot: {lead.marked_hot_time_ago}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {lead.snippet}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Campaign: {lead.campaign || 'Unknown'}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCallLead(lead.id)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                  >
                    📞 Call
                  </button>
                  <button 
                    onClick={() => handleViewChat(lead.id)}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                  >
                    💬 View Chat
                  </button>
                </div>
              </div>
            ))
          )}

          {uncalledLeads.length > 3 && (
            <button className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full">
              View Full Queue ({uncalledLeads.length - 3} more)
            </button>
          )}
        </div>

        {/* Card 2: AI → Sales Time Lag */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
          <div className="text-lg font-semibold mb-2">⏱️ AI → Sales Time Lag</div>
          <div className="text-sm text-gray-500 mb-4">
            Time elapsed between AI marking a lead hot and first human follow-up
          </div>
          <ul className="text-sm space-y-2">
            <li><strong>Avg Response Time:</strong> <span className="text-blue-600">{stats.avg_response || '—'}</span></li>
            <li><strong>Fastest:</strong> <span className="text-green-600">{stats.fastest_response || '—'}</span></li>
            <li><strong>Slowest:</strong> <span className="text-red-600">{stats.slowest_response || '—'}</span></li>
          </ul>
          
          {stats.avg_response === '—' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              💡 Start logging calls to see response time metrics
            </div>
          )}
        </div>

        {/* Card 3: Sales Outcomes (Last 7 Days) */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
          <div className="text-lg font-semibold mb-2">📊 Sales Outcomes (Last 7 Days)</div>
          <div className="text-sm text-gray-500 mb-4">Results from sales outreach on hot leads</div>
          <ul className="text-sm space-y-1">
            <li>✅ Connected: <strong className="text-green-600">{stats.connected || 0}</strong></li>
            <li>📞 Voicemail: <strong className="text-yellow-600">{stats.voicemail || 0}</strong></li>
            <li>📵 No Answer: <strong className="text-gray-600">{stats.no_answer || 0}</strong></li>
            <li>⛔ Not a Fit: <strong className="text-red-600">{stats.not_fit || 0}</strong></li>
            <li>🎯 Qualified: <strong className="text-blue-600">{stats.qualified || 0}</strong></li>
          </ul>

          {(stats.connected || 0) === 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              💡 Call outcomes will appear here as you log calls
            </div>
          )}
        </div>
      </div>

      {/* Call Outcome Modal */}
      {showOutcomeModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Call Outcome for {selectedLead.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              How did the call go?
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleOutcomeSelection('connected')}
                className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm hover:bg-green-200 transition-colors"
              >
                ✅ Connected
              </button>
              <button 
                onClick={() => handleOutcomeSelection('voicemail')}
                className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm hover:bg-yellow-200 transition-colors"
              >
                📞 Voicemail
              </button>
              <button 
                onClick={() => handleOutcomeSelection('no_answer')}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                📵 No Answer
              </button>
              <button 
                onClick={() => handleOutcomeSelection('not_fit')}
                className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm hover:bg-red-200 transition-colors"
              >
                ⛔ Not a Fit
              </button>
              <button 
                onClick={() => handleOutcomeSelection('qualified')}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                🎯 Qualified
              </button>
              <button 
                onClick={() => handleOutcomeSelection('interested')}
                className="bg-purple-100 text-purple-800 px-4 py-2 rounded text-sm hover:bg-purple-200 transition-colors"
              >
                😊 Interested
              </button>
            </div>

            <button 
              onClick={() => setShowOutcomeModal(false)}
              className="mt-4 w-full bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HotLeadHandoffPanel;