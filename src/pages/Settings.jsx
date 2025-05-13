import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

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

  const handleChange = (key, newValue) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: newValue,
      },
    }));
  };

  const handleSave = async (key) => {
    try {
      setSavingKey(key);
      const payload = {
        value: settings[key].value,
      };
      await axios.put(`/api/settings/${key}`, payload);
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
    } finally {
      setSavingKey(null);
    }
  };

  const renderTextareaSetting = (label, key) => (
    <div className="mb-6">
      <label className="block font-semibold mb-1">{label}</label>
      <textarea
        className="w-full border rounded p-2 h-32"
        value={settings[key]?.value || ''}
        onChange={(e) => handleChange(key, e.target.value)}
      />
      <button
        onClick={() => handleSave(key)}
        disabled={savingKey === key}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {savingKey === key ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  const renderToggleSetting = (label, key) => {
    const value = settings[key]?.value === 'true';
    return (
      <div className="mb-6">
        <label className="flex items-center space-x-2 font-semibold">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(key, e.target.checked.toString())}
          />
          <span>{label}</span>
        </label>
        <button
          onClick={() => handleSave(key)}
          disabled={savingKey === key}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {savingKey === key ? 'Saving...' : 'Save'}
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>

      {renderTextareaSetting('Campaigns (one per line)', 'Campaigns')}
      {renderTextareaSetting('Status Options (one per line)', 'Statuses')}
      {renderToggleSetting('Enable AI Automation', 'AI Enabled')}
      {renderToggleSetting('Enable 30-Day Follow-Ups', 'Follow-Up Enabled')}
    </div>
  );
}
