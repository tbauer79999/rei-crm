import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { buildInstructionBundle } from '../../lib/instructionBuilder';
import { Label } from '../ui/label';
import Button from '../ui/button';
import { 
  FileText, 
  Settings, 
  User, 
  Briefcase, 
  MessageCircle,
  Eye,
  CheckCircle,
  AlertCircle,
  Brain
} from 'lucide-react';

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
        setError('');
        
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.tenant_id) {
          throw new Error('Could not retrieve tenant ID');
        }

        const tenantId = profile.tenant_id;
        console.log('Fetching settings for tenant:', tenantId);

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

      console.log('Saving for tenant:', profile.tenant_id);

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
      console.log('Save successful:', result);
      setSuccess('Instructions saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Failed to save instructions:', err.message);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Industry & Role Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Industry & Role</h3>
            <p className="text-gray-600 text-sm">Define your business context and AI's primary role</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <span>Industry</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setRole('');
                setError('');
                setSuccess('');
              }}
            >
              <option value="">Select your industry</option>
              {Object.keys(industryOptions).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {industry && (
            <div>
              <Label className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>Specific Role</span>
              </Label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                  setSuccess('');
                }}
              >
                <option value="">Select your role</option>
                {industryOptions[industry].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Communication Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Communication Style</h3>
            <p className="text-gray-600 text-sm">Configure how the AI speaks and behaves with prospects</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span>Conversation Tone</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={tone}
              onChange={(e) => {
                setTone(e.target.value);
                setError('');
                setSuccess('');
              }}
            >
              <option value="">Select communication tone</option>
              {toneOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>AI Persona</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={persona}
              onChange={(e) => {
                setPersona(e.target.value);
                setError('');
                setSuccess('');
              }}
            >
              <option value="">Select AI personality</option>
              {personaOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Instruction Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Generated Instructions Preview</h3>
            <p className="text-gray-600 text-sm">Review the AI instructions that will be generated from your settings</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">AI System Instructions</span>
            </div>
          </div>
          <div className="p-4">
            <textarea
              value={preview}
              readOnly
              className="w-full bg-transparent border-0 text-sm font-mono text-gray-800 resize-none focus:outline-none"
              rows={20}
              placeholder="Select your industry, role, tone, and persona to generate AI instructions..."
            />
          </div>
        </div>
      </div>

      {/* Current Configuration Summary */}
      {(industry || role || tone || persona) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
              <p className="text-gray-600 text-sm">Summary of your AI instruction settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Industry</div>
              <div className="font-medium text-gray-900">{industry || 'Not set'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Role</div>
              <div className="font-medium text-gray-900">{role || 'Not set'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Tone</div>
              <div className="font-medium text-gray-900">{tone || 'Not set'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Persona</div>
              <div className="font-medium text-gray-900">{persona || 'Not set'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving || !industry || !role || !tone || !persona}
          className="px-6 py-2"
        >
          {saving ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Save Instructions</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}