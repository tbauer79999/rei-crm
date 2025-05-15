import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export default function MessagingSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/settings').then((res) => {
      const data = {};
      const records = res?.data?.records;

      if (Array.isArray(records)) {
        records.forEach((record) => {
          if (record.fields?.key && record.fields?.value !== undefined) {
            data[record.fields.key] = record.fields.value;
          }
        });
      } else {
        console.error('Unexpected settings API response:', res.data);
      }

      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      { key: 'messaging_tone_guidance', value: settings.messaging_tone_guidance || '' },
      { key: 'opening_message_prompt', value: settings.opening_message_prompt || '' },
      { key: 'response_style_preferences', value: settings.response_style_preferences || '' },
      { key: 'sms_opt_in_language', value: settings.sms_opt_in_language || '' },
      { key: 'unsubscribe_keywords', value: settings.unsubscribe_keywords || '' },
    ];
    for (const setting of updates) {
      await axios.post('/api/settings', setting);
    }
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="messaging_tone_guidance">Messaging Tone Guidance (Optional)</Label>
        <Textarea
          id="messaging_tone_guidance"
          name="messaging_tone_guidance"
          value={settings.messaging_tone_guidance || ''}
          onChange={handleChange}
          placeholder="e.g. Friendly, professional, empathetic"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="opening_message_prompt">Opening Message Prompt (Optional)</Label>
        <Textarea
          id="opening_message_prompt"
          name="opening_message_prompt"
          value={settings.opening_message_prompt || ''}
          onChange={handleChange}
          placeholder="e.g. Use a soft intro asking if they’re the property owner"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="response_style_preferences">Response Style Preferences (Optional)</Label>
        <Textarea
          id="response_style_preferences"
          name="response_style_preferences"
          value={settings.response_style_preferences || ''}
          onChange={handleChange}
          placeholder="e.g. Keep replies under 2 sentences. Avoid sounding robotic."
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="sms_opt_in_language">SMS Opt-In Language (Optional)</Label>
        <Textarea
          id="sms_opt_in_language"
          name="sms_opt_in_language"
          value={settings.sms_opt_in_language || ''}
          onChange={handleChange}
          placeholder="Enter the default opt-in message for compliance"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="unsubscribe_keywords">Unsubscribe Keywords (Optional, comma-separated)</Label>
        <Textarea
          id="unsubscribe_keywords"
          name="unsubscribe_keywords"
          value={settings.unsubscribe_keywords || ''}
          onChange={handleChange}
          placeholder="STOP, unsubscribe, cancel"
          className="mt-1"
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
