import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

export default function MessagingSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const keys = [
    'enable_sms',
    'sms_provider',
    'daily_send_limit',
    'default_sms_signature',
    'unsubscribe_footer',
    'sms_intro_template',
    'ai_message_delay_range',
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        const allSettings = Array.isArray(res.data) ? res.data : Object.values(res.data);


        const extracted = {};
        keys.forEach(key => {
          const entry = allSettings.find(s => s.key === key);
          extracted[key] = entry ? entry.value : '';
        });

        setSettings(extracted);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked.toString() : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(keys.map(key =>
        axios.put('/api/settings', {
          key,
          value: settings[key]
        })
      ));
      alert('Settings saved!');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading messaging settings...</div>;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold">Messaging Settings</h2>

      <div className="space-y-4">
        <div>
          <Label>Enable SMS</Label>
          <input
            type="checkbox"
            name="enable_sms"
            checked={settings.enable_sms === 'true'}
            onChange={handleChange}
            className="ml-2"
          />
        </div>

        <div>
          <Label>SMS Provider</Label>
          <Input
            name="sms_provider"
            value={settings.sms_provider || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>Daily Send Limit</Label>
          <Input
            type="number"
            name="daily_send_limit"
            value={settings.daily_send_limit || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>SMS Signature</Label>
          <Input
            name="default_sms_signature"
            value={settings.default_sms_signature || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>Unsubscribe Footer</Label>
          <Input
            name="unsubscribe_footer"
            value={settings.unsubscribe_footer || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>Intro SMS Template</Label>
          <Textarea
            name="sms_intro_template"
            value={settings.sms_intro_template || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>AI Message Delay Range (in seconds)</Label>
          <Input
            name="ai_message_delay_range"
            value={settings.ai_message_delay_range || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
