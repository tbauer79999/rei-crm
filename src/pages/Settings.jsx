import React, { useState } from 'react';
import { Users } from 'lucide-react';
import SalesTeamSettings from '../components/settings/SalesTeamSettings'; // New component we'll create
import { 
  Building2, 
  MessageSquare, 
  Brain, 
  FileText, 
  Database, 
  Settings as SettingsIcon,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import CompanySettings from '../components/settings/CompanySettings';
import MessagingSettings from '../components/settings/MessagingSettings';
import AISettings from '../components/settings/AISettings';
import AIInstructionSettings from '../components/settings/AIInstructionSettings';
import AIKnowledgeBase from '../components/settings/AIKnowledgeBase';
import SystemTools from '../components/settings/SystemTools';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function DebugTokenButton() {
  const [token, setToken] = useState('');

  const fetchToken = async () => {
    const { data } = await supabase.auth.getSession();
    setToken(data.session?.access_token || 'No token found');
  };

  return (
    <div className="mt-10">
      <button
        onClick={fetchToken}
        className="text-sm text-blue-600 underline hover:text-blue-800"
      >
        🔐 Show Supabase Access Token
      </button>
      {token && (
        <pre className="mt-4 text-xs bg-gray-100 p-3 rounded border border-gray-300 break-all">
          {token}
        </pre>
      )}
    </div>
  );
}

const settingsCategories = [
  {
    key: 'company',
    title: 'Company Information',
    description: 'Business details, contact info, and operating hours',
    icon: Building2,
    component: CompanySettings,
    status: 'healthy',
    statusText: 'Complete'
  },
  {
    key: 'messaging',
    title: 'Messaging & Communication',
    description: 'AI reply settings, throttling, and response modes',
    icon: MessageSquare,
    component: MessagingSettings,
    status: 'healthy',
    statusText: 'Configured'
  },
  {
  key: 'salesteam',
  title: 'Sales Team',
  description: 'Invite team members, manage user access, and view your sales roster',
  icon: Users,
  component: SalesTeamSettings,
  status: 'healthy',
  statusText: 'Active Team'
},
  {
    key: 'ai',
    title: 'AI & Automation',
    description: 'Escalation controls, scoring thresholds, and automation rules',
    icon: Brain,
    component: AISettings,
    status: 'attention',
    statusText: 'Review Settings'
  },
  {
    key: 'instruction',
    title: 'AI Instruction Hub',
    description: 'Industry personas, tone settings, and conversation guidelines',
    icon: FileText,
    component: AIInstructionSettings,
    status: 'healthy',
    statusText: 'Active'
  },
  {
    key: 'knowledge',
    title: 'AI Knowledge Base',
    description: 'Upload documents and training materials for AI context',
    icon: Database,
    component: AIKnowledgeBase,
    status: 'review',
    statusText: 'Pending Updates'
  },
  {
    key: 'systemtools',
    title: 'System Tools & Export',
    description: 'Data export, backups, and system maintenance utilities',
    icon: SettingsIcon,
    component: SystemTools,
    status: 'healthy',
    statusText: 'Ready'
  }
];

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'attention':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'review':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'attention':
        return 'text-orange-600';
      case 'review':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (activeCategory) {
    const category = settingsCategories.find(cat => cat.key === activeCategory);
    const ActiveComponent = category.component;

    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Settings
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                <category.icon className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{category.title}</h1>
                <p className="text-gray-600">{category.description}</p>
              </div>
            </div>
          </div>

          {/* Settings Component */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings & Configuration</h1>
          <p className="text-gray-600">Manage your REI-CRM system preferences and AI automation settings</p>
        </div>

        {/* Settings Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settingsCategories.map((category) => (
            <div
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                      <category.icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                        {category.title}
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {category.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(category.status)}
                      <span className={`text-sm font-medium ${getStatusColor(category.status)}`}>
                        {category.statusText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">6</div>
              <div className="text-sm text-gray-600">Settings Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">4</div>
              <div className="text-sm text-gray-600">Healthy Systems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-gray-600">Needs Attention</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
            <div className="text-center">
  <div className="text-2xl font-bold text-gray-900">7</div> {/* Changed from 6 to 7 */}
  <div className="text-sm text-gray-600">Settings Categories</div>
</div>
          </div>

          {/* Debug Access Token Tool */}
          <DebugTokenButton />
        </div>
      </div>
    </div>
  );
}
