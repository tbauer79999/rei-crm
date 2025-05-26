// src/components/settings/AISettings.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// supabase client is no longer needed here directly for tenant_id fetching
import { Label } from '../ui/label';
import Button from '../ui/button'; // Assuming this is a custom Button component
import { Input } from '../ui/input';

export default function AISettings() {
  const { user, loading: authLoading } = useAuth(); // Use authLoading
  // tenantId state is removed
  const [settingsLoading, setSettingsLoading] = useState(true); // Renamed from loading
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
      if (authLoading) {
        return; // Wait for auth loading to complete
      }
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load AI settings.');
        setSettingsLoading(false);
        // Clear existing settings if any
        setMinScore('7');
        setFollowupDelay('3');
        setEscalationMethod('All');
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

        setMinScore(settings['ai_min_escalation_score']?.value || '7');
        setFollowupDelay(settings['ai_cold_followup_delay_days']?.value || '3');
        setEscalationMethod(settings['ai_escalation_method']?.value || 'All');
      } catch (err) {
        console.error('Error loading AI settings:', err.message);
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
      return;
    }

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
        // Include tenant_id in the payload
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
    return <p>User not found. Please log in to manage AI settings.</p>;
  }
  // This check is now partly handled in useEffect, but good for initial render block
  if (!user.tenant_id && !settingsLoading) { // Avoid showing this if settings are about to load
    return <p>Tenant information is missing. Cannot load or save AI settings.</p>;
  }
  if (settingsLoading) { // Show settings loading only if user and tenant_id are available
     return <p>Loading AI settings...</p>;
  }


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">AI Escalation Controls</h2>

      {error && <p className="text-red-600 p-2 bg-red-100 rounded-md">{error}</p>}
      {success && <p className="text-green-600 p-2 bg-green-100 rounded-md">{success}</p>}

      <div className="space-y-2">
        <Label htmlFor="minScore">Minimum Score to Escalate (1–10)</Label>
        <Input
          id="minScore"
          type="number"
          min={1}
          max={10}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="followupDelay">Cold Follow-Up Delay</Label>
        <select
          id="followupDelay"
          className="w-full border rounded px-3 py-2 max-w-xs"
          value={followupDelay}
          onChange={(e) => setFollowupDelay(e.target.value)}
        >
          {delayOptions.map((d) => (
            <option key={d} value={d}>
              {d === '180' ? '6 months' : d === '1' ? '1 day' : `${d} days`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="escalationMethod">Escalation Method</Label>
        <select
          id="escalationMethod"
          className="w-full border rounded px-3 py-2 max-w-xs"
          value={escalationMethod}
          onChange={(e) => setEscalationMethod(e.target.value)}
        >
          {methodOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
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
