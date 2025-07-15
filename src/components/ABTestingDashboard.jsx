import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Play, Pause, Plus, TrendingUp, TrendingDown, Users, 
  Target, Clock, CheckCircle, AlertCircle, Settings,
  Calendar, Filter, Download, MoreVertical, Eye, 
  StopCircle, Award, Zap, MessageSquare, TrendingUp as TrendUp
} from 'lucide-react';
import { analyticsService } from '../lib/analyticsDataService';
import { useAuth } from '../context/AuthContext';

const ABTestingDashboard = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [selectedTest, setSelectedTest] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Real data states
  const [activeExperiments, setActiveExperiments] = useState([]);
  const [pastExperiments, setPastExperiments] = useState([]);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    testType: '',
    metric: '',
    trafficSplit: 50,
    experimentType: 'campaign', // campaign or global
    campaignId: '',
    variantA: { config: '' },
    variantB: { config: '' }
  });

  // Load all experiment data
  const loadExperimentData = async () => {
    try {
      setLoading(true);
      console.log('🧪 Loading A/B testing data...');

      const [activeExp, completedExp, campaigns] = await Promise.all([
        analyticsService.getActiveExperiments(),
        analyticsService.getCompletedExperiments(),
        analyticsService.getCampaignsForABTesting()
      ]);

      setActiveExperiments(activeExp);
      setPastExperiments(completedExp);
      setAvailableCampaigns(campaigns);

      console.log('✅ A/B testing data loaded:', { 
        active: activeExp.length, 
        completed: completedExp.length,
        campaigns: campaigns.length 
      });
    } catch (err) {
      console.error('Error loading A/B testing data:', err);
      setError('Failed to load experiment data');
    } finally {
      setLoading(false);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    if (user) {
      loadExperimentData();
    }
  }, [user]);

  // Handle experiment creation
  const handleCreateExperiment = async () => {
    try {
      setLoading(true);
      console.log('Creating experiment:', newExperiment);

      const result = await analyticsService.createExperiment({
        name: newExperiment.name,
        testType: newExperiment.testType,
        metric: newExperiment.metric,
        trafficSplit: newExperiment.trafficSplit,
        experimentType: newExperiment.experimentType,
        campaignId: newExperiment.campaignId,
        variantA: newExperiment.variantA,
        variantB: newExperiment.variantB
      });

      if (result.success) {
        console.log('✅ Experiment created successfully');
        // Reset form
        setActiveView('overview');
        setCreateStep(1);
        setNewExperiment({
          name: '',
          testType: '',
          metric: '',
          trafficSplit: 50,
          experimentType: 'campaign',
          campaignId: '',
          variantA: { config: '' },
          variantB: { config: '' }
        });
        // Reload data
        await loadExperimentData();
      } else {
        setError(`Failed to create experiment: ${result.error}`);
      }
    } catch (err) {
      console.error('Error creating experiment:', err);
      setError('Failed to create experiment');
    } finally {
      setLoading(false);
    }
  };

  // Handle experiment status updates
  const handleUpdateExperimentStatus = async (experimentId, newStatus) => {
    try {
      const result = await analyticsService.updateExperimentStatus(experimentId, newStatus);
      if (result.success) {
        console.log(`✅ Experiment ${experimentId} ${newStatus}`);
        await loadExperimentData(); // Refresh data
      } else {
        setError(`Failed to ${newStatus} experiment`);
      }
    } catch (err) {
      console.error(`Error updating experiment status:`, err);
      setError(`Failed to ${newStatus} experiment`);
    }
  };

  // Load experiment details for details view
  const handleViewDetails = async (experiment) => {
    try {
      setLoading(true);
      const details = await analyticsService.getExperimentDetails(experiment.id);
      if (details) {
        setSelectedTest({
          ...experiment,
          ...details,
          performanceOverTime: details.performanceOverTime || []
        });
        setPerformanceData(details.performanceOverTime || []);
        setActiveView('details');
      } else {
        setError('Failed to load experiment details');
      }
    } catch (err) {
      console.error('Error loading experiment details:', err);
      setError('Failed to load experiment details');
    } finally {
      setLoading(false);
    }
  };

  const StatusPill = ({ status }) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      running: 'bg-green-100 text-green-800 border-green-200',
      paused: 'bg-orange-100 text-orange-800 border-orange-200', 
      completed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const icons = {
      active: <Play className="w-3 h-3" />,
      running: <Play className="w-3 h-3" />,
      paused: <Pause className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
        {icons[status] || icons.active}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const ConfidenceIndicator = ({ confidence }) => {
    if (confidence >= 95) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Significant</span>
        </div>
      );
    } else if (confidence >= 70) {
      return (
        <div className="flex items-center gap-1 text-orange-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Trending</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-medium">Needs Data</span>
        </div>
      );
    }
  };

  const ExperimentCard = ({ experiment }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{experiment.name}</h3>
          <p className="text-sm text-gray-600">Testing: {experiment.metric}</p>
          <p className="text-xs text-gray-500 mt-1">
            {experiment.experimentType === 'global' ? 'Global Test' : `Campaign: ${experiment.campaignName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={experiment.status} />
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {experiment.leader && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Variant {experiment.leader.variant} Leading (+{experiment.leader.improvement}%)
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Participants</p>
          <p className="font-semibold">{experiment.participants?.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Confidence</p>
          <ConfidenceIndicator confidence={experiment.confidence || 0} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${Math.min(experiment.confidence || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewDetails(experiment)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Eye className="w-3 h-3 inline mr-1" />
            View Details
          </button>
          {(experiment.status === 'running' || experiment.status === 'active') && (
            <button 
              onClick={() => handleUpdateExperimentStatus(experiment.id, 'paused')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              <Pause className="w-3 h-3 inline mr-1" />
              Pause
            </button>
          )}
          {experiment.status === 'paused' && (
            <button 
              onClick={() => handleUpdateExperimentStatus(experiment.id, 'active')}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
            >
              <Play className="w-3 h-3 inline mr-1" />
              Resume
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {experiment.startDate && new Date(experiment.startDate).toLocaleDateString()} - 
          {experiment.endDate && new Date(experiment.endDate).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  const CreateExperimentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Create New Experiment</h2>
            <button 
              onClick={() => {
                setActiveView('overview');
                setCreateStep(1);
                setNewExperiment({
                  name: '',
                  testType: '',
                  metric: '',
                  trafficSplit: 50,
                  experimentType: 'campaign',
                  campaignId: '',
                  variantA: { config: '' },
                  variantB: { config: '' }
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {/* Progress Steps */}
          <div className="flex items-center mt-4 space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= createStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && <div className="w-16 h-0.5 bg-gray-200 mx-2"></div>}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Step {createStep}/3: {
              createStep === 1 ? 'Define Basics' : 
              createStep === 2 ? 'Configure Variants' : 
              'Review & Launch'
            }
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {createStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiment Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q2 Opening Line Test"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({...newExperiment, name: e.target.value})}
                />
              </div>

              {/* Experiment Type - Only show for business_admin */}
              {user?.role === 'business_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Experiment Scope
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewExperiment({...newExperiment, experimentType: 'campaign', campaignId: ''})}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        newExperiment.experimentType === 'campaign'
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Target className="w-5 h-5 mb-2 text-blue-600" />
                      <div className="font-medium">Campaign-Specific</div>
                      <div className="text-sm text-gray-500">Test within a specific campaign</div>
                    </button>
                    <button
                      onClick={() => setNewExperiment({...newExperiment, experimentType: 'global', campaignId: ''})}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        newExperiment.experimentType === 'global'
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-5 h-5 mb-2 text-blue-600" />
                      <div className="font-medium">Global</div>
                      <div className="text-sm text-gray-500">Test across all active campaigns</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Campaign Selection */}
              {newExperiment.experimentType === 'campaign' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Campaign
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newExperiment.campaignId}
                    onChange={(e) => setNewExperiment({...newExperiment, campaignId: e.target.value})}
                  >
                    <option value="">Choose a campaign...</option>
                    {availableCampaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} {campaign.is_active ? '(Active)' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What are you testing?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'opening', label: 'Opening Message', icon: MessageSquare },
                    { id: 'tone', label: 'AI Tone', icon: Settings },
                    { id: 'sequence', label: 'Message Sequence', icon: Target },
                    { id: 'timing', label: 'Follow-up Timing', icon: Clock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setNewExperiment({...newExperiment, testType: id})}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        newExperiment.testType === id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2 text-blue-600" />
                      <div className="font-medium">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Primary Success Metric
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'conversion', label: 'Hot Lead Conversion Rate', icon: TrendUp },
                    { id: 'reply', label: 'Reply Rate', icon: MessageSquare },
                    { id: 'engagement', label: 'Engagement Score', icon: Zap },
                    { id: 'response', label: 'Response Time', icon: Clock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setNewExperiment({...newExperiment, metric: id})}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        newExperiment.metric === id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2 text-blue-600" />
                      <div className="font-medium">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Traffic Split
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={newExperiment.trafficSplit}
                      onChange={(e) => setNewExperiment({...newExperiment, trafficSplit: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <div className="bg-blue-100 px-3 py-1 rounded">
                      A: {newExperiment.trafficSplit}%
                    </div>
                    <div className="bg-green-100 px-3 py-1 rounded">
                      B: {100 - newExperiment.trafficSplit}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Configure Your Variants</h3>
                <p className="text-gray-600">Set up what each group of leads will experience</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Variant A */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-blue-600">Variant A (Control)</h4>
                    <span className="text-sm text-gray-500">{newExperiment.trafficSplit}% of traffic</span>
                  </div>
                  
                  {newExperiment.testType === 'opening' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Opening Message</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows="4"
                        placeholder="Hi {name}, I noticed your property listing..."
                        value={newExperiment.variantA.config}
                        onChange={(e) => setNewExperiment({
                          ...newExperiment, 
                          variantA: { config: e.target.value }
                        })}
                      />
                      <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                        <strong>Preview:</strong> {newExperiment.variantA.config || "Hi John, I noticed your property listing..."}
                      </div>
                    </div>
                  )}
                  
                  {newExperiment.testType === 'tone' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Tone</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={newExperiment.variantA.config}
                        onChange={(e) => setNewExperiment({
                          ...newExperiment, 
                          variantA: { config: e.target.value }
                        })}
                      >
                        <option value="">Select tone...</option>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>
                  )}
                  
                  <button className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                    Reset to Current Live Settings
                  </button>
                </div>

                {/* Variant B */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-green-600">Variant B (Test)</h4>
                    <span className="text-sm text-gray-500">{100 - newExperiment.trafficSplit}% of traffic</span>
                  </div>
                  
                  {newExperiment.testType === 'opening' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Opening Message</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows="4"
                        placeholder="Hey {name}! Saw your listing and wanted to reach out..."
                        value={newExperiment.variantB.config}
                        onChange={(e) => setNewExperiment({
                          ...newExperiment, 
                          variantB: { config: e.target.value }
                        })}
                      />
                      <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                        <strong>Preview:</strong> {newExperiment.variantB.config || "Hey John! Saw your listing and wanted to reach out..."}
                      </div>
                    </div>
                  )}
                  
                  {newExperiment.testType === 'tone' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Tone</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={newExperiment.variantB.config}
                        onChange={(e) => setNewExperiment({
                          ...newExperiment, 
                          variantB: { config: e.target.value }
                        })}
                      >
                        <option value="">Select tone...</option>
                        <option value="friendly">Friendly</option>
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Review & Launch</h3>
                <p className="text-gray-600">Double-check your settings before starting the test</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-4">Experiment Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span> <span className="font-medium">{newExperiment.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Scope:</span> <span className="font-medium">{newExperiment.experimentType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Testing:</span> <span className="font-medium">{newExperiment.testType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Metric:</span> <span className="font-medium">{newExperiment.metric}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Split:</span> <span className="font-medium">{newExperiment.trafficSplit}% / {100 - newExperiment.trafficSplit}%</span>
                  </div>
                  {newExperiment.campaignId && (
                    <div>
                      <span className="text-gray-600">Campaign:</span> 
                      <span className="font-medium">
                        {availableCampaigns.find(c => c.id === newExperiment.campaignId)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-blue-600 mb-2">Variant A Configuration</h5>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      {newExperiment.variantA.config || 'Using current live settings'}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-green-600 mb-2">Variant B Configuration</h5>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      {newExperiment.variantB.config || 'Not configured'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <strong className="text-blue-900">Ready to launch!</strong>
                    <p className="text-blue-700 mt-1">
                      This experiment will automatically start collecting data from new leads. 
                      You can pause or end it at any time from the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-between">
          <button
            onClick={() => createStep > 1 ? setCreateStep(createStep - 1) : setActiveView('overview')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {createStep > 1 ? 'Previous' : 'Cancel'}
          </button>
          
          {createStep < 3 ? (
            <button
              onClick={() => setCreateStep(createStep + 1)}
              disabled={!newExperiment.name || !newExperiment.testType || !newExperiment.metric || 
                       (newExperiment.experimentType === 'campaign' && !newExperiment.campaignId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleCreateExperiment}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 inline mr-2" />
              {loading ? 'Creating...' : 'Launch Experiment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const ExperimentDetails = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setActiveView('overview')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <div className="flex gap-3">
          {selectedTest?.confidence >= 95 ? (
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <Award className="w-4 h-4 inline mr-2" />
              Declare Winner
            </button>
          ) : (
            <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed" title="Need 95% confidence to declare winner">
              <Award className="w-4 h-4 inline mr-2" />
              Declare Winner
            </button>
          )}
          <button 
            onClick={() => handleUpdateExperimentStatus(selectedTest?.id, 'completed')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <StopCircle className="w-4 h-4 inline mr-2" />
            End Test
          </button>
          {(selectedTest?.status === 'running' || selectedTest?.status === 'active') ? (
            <button 
              onClick={() => handleUpdateExperimentStatus(selectedTest?.id, 'paused')}
              className="px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50"
            >
              <Pause className="w-4 h-4 inline mr-2" />
              Pause Test
            </button>
          ) : (
            <button 
              onClick={() => handleUpdateExperimentStatus(selectedTest?.id, 'active')}
              className="px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Resume Test
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-5 gap-6">
          <div>
            <h3 className="font-semibold text-lg">{selectedTest?.name}</h3>
            <StatusPill status={selectedTest?.status} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Primary Metric</p>
            <p className="font-semibold">{selectedTest?.metric}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Participants</p>
            <p className="font-semibold">{selectedTest?.participants?.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Confidence Level</p>
            <div className="flex items-center gap-2">
              <ConfidenceIndicator confidence={selectedTest?.confidence || 0} />
              <span className="text-sm font-medium">{selectedTest?.confidence || 0}%</span>
            </div>
          </div>
          <div>
            {selectedTest?.leader && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Variant {selectedTest.leader.variant} Leading
                  </span>
                </div>
                <div className="text-lg font-bold text-green-700">
                  +{selectedTest.leader.improvement}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Performance Over Time</h4>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Variant A</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Variant B</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip 
              formatter={(value, dataKey) => [
                `${value}%`, 
                dataKey === 'variantA' ? 'Variant A' : 'Variant B'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="variantA" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name="Variant A"
            />
            <Line 
              type="monotone" 
              dataKey="variantB" 
              stroke="#10B981" 
              strokeWidth={3}
              name="Variant B"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold mb-4">Variant Comparison</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Conversion Rate</span>
              <div className="flex items-center gap-4">
                <span className="text-blue-600 font-medium">
                  {selectedTest?.variants?.a?.toFixed(1) || '0.0'}%
                </span>
                <span className="text-green-600 font-medium">
                  {selectedTest?.variants?.b?.toFixed(1) || '0.0'}%
                </span>
                <span className={`text-sm ${
                  (selectedTest?.variants?.b || 0) > (selectedTest?.variants?.a || 0) 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {selectedTest?.variants?.a && selectedTest?.variants?.b
                    ? ((selectedTest.variants.b - selectedTest.variants.a) / selectedTest.variants.a * 100).toFixed(1)
                    : '0.0'
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold mb-4">What Was Tested</h4>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-blue-600 mb-2">Variant A (Control)</h5>
              <div className="bg-blue-50 p-3 rounded text-sm">
                {selectedTest?.experiment_variants?.find(v => v.variant_name === 'A')?.configuration?.config || 
                 'Current live settings'}
              </div>
            </div>
            <div>
              <h5 className="font-medium text-green-600 mb-2">Variant B (Test)</h5>
              <div className="bg-green-50 p-3 rounded text-sm">
                {selectedTest?.experiment_variants?.find(v => v.variant_name === 'B')?.configuration?.config || 
                 'Test configuration'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PastExperimentCard = ({ experiment }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{experiment.name}</h4>
          <p className="text-sm text-gray-600">Testing: {experiment.metric}</p>
          <p className="text-xs text-gray-500 mt-1">
            {experiment.campaignName || 'Global Test'}
          </p>
        </div>
        <StatusPill status={experiment.status} />
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-900">
            Winner: Variant {experiment.winner} (+{experiment.improvement}%)
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{experiment.participants?.toLocaleString() || 0} participants</span>
        <button 
          onClick={() => handleViewDetails(experiment)}
          className="text-blue-600 hover:text-blue-700"
        >
          View Results
        </button>
      </div>
    </div>
  );

  // Loading state
  if (loading && activeView === 'overview') {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading A/B Tests</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError('');
              loadExperimentData();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render logic based on activeView
  if (activeView === 'create') {
    return <CreateExperimentModal />;
  }

  if (activeView === 'details' && selectedTest) {
    return <ExperimentDetails />;
  }

  // Overview Dashboard
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🧪 A/B Testing
          </h1>
          <p className="text-gray-600 mt-1">Optimize your AI's performance with data-driven experiments</p>
        </div>
        <button 
          onClick={() => setActiveView('create')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Experiment
          <span className="text-blue-200 text-sm ml-1">Optimize your AI's performance</span>
        </button>
      </div>

      {/* Active Experiments */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-600" />
          Active Experiments
        </h2>
        {activeExperiments.length > 0 ? (
          <div className="grid gap-4">
            {activeExperiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Experiments</h3>
              <p className="text-gray-600 mb-4">Start your first A/B test to optimize your lead conversion</p>
              <button 
                onClick={() => setActiveView('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Test
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Past Experiments */}
      {pastExperiments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gray-600" />
            Past Experiments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastExperiments.map((experiment) => (
              <PastExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTestingDashboard;