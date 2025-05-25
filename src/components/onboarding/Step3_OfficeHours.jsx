import { useState } from 'react';
import supabase from '../../lib/supabaseClient';
import { Select } from '../ui/select';
import Button from '../ui/button';



const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString());
const dayOptions = ['M–F', 'M–Sat', 'Everyday'];

export default function Step3_OfficeHours({ tenantId, onNext }) {
  const [openHour, setOpenHour] = useState('9');
  const [closeHour, setCloseHour] = useState('17');
  const [days, setDays] = useState('M–F');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const updates = [
        { key: 'officeOpenHour', value: openHour },
        { key: 'officeCloseHour', value: closeHour },
        { key: 'officeDays', value: days },
        { key: 'EscalateImmediately', value: 'true' },
        { key: 'QueuedResponseEnabled', value: 'true' }
      ];

      const { error } = await supabase.from('platform_settings')
        .upsert(updates.map(u => ({ ...u, tenant_id: tenantId })), { onConflict: ['tenant_id', 'key'] });

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
      <h1 className="text-2xl font-semibold">Step 3: Office Hours & Escalation</h1>
      <p className="text-sm text-gray-500">
        AI won’t reply outside these hours unless overridden. Escalations happen when leads show high motivation.
      </p>

      <div className="space-y-4">
        <Select label="Opening Hour" value={openHour} onChange={(e) => setOpenHour(e.target.value)}>
          {hourOptions.map((h) => <option key={h} value={h}>{h}:00</option>)}
        </Select>

        <Select label="Closing Hour" value={closeHour} onChange={(e) => setCloseHour(e.target.value)}>
          {hourOptions.map((h) => <option key={h} value={h}>{h}:00</option>)}
        </Select>

        <Select label="Active Days" value={days} onChange={(e) => setDays(e.target.value)}>
          {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Continue to Step 4'}
        </Button>
      </div>
    </div>
  );
}
