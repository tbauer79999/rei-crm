import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { callEdgeFunction } from '../../lib/edgeFunctionAuth';

// Edge Function URLs - Update these when you create the edge functions
const SETTINGS_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/settings';
const CUSTOMIZATION_URL = 'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/customization-settings';

const CustomizationPanel = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Example: Fetch customization settings
      // const data = await callEdgeFunction(CUSTOMIZATION_URL);
      // setSettings(data);
      
      // For now, using static data
      setSettings({
        campaigns: {
          tones: ['Friendly', 'Assertive', 'Aggressive'],
          personas: ['Consultant', 'Closer', 'Icebreaker'],
          industries: ['Real Estate', 'Staffing', 'B2B']
        },
        features: {
          aiAfterHours: true,
          aiColdFollowup: true,
          escalationNotifications: true
        },
        escalation: {
          scoreThreshold: 7,
          replyThreshold: 3,
          method: 'SMS + Dashboard Flag'
        }
      });
      
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (feature) => {
    try {
      // Example implementation when backend is ready:
      // await callEdgeFunction(SETTINGS_URL, {
      //   method: 'POST',
      //   body: {
      //     feature,
      //     enabled: !settings.features[feature]
      //   }
      // });
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        features: {
          ...prev.features,
          [feature]: !prev.features[feature]
        }
      }));
      
    } catch (err) {
      console.error('Error toggling feature:', err);
      alert('Failed to update feature. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Failed to load settings</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button 
          onClick={fetchSettings} 
          className="mt-2 text-sm text-red-600 underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Card 1: Campaign Personalization */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Campaign Personalization</div>
        <div className="text-sm text-gray-500 mb-4">Modify tone, persona, and industry context per campaign</div>
        <div className="text-sm text-gray-700">
          <div className="mb-2">
            <strong>Tones:</strong> {settings?.campaigns?.tones?.join(', ') || 'Loading...'}
          </div>
          <div className="mb-2">
            <strong>Personas:</strong> {settings?.campaigns?.personas?.join(', ') || 'Loading...'}
          </div>
          <div>
            <strong>Industries:</strong> {settings?.campaigns?.industries?.join(', ') || 'Loading...'}
          </div>
        </div>
        <button className="mt-3 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
          Edit Campaigns
        </button>
      </div>

      {/* Card 2: Feature Toggles */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Feature Toggles</div>
        <div className="text-sm text-gray-500 mb-4">Enable/disable AI features per tenant</div>
        <div className="space-y-2">
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={settings?.features?.aiAfterHours || false}
              onChange={() => handleToggleFeature('aiAfterHours')}
              className="mr-2"
            />
            AI After-Hours Override
          </label>
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={settings?.features?.aiColdFollowup || false}
              onChange={() => handleToggleFeature('aiColdFollowup')}
              className="mr-2"
            />
            AI Cold Follow-up Campaign
          </label>
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={settings?.features?.escalationNotifications || false}
              onChange={() => handleToggleFeature('escalationNotifications')}
              className="mr-2"
            />
            Escalation Notifications
          </label>
        </div>
      </div>

      {/* Card 3: Instruction & Prompt Settings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Instruction & Prompt Settings</div>
        <div className="text-sm text-gray-500 mb-4">Review or edit your AI instructions and tone/prompt bundle</div>
        <div className="text-sm text-gray-700 italic">
          "Speak with confidence. Focus on surfacing motivation..."
        </div>
        <button className="mt-3 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
          Edit Instructions
        </button>
      </div>

      {/* Card 4: Escalation Preview Settings */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
        <div className="text-lg font-semibold mb-2">Escalation Preview Settings</div>
        <div className="text-sm text-gray-500 mb-4">Visualize when and how AI escalates based on score & reply logic</div>
        <div className="text-sm text-gray-700">
          <strong>Trigger Rule:</strong><br />
          - Score ≥ <strong>{settings?.escalation?.scoreThreshold || 7}</strong><br />
          - After <strong>{settings?.escalation?.replyThreshold || 3} replies</strong> from lead<br />
          <br />
          <strong>Escalation Method:</strong><br />
          - {settings?.escalation?.method || 'SMS + Dashboard Flag'}
        </div>
        <button className="mt-3 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
          Configure Rules
        </button>
      </div>
    </div>
  );
};

export default CustomizationPanel;