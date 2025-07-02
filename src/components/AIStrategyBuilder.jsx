import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import supabase from '../lib/supabaseClient.js';
import { buildInstructionBundle, buildInitialInstruction } from '../lib/instructionBuilder.js';

import { 
  Brain,
  Save,
  AlertTriangle,
  CheckCircle,
  User,
  Briefcase,
  MessageCircle,
  Zap,
  Users,
  ArrowRight,
  RefreshCw,
  Calendar,
  Wand2
} from 'lucide-react';

const AIStrategyBuilder = () => {
  const { user } = useAuth();
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Strategy Configuration State
  const [strategyConfig, setStrategyConfig] = useState({
    businessName: '',
    industry: '',
    role: '',
    
    // Initial Instructions (First Contact)
    initialTone: '',
    initialPersona: '',
    
    // Engagement Instructions (Ongoing)
    engagementTone: '',
    engagementPersona: '',
    
    followups: [
      {
        id: 1,
        day: 3,
        type: 'gentle_reminder',
        tone: '',
        persona: '',
        enabled: true
      },
      {
        id: 2,
        day: 7,
        type: 'value_add',
        tone: '',
        persona: '',
        enabled: true
      },
      {
        id: 3,
        day: 14,
        type: 'final_attempt',
        tone: '',
        persona: '',
        enabled: true
      }
    ]
  });

  const industryOptions = {
    'Real Estate': ['Wholesaler', 'Retail Agent', 'Lead Qualifier', 'Appointment Setter'],
    'Staffing': ['Recruiter', 'Interview Coordinator', 'Client Relations'],
    'Home Services': ['Contractor', 'Estimator', 'Appointment Scheduler'],
    'Legal Intake': ['Intake Assistant', 'Client Support', 'Case Qualifier'],
    'Healthcare': ['Clinic Intake', 'Follow-Up Coordinator', 'Patient Support'],
    'Insurance': ['Agent', 'Renewal Support', 'Claims Assistant'],
    'Education': ['Admissions', 'Enrollment Support', 'Student Services'],
    'Consulting': ['Business Consultant', 'Sales Advisor', 'Client Manager'],
    'Finance': ['Financial Advisor', 'Loan Officer', 'Investment Consultant'],
    'Other': ['Sales Rep', 'Lead Nurturer', 'Customer Support']
  };

  const toneOptions = [
    'Friendly & Casual',
    'Assertive & Confident',
    'Aggressive & Bold',
    'Neutral & Professional',
    'Empathetic & Supportive'
  ];

  const initialPersonaOptions = [
    'Icebreaker / Intro',
    'Lead Qualifier',
    'FAQ Assistant',
    'Information Gatherer',
    'First Contact Specialist'
  ];

  const engagementPersonaOptions = [
    'Nurturer',
    'Appointment Setter',
    'Closer',
    'Relationship Builder',
    'Follow-up Specialist',
    'Objection Handler'
  ];

  const followupPersonaOptions = [
    'Gentle Reminder',
    'Value Provider',
    'Urgency Creator',
    'Relationship Builder',
    'Closing Specialist',
    'Final Attempt'
  ];

  const strategyTemplates = [
    {
      id: 'consultative',
      name: 'Consultative Sales',
      description: 'Relationship-first approach with value-driven messaging',
      icon: '🤝',
      industry: 'B2B SaaS',
      avgConversion: '14.2%',
      tone: 'Neutral & Professional',
      initialPersona: 'Lead Qualifier',
      engagementPersona: 'Relationship Builder'
    },
    {
      id: 'aggressive_sales',
      name: 'High-Velocity Sales',
      description: 'Fast-paced, conversion-focused with urgency triggers',
      icon: '🎯',
      industry: 'Enterprise',
      avgConversion: '18.3%',
      tone: 'Assertive & Confident',
      initialPersona: 'First Contact Specialist',
      engagementPersona: 'Closer'
    },
    {
      id: 'gentle_nurture',
      name: 'Long-term Nurture',
      description: 'Patient relationship building with educational content',
      icon: '🌱',
      industry: 'Healthcare',
      avgConversion: '9.1%',
      tone: 'Empathetic & Supportive',
      initialPersona: 'Icebreaker / Intro',
      engagementPersona: 'Nurturer'
    }
  ];

  // API helper function
  const callAPI = async (endpoint, options = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Load existing configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!user?.tenant_id) return;

      try {
        const settings = await callAPI(`/api/settings?tenant_id=${user.tenant_id}`);
        
        // Extract configuration from existing settings
        const extractLine = (bundle, label) => {
          const match = bundle?.match(new RegExp(`${label}:\\s*(.+)`));
          return match ? match[1].trim() : '';
        };

        const initialBundle = settings['ai_instruction_initial']?.value || '';
        const engagementBundle = settings['aiinstruction_bundle']?.value || '';

        setStrategyConfig(prev => ({
          ...prev,
          businessName: extractLine(engagementBundle, 'BUSINESS_NAME') || 'Your Business',
          industry: extractLine(engagementBundle, 'INDUSTRY') || '',
          role: extractLine(engagementBundle, 'ROLE') || '',
          initialTone: extractLine(initialBundle, 'TONE') || '',
          initialPersona: extractLine(initialBundle, 'PERSONA') || '',
          engagementTone: extractLine(engagementBundle, 'TONE') || '',
          engagementPersona: extractLine(engagementBundle, 'PERSONA') || '',
          followups: prev.followups.map((followup, index) => ({
            ...followup,
            day: parseInt(settings[`followup_delay_${index + 1}`]?.value || followup.day),
            tone: extractLine(settings[`ai_instruction_followup_${index + 1}`]?.value || '', 'TONE') || '',
            persona: extractLine(settings[`ai_instruction_followup_${index + 1}`]?.value || '', 'PERSONA') || ''
          }))
        }));

      } catch (err) {
        console.error('Error loading configuration:', err);
        setError('Failed to load existing configuration');
      }
    };

    loadConfiguration();
  }, [user?.tenant_id]);

  const applyTemplate = (template) => {
    setStrategyConfig(prev => ({
      ...prev,
      initialTone: template.tone,
      initialPersona: template.initialPersona,
      engagementTone: template.tone,
      engagementPersona: template.engagementPersona,
      followups: prev.followups.map((followup, index) => ({
        ...followup,
        tone: template.tone,
        persona: followupPersonaOptions[index] || 'Gentle Reminder'
      }))
    }));
    setUnsavedChanges(true);
  };

  const updateFollowup = (index, field, value) => {
    setStrategyConfig(prev => ({
      ...prev,
      followups: prev.followups.map((followup, i) => 
        i === index ? { ...followup, [field]: value } : followup
      )
    }));
    setUnsavedChanges(true);
  };

  const saveStrategy = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!user?.tenant_id) {
        throw new Error('Authentication required');
      }

      // Build instruction bundles
const initialBundle = buildInitialInstruction({
  tone: strategyConfig.initialTone,
  persona: strategyConfig.initialPersona,
  industry: strategyConfig.industry,
  role: strategyConfig.role,
  leadDetails: strategyConfig.leadDetails || {},
  knowledgeBase: strategyConfig.knowledgeBase || '',
  campaignMetadata: strategyConfig.campaignMetadata || {}
});


const engagementBundle = buildInstructionBundle({
  tone: strategyConfig.engagementTone,
  persona: strategyConfig.engagementPersona,
  industry: strategyConfig.industry,
  role: strategyConfig.role,
  leadDetails: strategyConfig.leadDetails || {},
  knowledgeBase: strategyConfig.knowledgeBase || '',
  campaignMetadata: strategyConfig.campaignMetadata || {}
});


      // Build follow-up bundles
      const followupBundles = strategyConfig.followups.map(followup => 
        buildInstructionBundle({
          tone: followup.tone || strategyConfig.engagementTone,
          persona: followup.persona,
          industry: strategyConfig.industry,
          role: strategyConfig.role,
          businessName: strategyConfig.businessName
        })
      );

      const settingsPayload = {
        ai_instruction_initial: { value: initialBundle },
        aiinstruction_bundle: { value: engagementBundle },
        ai_instruction_followup_1: { value: followupBundles[0] || '' },
        ai_instruction_followup_2: { value: followupBundles[1] || '' },
        ai_instruction_followup_3: { value: followupBundles[2] || '' },
        followup_delay_1: { value: strategyConfig.followups[0]?.day.toString() || '3' },
        followup_delay_2: { value: strategyConfig.followups[1]?.day.toString() || '7' },
        followup_delay_3: { value: strategyConfig.followups[2]?.day.toString() || '14' }
      };

      await callAPI('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ 
          settings: settingsPayload, 
          tenant_id: user.tenant_id 
        })
      });

      setSuccess('AI strategy saved successfully!');
      setUnsavedChanges(false);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Failed to save strategy:', err);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Strategy Builder</h2>
              <p className="text-gray-600 text-sm">Design your AI persona and automated follow-up sequence</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {unsavedChanges && (
              <div className="flex items-center space-x-2 text-orange-600 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>Unsaved changes</span>
              </div>
            )}
            <button
              onClick={saveStrategy}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Strategy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Core Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Representative Name
            </label>
            <input
              type="text"
              value={strategyConfig.businessName}
              onChange={(e) => {
                setStrategyConfig(prev => ({ ...prev, businessName: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Sarah Thompson, Mike Chen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={strategyConfig.industry}
              onChange={(e) => {
                setStrategyConfig(prev => ({ ...prev, industry: e.target.value, role: '' }));
                setUnsavedChanges(true);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select industry</option>
              {Object.keys(industryOptions).map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          {strategyConfig.industry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={strategyConfig.role}
                onChange={(e) => {
                  setStrategyConfig(prev => ({ ...prev, role: e.target.value }));
                  setUnsavedChanges(true);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select role</option>
                {industryOptions[strategyConfig.industry].map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Start Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategyTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all hover:shadow-sm"
            >
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-500">{template.industry}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-green-600 font-medium">{template.avgConversion} conversion</span>
              </div>
              <button 
                onClick={() => applyTemplate(template)}
                className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2"
              >
                Apply Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Initial vs Engagement Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Initial Instructions */}
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">Initial Contact Instructions</h3>
              <p className="text-blue-700 text-sm">How AI introduces itself and makes first contact</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Initial Tone
              </label>
              <select
                value={strategyConfig.initialTone}
                onChange={(e) => {
                  setStrategyConfig(prev => ({ ...prev, initialTone: e.target.value }));
                  setUnsavedChanges(true);
                }}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select tone</option>
                {toneOptions.map(tone => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Initial Persona
              </label>
              <select
                value={strategyConfig.initialPersona}
                onChange={(e) => {
                  setStrategyConfig(prev => ({ ...prev, initialPersona: e.target.value }));
                  setUnsavedChanges(true);
                }}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select persona</option>
                {initialPersonaOptions.map(persona => (
                  <option key={persona} value={persona}>{persona}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Engagement Instructions */}
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-900">Engagement Instructions</h3>
              <p className="text-green-700 text-sm">How AI nurtures and advances prospects</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-900 mb-2">
                Engagement Tone
              </label>
              <select
                value={strategyConfig.engagementTone}
                onChange={(e) => {
                  setStrategyConfig(prev => ({ ...prev, engagementTone: e.target.value }));
                  setUnsavedChanges(true);
                }}
                className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">Select tone</option>
                {toneOptions.map(tone => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-900 mb-2">
                Engagement Persona
              </label>
              <select
                value={strategyConfig.engagementPersona}
                onChange={(e) => {
                  setStrategyConfig(prev => ({ ...prev, engagementPersona: e.target.value }));
                  setUnsavedChanges(true);
                }}
                className="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">Select persona</option>
                {engagementPersonaOptions.map(persona => (
                  <option key={persona} value={persona}>{persona}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Sequence */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Follow-up Sequence</h3>
        
        <div className="space-y-6">
          {strategyConfig.followups.map((followup, index) => (
            <div key={followup.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Follow-up {index + 1}</div>
                    <div className="text-sm text-gray-600 capitalize">{followup.type.replace('_', ' ')}</div>
                  </div>
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={followup.enabled}
                    onChange={(e) => updateFollowup(index, 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delay (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={followup.day}
                    onChange={(e) => updateFollowup(index, 'day', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Tone
                  </label>
                  <select
                    value={followup.tone || strategyConfig.engagementTone}
                    onChange={(e) => updateFollowup(index, 'tone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Use engagement tone</option>
                    {toneOptions.map(tone => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Persona
                  </label>
                  <select
                    value={followup.persona}
                    onChange={(e) => updateFollowup(index, 'persona', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select persona</option>
                    {followupPersonaOptions.map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Visualization */}
        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h4 className="font-medium text-gray-900 mb-4">Follow-up Timeline</h4>
          <div className="flex items-center space-x-4 text-sm overflow-x-auto">
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Day 0: Initial Contact</span>
            </div>
            {strategyConfig.followups.map((followup, index) => (
              <React.Fragment key={followup.id}>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-500' : 
                    index === 1 ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}></div>
                  <span>Day {followup.day}: {followup.persona || 'Follow-up'}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Projection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Strategy Performance Projection</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.max(...strategyConfig.followups.map(f => f.day))}
            </div>
            <div className="text-sm text-gray-600">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">14.2%</div>
            <div className="text-sm text-gray-600">Est. Conversion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {strategyConfig.followups.filter(f => f.enabled).length + 1}
            </div>
            <div className="text-sm text-gray-600">Touch Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">87%</div>
            <div className="text-sm text-gray-600">Engagement Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStrategyBuilder;