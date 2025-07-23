import React from 'react';
import { 
  FeatureCard, 
  CollapsibleSection, 
  DataTable, 
  AlertBox, 
  MetricCard,
  BestPracticeBox,
  WarningBox,
  ProcessFlow
} from '../shared';

const GettingStarted = () => {
  // Platform overview process (extracted from original)
  const platformProcess = [
    { icon: '⚙️', label: 'Complete Settings', sublabel: 'A2P Registration First!' },
    { icon: '📤', label: 'Upload Leads', sublabel: 'Import your data' },
    { icon: '🤖', label: 'AI Engages', sublabel: 'Automated conversations' },
    { icon: '💬', label: 'Conversations', sublabel: 'Lead qualification' },
    { icon: '🔥', label: 'Hot Leads', sublabel: 'Sales-ready prospects' },
    { icon: '🤝', label: 'Sales Closes', sublabel: 'Revenue generation' }
  ];

  // Platform capabilities metrics (extracted from original)
  const platformMetrics = [
    { value: '120', label: 'Leads/Hour per Campaign', sublabel: 'Processing capacity' },
    { value: '24/7', label: 'AI Availability', sublabel: 'Round-the-clock operation' },
    { value: '0-100', label: 'Lead Scoring Range', sublabel: 'Qualification precision' },
    { value: '95%', label: 'A/B Test Confidence', sublabel: 'Statistical accuracy' }
  ];

  // Platform components (extracted from original)
  const platformComponents = [
    {
      icon: '📊',
      title: 'Pipeline Control Room',
      description: 'Executive dashboard showing real-time system health, lead flow metrics, AI performance indicators, and conversion funnels. Monitor hot lead handoffs, response times, and system-wide KPIs from a single command center.'
    },
    {
      icon: '👥',
      title: 'Lead Dashboard',
      description: 'Comprehensive lead management interface with advanced filtering, bulk actions, custom field configuration, and real-time status updates. Track leads through their entire journey from cold to closed.'
    },
    {
      icon: '🤖',
      title: 'AI Conversation Engine',
      description: 'View detailed AI-lead conversations with sentiment analysis, lead scoring, urgency detection, and engagement metrics. Every message is analyzed for buying signals and qualification criteria.'
    },
    {
      icon: '🚀',
      title: 'Campaign Management',
      description: 'Create and manage multiple campaigns with different goals, AI personalities, phone numbers, and routing rules. Control processing speed and monitor campaign-specific performance.'
    },
    {
      icon: '📈',
      title: 'Analytics & Insights',
      description: 'Deep analytics including conversion funnels, ROI analysis, AI performance metrics, and sales outcomes. Export custom reports and track performance across time periods.'
    },
    {
      icon: '⚙️',
      title: 'System Configuration',
      description: 'Configure company info, messaging rules, AI behavior, team access, phone numbers, and knowledge base. Full control over system behavior and user permissions.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">🚀 Complete Platform Overview</h2>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to the most advanced AI-powered lead engagement platform. This system automatically texts your leads, qualifies them through intelligent conversations, and hands off hot prospects to your sales team - all while you sleep.
        </p>

        <AlertBox type="danger" icon="🚨" title="CRITICAL: Start with Settings First!">
          <div className="space-y-2">
            <p><strong>Before uploading any leads, you MUST complete A2P registration in Settings.</strong></p>
            <p>Without this, your messages will not be delivered and you'll waste time on setup that won't work.</p>
          </div>
        </AlertBox>
        
        <div className="mt-8">
          <ProcessFlow steps={platformProcess} />
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Platform Capabilities at a Glance</h3>
          <div className="metric-grid">
            {platformMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                value={metric.value}
                label={metric.label}
                sublabel={metric.sublabel}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CRITICAL: Settings First Section */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔥 STEP 0: Complete Settings (MANDATORY FIRST STEP)</h2>
        
        <WarningBox title="Why Settings Must Come First">
          <p className="mb-3">Many users skip settings and go straight to uploading leads. This is a critical mistake that will waste hours of your time:</p>
          <ul className="ml-6 space-y-1">
            <li>• Without A2P registration, messages won't send</li>
            <li>• Without phone numbers, campaigns can't launch</li>
            <li>• Without team setup, hot leads go nowhere</li>
            <li>• Without AI configuration, conversations will be poor quality</li>
          </ul>
        </WarningBox>

        <h3 className="text-xl font-semibold mb-4">Settings Completion Checklist (Do This First!):</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
              <div>
                <strong className="text-red-800">A2P Brand Registration</strong>
                <p className="text-red-700 text-sm mt-1">Register your business with carriers. Takes 1-3 days for approval. Nothing works without this!</p>
                <p className="text-red-600 text-xs mt-1">📍 Go to Settings → A2P Brand & Campaign Registry</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
              <div>
                <strong className="text-red-800">A2P Campaign Registration</strong>
                <p className="text-red-700 text-sm mt-1">Register your specific use case (sales follow-up, etc.). Takes 2-7 days for approval.</p>
                <p className="text-red-600 text-xs mt-1">📍 Go to Settings → A2P Brand & Campaign Registry</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
              <div>
                <strong className="text-orange-800">Company Information</strong>
                <p className="text-orange-700 text-sm mt-1">Business details, hours, industry type. AI uses this to personalize conversations.</p>
                <p className="text-orange-600 text-xs mt-1">📍 Go to Settings → Company Information</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
              <div>
                <strong className="text-orange-800">Purchase Phone Numbers</strong>
                <p className="text-orange-700 text-sm mt-1">Get local numbers for your target market. Each campaign needs its own number.</p>
                <p className="text-orange-600 text-xs mt-1">📍 Go to Settings → Phone Numbers</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">5</div>
              <div>
                <strong className="text-yellow-800">Add Sales Team</strong>
                <p className="text-yellow-700 text-sm mt-1">Invite team members who will receive hot leads. Set up notifications.</p>
                <p className="text-yellow-600 text-xs mt-1">📍 Go to Settings → Sales Team</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">6</div>
              <div>
                <strong className="text-green-800">Configure AI Settings</strong>
                <p className="text-green-700 text-sm mt-1">Set escalation thresholds, AI personality, and conversation rules.</p>
                <p className="text-green-600 text-xs mt-1">📍 Go to Settings → AI & Automation</p>
              </div>
            </div>
          </div>
          
          <AlertBox type="success" icon="🎯" title="Pro Tip:">
            <div className="mt-3 text-sm">
              Complete steps 1-2 (A2P registration) first and submit them immediately. While waiting for approval, complete steps 3-6. This saves you 3-7 days of waiting time!
            </div>
          </AlertBox>
        </div>
      </div>

      {/* Platform Components Overview - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Key Platform Components</h2>
        
        <div className="cards-grid">
          {platformComponents.map((component, index) => (
            <FeatureCard
              key={index}
              icon={component.icon}
              title={component.title}
              description={component.description}
            />
          ))}
        </div>
      </div>

      {/* First Week Success Plan - Extracted from original but reordered */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📚 First Week Success Plan</h2>
        
        <CollapsibleSection title="Day 1-2: Complete Settings (CRITICAL)" isInitiallyOpen={true}>
          <AlertBox type="warning" icon="⚠️" title="Do NOT Skip This Step:">
            Most users want to jump straight to uploading leads. This is a mistake that will waste days of your time.
          </AlertBox>
          
          <ol className="ml-6 text-gray-700 space-y-4 mt-4">
            <li>
              <strong>Submit A2P Registrations:</strong> Go to Settings → A2P Registry and submit both Brand and Campaign registrations. This takes 1-7 days to approve, so do it immediately.
            </li>
            <li>
              <strong>Complete Company Settings:</strong> Navigate to Settings → Company Information. Fill in your business details, operating hours, and industry type. This helps AI tailor conversations.
            </li>
            <li>
              <strong>Purchase Phone Numbers:</strong> Go to Settings → Phone Numbers. Purchase at least one number for your first campaign. Consider getting numbers with local area codes for better response rates.
            </li>
            <li>
              <strong>Invite Your Team:</strong> Visit Settings → Sales Team. Add team members who will receive hot leads. Set their permissions and notification preferences.
            </li>
            <li>
              <strong>Configure AI Basics:</strong> Check Settings → AI & Automation. Review default escalation thresholds (when leads become "hot"). Start with defaults, optimize later.
            </li>
            <li>
              <strong>Upload Knowledge Base:</strong> In Settings → AI Knowledge Base, upload any PDFs, documents, or FAQs about your business. This helps AI answer specific questions.
            </li>
          </ol>
          
          <BestPracticeBox title="Day 1-2 Success Tip">
            <p>After purchasing a phone number, text it from your personal phone to ensure it's working. You should receive an auto-response from the AI within 30 seconds.</p>
          </BestPracticeBox>
        </CollapsibleSection>

        <CollapsibleSection title="Day 3-4: First Campaign Creation (WAIT FOR A2P APPROVAL)">
          <AlertBox type="info" icon="📋" title="Prerequisites Check:">
            Before creating campaigns, ensure A2P registrations are approved (check Settings → A2P Registry status).
          </AlertBox>
          
          <ol className="ml-6 text-gray-700 space-y-4 mt-4">
            <li>
              <strong>Create Test Campaign:</strong> Go to Campaign Management → Create Campaign. Name it "Test Campaign - [Your Business]"
            </li>
            <li>
              <strong>Select Campaign Goal:</strong> Choose the goal that matches your business:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• Real Estate: "Qualify Sellers"</li>
                <li>• Staffing: "Recruit Candidates"</li>
                <li>• B2B: "Book Demos"</li>
                <li>• General: "Lead Nurture"</li>
              </ul>
            </li>
            <li>
              <strong>Configure AI Personality:</strong> Select or create an AI personality. Start with "Professional" for B2B or "Friendly" for consumer-focused campaigns.
            </li>
            <li>
              <strong>Assign Resources:</strong> Select your purchased phone number and assign a sales team member who will receive hot leads.
            </li>
            <li>
              <strong>Upload Test Leads:</strong> Create a CSV with 10-20 test leads (can be fake numbers or team members). This lets you see the system in action safely.
            </li>
          </ol>
          
          <WarningBox title="Important: Start Small">
            Always test with a small batch before uploading hundreds of real leads. This helps you fine-tune messaging and ensure everything works as expected.
          </WarningBox>
        </CollapsibleSection>

        <CollapsibleSection title="Day 5-6: Monitor & Optimize">
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Check Control Room:</strong> Visit Pipeline Control Room daily. Monitor:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• System Health indicators (all should be green)</li>
                <li>• Lead Journey funnel (see where leads drop off)</li>
                <li>• AI Optimization metrics (response rates, timing)</li>
              </ul>
            </li>
            <li>
              <strong>Review Conversations:</strong> Click on individual leads in the Dashboard to read AI conversations. Look for:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• Natural conversation flow</li>
                <li>• Appropriate responses to questions</li>
                <li>• Proper hot lead identification</li>
              </ul>
            </li>
            <li>
              <strong>Adjust AI Settings:</strong> Based on observations:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• If too many false "hot leads": Increase escalation threshold</li>
                <li>• If missing opportunities: Lower threshold or adjust AI instructions</li>
                <li>• If responses seem off: Update knowledge base or AI personality</li>
              </ul>
            </li>
            <li>
              <strong>Set Up A/B Test:</strong> Create your first A/B test to optimize performance:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• Test different opening messages</li>
                <li>• Compare professional vs friendly tone</li>
                <li>• Experiment with follow-up timing</li>
              </ul>
            </li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Day 7: Scale Up Operations">
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Upload Real Leads:</strong> Now that you've tested and optimized, upload your first batch of real leads (50-200 recommended)
            </li>
            <li>
              <strong>Create Production Campaigns:</strong> Set up campaigns for different lead sources or goals:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• Separate campaigns for different lead types</li>
                <li>• Geographic segmentation if needed</li>
                <li>• Different approaches for cold vs warm leads</li>
              </ul>
            </li>
            <li>
              <strong>Train Your Team:</strong> Schedule a meeting to show sales team:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• How to access hot leads</li>
                <li>• How to read conversation history</li>
                <li>• Understanding lead scores and sentiment</li>
                <li>• Proper handoff procedures</li>
              </ul>
            </li>
            <li>
              <strong>Set Up Reporting:</strong> Configure weekly reports in Analytics to track:
              <ul className="mt-2 ml-6 space-y-1">
                <li>• Conversion rates by campaign</li>
                <li>• Cost per hot lead</li>
                <li>• Sales team performance</li>
                <li>• ROI by lead source</li>
              </ul>
            </li>
          </ol>
          
          <AlertBox type="success" icon="🎉" title="Congratulations!">
            <div>
              By the end of week one, you'll have a fully operational AI lead engagement system. Most users see their first hot leads within 24-48 hours of launching their first real campaign.
            </div>
          </AlertBox>
        </CollapsibleSection>
      </div>

      {/* Common Mistakes to Avoid */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🚫 Common Mistakes to Avoid</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-red-700">❌ What NOT to Do:</h3>
            <div className="space-y-3">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800">Skipping A2P Registration</h4>
                <p className="text-red-700 text-sm mt-1">Results in zero message delivery. Must be done first!</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800">Uploading Thousands of Leads First</h4>
                <p className="text-red-700 text-sm mt-1">Test with 10-20 leads first to verify everything works.</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800">Using Same Number for Multiple Campaigns</h4>
                <p className="text-red-700 text-sm mt-1">Each campaign needs its own dedicated phone number.</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800">Not Setting Business Hours</h4>
                <p className="text-red-700 text-sm mt-1">AI will text at 3am without proper time restrictions.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-700">✅ Best Practices:</h3>
            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800">Complete All Settings First</h4>
                <p className="text-green-700 text-sm mt-1">Follow the settings checklist before touching campaigns.</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800">Start Small and Test</h4>
                <p className="text-green-700 text-sm mt-1">Use 10-20 test leads to verify everything before scaling.</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800">Monitor Daily for First Week</h4>
                <p className="text-green-700 text-sm mt-1">Check conversations and metrics daily to catch issues early.</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800">Get Sales Team Feedback</h4>
                <p className="text-green-700 text-sm mt-1">Include sales team in setup to ensure hot leads are quality.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Training Videos - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎓 Platform Training Videos</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="font-semibold mb-2">Complete Platform Walkthrough</h3>
            <p className="text-sm">20-minute comprehensive tour of all features</p>
            <p className="text-xs mt-2 text-gray-500">(Coming Soon)</p>
          </div>
          <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="font-semibold mb-2">Settings Setup Guide</h3>
            <p className="text-sm">Step-by-step A2P registration and configuration</p>
            <p className="text-xs mt-2 text-gray-500">(Coming Soon)</p>
          </div>
          <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="font-semibold mb-2">Understanding AI Conversations</h3>
            <p className="text-sm">How to read and optimize AI interactions</p>
            <p className="text-xs mt-2 text-gray-500">(Coming Soon)</p>
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📊 Week 1 Success Metrics</h2>
        
        <p className="text-gray-600 mb-6">Here's what successful users typically achieve in their first week:</p>
        
        <div className="grid md:grid-cols-4 gap-4">
          <MetricCard value="100%" label="Settings Completion" sublabel="All critical settings configured" />
          <MetricCard value="24-48hrs" label="First Hot Lead" sublabel="Time to first qualified lead" />
          <MetricCard value="15-25%" label="Response Rate" sublabel="Leads who reply to first message" />
          <MetricCard value="3-8%" label="Hot Lead Rate" sublabel="Leads that become sales-ready" />
        </div>

        <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">🎯 Week 1 Goals:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-blue-700">
            <div>
              <h4 className="font-semibold mb-2">Setup Goals:</h4>
              <ul className="text-sm space-y-1">
                <li>• A2P registration submitted (Day 1)</li>
                <li>• All settings configured (Day 2)</li>
                <li>• Test campaign launched (Day 3)</li>
                <li>• First conversations reviewed (Day 4)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance Goals:</h4>
              <ul className="text-sm space-y-1">
                <li>• 10+ test leads processed</li>
                <li>• 1-2 hot leads generated</li>
                <li>• Sales team trained on platform</li>
                <li>• Ready for real lead upload</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStarted;