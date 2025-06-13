import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
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

  const [minScore, setMinScore] = useState('75');
  const [followupDelay, setFollowupDelay] = useState('3');
  const [escalationMethod, setEscalationMethod] = useState('All');

  const delayOptions = ['1', '3', '7', '14', '30', '60', '90', '180'];
  const methodOptions = ['Email', 'SMS', 'Dashboard Only', 'All'];

  // Enhanced API call helper
  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse error response, use the default message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (authLoading) return;
      
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load AI settings.');
        setSettingsLoading(false);
        setMinScore('75');
        setFollowupDelay('3');
        setEscalationMethod('All');
        return;
      }

      setSettingsLoading(true);
      setError('');
      try {
        const settings = await makeAuthenticatedRequest(`/api/settings?tenant_id=${user.tenant_id}`);

        setMinScore(settings['ai_min_escalation_score']?.value || '75');
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
    
    if (!['global_admin', 'business_admin'].includes(user.role)) {
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
      await makeAuthenticatedRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsPayload, tenant_id: user.tenant_id })
      });

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

        <div className="space-y-6">
          {/* Current Value Display */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Minimum Score to Escalate</span>
            <div className="flex items-center gap-3">
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: parseInt(minScore) >= 85 ? '#fef2f2' : 
                                 parseInt(minScore) >= 65 ? '#fff7ed' : 
                                 parseInt(minScore) >= 45 ? '#fefce8' : '#eff6ff',
                  color: parseInt(minScore) >= 85 ? '#ef4444' : 
                         parseInt(minScore) >= 65 ? '#f97316' : 
                         parseInt(minScore) >= 45 ? '#eab308' : '#3b82f6'
                }}
              >
                {parseInt(minScore) >= 85 ? '🔥 Hot Lead' : 
                 parseInt(minScore) >= 65 ? '🌶️ Warm Lead' : 
                 parseInt(minScore) >= 45 ? '☀️ Responding' : '❄️ Cold Lead'}
              </div>
              <div className="text-2xl font-bold text-gray-900 min-w-[60px] text-right">
                {minScore}
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="1"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, 
                  #3b82f6 0%, 
                  #3b82f6 ${(parseInt(minScore)-1)/99 * 44}%, 
                  #eab308 ${(parseInt(minScore)-1)/99 * 44}%, 
                  #eab308 ${(parseInt(minScore)-1)/99 * 64}%, 
                  #f97316 ${(parseInt(minScore)-1)/99 * 64}%, 
                  #f97316 ${(parseInt(minScore)-1)/99 * 84}%, 
                  #ef4444 ${(parseInt(minScore)-1)/99 * 84}%, 
                  #ef4444 ${(parseInt(minScore)-1)/99 * 100}%, 
                  #e5e7eb ${(parseInt(minScore)-1)/99 * 100}%, 
                  #e5e7eb 100%)`
              }}
            />
            
            {/* Zone Labels */}
            <div className="flex justify-between mt-2 px-1">
              <div className="flex flex-col items-center">
                <span className="text-xs text-blue-600 font-medium">❄️</span>
                <span className="text-xs text-gray-500">Cold</span>
                <span className="text-xs text-gray-400">0-44</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-yellow-600 font-medium">☀️</span>
                <span className="text-xs text-gray-500">Responding</span>
                <span className="text-xs text-gray-400">45-64</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-orange-600 font-medium">🌶️</span>
                <span className="text-xs text-gray-500">Warm</span>
                <span className="text-xs text-gray-400">65-84</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-red-600 font-medium">🔥</span>
                <span className="text-xs text-gray-500">Hot</span>
                <span className="text-xs text-gray-400">85-100</span>
              </div>
            </div>
          </div>

          {/* Helper Text */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Leads scoring <span className="font-semibold text-gray-900">{minScore} or higher</span> will be automatically escalated to your sales team.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              💡 Most SaaS companies set this between 70-80 for optimal balance
            </div>
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
            <div className="text-2xl font-bold text-gray-900">{minScore}/100</div>
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

      {/* Score Reference Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">Score Reference Guide</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white/60 rounded-lg p-3">
            <div className="font-semibold text-red-600">🔥 85-100</div>
            <div className="text-gray-600">Hot Lead</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <div className="font-semibold text-orange-600">🌶️ 65-84</div>
            <div className="text-gray-600">Warm Lead</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <div className="font-semibold text-yellow-600">☀️ 45-64</div>
            <div className="text-gray-600">Responding</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <div className="font-semibold text-blue-600">❄️ 0-44</div>
            <div className="text-gray-600">Cold Lead</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-4">
          {!['global_admin', 'business_admin'].includes(user?.role) && !authLoading && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Admin role required to save changes</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !['global_admin', 'business_admin'].includes(user?.role) || settingsLoading || authLoading}
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

      {/* Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: none;
        }
      `}</style>
    </div>
  );
}