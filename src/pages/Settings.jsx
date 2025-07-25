import React, { useState, useEffect } from 'react';
import { Users, Phone, Shield } from 'lucide-react';
import SalesTeamSettings from '../components/settings/SalesTeamSettings';
import PhoneNumbersSettings from '../components/settings/phonenumbersSettings';
import A2PCompliance from '../components/settings/a2pcompliance';
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
        <pre className="mt-4 text-xs bg-gray-100 p-3 rounded border border-gray-300 break-all overflow-x-auto">
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
    description: 'Configure AI message pacing, tone rules, and throttle settings',
    icon: MessageSquare,
    component: MessagingSettings,
    status: 'healthy',
    statusText: 'Configured'
  },
  {
    key: 'phonenumbers',
    title: 'Phone Numbers',
    description: 'Purchase and manage business phone numbers for your team',
    icon: Phone,
    component: PhoneNumbersSettings,
    status: 'healthy',
    statusText: 'Active'
  },
  {
    key: 'a2pcompliance',
    title: 'A2P Compliance',
    description: 'Register your business brand and campaigns for SMS messaging compliance',
    icon: Shield,
    component: A2PCompliance,
    status: 'attention',
    statusText: 'Setup Required'
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
    description: 'Control AI escalation behavior, scoring rules, and automated follow-up timing',
    icon: Brain,
    component: AISettings,
    status: 'attention',
    statusText: 'Needs Configuration'
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
    description: 'Upload business documents to train AI on your company language, process, and terminology',
    icon: Database,
    component: AIKnowledgeBase,
    status: 'review',
    statusText: 'Pending Updates'
  },
  {
    key: 'systemtools',
    title: 'System Tools & Export',
    description: 'Download settings, export message logs, or restore platform defaults',
    icon: SettingsIcon,
    component: SystemTools,
    status: 'healthy',
    statusText: 'Ready'
  }
];

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    document.title = "Settings – SurFox";
  }, []);

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
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 lg:py-8">
          {/* Header with Back Button */}
          <div className="mb-4 lg:mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-3 lg:mb-4 transition-colors"
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              <span className="text-sm lg:text-base">Back to Settings</span>
            </button>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                <category.icon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 break-words">{category.title}</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-1 break-words">{category.description}</p>
              </div>
            </div>
          </div>

          {/* Settings Component */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 lg:p-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 lg:py-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Settings & Configuration</h1>
          <p className="text-sm lg:text-base text-gray-600">Manage your SurFox system preferences and AI automation settings</p>
        </div>

        {/* Settings Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {settingsCategories.map((category) => (
            <div
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className="group bg-white rounded-xl border border-gray-200 p-4 lg:p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors flex-shrink-0">
                      <category.icon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors break-words">
                        {category.title}
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-sm lg:text-base text-gray-600 mb-4 leading-relaxed break-words">
                    {category.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(category.status)}
                      <span className={`text-xs lg:text-sm font-medium ${getStatusColor(category.status)}`}>
                        {category.statusText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-2 lg:ml-4 flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Footer */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-gray-900">9</div>
              <div className="text-xs lg:text-sm text-gray-600 break-words">Settings Categories</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-green-600">6</div>
              <div className="text-xs lg:text-sm text-gray-600 break-words">✔️ Fully Configured</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-orange-600">2</div>
              <div className="text-xs lg:text-sm text-gray-600 break-words">Needs Attention</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-blue-600">1</div>
              <div className="text-xs lg:text-sm text-gray-600 break-words">🕗 Awaiting Changes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}