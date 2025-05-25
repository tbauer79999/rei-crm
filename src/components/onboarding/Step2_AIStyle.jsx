// src/components/onboarding/Step2_AIStyle.jsx
import { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';
import Button from '../ui/button';
import { Select } from '../ui/select';

const toneOptions = [
  { value: 'Friendly & Casual', label: 'Friendly & Casual' },
  { value: 'Professional & Polite', label: 'Professional & Polite' },
  { value: 'Confident & Assertive', label: 'Confident & Assertive' },
  { value: 'Urgent & Direct', label: 'Urgent & Direct' },
];

const personaOptions = [
  { value: 'Helpful Assistant', label: 'Helpful Assistant' },
  { value: 'Hard Closer', label: 'Hard Closer' },
  { value: 'Friendly Neighbor', label: 'Friendly Neighbor' },
  { value: 'Patient Consultant', label: 'Patient Consultant' },
];

export default function Step2_AIStyle({ tenantId, onNext }) {
  const [tone, setTone] = useState('');
  const [persona, setPersona] = useState('');
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
      const { error } = await supabase.from('ai_instruction_bundles').insert([
        {
          tenant_id: tenantId,
          tone,
          persona,
          industry,
          use_case: '',
          role: '',
          full_bundle: '',
        },
      ]);
      if (error) throw error;
      onNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Step 2: AI Communication Style</h1>
      <p className="text-sm text-gray-500">
        This determines how your AI messages will sound when engaging with leads.
        You can always refine this later in Settings.
      </p>

      <div className="space-y-4">
        <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="">Select a tone</option>
          {toneOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Select label="Persona" value={persona} onChange={(e) => setPersona(e.target.value)}>
          <option value="">Select a persona</option>
          {personaOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        {industry && (
          <p className="text-xs text-gray-400">Industry: <strong>{industry}</strong> (autofilled from step 1)</p>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={loading || !tone || !persona}>
          {loading ? 'Saving...' : 'Continue to Step 3'}
        </Button>
      </div>
    </div>
  );
}
