// src/components/onboarding/Step2_AIStyle.jsx
import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles, Users } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

const toneOptions = [
  { value: 'Friendly & Casual', icon: '😊', desc: 'Warm and approachable communication' },
  { value: 'Professional & Polite', icon: '🤝', desc: 'Formal and respectful tone' },
  { value: 'Confident & Assertive', icon: '💪', desc: 'Direct and confident approach' },
  { value: 'Urgent & Direct', icon: '⚡', desc: 'Fast-paced and action-oriented' }
];

const personaOptions = [
  { value: 'Helpful Assistant', icon: '🤖', desc: 'Supportive and informative' },
  { value: 'Hard Closer', icon: '🎯', desc: 'Results-focused and persuasive' },
  { value: 'Friendly Neighbor', icon: '👋', desc: 'Casual and personable' },
  { value: 'Patient Consultant', icon: '🧠', desc: 'Thoughtful and educational' }
];

export default function Step2_AIStyle({ tenantId, formData, setFormData, onNext }) {
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch industry from tenants table
    const fetchIndustry = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('industry')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching tenant industry:', error);
        return;
      }

      setIndustry(data?.industry || '');
    };

    if (tenantId) fetchIndustry();
  }, [tenantId]);

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

      console.log('User ID:', user.id);
      console.log('Profile tenant_id:', profile.tenant_id);
      console.log('Passed tenantId:', tenantId);

      // Use the tenant_id from the user's profile (this is what RLS expects)
      const { data, error } = await supabase.from('ai_instruction_bundles').insert([
        {
          tenant_id: profile.tenant_id, // Use profile tenant_id instead of passed tenantId
          tone: formData.tone,
          persona: formData.persona,
          industry,
          use_case: '',
          role: '',
          full_bundle: '',
        },
      ]).select();

      if (error) {
        console.error('AI instruction bundle insert error:', error);
        throw error;
      }

      console.log('AI instruction bundle created:', data);
      onNext();
    } catch (err) {
      console.error('Step2 error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Configure your AI assistant
        </h2>
        <p className="text-gray-600 mt-2">Choose how your AI will communicate with leads</p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" />
            Communication Tone
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toneOptions.map(option => (
              <div
                key={option.value}
                onClick={() => setFormData({...formData, tone: option.value})}
                className={`
                  p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${formData.tone === option.value 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.value}</div>
                    <div className="text-sm text-gray-500">{option.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-pink-500" />
            AI Persona
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personaOptions.map(option => (
              <div
                key={option.value}
                onClick={() => setFormData({...formData, persona: option.value})}
                className={`
                  p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${formData.persona === option.value 
                    ? 'border-pink-500 bg-pink-50' 
                    : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.value}</div>
                    <div className="text-sm text-gray-500">{option.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {industry && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Industry:</strong> {industry} (auto-filled from step 1)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.tone || !formData.persona}
          className={`
            px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
            ${(formData.tone && formData.persona) && !loading
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {loading ? 'Saving...' : 'Continue to Step 3'}
        </button>
      </div>
    </div>
  );
}