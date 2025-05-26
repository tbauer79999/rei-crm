// File: src/components/settings/MessagingSettings.jsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { Label } from '../ui/label';
import Button from '../ui/button';

export default function MessagingSettings() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
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
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', user?.id)
          .single();

        if (profileError || !profile?.tenant_id) {
          throw new Error('Tenant ID not found.');
        }

        setTenantId(profile.tenant_id);

        const res = await fetch(`/api/settings?tenant_id=${profile.tenant_id}`);
        const settings = await res.json();

        setReplyMode(settings['ai_reply_mode']?.value || 'paced');
        setHourlyLimit(settings['ai_hourly_throttle_limit']?.value || '30');
      } catch (err) {
        console.error('Error loading messaging settings:', err.message);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchSettings();
  }, [user]);

const handleSave = async () => {
  setSaving(true);
  setSuccess('');
  setError('');

  const settingsPayload = {
    ai_reply_mode: {
      value: replyMode,
      tenant_id: user?.tenant_id, // ✅ include tenant_id here
    },
    ai_hourly_throttle_limit: {
      value: hourlyLimit,
      tenant_id: user?.tenant_id, // ✅ include tenant_id here
    },
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsPayload),
    });

    if (!res.ok) throw new Error('Failed to save settings');
    setSuccess('Settings saved successfully!');
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Messaging Settings</h2>

      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <div>
        <Label>AI Reply Mode</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={replyMode}
          onChange={(e) => setReplyMode(e.target.value)}
        >
          {replyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Max AI Messages per Hour</Label>
        <input
          type="number"
          min="1"
          value={hourlyLimit}
          className="w-full border rounded px-3 py-2"
          onChange={(e) => setHourlyLimit(e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-1">
          Prevents overwhelming carriers or triggering spam flags by pacing output.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
