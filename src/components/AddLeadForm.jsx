import React, { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AddLeadForm({ onSuccess, onCancel }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'Hot Lead',
    campaign_id: '',
  });

  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [errorCampaigns, setErrorCampaigns] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user || !user.tenant_id) {
        setErrorCampaigns('User or tenant ID not available. Cannot fetch campaigns.');
        setLoadingCampaigns(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true);

        if (error) {
          throw error;
        }
        setCampaigns(data);
        setErrorCampaigns(null);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setErrorCampaigns(error.message);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, [user]);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setCreatingCampaign(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            name: newCampaignName.trim(),
            tenant_id: user.tenant_id,
            is_active: true,
            created_at: now,
            start_date: now, // Add required start_date field
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new campaign to the list
      setCampaigns([...campaigns, data]);
      
      // Auto-select the new campaign
      setForm({ ...form, campaign_id: String(data.id) });
      
      // Reset create campaign form
      setNewCampaignName('');
      setShowCreateCampaign(false);
      
      alert('Campaign created successfully!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(`Error creating campaign: ${error.message}`);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("FORM SUBMITTED!", form);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || localStorage.getItem('auth_token');

      if (!user || !user.tenant_id || !accessToken) {
        alert('User authentication information not available. Please log in.');
        return;
      }

      // Allow submission without campaign if no campaigns exist
      if (!form.campaign_id && campaigns.length > 0) {
        alert('Please select a campaign for the lead.');
        return;
      }

      const edgeFunctionUrl = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/my-first-qualification-function'; 

      const res = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          status: form.status,
          tenant_id: user.tenant_id,
          campaign_id: form.campaign_id || null, // Allow null if no campaigns
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit lead');
      }

      alert('Lead submitted successfully!');
      setForm({ name: '', phone: '', email: '', status: 'Hot Lead', campaign_id: '' });
      onSuccess();
    } catch (error) {
      console.error('Error submitting lead:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-xl shadow border-2 border-gray-300 mb-6 max-w-xl mx-auto"
    >
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Name"
        className="w-full border px-3 py-2 rounded"
        required
      />
      <input
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="Phone"
        className="w-full border px-3 py-2 rounded"
        required
      />
      <input
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Email"
        className="w-full border px-3 py-2 rounded"
        type="email"
      />
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
      >
        <option>Hot Lead</option>
        <option>Cold Lead</option>
        <option>Unsubscribed</option>
      </select>

      {/* Campaign Selection Section */}
      {loadingCampaigns ? (
        <p>Loading campaigns...</p>
      ) : errorCampaigns ? (
        <p className="text-red-500">Error loading campaigns: {errorCampaigns}</p>
      ) : campaigns.length === 0 ? (
        // No campaigns exist - show create option
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-yellow-800 text-sm mb-2">
              No campaigns found. You can either create a new campaign or add the lead without one.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateCampaign(!showCreateCampaign)}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              {showCreateCampaign ? 'Cancel' : 'Create New Campaign'}
            </button>
          </div>
          
          {showCreateCampaign && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Campaign name"
                className="flex-1 border px-3 py-2 rounded"
                disabled={creatingCampaign}
              />
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={creatingCampaign}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {creatingCampaign ? 'Creating...' : 'Create'}
              </button>
            </div>
          )}
        </div>
      ) : (
        // Campaigns exist - show dropdown
        <div className="space-y-2">
          <select
            name="campaign_id"
            value={form.campaign_id}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select a Campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={String(campaign.id)}>
                {campaign.name}
              </option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={() => setShowCreateCampaign(!showCreateCampaign)}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            {showCreateCampaign ? 'Cancel' : 'Create New Campaign'}
          </button>
          
          {showCreateCampaign && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Campaign name"
                className="flex-1 border px-3 py-2 rounded"
                disabled={creatingCampaign}
              />
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={creatingCampaign}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {creatingCampaign ? 'Creating...' : 'Create'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loadingCampaigns || creatingCampaign}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}