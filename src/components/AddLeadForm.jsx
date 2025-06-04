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

      // Check if a campaign is selected
      if (!form.campaign_id) {
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
          campaign_id: form.campaign_id,
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

      {/* Campaign Selection Dropdown */}
      {loadingCampaigns ? (
        <p>Loading campaigns...</p>
      ) : errorCampaigns ? (
        <p className="text-red-500">Error loading campaigns: {errorCampaigns}</p>
      ) : (
        <select
          name="campaign_id"
          value={form.campaign_id}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        >
          <option value="">Select a Campaign</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={String(campaign.id)}> {/* <--- CHANGE IS HERE: String(campaign.id) */}
              {campaign.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loadingCampaigns}
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