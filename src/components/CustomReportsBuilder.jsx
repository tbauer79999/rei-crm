import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Download, 
  Calendar, 
  Layout, 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Target,
  Activity,
  FileText,
  Mail,
  Clock,
  Save,
  Eye,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  Filter,
  X
} from 'lucide-react';

const CustomReportsBuilder = () => {
  const [activeView, setActiveView] = useState('builder'); // builder, templates, saved
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    dateRange: '30',
    sections: [],
    schedule: null
  });
  const [draggedItem, setDraggedItem] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Available report sections
  const reportSections = [
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      description: 'High-level KPIs and performance overview',
      icon: BarChart3,
      type: 'summary',
      preview: 'Key metrics, conversion rates, ROI summary'
    },
    {
      id: 'campaign-performance',
      name: 'Campaign Performance',
      description: 'Detailed campaign metrics and comparison',
      icon: Target,
      type: 'table',
      preview: 'Campaign names, leads, conversions, costs'
    },
    {
      id: 'lead-funnel',
      name: 'Lead Funnel Analysis',
      description: 'Conversion funnel with stage breakdown',
      icon: TrendingUp,
      type: 'funnel',
      preview: 'Funnel stages, conversion rates, drop-off points'
    },
    {
      id: 'team-performance',
      name: 'Sales Team Performance',
      description: 'Individual and team performance metrics',
      icon: Users,
      type: 'table',
      preview: 'Rep names, handoffs, conversions, pipeline value'
    },
    {
      id: 'roi-analysis',
      name: 'ROI Analysis',
      description: 'Return on investment by source and campaign',
      icon: DollarSign,
      type: 'table',
      preview: 'Lead sources, costs, revenue, ROI percentages'
    },
    {
      id: 'ai-insights',
      name: 'AI Performance Insights',
      description: 'AI conversation metrics and optimization data',
      icon: Activity,
      type: 'insights',
      preview: 'Response rates, conversation quality, optimization tips'
    }
  ];

  // Pre-built templates
  const templates = [
    {
      id: 'executive-overview',
      name: 'Executive Overview',
      description: 'High-level performance summary for leadership',
      sections: ['executive-summary', 'roi-analysis', 'lead-funnel'],
      icon: FileText
    },
    {
      id: 'sales-performance',
      name: 'Sales Performance Report',
      description: 'Detailed sales team and campaign analysis',
      sections: ['campaign-performance', 'team-performance', 'lead-funnel'],
      icon: Users
    },
    {
      id: 'operational-deep-dive',
      name: 'Operational Deep Dive',
      description: 'Comprehensive operational metrics and AI insights',
      sections: ['executive-summary', 'campaign-performance', 'ai-insights', 'roi-analysis'],
      icon: BarChart3
    }
  ];

  const handleDragStart = (e, section) => {
    setDraggedItem(section);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedItem && !reportConfig.sections.find(s => s.id === draggedItem.id)) {
      setReportConfig(prev => ({
        ...prev,
        sections: [...prev.sections, draggedItem]
      }));
    }
    setDraggedItem(null);
  };

  const removeSection = (sectionId) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const moveSection = (fromIndex, toIndex) => {
    const newSections = [...reportConfig.sections];
    const [removed] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, removed);
    setReportConfig(prev => ({ ...prev, sections: newSections }));
  };

  const applyTemplate = (template) => {
    const templateSections = template.sections.map(sectionId => 
      reportSections.find(s => s.id === sectionId)
    ).filter(Boolean);
    
    setReportConfig(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      sections: templateSections
    }));
    setSelectedTemplate(template.id);
    setActiveView('builder');
  };

  const TemplatesView = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Layout className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose a Report Template</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Start with a professionally designed template, then customize to your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => applyTemplate(template)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <template.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm text-gray-500">
                {template.sections.length} sections
              </div>
            </div>
            
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h4>
            <p className="text-gray-600 text-sm mb-4">{template.description}</p>
            
            <div className="space-y-2">
              {template.sections.slice(0, 3).map((sectionId) => {
                const section = reportSections.find(s => s.id === sectionId);
                return (
                  <div key={sectionId} className="flex items-center text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
                    {section?.name}
                  </div>
                );
              })}
              {template.sections.length > 3 && (
                <div className="text-xs text-gray-400">
                  +{template.sections.length - 3} more sections
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <button
          onClick={() => setActiveView('builder')}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          Or start from scratch
        </button>
      </div>
    </div>
  );

  const BuilderView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Configuration */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Configuration</h3>
          
          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <input
                type="text"
                value={reportConfig.name}
                onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Monthly Executive Summary"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={reportConfig.description}
                onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this report..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={reportConfig.dateRange}
                onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Available Sections */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Sections</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reportSections.map((section) => (
                <div
                  key={section.id}
                  draggable={!reportConfig.sections.find(s => s.id === section.id)}
                  onDragStart={(e) => handleDragStart(e, section)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={`p-3 rounded-lg border border-gray-200 transition-all ${
                    reportConfig.sections.find(s => s.id === section.id) 
                      ? 'bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'bg-white hover:border-blue-300 cursor-grab active:cursor-grabbing hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <section.icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{section.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Report
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Report Builder */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-200 min-h-[600px]">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {reportConfig.name || 'Untitled Report'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {reportConfig.description || 'Drag sections from the left panel to build your report'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  {reportConfig.sections.length} sections
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`p-6 min-h-[500px] transition-colors ${
              draggedItem ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
            }`}
          >
            {reportConfig.sections.length === 0 ? (
              <div className={`text-center py-20 rounded-xl transition-colors ${
                draggedItem 
                  ? 'border-2 border-dashed border-blue-400 bg-blue-50' 
                  : 'border-2 border-dashed border-gray-300'
              }`}>
                <Layout className={`w-16 h-16 mx-auto mb-4 ${
                  draggedItem ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <h4 className={`text-lg font-medium mb-2 ${
                  draggedItem ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {draggedItem ? `Drop "${draggedItem.name}" here` : 'Start Building Your Report'}
                </h4>
                <p className={`mb-6 ${
                  draggedItem ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {draggedItem 
                    ? 'Release to add this section to your report'
                    : 'Drag sections from the left panel to create your custom report'
                  }
                </p>
                {!draggedItem && (
                  <button
                    onClick={() => setActiveView('templates')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Or choose a template
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {reportConfig.sections.map((section, index) => (
                  <div
                    key={`${section.id}-${index}`}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-6 group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <section.icon className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{section.name}</h4>
                          <p className="text-sm text-gray-600">{section.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Section Preview */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 italic">
                        Preview: {section.preview}
                      </div>
                      {section.type === 'table' && (
                        <div className="mt-3">
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-gray-100 p-2 rounded font-medium">Column 1</div>
                            <div className="bg-gray-100 p-2 rounded font-medium">Column 2</div>
                            <div className="bg-gray-100 p-2 rounded font-medium">Column 3</div>
                            <div className="bg-gray-100 p-2 rounded font-medium">Column 4</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SavedReportsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Saved Reports</h3>
          <p className="text-gray-600 mt-1">Manage your saved report configurations</p>
        </div>
        <button
          onClick={() => setActiveView('templates')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example saved reports */}
        {[
          { name: 'Monthly Executive Summary', lastRun: '2 days ago', sections: 4, scheduled: true },
          { name: 'Weekly Sales Performance', lastRun: '1 week ago', sections: 3, scheduled: true },
          { name: 'Q4 Campaign Analysis', lastRun: '3 days ago', sections: 5, scheduled: false }
        ].map((report, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="flex items-center space-x-2">
                {report.scheduled && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Scheduled" />
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2">{report.name}</h4>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <div>{report.sections} sections</div>
              <div>Last run: {report.lastRun}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                Run Now
              </button>
              <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Schedule Modal Component
  const ScheduleModal = () => {
    if (!showScheduleModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Report</h3>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Recipients</label>
              <input
                type="email"
                placeholder="email@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-6">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
            <p className="text-gray-600 mt-1">Create professional reports with real-time data</p>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'templates', label: 'Templates', icon: Layout },
              { id: 'builder', label: 'Builder', icon: Settings },
              { id: 'saved', label: 'Saved', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {activeView === 'templates' && <TemplatesView />}
        {activeView === 'builder' && <BuilderView />}
        {activeView === 'saved' && <SavedReportsView />}
      </div>

      <ScheduleModal />
    </div>
  );
};

export default CustomReportsBuilder;