import React, { useState } from 'react';
import CompanySettings from '../components/settings/CompanySettings';
import MessagingSettings from '../components/settings/MessagingSettings';
import AISettings from '../components/settings/AISettings';
import SystemTools from '../components/settings/SystemTools';

const tabs = [
  { key: 'company', label: 'Company Info' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'ai', label: 'AI & Automation' },
  { key: 'systemtools', label: 'System Tools' }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Settings</h1>

      {/* Folder Tabs */}
      <div className="flex space-x-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-md border border-b-0 ${
              activeTab === tab.key
                ? 'bg-white border-gray-300 text-blue-600 font-semibold'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-b-md shadow border border-gray-300">
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'messaging' && <MessagingSettings />}
        {activeTab === 'ai' && <AISettings />}
        {activeTab === 'systemtools' && <SystemTools />}
      </div>
    </div>
  );
}
