import React, { useState } from 'react';
import CompanySettings from '../components/settings/CompanySettings';
import MessagingSettings from '../components/settings/MessagingSettings';
import AISettings from '../components/settings/AISettings';
import AIInstructionSettings from '../components/settings/AIInstructionSettings';
import AIKnowledgeBase from '../components/settings/AIKnowledgeBase';
import SystemTools from '../components/settings/SystemTools';

const tabs = [
  { key: 'company', label: 'Company Info', component: CompanySettings },
  { key: 'messaging', label: 'Messaging', component: MessagingSettings },
  { key: 'ai', label: 'AI & Automation', component: AISettings },
  { key: 'instruction', label: 'AI Instruction Hub', component: AIInstructionSettings },
  { key: 'knowledge', label: 'AI Knowledge Base', component: AIKnowledgeBase },
  { key: 'systemtools', label: 'System Tools', component: SystemTools },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const ActiveComponent = activeTab.component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

        <div className="flex space-x-2 overflow-x-auto mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border
  ${
    activeTab.key === tab.key
      ? 'bg-slate-800 text-white border-slate-800'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
  }`}

            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
