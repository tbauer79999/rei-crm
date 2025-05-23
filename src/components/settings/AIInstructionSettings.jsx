import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';
import { Label } from '../ui/label';
import Button from '../ui/button';
import { buildInstructionBundle } from '../../lib/instructionBuilder';

export default function AIInstructionSettings() {
  const [industry, setIndustry] = useState('');
  const [tone, setTone] = useState('');
  const [persona, setPersona] = useState('');
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('');

  const industryOptions = {
    'Real Estate': ['Wholesaler', 'Agent/Broker', 'Property Manager', 'Cash Buyer'],
    'Automotive Sales': ['Internet Sales Rep', 'Appointment Setter', 'Post-Test Drive Follow-up', 'Lead Qualifier'],
    'Home Services': ['Contractor', 'Estimator', 'Customer Service', 'Project Scheduler'],
    'Insurance': ['Agent', 'Renewal Specialist', 'Claims Rep'],
    'Healthcare': ['Front Desk', 'Appointment Follow-up', 'Billing Inquiry'],
    'Legal Services': ['Paralegal', 'Intake Coordinator', 'Follow-up Specialist'],
    'Education & Tutoring': ['Admissions', 'Enrollment Specialist', 'Tutor'],
    'Fitness & Wellness': ['Coach', 'Sales Rep', 'Follow-up Trainer'],
    'Beauty & Medspa': ['Aesthetician', 'Client Concierge', 'Treatment Follow-up'],
    'Financial Services': ['Advisor', 'Loan Officer', 'Credit Repair Specialist']
  };

  const roleOptions = [
    'Prospector',
    'Appointment Setter',
    'Closer',
    'Sales Director',
    'Solo Operator',
    'Follow-Up Specialist',
    'Customer Service Rep'
  ];

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

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'aiInstruction_bundle');

      if (error) {
        console.error('Failed to fetch instruction bundle:', error);
        return;
      }

      const bundle = data?.value || '';
      setTone(extractLine(bundle, 'TONE'));
      setPersona(extractLine(bundle, 'PERSONA'));
      setIndustry(extractLine(bundle, 'INDUSTRY'));
      setRole(extractLine(bundle, 'ROLE'));
    };

    fetchSettings();
  }, []);

  const extractLine = (bundle, label) => {
    const match = bundle.match(new RegExp(`${label}:\\s*(.+)`));
    return match ? match[1].trim() : '';
  };

  const handleSave = async () => {
  setSaving(true);
  try {
    const res = await fetch('/api/settings/instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone, persona, industry, role })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Unknown error saving instructions');
    }
  } catch (err) {
    console.error('Failed to save instructions:', err);
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="space-y-6">
      <div>
        <Label>Industry</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            setRole('');
          }}
        >
          <option value="">Select industry</option>
          {Object.keys(industryOptions).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {industry && (
        <div>
          <Label>Role or Intent</Label>
          <select
            className="w-full border rounded px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Select role</option>
            {industryOptions[industry].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      )}

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

      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Instructions'}
      </Button>
    </div>
  );
}
