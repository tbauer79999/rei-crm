// src/components/settings/AISettings.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { Label } from '../ui/label';
import Button from '../ui/button';
import { Input } from '../ui/input';

export default function AISettings() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [minScore, setMinScore] = useState('7');
  const [followupDelay, setFollowupDelay] = useState('3');
  const [escalationMethod, setEscalationMethod] = useState('All');

  const delayOptions = ['1', '3', '7', '14', '30', '60', '90', '180'];
  const methodOptions = ['Email', 'SMS', 'Dashboard Only', 'All'];

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

        setMinScore(settings['ai_min_escalation_score']?.value || '7');
        setFollowupDelay(settings['ai_cold_followup_delay_days']?.value || '3');
        setEscalationMethod(settings['ai_escalation_method']?.value || 'All');
      } catch (err) {
        console.error('Error loading AI settings:', err.message);
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
      ai_min_escalation_score: { value: minScore },
      ai_cold_followup_delay_days: { value: followupDelay },
      ai_escalation_method: { value: escalationMethod }
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload)
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
      <h2 className="text-xl font-semibold">AI Escalation Controls</h2>

      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <div>
        <Label>Minimum Score to Escalate (1–10)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
      </div>

      <div>
        <Label>Cold Follow-Up Delay</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={followupDelay}
          onChange={(e) => setFollowupDelay(e.target.value)}
        >
          {delayOptions.map((d) => (
            <option key={d} value={d}>
              {d === '180' ? '6 months' : `${d} days`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Escalation Method</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={escalationMethod}
          onChange={(e) => setEscalationMethod(e.target.value)}
        >
          {methodOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
