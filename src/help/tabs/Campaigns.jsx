import React from 'react';
import { 
  FeatureCard, 
  CollapsibleSection, 
  DataTable, 
  AlertBox, 
  MetricCard,
  BestPracticeBox,
  WarningBox
} from '../shared';

const Campaigns = () => {
  // Campaign fundamentals metrics (extracted from original)
  const campaignMetrics = [
    { value: '120', label: 'Leads processed per hour per active campaign', sublabel: 'Processing capacity' },
    { value: '∞', label: 'Unlimited campaigns you can create', sublabel: 'No restrictions' },
    { value: '24/7', label: 'AI works around the clock', sublabel: 'Continuous operation' },
    { value: '1:1', label: 'Each campaign needs its own phone number', sublabel: 'Dedicated numbers' }
  ];

  // Campaign goals data (extracted from original)
  const campaignGoalsData = [
    ['Qualify Sellers', 'Real Estate - Finding motivated sellers', 'Asks about timeline, motivation, condition, price expectations', 'Hot lead = Ready to sell in 0-3 months'],
    ['Recruit Candidates', 'Staffing - Finding job seekers', 'Discusses experience, availability, salary expectations, location', 'Hot lead = Actively looking, qualified'],
    ['Book Demos', 'B2B SaaS - Software sales', 'Identifies pain points, decision makers, timeline, budget', 'Hot lead = Requests demo/meeting'],
    ['Lead Nurture', 'Long-term relationship building', 'Provides value, stays top-of-mind, educates gradually', 'Hot lead = Shows buying signals'],
    ['Follow-up Sequence', 'Re-engaging old leads', 'References previous interaction, checks current status', 'Hot lead = Re-engaged and interested'],
    ['Appointment Setting', 'Service businesses', 'Qualifies need, checks availability, schedules calls', 'Hot lead = Agrees to appointment']
  ];

  // Campaign states data (extracted from original)
  const campaignStatesData = [
    ['▶️ Active + AI On', 'Fully operational campaign', 'Processing new leads, sending messages, responding to replies', 'Normal production campaigns'],
    ['⏸️ Paused + AI On', 'Temporarily stopped', 'Not processing new leads, but still responding to incoming messages', 'Adjusting settings, upload issues'],
    ['▶️ Active + AI Off', 'Collection mode only', 'Records responses but doesn\'t reply automatically', 'Manual follow-up campaigns'],
    ['📁 Archived', 'Hidden from main view', 'No activity, preserves historical data', 'Completed campaigns']
  ];

  // Performance KPIs data (extracted from original)
  const performanceKPIs = [
    {
      title: 'Initial Response Rate',
      description: 'Percentage of leads who reply to first message. Industry average: 15-25%. Below 10%? Check your opening message and timing.'
    },
    {
      title: 'Conversation Depth',
      description: 'Average messages exchanged per lead. More messages = higher engagement. Aim for 4-6 messages before hot lead status.'
    },
    {
      title: 'Hot Lead Conversion',
      description: 'Percentage of engaged leads that become hot. Should be 10-20% of responders. Too high? You might be missing opportunities. Too low? Tighten criteria.'
    },
    {
      title: 'Speed to Hot',
      description: 'Time from first contact to hot lead status. Faster is usually better - indicates strong initial messaging and proper lead targeting.'
    },
    {
      title: 'Sales Acceptance Rate',
      description: 'Percentage of hot leads your sales team confirms as qualified. Below 70%? Adjust AI escalation criteria.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">🚀 Complete Campaign Management Guide</h2>
        <p className="text-lg text-gray-600 mb-8">
          Campaigns are the engine that drives your lead engagement. Master campaign creation and management to maximize your AI's effectiveness.
        </p>

        <h3 className="text-2xl font-semibold mb-6">Campaign Fundamentals</h3>
        
        <div className="metric-grid">
          {campaignMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              value={metric.value}
              label={metric.label}
              sublabel={metric.sublabel}
            />
          ))}
        </div>
      </div>

      {/* Campaign Goals & Use Cases - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Campaign Goals & Use Cases</h2>
        <p className="text-gray-600 mb-6">Choose the right goal for your campaign to optimize AI behavior:</p>
        
        <DataTable
          headers={['Goal Type', 'Best For', 'AI Approach', 'Success Metrics']}
          data={campaignGoalsData}
        />

        <BestPracticeBox title="Pro Tip: Goal Selection">
          <p>Your campaign goal directly influences how AI conversations flow. Choose carefully based on your actual business objective, not just what sounds good. You can always create multiple campaigns with different goals for the same lead list.</p>
        </BestPracticeBox>
      </div>

      {/* Phone Number Management - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📱 Phone Number Management</h2>
        
        <h3 className="text-xl font-semibold mb-4">Phone Number Requirements</h3>
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-semibold mb-3 text-green-700">✅ Best Practices:</h4>
            <ul className="text-gray-700 space-y-2">
              <li><strong>One Number Per Campaign:</strong> Each campaign requires a dedicated phone number. This ensures consistent conversations and proper tracking.</li>
              <li><strong>Local Area Codes:</strong> Choose numbers with area codes matching your target market. Local numbers get 3x better response rates.</li>
              <li><strong>Number Porting:</strong> You can port existing business numbers into the platform. Process takes 7-10 business days.</li>
              <li><strong>Compliance Built-In:</strong> All numbers automatically handle opt-outs (STOP) and comply with TCPA regulations.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-blue-700">📋 Requirements:</h4>
            <ul className="text-gray-700 space-y-2">
              <li><strong>A2P Registration:</strong> Must have approved brand/campaign before purchasing numbers</li>
              <li><strong>Number Warming:</strong> Start new numbers slow (50-100 msgs/day), increase by 50 daily</li>
              <li><strong>Volume Limits:</strong> 500-1000 messages/day per number maximum</li>
              <li><strong>Dedicated Usage:</strong> Cannot share numbers between different campaign types</li>
            </ul>
          </div>
        </div>

        <WarningBox title="Phone Number Best Practices">
          <ul className="ml-6 space-y-1">
            <li>Purchase numbers before creating campaigns</li>
            <li>Don't use the same number for different types of campaigns</li>
            <li>Consider getting multiple numbers for high-volume campaigns</li>
            <li>Test numbers by texting them yourself first</li>
            <li>Keep some numbers in reserve for quick campaign launches</li>
          </ul>
        </WarningBox>
      </div>

      {/* AI Personality Configuration - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🤖 AI Personality Configuration</h2>
        <p className="text-gray-600 mb-6">Match your AI's personality to your audience and campaign goals:</p>
        
        <CollapsibleSection title="Professional Personality">
          <h4 className="text-lg font-semibold mb-3">Characteristics:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Formal language and proper grammar</li>
            <li>Industry-specific terminology</li>
            <li>Focuses on value propositions</li>
            <li>Respectful of time constraints</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Best For:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>B2B campaigns</li>
            <li>High-value services</li>
            <li>Executive decision makers</li>
            <li>Industries like legal, financial, medical</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Example Opening:</h4>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            "Good morning [Name], I'm reaching out from [Company] regarding your interest in [Service]. I wanted to see if you had a few moments to discuss how we might be able to help with [Specific Need]."
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Friendly Personality">
          <h4 className="text-lg font-semibold mb-3">Characteristics:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Conversational and warm tone</li>
            <li>Uses first names and casual language</li>
            <li>Emoji usage where appropriate</li>
            <li>Builds rapport before business</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Best For:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Consumer services</li>
            <li>Real estate</li>
            <li>Local businesses</li>
            <li>Younger demographics</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Example Opening:</h4>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            "Hey [Name]! 👋 I saw you were looking into [Service] and wanted to reach out personally. How's your day going? I'd love to chat about how we can help make your life easier!"
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Casual Personality">
          <h4 className="text-lg font-semibold mb-3">Characteristics:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Very relaxed, conversational tone</li>
            <li>Uses slang and colloquialisms appropriately</li>
            <li>Feels like texting with a friend</li>
            <li>Short, punchy messages</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Best For:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Younger audiences (Gen Z, Millennials)</li>
            <li>Creative industries</li>
            <li>Lifestyle brands</li>
            <li>Event promotions</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Example Opening:</h4>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            "Yo [Name]! Saw you checking out our stuff - pretty cool right? 😎 Got any questions or just browsing around?"
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Custom AI Personalities">
          <p className="mb-4">Create unique AI personalities tailored to your brand:</p>
          
          <h4 className="text-lg font-semibold mb-3">How to Create Custom Personalities:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li>Go to Settings → AI Instruction Hub</li>
            <li>Click "Create New Personality"</li>
            <li>Define tone, style, and vocabulary</li>
            <li>Add example conversations</li>
            <li>Set dos and don'ts</li>
            <li>Test with sample leads</li>
          </ol>
        </CollapsibleSection>
      </div>

      {/* Campaign Creation Step-by-Step - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">⚡ Campaign Creation Step-by-Step</h2>
        
        <CollapsibleSection title="Step 1: Campaign Basics" isInitiallyOpen={true}>
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Campaign Name:</strong> Use descriptive names like "Q2 2024 Home Sellers - Phoenix" or "Tech Recruiting - Senior Devs". This helps with organization and reporting.
            </li>
            <li>
              <strong>Description:</strong> Add details about lead source, expected volume, and any special instructions. Your team will thank you later.
            </li>
            <li>
              <strong>Campaign Goal:</strong> Select from the 6 pre-configured goals. This determines AI conversation flow and hot lead criteria.
            </li>
            <li>
              <strong>Campaign Color:</strong> Choose a color for visual organization in analytics and dashboards. Group similar campaigns with similar colors.
            </li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Step 2: AI Configuration">
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Select AI Personality:</strong> Choose from Professional, Friendly, Casual, or custom personalities you've created.
            </li>
            <li>
              <strong>AI On/Off Toggle:</strong> You can create campaigns with AI disabled if you only want to collect responses without automated replies.
            </li>
            <li>
              <strong>Response Speed:</strong> Default is immediate. Can be adjusted in Settings → Messaging for more human-like delays.
            </li>
            <li>
              <strong>Escalation Rules:</strong> Set when leads should be marked as "hot" - uses global settings by default but can be customized per campaign.
            </li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Step 3: Resources & Assignment">
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Phone Number:</strong> Select from available numbers or purchase new one. Remember: one campaign = one number.
            </li>
            <li>
              <strong>Sales Team Assignment:</strong> Choose which team member receives hot leads from this campaign. Can be changed later.
            </li>
            <li>
              <strong>Routing Tags:</strong> Add tags like "spanish-speaking" or "high-value" to automatically route special leads.
            </li>
            <li>
              <strong>Launch Settings:</strong> Campaign starts active by default. You can create in paused state to upload leads first.
            </li>
          </ol>
          
          <AlertBox type="info" icon="💡" title="Pro Move:">
            Create campaigns in paused state, upload all leads, review settings one more time, then activate. This prevents accidental messages while you're still setting up.
          </AlertBox>
        </CollapsibleSection>
      </div>

      {/* Campaign Control Panel - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎮 Campaign Control Panel</h2>
        
        <h3 className="text-xl font-semibold mb-4">Campaign States Explained</h3>
        <DataTable
          headers={['State', 'What It Means', 'AI Behavior', 'Common Use Case']}
          data={campaignStatesData}
        />

        <h3 className="text-xl font-semibold mt-8 mb-4">Real-Time Campaign Metrics</h3>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <MetricCard value="1,247" label="Total Leads" sublabel="All leads in campaign" />
          <MetricCard value="892" label="Messages Sent" sublabel="Outbound message count" />
          <MetricCard value="34%" label="Response Rate" sublabel="Leads who replied" />
          <MetricCard value="47" label="Hot Leads" sublabel="Sales-ready prospects" />
        </div>

        <WarningBox title="Processing Limits">
          <p>Each active campaign processes ~120 leads per hour. With 5 active campaigns, you're processing 600 leads/hour. Plan accordingly for large uploads - a 10,000 lead list with one campaign takes ~83 hours to fully process.</p>
        </WarningBox>
      </div>

      {/* Campaign Performance Optimization - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📊 Campaign Performance Optimization</h2>
        
        <h3 className="text-xl font-semibold mb-4">Key Performance Indicators</h3>
        <div className="space-y-4">
          {performanceKPIs.map((kpi, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <h4 className="font-semibold text-gray-800">{kpi.title}</h4>
              <p className="text-gray-600 text-sm mt-1">{kpi.description}</p>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold mt-8 mb-4">Performance Benchmarks</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-3">🚨 Warning Signs:</h4>
            <ul className="text-red-700 text-sm space-y-1">
              <li>• Response rate &lt;10%</li>
              <li>• Hot lead rate &lt;2%</li>
              <li>• Unsubscribe rate &gt;3%</li>
              <li>• Sales acceptance &lt;50%</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-3">📊 Average Performance:</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• Response rate 15-25%</li>
              <li>• Hot lead rate 3-8%</li>
              <li>• Unsubscribe rate 1-2%</li>
              <li>• Sales acceptance 60-80%</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3">🎯 Excellent Performance:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Response rate &gt;30%</li>
              <li>• Hot lead rate &gt;10%</li>
              <li>• Unsubscribe rate &lt;1%</li>
              <li>• Sales acceptance &gt;85%</li>
            </ul>
          </div>
        </div>

        <BestPracticeBox title="Optimization Checklist">
          <ul className="ml-6 space-y-1">
            <li>Run A/B tests on opening messages monthly</li>
            <li>Review AI conversations weekly for quality</li>
            <li>Get sales team feedback on lead quality</li>
            <li>Adjust escalation thresholds based on outcomes</li>
            <li>Test different AI personalities with same list</li>
            <li>Monitor unsubscribe rates (should be under 2%)</li>
          </ul>
        </BestPracticeBox>
      </div>

      {/* Advanced Campaign Strategies */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Advanced Campaign Strategies</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">📈 Campaign Scaling Strategies:</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Vertical Scaling</h4>
                <p className="text-sm text-gray-600">Add more phone numbers to single campaign type. Better for testing and optimization.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Horizontal Scaling</h4>
                <p className="text-sm text-gray-600">Create multiple campaign types for different audiences. Better for diverse lead sources.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Geographic Scaling</h4>
                <p className="text-sm text-gray-600">Separate campaigns by region/time zone. Better for national/international businesses.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">🔄 Campaign Lifecycle Management:</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Launch Phase (Week 1)</h4>
                <p className="text-sm text-gray-600">Test with small batches, monitor closely, adjust settings based on initial results.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Growth Phase (Week 2-4)</h4>
                <p className="text-sm text-gray-600">Scale up volume, optimize messaging, implement A/B tests, train sales team.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Maturity Phase (Month 2+)</h4>
                <p className="text-sm text-gray-600">Focus on ROI optimization, advanced segmentation, automated reporting.</p>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mt-8 mb-4">🚀 Campaign Success Formula</h3>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">Quality Leads</div>
              <p className="text-sm text-blue-700">Well-sourced, properly consented leads with accurate contact info</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 mb-2">Smart AI Setup</div>
              <p className="text-sm text-green-700">Right personality, proper goals, optimized escalation thresholds</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-2">Rapid Testing</div>
              <p className="text-sm text-purple-700">Quick A/B tests, fast iteration, data-driven optimization</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600 mb-2">Sales Alignment</div>
              <p className="text-sm text-orange-700">Team trained, feedback loops, quality handoffs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Troubleshooting Quick Reference */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔧 Campaign Troubleshooting Quick Reference</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-red-700">❌ Common Issues:</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-red-500 pl-3">
                <h4 className="font-semibold text-red-800">Low Response Rates</h4>
                <p className="text-red-700 text-sm">Check: Opening message tone, send timing, lead source quality, phone number reputation</p>
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <h4 className="font-semibold text-red-800">No Hot Leads Generated</h4>
                <p className="text-red-700 text-sm">Check: Escalation thresholds too high, AI personality mismatch, goal selection incorrect</p>
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <h4 className="font-semibold text-red-800">High Unsubscribe Rate</h4>
                <p className="text-red-700 text-sm">Check: Message frequency, consent quality, content aggressiveness, timing violations</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-700">✅ Quick Fixes:</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-green-800">Improve Response Rates</h4>
                <p className="text-green-700 text-sm">A/B test friendlier opening, send during business hours, verify lead consent, warm new numbers</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-green-800">Generate More Hot Leads</h4>
                <p className="text-green-700 text-sm">Lower thresholds to 70, review conversation samples, adjust AI personality, update goal selection</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-green-800">Reduce Unsubscribes</h4>
                <p className="text-green-700 text-sm">Soften messaging tone, reduce frequency, verify lead source consent, respect business hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;