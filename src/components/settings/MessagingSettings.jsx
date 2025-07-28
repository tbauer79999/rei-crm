import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { Label } from '../ui/label';
import supabase from '../../lib/supabaseClient';
import Button from '../ui/button';
import { 
  MessageSquare, 
  Timer, 
  Zap, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Plus,
  Trash2,
  Eye,
  FileText
} from 'lucide-react';

export default function MessagingSettings() {
  const { user, hasPermission, loading: authLoading } = useAuth();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('response'); // 'response' or 'templates'

  // Permission checks
  const canViewMessagingSettings = hasPermission(PERMISSIONS.VIEW_EDIT_AI_SETTINGS) || hasPermission(PERMISSIONS.MODIFY_AI_REPLY_MODE);
  const canEditMessagingSettings = hasPermission(PERMISSIONS.VIEW_EDIT_AI_SETTINGS);
  const canModifyReplyMode = hasPermission(PERMISSIONS.MODIFY_AI_REPLY_MODE);

  // Response Settings State
  const [replyMode, setReplyMode] = useState('paced');
  const [hourlyLimit, setHourlyLimit] = useState('30');

  // Template Settings State
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [tcpaEnabled, setTcpaEnabled] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const replyOptions = [
    { 
      label: 'Paced (2–5 min delay)', 
      value: 'paced',
      description: 'Natural conversation flow with human-like response timing'
    },
    { 
      label: 'Status-Based (1–10 min)', 
      value: 'status-based',
      description: 'Response timing adapts based on lead engagement level'
    }
  ];

  // Common placeholder options
  const commonPlaceholders = [
    { key: '{firstName}', label: 'First Name' },
    { key: '{lastName}', label: 'Last Name' },
    { key: '{companyName}', label: 'Company Name' },
    { key: '{address}', label: 'Address' },
    { key: '{phoneNumber}', label: 'Phone Number' },
    { key: '{email}', label: 'Email' }
  ];

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001';
    }
    
    return 'https://api.getsurfox.com/api';
  };

  // Enhanced API call helper with better error handling
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const apiBaseUrl = getApiBaseUrl();
      const fullUrl = `${apiBaseUrl}${endpoint}`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      console.log('Making API request to:', fullUrl);

      const response = await fetch(fullUrl, {
        ...options,
        headers
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API endpoint not found. Expected JSON but received HTML. Check your API URL: ${fullUrl}`);
        }

        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          const responseText = await response.text();
          errorMessage = `${errorMessage}. Response: ${responseText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      
      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  // Fetch templates from Supabase
  const fetchTemplates = async () => {
    if (!user?.tenant_id) return;
    
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('initial_message_templates')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(`Failed to load templates: ${err.message}`);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Add new template
  const addTemplate = async () => {
    if (templates.length >= 10) {
      setError('Maximum of 10 templates allowed');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('initial_message_templates')
        .insert([{
          message: '',
          tenant_id: user.tenant_id,
          used: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTemplates([...templates, data]);
    } catch (err) {
      console.error('Error adding template:', err);
      setError(`Failed to add template: ${err.message}`);
    }
  };

  // Update template
  const updateTemplate = async (id, message) => {
    try {
      const { error } = await supabase
        .from('initial_message_templates')
        .update({ message })
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === id ? { ...t, message } : t
      ));
    } catch (err) {
      console.error('Error updating template:', err);
      setError(`Failed to update template: ${err.message}`);
    }
  };

  // Delete template
  const deleteTemplate = async (id) => {
    try {
      const { error } = await supabase
        .from('initial_message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(`Failed to delete template: ${err.message}`);
    }
  };

  // Insert placeholder at cursor position
  const insertPlaceholder = (templateId, placeholder) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const textarea = document.getElementById(`template-${templateId}`);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentMessage = template.message || '';
    const newMessage = currentMessage.slice(0, start) + placeholder + currentMessage.slice(end);
    
    updateTemplate(templateId, newMessage);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  // Preview template with sample data
  const getTemplatePreview = (message) => {
    return message
      .replace(/{firstName}/g, 'John')
      .replace(/{lastName}/g, 'Smith')
      .replace(/{companyName}/g, 'ABC Corp')
      .replace(/{address}/g, '123 Main St, City, State')
      .replace(/{phoneNumber}/g, '(555) 123-4567')
      .replace(/{email}/g, 'john@example.com');
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (authLoading) return;
      
      if (!user || !user.tenant_id) {
        setError('User or tenant information is missing. Cannot load messaging settings.');
        setSettingsLoading(false);
        setReplyMode('paced');
        setHourlyLimit('30');
        return;
      }

      if (!canViewMessagingSettings) {
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);
      setError('');
      try {
        const settings = await makeAuthenticatedRequest(`/settings?tenant_id=${user.tenant_id}`);

        setReplyMode(settings['ai_reply_mode']?.value || 'paced');
        setHourlyLimit(settings['ai_hourly_throttle_limit']?.value || '30');
        setTcpaEnabled(settings['tcpa_compliance_enabled']?.value === 'true' || false);
      } catch (err) {
        console.error('Error loading messaging settings:', err.message);
        setError(`Failed to load settings: ${err.message}`);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
    if (user?.tenant_id) {
      fetchTemplates();
    }
  }, [user?.tenant_id, authLoading, canViewMessagingSettings]);

  const handleReplyModeChange = (value) => {
    if (!canModifyReplyMode) {
      setError("You don't have permission to modify AI reply mode settings.");
      return;
    }
    setReplyMode(value);
  };

  const handleHourlyLimitChange = (value) => {
    if (!canEditMessagingSettings) {
      setError("You don't have permission to modify messaging throttle settings.");
      return;
    }
    setHourlyLimit(value);
  };

  const handleSave = async () => {
    if (!canEditMessagingSettings && !canModifyReplyMode) {
      setError("You don't have permission to save messaging settings.");
      return;
    }

    if (!user || !user.tenant_id) {
      setError('User or tenant information is missing. Cannot save settings.');
      return;
    }

    setSaving(true);
    setSuccess('');
    setError('');

    const settingsPayload = {};
    
    if (canModifyReplyMode) {
      settingsPayload.ai_reply_mode = { value: replyMode };
    }
    
    if (canEditMessagingSettings) {
      settingsPayload.ai_hourly_throttle_limit = { value: hourlyLimit };
      settingsPayload.tcpa_compliance_enabled = { value: tcpaEnabled.toString() };
    }

    try {
      await makeAuthenticatedRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsPayload, tenant_id: user.tenant_id })
      });

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Permission check - show access denied if user can't view messaging settings
  if (!canViewMessagingSettings && !authLoading) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to view messaging settings.</p>
      </div>
    );
  }

  if (authLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-gray-600">User not found. Please log in to manage messaging settings.</p>
    </div>
  );

  if (!user.tenant_id && !settingsLoading) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <p className="text-gray-600">Tenant information is missing. Cannot load or save messaging settings.</p>
    </div>
  );

  if (settingsLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

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

      {/* Permission Check Alert */}
      {!canEditMessagingSettings && canViewMessagingSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            You have {canModifyReplyMode ? 'limited' : 'read-only'} access to messaging settings. 
            {canModifyReplyMode ? ' You can modify reply mode but not throttle settings.' : ' Admin permissions required to modify settings.'}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('response')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'response'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Response Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Initial Templates</span>
                {templates.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {templates.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'response' && (
            <div className="space-y-8">
              {/* AI Reply Mode */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Reply Mode</h3>
                    <p className="text-gray-600 text-sm">Configure how the AI responds to incoming messages</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="replyMode" className="flex items-center space-x-2 mb-3">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <span>Response Timing Strategy</span>
                  </Label>
                  
                  <div className="grid gap-4">
                    {replyOptions.map((opt) => (
                      <div key={opt.value} className="relative">
                        <label className={`block p-4 border-2 rounded-lg transition-all ${
                          canModifyReplyMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                        } ${
                          replyMode === opt.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <input
                              type="radio"
                              name="replyMode"
                              value={opt.value}
                              checked={replyMode === opt.value}
                              onChange={(e) => handleReplyModeChange(e.target.value)}
                              disabled={!canModifyReplyMode}
                              className="mt-1 h-4 w-4 text-blue-600 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{opt.label}</div>
                              <div className="text-sm text-gray-600 mt-1">{opt.description}</div>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {!canModifyReplyMode && (
                    <p className="text-sm text-gray-500 italic">
                      Contact an admin to modify AI reply mode settings.
                    </p>
                  )}
                </div>
              </div>

              {/* Message Throttling */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Message Throttling</h3>
                    <p className="text-gray-600 text-sm">Prevent spam flags and carrier blocking with smart rate limiting</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hourlyLimit" className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-gray-500" />
                      <span>Max AI Messages per Hour</span>
                    </Label>
                    <div className="max-w-xs">
                      <input
                        id="hourlyLimit"
                        type="number"
                        min="1"
                        max="100"
                        value={hourlyLimit}
                        disabled={!canEditMessagingSettings}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        onChange={(e) => handleHourlyLimitChange(e.target.value)}
                      />
                    </div>
                    {!canEditMessagingSettings && (
                      <p className="text-sm text-gray-500 italic mt-2">
                        Contact an admin to modify throttle settings.
                      </p>
                    )}
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Shield className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <strong>Recommended:</strong> 30-50 messages per hour prevents overwhelming carriers 
                          and reduces the risk of being flagged as spam.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
                    <p className="text-gray-600 text-sm">Summary of your messaging automation settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Timer className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Reply Mode</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 capitalize">
                      {replyMode === 'paced' ? 'Paced (2-5 min)' : 'Status-Based (1-10 min)'}
                    </div>
                    <div className="text-sm text-gray-600">Response timing strategy</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Zap className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Hourly Limit</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{hourlyLimit} msgs/hr</div>
                    <div className="text-sm text-gray-600">Maximum send rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Templates Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Initial Message Templates</h3>
                  <p className="text-gray-600 text-sm">Create up to 10 pre-configured opening messages. System will randomly select from available templates.</p>
                </div>
                <Button
                  onClick={addTemplate}
                  disabled={templates.length >= 10 || !canEditMessagingSettings}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Template</span>
                </Button>
              </div>

              {/* Templates Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {templates.length === 0 ? 'AI Generated Messages Only' : 
                     `${templates.length}/10 Templates Active`}
                  </span>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  {templates.length === 0 ? 
                    'Add templates to use pre-approved messages for initial contact. Without templates, AI generates all messages.' :
                    'System will randomly select from your templates for initial messages, then AI takes over the conversation.'
                  }
                </p>
              </div>

              {/* Template List */}
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template, index) => (
                    <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">Template {index + 1}</span>
                          {template.used > 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Used {template.used} times
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {template.message && (
                            <button
                              onClick={() => setPreviewTemplate(previewTemplate === template.id ? null : template.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Preview with sample data"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            disabled={!canEditMessagingSettings}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <textarea
                          id={`template-${template.id}`}
                          value={template.message || ''}
                          onChange={(e) => updateTemplate(template.id, e.target.value)}
                          disabled={!canEditMessagingSettings}
                          placeholder="Enter your initial message template here..."
                          className="w-full h-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                        />

                        {/* Placeholder Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-gray-500 mr-2">Quick Insert:</span>
                          {commonPlaceholders.map((placeholder) => (
                            <button
                              key={placeholder.key}
                              onClick={() => insertPlaceholder(template.id, placeholder.key)}
                              disabled={!canEditMessagingSettings}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border disabled:opacity-50"
                            >
                              {placeholder.label}
                            </button>
                          ))}
                        </div>

                        {/* Preview */}
                        {previewTemplate === template.id && template.message && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-2">Preview with sample data:</div>
                            <div className="text-sm text-gray-700 italic">
                              "{getTemplatePreview(template.message)}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No templates created yet</p>
                      <p className="text-sm text-gray-500">Click "Add Template" to create your first message template</p>
                    </div>
                  )}
                </div>
              )}

              {/* TCPA Compliance */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">TCPA Compliance</h4>
                    <p className="text-gray-600 text-sm">Automatically include required opt-out language in initial messages</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tcpaEnabled}
                      onChange={(e) => setTcpaEnabled(e.target.checked)}
                      disabled={!canEditMessagingSettings}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable TCPA compliance text</span>
                  </label>
                </div>
                {tcpaEnabled && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      <strong>Auto-appended text:</strong> "Reply STOP to opt out of future messages. Msg & data rates may apply."
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-4">
          {!canEditMessagingSettings && !canModifyReplyMode && !authLoading && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Admin permissions required to save changes</span>
            </div>
          )}
          {(canEditMessagingSettings || canModifyReplyMode) && (
            <Button
              onClick={handleSave}
              disabled={saving || settingsLoading || authLoading}
              className="px-6 py-2"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Settings"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}