import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Label } from '../ui/label';
import Button from '../ui/button';
import { buildInstructionBundle } from '../../lib/instructionBuilder';

export default function AIInstructionSettings() {
  const [tone, setTone] = useState('');
  const [persona, setPersona] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  const toneOptions = [
    'Friendly & Casual',
    'Assertive & Confident',
    'Aggressive & Bold',
    'Neutral & Professional',
    'Empathetic & Supportive'
  ];

  const personaOptions = [
    'Icebreaker / Intro',
    'Nurturer',
    'Appointment Setter',
    'Closer',
    'Qualifier',
    'FAQ Assistant'
  ];

  const industryOptions = [
    'Real Estate: Wholesaling',
    'Real Estate: Retail Agent',
    'Home Services: Contractor Follow-Up',
    'Auto Sales: Internet Lead',
    'Financial Services: Appointment Setter',
    'General: SMS Responder'
  ];

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => {
        const bundle = res.data.AIInstructionBundle?.value || '';
        setTone(extractLine(bundle, 'TONE'));
        setPersona(extractLine(bundle, 'PERSONA'));
        setIndustry(extractLine(bundle, 'USE CASE'));
      })
      .catch(err => console.error('Failed to load instructions:', err));
  }, []);

  const extractLine = (bundle, label) => {
    const match = bundle.match(new RegExp(`${label}:\\s*(.+)`));
    return match ? match[1].trim() : '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullInstructions = buildInstructionBundle({ tone, persona, industry });
      await axios.put('/api/settings', {
        AIInstructionBundle: { value: fullInstructions }
      });
    } catch (err) {
      console.error('Failed to save instructions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Tone / Style</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          <option value="">Select tone</option>
          {toneOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Persona / Intent</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
        >
          <option value="">Select persona</option>
          {personaOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Industry Profile / Use Case</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">Select use case</option>
          {industryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Instructions'}
      </Button>
    </div>
  );
}
