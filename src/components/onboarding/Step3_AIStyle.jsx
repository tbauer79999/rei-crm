// src/components/onboarding/Step2_AIStyle.jsx
import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles, Users, Bot } from 'lucide-react';
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
  const [industryId, setIndustryId] = useState('');
  const [archetypes, setArchetypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Get industry ID from tenant
  useEffect(() => {
    const fetchIndustryId = async () => {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('industry')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching tenant industry:', error);
        return;
      }

      setIndustryId(tenant?.industry || '');
    };

    if (tenantId) fetchIndustryId();
  }, [tenantId]);

  // Step 2: Load archetypes for that industry
  useEffect(() => {
    const fetchArchetypes = async () => {
      if (!industryId) return;

      const { data, error } = await supabase
        .from('ai_archetypes')
        .select('*')
        .contains('allowed_industries', [industryId]);

      if (error) {
        console.error('Error fetching archetypes:', error);
        return;
      }

      setArchetypes(data);
    };

    fetchArchetypes();
  }, [industryId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (profileError || !profile) throw new Error('User profile not found');

      const { data, error } = await supabase.from('ai_instruction_bundles').insert([{
        tenant_id: profile.tenant_id,
        tone: formData.tone,
        persona: formData.persona,
        archetype: formData.archetype || '',
        industry: industryId,
        use_case: '',
        role: '',
        full_bundle: '',
      }]);

      if (error) throw error;

      onNext();
    } catch (err) {
      console.error('Submit error:', err);
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
        {/* Tone selector */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" />
            Communication Tone
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toneOptions.map(option => (
              <div
                key={option.value}
                onClick={() => setFormData({ ...formData, tone: option.value })}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.tone === option.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
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

        {/* Persona selector */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-pink-500" />
            AI Persona
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personaOptions.map(option => (
              <div
                key={option.value}
                onClick={() => setFormData({ ...formData, persona: option.value })}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.persona === option.value
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                }`}
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

        {/* Archetype selector */}
        {archetypes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bot size={20} className="text-indigo-500" />
              Choose an AI Assistant Archetype
            </h3>
            <select
              className="w-full p-3 border rounded-lg"
              value={formData.archetype || ''}
              onChange={(e) => setFormData({ ...formData, archetype: e.target.value })}
            >
              <option value="">Select an archetype</option>
              {archetypes.map(arc => (
                <option key={arc.id} value={arc.key}>
                  {arc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.tone || !formData.persona || !formData.archetype}
          className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            formData.tone && formData.persona && formData.archetype && !loading
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Saving...' : 'Continue to Step 3'}
        </button>
      </div>
    </div>
  );
}
