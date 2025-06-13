import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  Wand2, 
  Save, 
  Copy, 
  RotateCcw, 
  ChevronDown,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';

const FollowUpStrategyManager = () => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [strategies, setStrategies] = useState({});
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Mock data for demo
  const campaigns = [
    { id: '1', name: 'Q1 Lead Generation', status: 'active', leads: 1247 },
    { id: '2', name: 'Enterprise Outreach', status: 'active', leads: 89 },
    { id: '3', name: 'Webinar Follow-up', status: 'paused', leads: 456 }
  ];

  const defaultStrategy = {
    id: null,
    name: 'Custom Strategy',
    description: 'Tailored follow-up sequence',
    followups: [
      {
        id: 1,
        day: 3,
        type: 'gentle_reminder',
        subject: 'Following up on our conversation',
        message: 'Hi {firstName},\n\nI wanted to circle back on our previous conversation about {topic}. Do you have any questions I can help answer?\n\nBest regards,\n{agentName}',
        enabled: true,
        tone: 'professional',
        persona: 'helpful'
      },
      {
        id: 2,
        day: 7,
        type: 'value_add',
        subject: 'Thought you might find this helpful',
        message: 'Hi {firstName},\n\nI came across this resource that might be valuable for {companyName}: [relevant resource]\n\nWould love to discuss how this could apply to your situation.\n\nBest,\n{agentName}',
        enabled: true,
        tone: 'consultative',
        persona: 'advisor'
      },
      {
        id: 3,
        day: 14,
        type: 'final_attempt',
        subject: 'Last check-in from {companyName}',
        message: 'Hi {firstName},\n\nI don\'t want to be a bother, so this will be my final outreach unless I hear back from you.\n\nIf timing isn\'t right now, I completely understand. Feel free to reach out when it makes sense.\n\nBest wishes,\n{agentName}',
        enabled: true,
        tone: 'respectful',
        persona: 'understanding'
      }
    ],
    settings: {
      respectOptOuts: true,
      pauseOnReply: true,
      trackEngagement: true,
      personalization: 'high'
    }
  };

  const [editingStrategy, setEditingStrategy] = useState(defaultStrategy);

  const strategyTemplates = [
    {
      id: 'aggressive_sales',
      name: 'Aggressive Sales',
      description: 'High-frequency, conversion-focused sequence',
      icon: '🎯',
      followupCount: 5,
      avgConversion: '12.3%'
    },
    {
      id: 'consultative',
      name: 'Consultative Approach',
      description: 'Value-first, relationship building sequence',
      icon: '🤝',
      followupCount: 4,
      avgConversion: '8.7%'
    },
    {
      id: 'gentle_nurture',
      name: 'Gentle Nurture',
      description: 'Low-pressure, long-term relationship building',
      icon: '🌱',
      followupCount: 3,
      avgConversion: '6.1%'
    }
  ];

  const FollowUpCard = ({ followup, index, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempFollowup, setTempFollowup] = useState(followup);

    const handleSave = () => {
      onUpdate(index, tempFollowup);
      setIsEditing(false);
      setUnsavedChanges(true);
    };

    const handleCancel = () => {
      setTempFollowup(followup);
      setIsEditing(false);
    };

    const getTypeColor = (type) => {
      const colors = {
        gentle_reminder: 'bg-blue-50 text-blue-700 border-blue-200',
        value_add: 'bg-green-50 text-green-700 border-green-200',
        final_attempt: 'bg-orange-50 text-orange-700 border-orange-200'
      };
      return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
    };

    return (
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">Day {followup.day}</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(followup.type)}`}>
                    {followup.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={followup.enabled}
                  onChange={(e) => onUpdate(index, { ...followup, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </label>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Subject Line</div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
              {followup.subject}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Message Preview</div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border line-clamp-2">
              {followup.message.substring(0, 120)}...
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={tempFollowup.day}
                      onChange={(e) => setTempFollowup({ ...tempFollowup, day: parseInt(e.target.value) })}
                      className="w-20 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={tempFollowup.subject}
                      onChange={(e) => setTempFollowup({ ...tempFollowup, subject: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message Content
                    </label>
                    <textarea
                      rows={6}
                      value={tempFollowup.message}
                      onChange={(e) => setTempFollowup({ ...tempFollowup, message: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Use variables like {firstName}, {companyName}, {agentName}"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Tone: <span className="font-medium">{followup.tone}</span></span>
                      <span>Persona: <span className="font-medium">{followup.persona}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <div className="text-xs text-gray-500 mb-2">Full Message:</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {followup.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const generateAIStrategy = async () => {
    setAiGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAiGenerating(false);
    setUnsavedChanges(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Follow-up Strategy Manager</h1>
            <p className="text-gray-600 mt-1">Configure intelligent follow-up sequences for your campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                previewMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview Mode</span>
            </button>
            <button
              onClick={generateAIStrategy}
              disabled={aiGenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              <span>{aiGenerating ? 'Generating...' : 'AI Generate'}</span>
            </button>
          </div>
        </div>

        {/* Campaign Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => setSelectedCampaign(campaign)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCampaign?.id === campaign.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  campaign.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {campaign.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {campaign.leads} active leads
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCampaign && (
        <>
          {/* Strategy Templates */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Strategy Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategyTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.followupCount} follow-ups</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 font-medium">
                      {template.avgConversion} avg conversion
                    </span>
                    <button className="text-blue-600 text-sm hover:text-blue-700">
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Builder */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Strategy for {selectedCampaign.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure your follow-up sequence and timing
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {unsavedChanges && (
                    <div className="flex items-center space-x-2 text-orange-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Save className="w-4 h-4" />
                    <span>Save Strategy</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {editingStrategy.followups.map((followup, index) => (
                <FollowUpCard
                  key={followup.id}
                  followup={followup}
                  index={index}
                  onUpdate={(idx, updatedFollowup) => {
                    const newFollowups = [...editingStrategy.followups];
                    newFollowups[idx] = updatedFollowup;
                    setEditingStrategy({ ...editingStrategy, followups: newFollowups });
                  }}
                  onDelete={(idx) => {
                    const newFollowups = editingStrategy.followups.filter((_, i) => i !== idx);
                    setEditingStrategy({ ...editingStrategy, followups: newFollowups });
                    setUnsavedChanges(true);
                  }}
                />
              ))}

              <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                <Plus className="w-5 h-5 mx-auto mb-2" />
                Add Another Follow-up
              </button>
            </div>
          </div>

          {/* Strategy Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Strategy Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                  <span className="text-sm text-gray-700">Respect opt-outs and unsubscribes</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                  <span className="text-sm text-gray-700">Pause sequence when lead replies</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                  <span className="text-sm text-gray-700">Track engagement metrics</span>
                </label>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personalization Level
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>High - Use all available data</option>
                    <option>Medium - Basic personalization</option>
                    <option>Low - Minimal personalization</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sending Time Zone
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Lead's Time Zone (Recommended)</option>
                    <option>Company Time Zone</option>
                    <option>Custom Time Zone</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FollowUpStrategyManager;