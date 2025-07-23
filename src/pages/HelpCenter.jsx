import React, { useState, useMemo } from 'react';

// Import tab components
import GettingStarted from '../help/tabs/GettingStarted';
import LeadManagement from '../help/tabs/LeadManagement';
import Campaigns from '../help/tabs/Campaigns';
import AIFeatures from '../help/tabs/AIFeatures';
import Analytics from '../help/tabs/Analytics';
import Settings from '../help/tabs/Settings';
import Integrations from '../help/tabs/Integrations';
import Troubleshooting from '../help/tabs/Troubleshooting';

// Search Bar Component
const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <section className="bg-white py-8 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto max-w-4xl px-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help articles, features, or tutorials..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full py-4 px-4 pr-12 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
            🔍
          </span>
        </div>
      </div>
    </section>
  );
};

// Tab Navigation Component
// Real search functionality
const searchResults = useMemo(() => {
  if (!searchTerm || searchTerm.length < 2) return {};
  
  const term = searchTerm.toLowerCase();
  const results = {};
  
  // Define content for each tab to search through
  const tabContent = {
    'getting-started': 'getting started platform overview settings first A2P registration phone numbers team setup AI configuration knowledge base complete setup checklist',
    'lead-management': 'lead management status hot cold engaging responding AI scoring import CSV bulk upload conversation view filtering search',
    'campaigns': 'campaign management creation phone numbers AI personality professional friendly casual goals qualify sellers recruit candidates book demos',
    'ai-features': 'AI features engine conversation intelligence A/B testing custom instructions knowledge base templates real estate staffing B2B',
    'analytics': 'analytics dashboard pipeline control room AI strategy hub performance metrics ROI revenue analysis export data',
    'settings': 'settings company information A2P brand registration campaign registry phone numbers sales team AI automation messaging',
    'integrations': 'integrations workflows CSV import export email notifications webhooks API CRM synchronization',
    'troubleshooting': 'troubleshooting common issues AI not sending hot leads not detected CSV import failing notifications performance'
  };
  
  // Search through each tab's content
  Object.entries(tabContent).forEach(([tabId, content]) => {
    const matches = content.toLowerCase().split(' ').filter(word => 
      word.includes(term) || term.includes(word)
    ).length;
    
    if (matches > 0) {
      results[tabId] = matches;
    }
  });
  
  return results;
}, [searchTerm]);

// Main Help Center Component
const HelpCenter = () => {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock search functionality - you can enhance this
  const searchResults = useMemo(() => {
    if (!searchTerm) return {};
    
    const term = searchTerm.toLowerCase();
    const results = {};
    
    // Simulate search results across tabs
    if (term.includes('integration') || term.includes('api') || term.includes('webhook')) {
      results['integrations'] = 5;
    }
    if (term.includes('campaign') || term.includes('phone')) {
      results['campaigns'] = 3;
    }
    if (term.includes('lead') || term.includes('score')) {
      results['lead-management'] = 7;
    }
    if (term.includes('ai') || term.includes('conversation')) {
      results['ai-features'] = 4;
    }
    if (term.includes('analytics') || term.includes('report')) {
      results['analytics'] = 2;
    }
    if (term.includes('settings') || term.includes('team')) {
      results['settings'] = 3;
    }
    if (term.includes('start') || term.includes('setup')) {
      results['getting-started'] = 6;
    }
    if (term.includes('trouble') || term.includes('error') || term.includes('fix')) {
      results['troubleshooting'] = 8;
    }
    
    return results;
  }, [searchTerm]);

  // Auto-switch to most relevant tab when searching
  React.useEffect(() => {
    if (searchTerm && Object.keys(searchResults).length > 0) {
      const topResult = Object.entries(searchResults).reduce((a, b) => 
        searchResults[a[0]] > searchResults[b[0]] ? a : b
      )[0];
      if (topResult !== activeTab) {
        setActiveTab(topResult);
      }
    }
  }, [searchResults, searchTerm, activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return <GettingStarted />;
      case 'lead-management':
        return <LeadManagement />;
      case 'campaigns':
        return <Campaigns />;
      case 'ai-features':
        return <AIFeatures />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'integrations':
        return <Integrations />;
      case 'troubleshooting':
        return <Troubleshooting />;
      default:
        return <GettingStarted />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12 text-center shadow-lg">
        <div className="container mx-auto max-w-4xl px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            AI Lead Texting Platform Help Center
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Master every feature of your AI-powered lead engagement system
          </p>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />

      {/* Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        searchResults={searchResults}
      />

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-5 pb-20">
        {/* Search Results Summary */}
        {searchTerm && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Search Results for "{searchTerm}"
            </h3>
            <div className="text-blue-700 text-sm">
              Found {Object.values(searchResults).reduce((a, b) => a + b, 0)} matches across{' '}
              {Object.keys(searchResults).length} sections
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="content-section active animate-fadeIn">
          {renderTabContent()}
        </div>
      </main>

      {/* Add the CSS for animations and styling */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid transparent;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #667eea;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 24px;
        }

        .card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: #2d3748;
        }

        .card p {
          color: #4a5568;
          line-height: 1.6;
        }

        .feature-section {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .feature-section h2 {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .process-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2rem 0;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .process-step {
          flex: 1;
          text-align: center;
          position: relative;
          min-width: 150px;
        }

        .process-step:not(:last-child)::after {
          content: '→';
          position: absolute;
          right: -20px;
          top: 50%;
          transform: translateY(-50%);
          color: #cbd5e0;
          font-size: 1.5rem;
        }

        .process-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.5rem;
          color: white;
          font-size: 24px;
        }

        .process-label {
          font-weight: 600;
          color: #2d3748;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .metric-card {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 0.25rem;
        }

        .metric-label {
          color: #4a5568;
          font-size: 0.875rem;
        }

        .collapsible {
          background: white;
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .collapsible-header {
          padding: 1.25rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background-color 0.3s ease;
        }

        .collapsible-header:hover {
          background-color: #f7fafc;
        }

        .collapsible-header h3 {
          margin: 0;
          color: #2d3748;
          font-size: 1.1rem;
        }

        .collapsible-icon {
          transition: transform 0.3s ease;
          color: #a0aec0;
        }

        .rotate-180 {
          transform: rotate(180deg);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table th {
          background-color: #f7fafc;
          font-weight: 600;
          color: #2d3748;
        }

        .data-table tr:hover {
          background-color: #f7fafc;
        }

        .alert {
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .alert-info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }

        .alert-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .alert-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .alert-danger {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .best-practice {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 1.25rem;
          margin: 1rem 0;
        }

        .best-practice h4 {
          color: #166534;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .best-practice p {
          color: #166534;
          font-size: 0.95rem;
        }

        .warning-box {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 1.25rem;
          margin: 1rem 0;
        }

        .warning-box h4 {
          color: #92400e;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .warning-box p {
          color: #92400e;
          font-size: 0.95rem;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-hot {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-engaging {
          background: #fed7aa;
          color: #ea580c;
        }

        .status-responding {
          background: #bbf7d0;
          color: #16a34a;
        }

        .status-cold {
          background: #dbeafe;
          color: #2563eb;
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-list li {
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .feature-list li:last-child {
          border-bottom: none;
        }

        .feature-icon {
          color: #667eea;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .feature-content h4 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
          color: #2d3748;
        }

        .feature-content p {
          color: #4a5568;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default HelpCenter;