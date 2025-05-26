// File: src/components/settings/MessagingSettings.jsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// supabaseClient import will be removed as it's no longer needed.
import { Label } from '../ui/label';
import Button from '../ui/button'; // Assuming this is a custom Button component

export default function MessagingSettings() {
  const { user, loading: authLoading } = useAuth(); // Use authLoading
  // tenantId state is removed
  const [settingsLoading, setSettingsLoading] = useState(true); // Renamed from loading
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [replyMode, setReplyMode] = useState('paced');
  const [hourlyLimit, setHourlyLimit] = useState('30');

  const replyOptions = [
    { label: 'Paced (2–5 min delay)', value: 'paced' },
    { label: 'Status-Based (1–10 min)', value: 'status-based' }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      if (authLoading) {
        return; // Wait for auth loading to complete
      }
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load messaging settings.');
        setSettingsLoading(false);
        // Clear existing settings if any
        setReplyMode('paced');
        setHourlyLimit('30');
        return;
      }

      setSettingsLoading(true);
      setError(''); // Clear previous errors
      try {
        // Use user.tenant_id directly
        const res = await fetch(`/api/settings?tenant_id=${user.tenant_id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to fetch settings (${res.status})`);
        }
        const settings = await res.json();

        setReplyMode(settings['ai_reply_mode']?.value || 'paced');
        setHourlyLimit(settings['ai_hourly_throttle_limit']?.value || '30');
      } catch (err) {
        console.error('Error loading messaging settings:', err.message);
        setError(`Failed to load settings: ${err.message}`);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.tenant_id, user?.role, authLoading]); // MODIFIED dependency array

  const handleSave = async () => {
    if (!user || !user.tenant_id) {
      setError('User or tenant information is missing. Cannot save settings.');
      return;
    }
    if (user.role !== 'admin') {
      setError('Admin role required to save settings.');
      // This message is also good to have here, though UI will disable button
      return;
    }

    setSaving(true);
    setSuccess('');
    setError('');

    // Adjusted settingsPayload to not include tenant_id in individual settings
    const settingsPayload = {
      ai_reply_mode: { value: replyMode },
      ai_hourly_throttle_limit: { value: hourlyLimit }
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Include tenant_id at the root of the JSON body
        body: JSON.stringify({ settings: settingsPayload, tenant_id: user.tenant_id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to save settings (${res.status})`);
      }
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <p>Loading user data...</p>;
  }
  if (!user) {
    return <p>User not found. Please log in to manage messaging settings.</p>;
  }
  if (!user.tenant_id && !settingsLoading) {
    return <p>Tenant information is missing. Cannot load or save messaging settings.</p>;
  }
   if (settingsLoading) {
     return <p>Loading messaging settings...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Messaging Settings</h2>

      {error && <p className="text-red-600 p-2 bg-red-100 rounded-md">{error}</p>}
      {success && <p className="text-green-600 p-2 bg-green-100 rounded-md">{success}</p>}

      <div className="space-y-2">
        <Label htmlFor="replyMode">AI Reply Mode</Label>
        <select
          id="replyMode"
          className="w-full border rounded px-3 py-2 max-w-xs"
          value={replyMode}
          onChange={(e) => setReplyMode(e.target.value)}
        >
          {replyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hourlyLimit">Max AI Messages per Hour</Label>
        <input
          id="hourlyLimit"
          type="number"
          min="1"
          value={hourlyLimit}
          className="w-full border rounded px-3 py-2 max-w-xs"
          onChange={(e) => setHourlyLimit(e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-1">
          Prevents overwhelming carriers or triggering spam flags by pacing output.
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <Button 
          onClick={handleSave} 
          disabled={saving || user?.role !== 'admin' || settingsLoading || authLoading}
          aria-disabled={saving || user?.role !== 'admin' || settingsLoading || authLoading}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {user?.role !== 'admin' && !authLoading && (
          <p className="text-sm text-red-500" role="alert">
            Save disabled: Admin role required.
          </p>
        )}
      </div>
    </div>
  );
}
