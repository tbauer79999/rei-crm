import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleSave = async (key) => {
    try {
      setSaving(true);
      const value = settings[key].value;
      await axios.put(`/api/settings/${encodeURIComponent(key)}`, { value });
      await fetchSettings(); // Refresh
    } catch (err) {
      console.error('Error saving setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderTextareaSetting = (label, key) => (
    <div className="bg-white rounded shadow p-4 mb-6">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        rows={4}
        className="w-full border rounded p-2 text-sm"
        value={settings[key]?.value || ''}
        onChange={(e) => handleChange(key, e.target.value)}
      />
      <button
        onClick={() => handleSave(key)}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  const renderToggleSetting = (label, key) => {
    const value = settings[key]?.value === 'true';
    return (
      <div className="bg-white rounded shadow p-4 mb-6 flex justify-between items-center">
        <div>
          <label className="block text-sm font-medium">{label}</label>
          <p className="text-xs text-gray-500 mt-1">Toggle setting for this feature</p>
        </div>
        <button
          onClick={() => handleSave(key)}
          className={`text-xs px-4 py-2 rounded ${value ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'}`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </button>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleChange(key, e.target.checked.toString())}
          className="ml-4 h-5 w-5 text-blue-600"
        />
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center text-sm">Loading settings...</div>;

return (
  <div className="p-6 max-w-4xl mx-auto bg-gray-100 min-h-screen space-y-4">
    <h1 className="text-2xl font-bold mb-4">Platform Settings</h1>

    {renderTextareaSetting('Campaigns (one per line)', 'Campaigns')}
    {renderTextareaSetting('Status Options (one per line)', 'Statuses')}
    {renderToggleSetting('Enable AI Automation', 'AI Enabled')}
    {renderToggleSetting('Enable 30-Day Follow-Ups', 'Follow-Up Enabled')}
  </div>
);

}
