import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Label } from '../ui/label';
import supabase from '../../lib/supabaseClient';
import Button from '../ui/button';
import { 
  MessageSquare, 
  Timer, 
  Zap, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Activity
} from 'lucide-react';

export default function MessagingSettings() {
  const { user, loading: authLoading } = useAuth();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [replyMode, setReplyMode] = useState('paced');
  const [hourlyLimit, setHourlyLimit] = useState('30');

  const replyOptions = [
    { 
      label: 'Paced (2–5 min delay)', 
      value: 'paced',
      description: 'Natural conversation flow with human-like response timing'
    },
    { 
      label: 'Status-Based (1–10 min)', 
      value: 'status-based',
      description: 'Response timing adapts based on lead engagement level'
    }
  ];

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    // Use the environment variable you already have set
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // For development
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001'; // or whatever your local API port is
    }
    
    // Fallback - but you shouldn't need this since you have the env var
    return 'https://api.getsurfox.com/api';
  };

  // Enhanced API call helper with better error handling
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const apiBaseUrl = getApiBaseUrl();
      const fullUrl = `${apiBaseUrl}${endpoint}`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      console.log('Making API request to:', fullUrl);

      const response = await fetch(fullUrl, {
        ...options,
        headers
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        // Check if response is HTML (common when API endpoint doesn't exist)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API endpoint not found. Expected JSON but received HTML. Check your API URL: ${fullUrl}`);
        }

        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, include more details
          const responseText = await response.text();
          errorMessage = `${errorMessage}. Response: ${responseText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      
      // Check if response is actually JSON
      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (authLoading) return;
      
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load messaging settings.');
        setSettingsLoading(false);
        setReplyMode('paced');
        setHourlyLimit('30');
        return;
      }

      setSettingsLoading(true);
      setError('');
      try {
        // Updated to use the correct endpoint format
        const settings = await makeAuthenticatedRequest(`/settings?tenant_id=${user.tenant_id}`);

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
      ai_reply_mode: { value: replyMode },
      ai_hourly_throttle_limit: { value: hourlyLimit }
    };

    try {
      // Updated to use the correct endpoint format
      await makeAuthenticatedRequest('/settings', {
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
      <p className="text-gray-600">User not found. Please log in to manage messaging settings.</p>
    </div>
  );

  if (!user.tenant_id && !settingsLoading) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <p className="text-gray-600">Tenant information is missing. Cannot load or save messaging settings.</p>
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

 

      {/* AI Reply Mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Reply Mode</h3>
            <p className="text-gray-600 text-sm">Configure how the AI responds to incoming messages</p>
          </div>
        </div>

        <div className="space-y-4">
          <Label htmlFor="replyMode" className="flex items-center space-x-2 mb-3">
            <Timer className="w-4 h-4 text-gray-500" />
            <span>Response Timing Strategy</span>
          </Label>
          
          <div className="grid gap-4">
            {replyOptions.map((opt) => (
              <div key={opt.value} className="relative">
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  replyMode === opt.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="replyMode"
                      value={opt.value}
                      checked={replyMode === opt.value}
                      onChange={(e) => setReplyMode(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{opt.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{opt.description}</div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message Throttling */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Message Throttling</h3>
            <p className="text-gray-600 text-sm">Prevent spam flags and carrier blocking with smart rate limiting</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hourlyLimit" className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span>Max AI Messages per Hour</span>
            </Label>
            <div className="max-w-xs">
              <input
                id="hourlyLimit"
                type="number"
                min="1"
                max="100"
                value={hourlyLimit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setHourlyLimit(e.target.value)}
              />
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Recommended:</strong> 30-50 messages per hour prevents overwhelming carriers 
                  and reduces the risk of being flagged as spam.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
            <p className="text-gray-600 text-sm">Summary of your messaging automation settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Timer className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Reply Mode</span>
            </div>
            <div className="text-lg font-bold text-gray-900 capitalize">
              {replyMode === 'paced' ? 'Paced (2-5 min)' : 'Status-Based (1-10 min)'}
            </div>
            <div className="text-sm text-gray-600">Response timing strategy</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Zap className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Hourly Limit</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{hourlyLimit} msgs/hr</div>
            <div className="text-sm text-gray-600">Maximum send rate</div>
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
    </div>
  );
}