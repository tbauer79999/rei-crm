import React from 'react';
import { 
  FeatureCard, 
  CollapsibleSection, 
  DataTable, 
  AlertBox, 
  MetricCard,
  BestPracticeBox,
  WarningBox,
  StatusPill,
  FeatureList
} from '../shared';

const LeadManagement = () => {
  // Lead status data (extracted from original)
  const leadStatusData = [
    [<StatusPill status="🔥 Hot Lead" type="hot" />, 'Red/Fire', 'Lead shows high interest, urgency, or buying signals. AI has identified them as sales-ready.', 'Immediate sales follow-up required'],
    [<StatusPill status="💬 Engaging" type="engaging" />, 'Orange', 'Lead is actively conversing with AI, asking questions, showing interest.', 'Let AI continue nurturing'],
    [<StatusPill status="↩️ Responding" type="responding" />, 'Green', 'Lead has responded to initial outreach, conversation is active.', 'Monitor for escalation'],
    [<StatusPill status="❄️ Cold Lead" type="cold" />, 'Blue', 'No response yet or minimal engagement. May need different approach.', 'Wait for follow-up sequence'],
    [<StatusPill status="🚫 Unsubscribed" type="default" />, 'Gray', 'Lead has opted out of communications. No further contact allowed.', 'Remove from active campaigns']
  ];

  // Lead scoring metrics (extracted from original)
  const leadScoringMetrics = [
    { value: '🔥', label: 'On Fire', sublabel: '76-100 - Immediate sales opportunity. High urgency, clear need, budget confirmed.' },
    { value: '🌶️', label: 'Hot', sublabel: '51-75 - Strong interest shown. Asking specific questions, timeline discussed.' },
    { value: '☀️', label: 'Warm', sublabel: '26-50 - Engaged but early stage. Gathering information, no urgency yet.' },
    { value: '❄️', label: 'Cold', sublabel: '0-25 - Minimal engagement. Short responses, no clear interest signals.' }
  ];

  // Lead scoring factors (extracted from original)
  const scoringFactors = [
    {
      title: 'Response Time & Frequency',
      description: 'Leads who respond quickly and maintain conversation flow score higher. Multiple exchanges indicate genuine interest.'
    },
    {
      title: 'Message Length & Quality',
      description: 'Detailed responses with questions score higher than one-word answers. AI analyzes engagement depth.'
    },
    {
      title: 'Sentiment Analysis',
      description: 'Positive language, enthusiasm, and agreement signals increase score. Negative sentiment or objections lower it.'
    },
    {
      title: 'Buying Signals',
      description: 'Keywords like "how much", "when can we start", "interested in learning more" significantly boost scores.'
    },
    {
      title: 'Urgency Indicators',
      description: 'Time-sensitive language ("need this soon", "by next month") increases hot lead probability.'
    }
  ];

  // Custom fields data (extracted from original)
  const customFieldsData = {
    realEstate: [
      'property_address',
      'property_type (SFH, Condo, Multi-family)',
      'asking_price',
      'bedrooms',
      'square_footage',
      'listing_date'
    ],
    staffing: [
      'current_position',
      'years_experience',
      'desired_salary',
      'skills',
      'availability',
      'location_preference'
    ],
    b2b: [
      'company_name',
      'industry',
      'company_size',
      'annual_revenue',
      'decision_maker',
      'current_solution'
    ]
  };

  // Advanced filtering features (extracted from original)
  const filteringFeatures = [
    {
      title: 'Global Search',
      description: 'Search across all lead fields including name, phone, email, and custom fields. Search is case-insensitive and supports partial matches.'
    },
    {
      title: 'Status Filters',
      description: 'Quick filter buttons for each status type. Click multiple statuses to see combined results. Status counts update in real-time.'
    },
    {
      title: 'Campaign Filters',
      description: 'Filter leads by campaign assignment. Useful for campaign-specific follow-up or performance analysis.'
    },
    {
      title: 'Date Range Filters',
      description: 'Filter by creation date, last interaction, or custom date fields. Find leads from specific time periods.'
    },
    {
      title: 'Score-Based Filtering',
      description: 'Filter leads by AI score ranges to focus on your hottest opportunities or identify leads needing attention.'
    }
  ];

  // Conversation view features (extracted from original)
  const conversationFeatures = [
    {
      title: 'Message Timeline',
      description: 'See all messages in chronological order with timestamps. AI messages show with bot indicator, lead messages with user icon.'
    },
    {
      title: 'Real-Time Scoring',
      description: 'Watch lead scores update after each message. Hover over scores to see factors that influenced the calculation.'
    },
    {
      title: 'Sentiment Indicators',
      description: 'Each inbound message shows sentiment analysis: 😍 Very Positive, 😊 Positive, 😐 Neutral, 😠 Negative'
    },
    {
      title: 'Engagement Metrics',
      description: 'View response time, message frequency, and engagement level. Track when lead was last active.'
    },
    {
      title: 'Lead Score Chart',
      description: 'Visual chart showing score progression over time. Identify trends and conversation turning points.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">📋 Complete Lead Management Guide</h2>
        <p className="text-lg text-gray-600 mb-8">
          The lead management system is the heart of your platform. Here's everything you need to know about managing, tracking, and optimizing your lead pipeline.
        </p>

        <h3 className="text-2xl font-semibold mb-6">Understanding Lead Statuses</h3>
        <p className="text-gray-600 mb-4">
          Every lead in the system has a status that automatically updates based on their interaction with your AI:
        </p>
        
        <DataTable
          headers={['Status', 'Indicator', 'Description', 'Next Action']}
          data={leadStatusData}
        />
      </div>

      {/* AI Lead Scoring System - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 AI Lead Scoring System</h2>
        <p className="text-gray-600 mb-6">
          Our proprietary AI scoring algorithm analyzes every message to determine lead quality on a 0-100 scale:
        </p>
        
        <div className="metric-grid mb-8">
          {leadScoringMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              value={metric.value}
              label={metric.label}
              sublabel={metric.sublabel}
            />
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-4">Factors That Influence Lead Score</h3>
        <FeatureList features={scoringFactors} />
      </div>

      {/* Bulk Lead Import Guide - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📤 Bulk Lead Import Guide</h2>
        
        <h3 className="text-xl font-semibold mb-4">Preparing Your CSV File</h3>
        <p className="text-gray-600 mb-4">Follow these guidelines for successful bulk imports:</p>
        
        <CollapsibleSection title="Required CSV Format">
          <p className="mb-4">Your CSV must include these columns (download template from dashboard):</p>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
            name,phone,email,property_address,status,campaign,notes<br/>
            John Smith,+1-555-123-4567,john@email.com,123 Main St,Cold Lead,Q2 Sellers,Interested in selling<br/>
            Jane Doe,+15551234568,jane@email.com,456 Oak Ave,Cold Lead,Q2 Sellers,Timeline 3-6 months
          </div>
          
          <h4 className="text-lg font-semibold mb-3">Column Requirements:</h4>
          <ul className="ml-6 text-gray-700 space-y-2">
            <li><strong>name:</strong> Full name (required)</li>
            <li><strong>phone:</strong> Include country code (+1 for US). Accepts multiple formats.</li>
            <li><strong>email:</strong> Valid email address (optional but recommended)</li>
            <li><strong>property_address:</strong> For real estate. Other industries can customize fields.</li>
            <li><strong>status:</strong> Usually "Cold Lead" for new imports</li>
            <li><strong>campaign:</strong> Must match existing campaign name exactly</li>
            <li><strong>notes:</strong> Any additional context for AI or sales team</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Custom Fields Configuration">
          <p className="mb-4">Different industries can configure custom fields:</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-blue-800">Real Estate Fields:</h4>
              <ul className="text-gray-700 space-y-1 text-sm">
                {customFieldsData.realEstate.map((field, index) => (
                  <li key={index}>• {field}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-green-800">Staffing/Recruiting Fields:</h4>
              <ul className="text-gray-700 space-y-1 text-sm">
                {customFieldsData.staffing.map((field, index) => (
                  <li key={index}>• {field}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-purple-800">B2B Sales Fields:</h4>
              <ul className="text-gray-700 space-y-1 text-sm">
                {customFieldsData.b2b.map((field, index) => (
                  <li key={index}>• {field}</li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        <BestPracticeBox title="Import Best Practices">
          <ul className="ml-6 space-y-1">
            <li>Clean your data first - remove duplicates, fix formatting</li>
            <li>Start with 50-100 leads to test your campaign settings</li>
            <li>Use UTF-8 encoding if your data contains special characters</li>
            <li>Include as much context as possible in the notes field</li>
            <li>Segment your lists by quality - run separate campaigns for different lead types</li>
          </ul>
        </BestPracticeBox>

        <WarningBox title="Common Import Errors">
          <ul className="ml-6 space-y-1">
            <li>Phone numbers without country codes</li>
            <li>Campaign names that don't match exactly (case-sensitive)</li>
            <li>Special characters in phone numbers (remove parentheses, dashes)</li>
            <li>Extra columns not in the template</li>
            <li>Headers with trailing spaces</li>
          </ul>
        </WarningBox>
      </div>

      {/* Advanced Lead Filtering & Search - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔍 Advanced Lead Filtering & Search</h2>
        
        <h3 className="text-xl font-semibold mb-4">Search Capabilities</h3>
        <p className="text-gray-600 mb-4">
          The platform offers powerful search and filtering to find exactly the leads you need:
        </p>
        
        <FeatureList features={filteringFeatures} />

        <h3 className="text-xl font-semibold mt-8 mb-4">Bulk Actions</h3>
        <p className="text-gray-600 mb-4">Perform actions on multiple leads simultaneously:</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Data Management:</h4>
            <ul className="text-gray-700 text-sm space-y-1">
              <li>• <strong>Export Selected:</strong> Download filtered leads as CSV</li>
              <li>• <strong>Update Status:</strong> Manually change status for multiple leads</li>
              <li>• <strong>Add Tags:</strong> Apply routing tags for organization</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Campaign Management:</h4>
            <ul className="text-gray-700 text-sm space-y-1">
              <li>• <strong>Assign to Campaign:</strong> Move leads between campaigns</li>
              <li>• <strong>Assign to Team Member:</strong> Distribute leads to sales reps</li>
              <li>• <strong>Bulk Delete:</strong> Remove leads from system</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Understanding Lead Conversations - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">💬 Understanding Lead Conversations</h2>
        
        <h3 className="text-xl font-semibold mb-4">Conversation View Features</h3>
        <p className="text-gray-600 mb-4">Click any lead to access the detailed conversation view:</p>
        
        <FeatureList features={conversationFeatures} />

        <h3 className="text-xl font-semibold mt-8 mb-4">Manual Intervention Options</h3>
        <p className="text-gray-600 mb-4">While AI handles most conversations, you can intervene when needed:</p>
        
        <AlertBox type="warning" icon="⚠️" title="Coming Soon:">
          Manual message sending is in development. Currently, all messages go through AI to maintain conversation consistency.
        </AlertBox>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">✅ Current Capabilities:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• View complete conversation history</li>
              <li>• Monitor real-time lead scores</li>
              <li>• Track sentiment progression</li>
              <li>• Export conversation transcripts</li>
              <li>• Add internal notes to leads</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3">🚀 Coming Soon:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Manual message override</li>
              <li>• AI suggestion approval</li>
              <li>• Custom response templates</li>
              <li>• Conversation handoff to human</li>
              <li>• Live chat integration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lead Lifecycle Management */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔄 Lead Lifecycle Management</h2>
        
        <h3 className="text-xl font-semibold mb-4">Typical Lead Journey</h3>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">1</div>
              <h4 className="font-semibold">Import</h4>
              <p className="text-sm text-gray-600">Lead uploaded to system</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">2</div>
              <h4 className="font-semibold">First Contact</h4>
              <p className="text-sm text-gray-600">AI sends initial message</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">3</div>
              <h4 className="font-semibold">Engagement</h4>
              <p className="text-sm text-gray-600">Lead responds, AI nurtures</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">4</div>
              <h4 className="font-semibold">Hot Lead</h4>
              <p className="text-sm text-gray-600">AI identifies buying signals</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto font-bold">5</div>
              <h4 className="font-semibold">Sales Handoff</h4>
              <p className="text-sm text-gray-600">Human takes over</p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mt-8 mb-4">Lead Performance Metrics</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <MetricCard value="15-25%" label="Typical Response Rate" sublabel="Industry average for first message" />
          <MetricCard value="3-8%" label="Lead to Hot Conversion" sublabel="Percentage that become hot leads" />
          <MetricCard value="24-48hrs" label="Average Qualification Time" sublabel="Time to identify hot leads" />
          <MetricCard value="72hrs" label="Follow-up Window" sublabel="Critical response timeframe" />
        </div>
      </div>

      {/* Optimization Tips */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">⚡ Lead Management Optimization</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">🎯 Daily Management Tasks:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                <div>
                  <strong>Review Hot Leads:</strong> Check new hot leads from overnight activity
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                <div>
                  <strong>Monitor AI Conversations:</strong> Spot-check AI responses for quality
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                <div>
                  <strong>Update Lead Statuses:</strong> Manually adjust leads based on sales feedback
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                <div>
                  <strong>Clean Data:</strong> Remove duplicates, fix formatting issues
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">📊 Weekly Optimization:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                <div>
                  <strong>Analyze Conversion Rates:</strong> Which lead sources perform best?
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                <div>
                  <strong>Review False Positives:</strong> Leads marked hot but not qualified
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                <div>
                  <strong>Adjust AI Thresholds:</strong> Fine-tune scoring based on outcomes
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                <div>
                  <strong>Export Performance Data:</strong> Share insights with sales team
                </div>
              </div>
            </div>
          </div>
        </div>

        <BestPracticeBox title="Pro Lead Management Tips">
          <ul className="ml-6 space-y-1">
            <li>Set up automated daily reports to track key metrics</li>
            <li>Create lead scoring benchmarks for different industries</li>
            <li>Use tags to segment leads by quality, source, and urgency</li>
            <li>Regularly backup your lead database</li>
            <li>Train your sales team on reading AI conversation summaries</li>
            <li>Monitor competitor mentions in conversations for market intelligence</li>
          </ul>
        </BestPracticeBox>
      </div>
    </div>
  );
};

export default LeadManagement;