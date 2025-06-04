import React from 'react';
import { Building2, Globe, DollarSign, Brain, Award } from 'lucide-react';

const NavigationTabs = ({ activeView, setActiveView }) => {
  const tabs = [
    { id: 'portfolio', name: 'Portfolio Intelligence', icon: Building2 },
    { id: 'market', name: 'Market Intelligence', icon: Globe },
    { id: 'revenue', name: 'Revenue Operations', icon: DollarSign },
    { id: 'predictive', name: 'Predictive Analytics', icon: Brain },
    { id: 'benchmarks', name: 'Industry Benchmarks', icon: Award },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default NavigationTabs;
