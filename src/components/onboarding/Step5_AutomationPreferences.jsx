import { useState } from 'react';
import supabase from '../../lib/supabaseClient';
import Checkbox from '../ui/checkbox';
import Button from '../ui/button';



export default function Step5_AutomationPreferences({ tenantId, onNext }) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [reengagement, setReengagement] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const updates = [
        { key: 'AIOverride', value: aiEnabled.toString() },
        { key: 'QueuedResponseEnabled', value: reengagement.toString() }
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
      <h1 className="text-2xl font-semibold">Step 5: Automation Preferences</h1>
      <p className="text-sm text-gray-500">
        Enable or disable key automation behaviors. These can always be updated in Settings later.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between border rounded p-3">
          <div>
            <p className="font-medium">Enable AI Conversations</p>
            <p className="text-sm text-gray-500">Allow AI to automatically engage leads when they respond.</p>
          </div>
          <Checkbox checked={aiEnabled} onCheckedChange={() => setAiEnabled(!aiEnabled)} />
        </div>

        <div className="flex items-center justify-between border rounded p-3">
          <div>
            <p className="font-medium">Enable Re-engagement</p>
            <p className="text-sm text-gray-500">Allow AI to follow up with non-responsive leads over time.</p>
          </div>
          <Checkbox checked={reengagement} onCheckedChange={() => setReengagement(!reengagement)} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Finish Setup'}
        </Button>
      </div>
    </div>
  );
}
