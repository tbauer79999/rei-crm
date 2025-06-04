import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Label } from '../ui/label';
import Button from '../ui/button';
import { Input } from '../ui/input';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Bell, 
  CheckCircle, 
  AlertCircle,
  Settings
} from 'lucide-react';

export default function AISettings() {
  const { user, loading: authLoading } = useAuth();
  const [settingsLoading, setSettingsLoading] = useState(true);
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
      if (authLoading) return;
      
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load AI settings.');
        setSettingsLoading(false);
        setMinScore('7');
        setFollowupDelay('3');
        setEscalationMethod('All');
        return;
      }

      setSettingsLoading(true);
      setError('');
      try {
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
  }, [user?.tenant_id, user?.role, authLoading]);

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
        body: JSON.stringify({ settings: settingsPayload, tenant_id: user.tenant_id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to save settings (${res.status})`);
      }
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-gray-600">User not found. Please log in to manage AI settings.</p>
    </div>
  );

  if (!user.tenant_id && !settingsLoading) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <p className="text-gray-600">Tenant information is missing. Cannot load or save AI settings.</p>
    </div>
  );

  if (settingsLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Escalation Score Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Escalation Scoring</h3>
            <p className="text-gray-600 text-sm">Configure when leads should be escalated to your sales team</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="minScore" className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span>Minimum Score to Escalate (1–10)</span>
            </Label>
            <div className="max-w-xs">
              <Input
                id="minScore"
                type="number"
                min={1}
                max={10}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="7"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Leads scoring at or above this threshold will be automatically escalated to your team.
            </p>
          </div>
        </div>
      </div>

      {/* Follow-up Timing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Follow-up Timing</h3>
            <p className="text-gray-600 text-sm">Control how long the AI waits before following up with cold leads</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="followupDelay" className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Cold Follow-Up Delay</span>
            </Label>
            <div className="max-w-xs">
              <select
                id="followupDelay"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <p className="text-sm text-gray-500 mt-2">
              Time to wait before sending follow-up messages to unresponsive leads.
            </p>
          </div>
        </div>
      </div>

      {/* Escalation Method */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Escalation Notifications</h3>
            <p className="text-gray-600 text-sm">Choose how you want to be notified about hot leads</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="escalationMethod" className="flex items-center space-x-2 mb-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <span>Notification Method</span>
            </Label>
            <div className="max-w-xs">
              <select
                id="escalationMethod"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={escalationMethod}
                onChange={(e) => setEscalationMethod(e.target.value)}
              >
                {methodOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              How you'll be alerted when leads meet your escalation criteria.
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
            <p className="text-gray-600 text-sm">Summary of your AI automation settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{minScore}/10</div>
            <div className="text-sm text-gray-600">Escalation Score</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {followupDelay === '180' ? '6mo' : followupDelay === '1' ? '1d' : `${followupDelay}d`}
            </div>
            <div className="text-sm text-gray-600">Follow-up Delay</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-bold text-gray-900">{escalationMethod}</div>
            <div className="text-sm text-gray-600">Alert Method</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-4">
          {user?.role !== 'admin' && !authLoading && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Admin role required to save changes</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || user?.role !== 'admin' || settingsLoading || authLoading}
            className="px-6 py-2"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}