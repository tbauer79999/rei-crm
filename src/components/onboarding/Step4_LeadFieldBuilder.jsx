import { useState } from 'react';
import supabase from '../../lib/supabaseClient';
import Input from '../ui/input';
import Button from '../ui/button';
import Select from '../ui/select';
import Checkbox from '../ui/checkbox';




const presetFields = [
  { field_name: 'name', field_label: 'Full Name', field_type: 'text', is_required: true },
  { field_name: 'phone', field_label: 'Phone Number', field_type: 'text', is_required: true },
  { field_name: 'email', field_label: 'Email Address', field_type: 'text', is_required: false },
  { field_name: 'status', field_label: 'Lead Status', field_type: 'dropdown', is_required: true, options: ['Cold', 'Warm', 'Engaged', 'Hot', 'Escalated'] },
  { field_name: 'campaign', field_label: 'Campaign', field_type: 'text', is_required: false },
];

export default function Step4_LeadFieldBuilder({ tenantId, onNext }) {
  const [selectedFields, setSelectedFields] = useState(presetFields.map(f => ({ ...f, enabled: true })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleField = (fieldName) => {
    setSelectedFields(prev =>
      prev.map(f => f.field_name === fieldName ? { ...f, enabled: !f.enabled } : f)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const fieldsToInsert = selectedFields
        .filter(f => f.enabled)
        .map(f => ({
          tenant_id: tenantId,
          field_name: f.field_name,
          field_label: f.field_label,
          field_type: f.field_type,
          is_required: f.is_required,
          options: f.options || null,
        }));

      const { error } = await supabase.from('lead_field_config').insert(fieldsToInsert);
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
      <h1 className="text-2xl font-semibold">Step 4: Lead Field Builder</h1>
      <p className="text-sm text-gray-500">
        Choose which fields you'd like to collect for each lead. You can always update this later in Settings.
      </p>

      <div className="space-y-4">
        {selectedFields.map((field) => (
          <div key={field.field_name} className="flex items-center justify-between border rounded p-3">
            <div>
              <p className="font-medium">{field.field_label}</p>
              <p className="text-sm text-gray-500">Type: {field.field_type} {field.is_required ? '(Required)' : ''}</p>
            </div>
            <Checkbox checked={field.enabled} onCheckedChange={() => toggleField(field.field_name)} />
          </div>
        ))}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Continue to Step 5'}
        </Button>
      </div>
    </div>
  );
}
