// src/components/onboarding/Step5_AutomationPreferences.jsx
import { useState } from 'react';
import { Zap, MessageCircle, Rocket } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

export default function Step5_AutomationPreferences({ tenantId, formData, setFormData, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user and their profile to ensure we use the correct tenant_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Get the user's tenant_id from their profile (this is what RLS checks against)
      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const updates = [
        { key: 'AIOverride', value: formData.aiEnabled.toString() },
        { key: 'QueuedResponseEnabled', value: formData.reengagement.toString() }
      ];

      console.log('Inserting automation preferences for tenant:', profile.tenant_id);
      const { error } = await supabase.from('platform_settings')
        .upsert(updates.map(u => ({ ...u, tenant_id: profile.tenant_id })), { onConflict: ['tenant_id', 'key'] });

      if (error) {
        console.error('Automation preferences error:', error);
        throw error;
      }

      console.log('Automation preferences saved successfully');
      onNext();
    } catch (err) {
      console.error('Step5 error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
          Enable smart features
        </h2>
        <p className="text-gray-600 mt-2">Configure automation and AI capabilities</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div
          onClick={() => setFormData({...formData, aiEnabled: !formData.aiEnabled})}
          className={`
            p-6 border-2 rounded-xl cursor-pointer transition-all duration-200
            ${formData.aiEnabled 
              ? 'border-yellow-500 bg-yellow-50' 
              : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle size={24} className={formData.aiEnabled ? 'text-yellow-500' : 'text-gray-400'} />
              <div>
                <div className="font-semibold">AI Conversations</div>
                <div className="text-sm text-gray-500">Automatically engage with responding leads</div>
              </div>
            </div>
            <div className={`
              w-12 h-6 rounded-full transition-all duration-200 relative
              ${formData.aiEnabled ? 'bg-yellow-500' : 'bg-gray-300'}
            `}>
              <div className={`
                w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200
                ${formData.aiEnabled ? 'left-6' : 'left-0.5'}
              `} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFormData({...formData, reengagement: !formData.reengagement})}
          className={`
            p-6 border-2 rounded-xl cursor-pointer transition-all duration-200
            ${formData.reengagement 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket size={24} className={formData.reengagement ? 'text-orange-500' : 'text-gray-400'} />
              <div>
                <div className="font-semibold">Smart Re-engagement</div>
                <div className="text-sm text-gray-500">Follow up with non-responsive leads automatically</div>
              </div>
            </div>
            <div className={`
              w-12 h-6 rounded-full transition-all duration-200 relative
              ${formData.reengagement ? 'bg-orange-500' : 'bg-gray-300'}
            `}>
              <div className={`
                w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200
                ${formData.reengagement ? 'left-6' : 'left-0.5'}
              `} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`
            px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
            ${!loading
              ? 'bg-gradient-to-r from-orange-500 to-yellow-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {loading ? 'Saving...' : 'Continue to Step 6'}
        </button>
      </div>
    </div>
  );
}