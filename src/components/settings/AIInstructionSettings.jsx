import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { buildInstructionBundle } from '../../lib/instructionBuilder';
import { Label } from '../ui/label';
import Button from '../ui/button';

export default function AIInstructionSettings() {
  const { user } = useAuth();
  const [industry, setIndustry] = useState('');
  const [tone, setTone] = useState('');
  const [persona, setPersona] = useState('');
  const [role, setRole] = useState('');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const industryOptions = {
    'Real Estate': ['Wholesaler', 'Retail Agent', 'Lead Qualifier', 'Appointment Setter'],
    'Home Services': ['Contractor', 'Estimator', 'Appointment Scheduler'],
    'Auto Sales': ['Sales Rep', 'Lead Nurturer'],
    'Financial Services': ['Advisor', 'Appointment Setter'],
    'Healthcare': ['Clinic Intake', 'Follow-Up Coordinator'],
    'Education': ['Admissions', 'Enrollment Support'],
    'Legal': ['Intake Assistant', 'Client Support'],
    'Insurance': ['Agent', 'Renewal Support'],
    'Recruiting': ['Recruiter', 'Interview Coordinator'],
    'E-Commerce': ['Customer Support', 'Abandoned Cart Recovery']
  };

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

  const extractLine = (bundle, label) => {
    const match = bundle.match(new RegExp(`${label}:\\s*(.+)`));
    return match ? match[1].trim() : '';
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setError(''); // Clear previous errors
        
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', user?.id)
          .single();

        if (profileError || !profile?.tenant_id) {
          throw new Error('Could not retrieve tenant ID');
        }

        const tenantId = profile.tenant_id;
        console.log('Fetching settings for tenant:', tenantId); // Debug log

        const res = await fetch(`/api/settings?tenant_id=${tenantId}`);
        
        if (!res.ok) {
          throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
        
        const settings = await res.json();
        const bundle = settings['aiinstruction_bundle']?.value || '';

        setTone(extractLine(bundle, 'TONE'));
        setPersona(extractLine(bundle, 'PERSONA'));
        setIndustry(extractLine(bundle, 'INDUSTRY'));
        setRole(extractLine(bundle, 'ROLE'));
      } catch (err) {
        console.error('Error loading tenant-specific instructions:', err.message);
        setError(`Failed to load settings: ${err.message}`);
      }
    };

    if (user?.id) {
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    const bundle = buildInstructionBundle({ tone, persona, industry, role });
    setPreview(bundle);
  }, [tone, persona, industry, role]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate required fields
      if (!industry || !role || !tone || !persona) {
        throw new Error('Please fill in all fields before saving');
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Unable to find tenant ID for this user');
      }

      console.log('Saving for tenant:', profile.tenant_id); // Debug log

      const res = await fetch('/api/settings/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          persona,
          industry,
          role,
          tenant_id: profile.tenant_id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const result = await res.json();
      console.log('Save successful:', result); // Debug log
      setSuccess('Instructions saved successfully!');
      
    } catch (err) {
      console.error('Failed to save instructions:', err.message);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div>
        <Label>Industry</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            setRole('');
            setError(''); // Clear errors when user makes changes
            setSuccess('');
          }}
        >
          <option value="">Select industry</option>
          {Object.keys(industryOptions).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {industry && (
        <div>
          <Label>Role</Label>
          <select
            className="w-full border rounded px-3 py-2"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setError('');
              setSuccess('');
            }}
          >
            <option value="">Select role</option>
            {industryOptions[industry].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label>Tone</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={tone}
          onChange={(e) => {
            setTone(e.target.value);
            setError('');
            setSuccess('');
          }}
        >
          <option value="">Select tone</option>
          {toneOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Persona</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={persona}
          onChange={(e) => {
            setPersona(e.target.value);
            setError('');
            setSuccess('');
          }}
        >
          <option value="">Select persona</option>
          {personaOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label className="font-medium">Preview</Label>
        <textarea
          value={preview}
          readOnly
          className="w-full border rounded px-3 py-2 text-xs h-80 bg-gray-50"
        />
      </div>

      <Button 
        onClick={handleSave} 
        disabled={saving || !industry || !role || !tone || !persona}
      >
        {saving ? 'Saving...' : 'Save Instructions'}
      </Button>
    </div>
  );
}