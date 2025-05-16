import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Label } from '../ui/label';
import Button from '../ui/button';

export default function AISettings() {
  const [autoReplies, setAutoReplies] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [escalation, setEscalation] = useState(false);
  const [delay, setDelay] = useState('3');
  const [statusField, setStatusField] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/settings').then((res) => {
      const data = res.data;
      setAutoReplies(data.EnableAIAutoReplies?.value === 'true');
      setScoring(data.EnableMotivationScoring?.value === 'true');
      setEscalation(data.EscalateHotLeadImmediately?.value === 'true');
      setDelay(data.AIResponseDelay?.value || '3');
      setStatusField(data.AIStatusFieldEnabled?.value === 'true');
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/settings', {
        EnableAIAutoReplies: { value: String(autoReplies) },
        EnableMotivationScoring: { value: String(scoring) },
        EscalateHotLeadImmediately: { value: String(escalation) },
        AIResponseDelay: { value: delay },
        AIStatusFieldEnabled: { value: String(statusField) },
      });
    } catch (err) {
      console.error('Failed to save AI automation settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Enable AI Auto-Replies</Label>
        <input
          type="checkbox"
          checked={autoReplies}
          onChange={(e) => setAutoReplies(e.target.checked)}
          className="ml-2"
        />
      </div>

      <div>
        <Label>Enable Motivation Scoring</Label>
        <input
          type="checkbox"
          checked={scoring}
          onChange={(e) => setScoring(e.target.checked)}
          className="ml-2"
        />
      </div>

      <div>
        <Label>Escalate HOT Leads Immediately</Label>
        <input
          type="checkbox"
          checked={escalation}
          onChange={(e) => setEscalation(e.target.checked)}
          className="ml-2"
        />
      </div>

      <div>
        <Label>AI Response Delay (seconds)</Label>
        <input
          type="number"
          min="0"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          className="border border-gray-300 px-3 py-1 rounded w-20 ml-2"
        />
      </div>

      <div>
        <Label>Write AI Status Back to Airtable</Label>
        <input
          type="checkbox"
          checked={statusField}
          onChange={(e) => setStatusField(e.target.checked)}
          className="ml-2"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
