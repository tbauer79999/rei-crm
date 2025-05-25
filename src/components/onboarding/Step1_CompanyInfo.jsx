// src/components/onboarding/Step1_CompanyInfo.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { Input } from '../ui/input';
import Button from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';

const industries = [
  'Real Estate',
  'Staffing',
  'Home Services',
  'Legal Intake',
  'Healthcare',
  'Insurance',
  'Education',
  'Consulting',
  'Finance',
  'Other',
];

export default function Step1_CompanyInfo({ onNext }) {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name: companyName,
            industry,
            description,
            onboarding_complete: false
          }
        ])
        .select()
        .single();

      if (tenantError) throw tenantError;

      const tenantId = data.id;

      const { error: userUpdateError } = await supabase
        .from('users_profile')
        .update({ tenant_id: tenantId })
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      onNext(tenantId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Step 1: Company Info</h1>
      <p className="text-sm text-gray-500">
        This information helps us tailor your CRM experience, including tone, field labels, and automation defaults.
      </p>

      <div className="space-y-4">
        <Input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company Name"
        />

        <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Select Industry</option>
          {industries.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief Description"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={loading || !companyName || !industry}>
          {loading ? 'Saving...' : 'Continue to Step 2'}
        </Button>
      </div>
    </div>
  );
}
