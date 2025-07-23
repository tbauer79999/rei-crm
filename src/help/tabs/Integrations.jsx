import React from 'react';
import { 
  FeatureCard, 
  CollapsibleSection, 
  DataTable, 
  AlertBox, 
  MetricCard,
  ProcessFlow 
} from '../shared';

const Integrations = () => {
  // Data for the integration methods
  const integrationMethods = [
    {
      icon: '📊',
      title: 'CSV Import/Export',
      description: 'Bulk data transfer between systems. Import leads from any source, export results to any CRM. Manual but reliable for all platforms.'
    },
    {
      icon: '📧',
      title: 'Email Notifications',
      description: 'Real-time alerts for hot leads sent to your team. Includes conversation summary and quick action links.'
    },
    {
      icon: '📱',
      title: 'SMS Alerts',
      description: 'Instant text notifications for urgent hot leads. Ensures your sales team never misses an opportunity.'
    },
    {
      icon: '🔗',
      title: 'Webhook Events (Coming)',
      description: 'Real-time data push to your systems. Trigger workflows in Zapier, Make, or custom applications.'
    },
    {
      icon: '🚀',
      title: 'API Access (Coming)',
      description: 'Full programmatic access to create leads, read conversations, update statuses, and pull analytics.'
    },
    {
      icon: '🤝',
      title: 'Native Integrations (Planned)',
      description: 'Direct connections to popular CRMs like Salesforce, HubSpot, and Pipedrive coming soon.'
    }
  ];

  // Lead flow process steps
  const leadFlowSteps = [
    { icon: '📧', label: 'Email Campaign' },
    { icon: '📝', label: 'Form Submission' },
    { icon: '🤖', label: 'AI Texting' },
    { icon: '🔥', label: 'Hot Lead' },
    { icon: '💼', label: 'CRM Deal' }
  ];

  // Sales tool integration data
  const salesToolsData = [
    ['Calendar (Calendly, etc)', 'Share booking links in AI conversations', 'AI provides link → Lead books → Notification to platform'],
    ['Dialer (PowerDialer, etc)', 'Export hot lead phone numbers', 'Hot lead → CSV export → Import to dialer queue'],
    ['Email Sequences', 'Trigger based on AI outcome', 'Cold in SMS → Add to email nurture campaign'],
    ['Proposal Tools', 'Generate from qualified lead data', 'Export lead details → Create proposal → Track engagement']
  ];

  // Future integrations metrics
  const futureIntegrations = [
    { value: '🔗', label: 'Salesforce', sublabel: 'Bi-directional sync, custom objects, workflow triggers' },
    { value: '🔗', label: 'HubSpot', sublabel: 'Contact sync, deal creation, timeline events' },
    { value: '🔗', label: 'Zapier', sublabel: '1000+ app connections, custom workflows' },
    { value: '🔗', label: 'Slack', sublabel: 'Hot lead alerts, team notifications, conversation summaries' }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">🔌 Integrations & Workflows</h2>
        <p className="text-lg text-gray-600 mb-8">
          Connect your AI texting platform with your existing tech stack for seamless operations.
        </p>

        <h3 className="text-2xl font-semibold mb-6">Current Integration Methods</h3>
        <div className="cards-grid">
          {integrationMethods.map((method, index) => (
            <FeatureCard
              key={index}
              icon={method.icon}
              title={method.title}
              description={method.description}
            />
          ))}
        </div>
      </div>

      {/* Common Integration Workflows */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔄 Common Integration Workflows</h2>
        
        <CollapsibleSection title="CRM Synchronization Workflow">
          <h4 className="text-lg font-semibold mb-3">Current Manual Process:</h4>
          <ol className="ml-6 text-gray-700 space-y-2 mb-4">
            <li>Export leads from CRM as CSV</li>
            <li>Map fields to platform template</li>
            <li>Import to AI texting platform</li>
            <li>AI engages and qualifies leads</li>
            <li>Export hot leads daily</li>
            <li>Import back to CRM with updated status</li>
          </ol>
          
          <h4 className="text-lg font-semibold mb-3">Automation Tips:</h4>
          <ul className="ml-6 text-gray-700 space-y-1">
            <li>Set up scheduled exports from CRM</li>
            <li>Use spreadsheet tools for field mapping</li>
            <li>Create import templates for consistency</li>
            <li>Establish daily sync routines</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Marketing Automation Integration">
          <h4 className="text-lg font-semibold mb-3">Lead Flow Architecture:</h4>
          <div className="my-6">
            <ProcessFlow steps={leadFlowSteps} />
          </div>
          
          <h4 className="text-lg font-semibold mb-3">Integration Points:</h4>
          <ul className="ml-6 text-gray-700 space-y-2">
            <li><strong>Form Submissions:</strong> Auto-add to AI texting with web form integration</li>
            <li><strong>Email Responders:</strong> Trigger SMS outreach for engaged email leads</li>
            <li><strong>Lead Scoring:</strong> Combine email + SMS engagement scores</li>
            <li><strong>Suppression Lists:</strong> Sync opt-outs across all channels</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Sales Tool Stack Integration">
          <h4 className="text-lg font-semibold mb-3">Common Sales Stack Connections:</h4>
          <DataTable
            headers={['Tool Type', 'Integration Method', 'Data Flow']}
            data={salesToolsData}
          />
        </CollapsibleSection>
      </div>

      {/* Future Integration Roadmap */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🚀 Future Integration Roadmap</h2>
        
        <AlertBox type="info" icon="🔮" title="Coming in 2024:">
          Native integrations with major CRMs, webhook support, Zapier app, and full REST API. Stay tuned for updates!
        </AlertBox>

        <h3 className="text-xl font-semibold mt-8 mb-6">Planned Integrations</h3>
        <div className="metric-grid">
          {futureIntegrations.map((integration, index) => (
            <MetricCard
              key={index}
              value={integration.value}
              label={integration.label}
              sublabel={integration.sublabel}
            />
          ))}
        </div>
      </div>

      {/* Integration Benefits */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Integration Benefits</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Current Capabilities</h3>
            <ul className="text-green-700 space-y-2">
              <li>• Manual CSV import/export workflows</li>
              <li>• Email and SMS notifications</li>
              <li>• Bulk data transfers</li>
              <li>• Lead source tracking</li>
              <li>• Team notification systems</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🚀 Coming Soon</h3>
            <ul className="text-blue-700 space-y-2">
              <li>• Real-time CRM synchronization</li>
              <li>• Webhook event triggers</li>
              <li>• API-driven integrations</li>
              <li>• Zapier marketplace app</li>
              <li>• Native platform connections</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🏁 Getting Started with Integrations</h2>
        
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recommended First Steps:</h3>
          <ol className="ml-6 text-gray-700 space-y-3">
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
              <div>
                <strong>Audit Your Current Tech Stack:</strong> List all tools that handle leads, from capture to close
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
              <div>
                <strong>Map Your Lead Journey:</strong> Identify where AI texting fits in your existing workflow
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
              <div>
                <strong>Start with CSV Imports:</strong> Test the platform with a small batch from your CRM
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
              <div>
                <strong>Set Up Notifications:</strong> Configure your team to receive hot lead alerts
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
              <div>
                <strong>Plan for API Access:</strong> Document integration requirements for when API becomes available
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Integrations;