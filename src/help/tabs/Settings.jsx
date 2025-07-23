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

const Settings = () => {
  // Settings overview cards data (extracted from original)
  const settingsCards = [
    {
      icon: '🏢',
      title: 'Company Information',
      description: 'Foundation settings that personalize your entire platform experience and help AI represent your brand accurately.'
    },
    {
      icon: '📱',
      title: 'A2P Brand & Campaign Registry',
      description: 'CRITICAL: Register your brand and campaigns with carriers to ensure message delivery. Required for all business texting.'
    },
    {
      icon: '💬',
      title: 'Messaging & Communication',
      description: 'Control how and when your AI communicates. Set throttles, delays, and conversation limits.'
    },
    {
      icon: '📞',
      title: 'Phone Numbers',
      description: 'Purchase, port, and manage your communication channels. Each campaign needs its own number.'
    },
    {
      icon: '👥',
      title: 'Sales Team',
      description: 'Add team members, set permissions, configure hot lead routing and notifications.'
    },
    {
      icon: '🧠',
      title: 'AI & Automation',
      description: 'Fine-tune AI behavior, escalation rules, and scoring thresholds for optimal performance.'
    },
    {
      icon: '📝',
      title: 'AI Instruction Hub',
      description: 'Create custom AI personalities, conversation flows, and industry-specific behaviors.'
    },
    {
      icon: '📚',
      title: 'AI Knowledge Base',
      description: 'Upload documents that AI references to answer questions accurately about your business.'
    },
    {
      icon: '🔧',
      title: 'System Tools',
      description: 'Data export, backups, API access, and advanced system maintenance utilities.'
    }
  ];

  // Messaging controls data (extracted from original)
  const messagingControlsData = [
    ['Message Throttle', '120/hour', 'Prevents overwhelming your phone numbers', 'Keep default unless you have carrier approval'],
    ['Response Delay', '0-30 seconds', 'Makes AI seem more human', '5-15 seconds optimal'],
    ['Conversation Limit', '20 messages', 'Prevents endless loops', 'Increase for complex sales'],
    ['Follow-up Attempts', '3', 'Re-engagement without spam', '3-4 is ideal'],
    ['Follow-up Timing', 'Day 1, 3, 7', 'Spacing prevents annoyance', 'Adjust based on urgency']
  ];

  // Escalation thresholds data (extracted from original)
  const escalationThresholdsData = [
    ['Lead Score Threshold', '75/100', 'Too many false positives: Increase to 80-85', 'Missing opportunities: Decrease to 65-70'],
    ['Sentiment Threshold', '0.6 (-1 to 1)', 'Highly positive language required for your industry', 'Standard for most industries'],
    ['Message Count', '3 exchanges', 'Complex sales need more qualification: Increase', 'Simple services: Can decrease'],
    ['Keyword Triggers', '"ready to buy", "send quote"', 'Add industry-specific buying signals', 'Customize for your business']
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">⚙️ Complete Settings Guide</h2>
        <p className="text-lg text-gray-600 mb-8">
          Master your platform configuration to maximize performance and ensure smooth operations. Each setting impacts how your AI engages leads.
        </p>

        <div className="cards-grid">
          {settingsCards.map((card, index) => (
            <FeatureCard
              key={index}
              icon={card.icon}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>

      {/* A2P Brand & Campaign Registry - NEW CRITICAL SECTION */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📱 A2P Brand & Campaign Registry (CRITICAL)</h2>
        
        <AlertBox type="danger" icon="🚨" title="MUST COMPLETE FIRST:">
          <div className="space-y-2">
            <p><strong>Without A2P registration, your messages will NOT be delivered.</strong></p>
            <p>All business texting requires carrier-approved Brand and Campaign registration as of 2023.</p>
          </div>
        </AlertBox>

        <CollapsibleSection title="Step 1: Brand Registration" isInitiallyOpen={true}>
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">What You Need:</h4>
            <ul className="ml-6 text-gray-700 space-y-2">
              <li><strong>Business Legal Name:</strong> Exact name as registered with state/IRS</li>
              <li><strong>EIN (Tax ID):</strong> 9-digit federal tax identification number</li>
              <li><strong>Business Address:</strong> Physical address, not PO Box</li>
              <li><strong>Business Phone:</strong> Main business contact number</li>
              <li><strong>Website URL:</strong> Active business website with contact info</li>
              <li><strong>Industry Classification:</strong> Standard industry category</li>
              <li><strong>Stock Symbol:</strong> If publicly traded (optional)</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6">Registration Process:</h4>
            <ol className="ml-6 text-gray-700 space-y-3">
              <li className="flex items-start">
                <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                <div>
                  <strong>Go to Settings → A2P Registry:</strong> Click "Register New Brand"
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                <div>
                  <strong>Complete Brand Form:</strong> Fill all required fields exactly as they appear on legal documents
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                <div>
                  <strong>Pay Registration Fee:</strong> $4/month ongoing fee (billed automatically)
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                <div>
                  <strong>Wait for Approval:</strong> 1-3 business days for standard brands
                </div>
              </li>
            </ol>

            <WarningBox title="Common Brand Registration Mistakes">
              <ul className="ml-6 space-y-1">
                <li>Using DBA instead of legal business name</li>
                <li>Mismatched EIN/business name combination</li>
                <li>PO Box instead of physical address</li>
                <li>Website doesn't match business information</li>
                <li>Industry classification doesn't match actual business</li>
              </ul>
            </WarningBox>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Step 2: Campaign Registration">
          <div className="space-y-4">
            <AlertBox type="warning" icon="⚠️" title="One Campaign Per Use Case:">
              You need separate campaigns for different messaging purposes (sales, support, marketing, etc.)
            </AlertBox>

            <h4 className="text-lg font-semibold">Campaign Information Required:</h4>
            <ul className="ml-6 text-gray-700 space-y-2">
              <li><strong>Campaign Description:</strong> Clear explanation of messaging purpose</li>
              <li><strong>Message Flow:</strong> How leads opt-in and conversation flow</li>
              <li><strong>Sample Messages:</strong> 3-5 example messages you'll send</li>
              <li><strong>Opt-in Method:</strong> How people consent to receive texts</li>
              <li><strong>Opt-out Method:</strong> How people can unsubscribe (auto-handled)</li>
              <li><strong>Help Keywords:</strong> What people can text for assistance</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6">Pre-Built Campaign Templates:</h4>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-semibold text-blue-800">Real Estate Lead Follow-up</h5>
                <p className="text-blue-700 text-sm mt-2">
                  ✅ Purpose: Follow up with property seller leads<br/>
                  ✅ Opt-in: Lead form submission with consent<br/>
                  ✅ Messages: Property questions, valuation, next steps
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-semibold text-green-800">B2B Demo Booking</h5>
                <p className="text-green-700 text-sm mt-2">
                  ✅ Purpose: Qualify and book software demos<br/>
                  ✅ Opt-in: Contact form with phone consent<br/>
                  ✅ Messages: Needs assessment, demo scheduling
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h5 className="font-semibold text-purple-800">Staffing Recruitment</h5>
                <p className="text-purple-700 text-sm mt-2">
                  ✅ Purpose: Recruit and qualify job candidates<br/>
                  ✅ Opt-in: Job application with text consent<br/>
                  ✅ Messages: Availability, skills, interview setup
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h5 className="font-semibold text-orange-800">Customer Support</h5>
                <p className="text-orange-700 text-sm mt-2">
                  ✅ Purpose: Existing customer support follow-up<br/>
                  ✅ Opt-in: Existing customer relationship<br/>
                  ✅ Messages: Issue resolution, satisfaction check
                </p>
              </div>
            </div>

            <BestPracticeBox title="Campaign Registration Tips">
              <ul className="ml-6 space-y-1">
                <li>Be specific about your business purpose - vague descriptions get rejected</li>
                <li>Include clear opt-in consent language in your forms</li>
                <li>Make sample messages realistic - use actual content you'll send</li>
                <li>Register separate campaigns for sales vs support vs marketing</li>
                <li>Campaign approval takes 2-7 business days</li>
              </ul>
            </BestPracticeBox>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="A2P Status Monitoring">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Registration Status Dashboard:</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="font-semibold">Approved</div>
                  <div className="text-sm text-gray-600">Ready to send messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">🟡</div>
                  <div className="font-semibold">Pending</div>
                  <div className="text-sm text-gray-600">Under carrier review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">🔴</div>
                  <div className="font-semibold">Rejected</div>
                  <div className="text-sm text-gray-600">Needs modification</div>
                </div>
              </div>
            </div>

            <AlertBox type="info" icon="📋" title="Required Documentation:">
              Keep these documents ready for potential carrier requests:
              <ul className="ml-4 mt-2 space-y-1">
                <li>• Business license or incorporation documents</li>
                <li>• Current business insurance certificate</li>
                <li>• Website screenshots showing contact information</li>
                <li>• Sample opt-in forms or lead capture pages</li>
              </ul>
            </AlertBox>
          </div>
        </CollapsibleSection>
      </div>

      {/* Company Information Settings - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🏢 Company Information Settings</h2>
        
        <CollapsibleSection title="Basic Company Details">
          <h4 className="text-lg font-semibold mb-3">Required Fields:</h4>
          <ul className="ml-6 text-gray-700 space-y-2 mb-4">
            <li><strong>Company Name:</strong> Appears in UI and AI conversations</li>
            <li><strong>Industry Type:</strong> Optimizes AI language and examples</li>
            <li><strong>Business Hours:</strong> AI only texts during these hours</li>
            <li><strong>Time Zone:</strong> Critical for proper scheduling</li>
            <li><strong>Website:</strong> AI can reference for credibility</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Optional but Recommended:</h4>
          <ul className="ml-6 text-gray-700 space-y-2">
            <li><strong>Company Description:</strong> 2-3 sentences AI uses to describe your business</li>
            <li><strong>Unique Value Proposition:</strong> What makes you different</li>
            <li><strong>Target Customer:</strong> Helps AI qualify leads better</li>
            <li><strong>Company Size:</strong> Builds appropriate credibility</li>
          </ul>
          
          <AlertBox type="warning" icon="⚠️" title="Business Hours Matter:">
            AI will NEVER text outside your configured hours unless you explicitly enable 24/7 mode. Most users see better results respecting normal hours.
          </AlertBox>
        </CollapsibleSection>
      </div>

      {/* Messaging & Communication Settings - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">💬 Messaging & Communication Settings</h2>
        
        <h3 className="text-xl font-semibold mb-4">Critical Messaging Controls</h3>
        <DataTable
          headers={['Setting', 'Default', 'Impact', 'Recommendation']}
          data={messagingControlsData}
        />

        <BestPracticeBox title="Messaging Best Practices">
          <ul className="ml-6 space-y-1">
            <li>Start conservative with throttles - increase gradually</li>
            <li>Random delays (5-30 sec) appear most natural</li>
            <li>Longer delays for complex questions show "thinking"</li>
            <li>Test settings with small batches first</li>
            <li>Monitor unsubscribe rates - adjust if &gt;2%</li>
          </ul>
        </BestPracticeBox>
      </div>

      {/* Phone Number Management - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📞 Phone Number Management</h2>
        
        <h3 className="text-xl font-semibold mb-4">Phone Number Strategy</h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">✅ Best Practices:</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Local numbers get 3x better response rates</li>
                <li>• Get numbers in your target market's area codes</li>
                <li>• Each campaign needs its own dedicated number</li>
                <li>• Start new numbers slowly (50-100 msgs/day)</li>
                <li>• Rotate between multiple numbers for high volume</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">⚠️ Requirements:</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Must have approved A2P brand first</li>
                <li>• 500-1000 messages/day per number maximum</li>
                <li>• Toll-free only good for national brands</li>
                <li>• Cannot share numbers between campaign types</li>
                <li>• New numbers need 7-day warming period</li>
              </ul>
            </div>
          </div>
        </div>

        <WarningBox title="Compliance Requirements">
          <ul className="ml-6 space-y-1">
            <li>Only text numbers with explicit or implied consent</li>
            <li>Honor opt-outs immediately (automatic)</li>
            <li>Include business identification in first message</li>
            <li>Respect quiet hours (no texts 9pm-8am local time)</li>
            <li>Maintain records of consent for 4 years</li>
          </ul>
        </WarningBox>
      </div>

      {/* Sales Team Configuration - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">👥 Sales Team Configuration</h2>
        
        <h3 className="text-xl font-semibold mb-4">Team Setup Process</h3>
        <CollapsibleSection title="Adding Team Members">
          <ol className="ml-6 text-gray-700 space-y-4">
            <li>
              <strong>Send Invitation:</strong> Enter email address and select role. They'll receive setup instructions.
            </li>
            <li>
              <strong>Assign Role:</strong>
              <ul className="mt-2 ml-6 space-y-1">
                <li><strong>Sales User:</strong> Can view assigned leads, conversations</li>
                <li><strong>Sales Manager:</strong> Above + view all leads, basic analytics</li>
                <li><strong>Admin:</strong> Full access except billing</li>
              </ul>
            </li>
            <li>
              <strong>Configure Notifications:</strong>
              <ul className="mt-2 ml-6 space-y-1">
                <li>Email alerts for new hot leads</li>
                <li>SMS notifications (optional)</li>
                <li>In-app notifications</li>
                <li>Daily summary emails</li>
              </ul>
            </li>
            <li>
              <strong>Set Availability:</strong> Mark vacation days, working hours, and capacity limits.
            </li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Hot Lead Routing Rules">
          <h4 className="text-lg font-semibold mb-3">Routing Methods:</h4>
          <ul className="ml-6 text-gray-700 space-y-2 mb-4">
            <li><strong>Round Robin:</strong> Distributes evenly across available team</li>
            <li><strong>Performance-Based:</strong> Top performers get more leads</li>
            <li><strong>Skill-Based:</strong> Match lead types to rep expertise</li>
            <li><strong>Geographic:</strong> Route by territory or time zone</li>
            <li><strong>Campaign-Specific:</strong> Dedicate reps to certain campaigns</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Routing Priority:</h4>
          <ol className="ml-6 text-gray-700 space-y-1">
            <li>Campaign assignment (if specified)</li>
            <li>Skill/tag matching</li>
            <li>Availability status</li>
            <li>Current workload</li>
            <li>Performance score</li>
          </ol>
        </CollapsibleSection>
      </div>

      {/* AI & Automation Settings - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🧠 AI & Automation Settings</h2>
        
        <h3 className="text-xl font-semibold mb-4">Escalation Thresholds</h3>
        <p className="text-gray-600 mb-4">Configure when leads are marked as "hot" and handed to sales:</p>
        
        <DataTable
          headers={['Threshold Type', 'Default Value', 'Adjust When...']}
          data={escalationThresholdsData}
        />

        <BestPracticeBox title="AI Configuration Tips">
          <ul className="ml-6 space-y-1">
            <li>Start with default thresholds for 2 weeks, then adjust based on data</li>
            <li>Review false positives weekly - leads marked hot but sales says not qualified</li>
            <li>Different campaigns may need different thresholds</li>
            <li>Document threshold changes and their impact</li>
            <li>Get sales team feedback on lead quality regularly</li>
          </ul>
        </BestPracticeBox>
      </div>

      {/* Quick Setup Checklist */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">✅ Settings Setup Checklist</h2>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-4">Complete These In Order:</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>1. A2P Brand Registration</strong> - Submit and wait for approval (1-3 days)</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>2. A2P Campaign Registration</strong> - Register your use case (2-7 days)</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>3. Company Information</strong> - Complete all required fields</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>4. Purchase Phone Numbers</strong> - Get local numbers for your market</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>5. Add Sales Team</strong> - Invite team members and set roles</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>6. Configure AI Settings</strong> - Set escalation thresholds</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>7. Upload Knowledge Base</strong> - Add your business FAQs</span>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span><strong>8. Test Everything</strong> - Send test messages to verify setup</span>
            </div>
          </div>
          
          <AlertBox type="success" icon="🎉" title="Ready to Launch:">
            <div className="mt-3">
              Once all checkboxes are complete, you're ready to import leads and start your first campaign!
            </div>
          </AlertBox>
        </div>
      </div>
    </div>
  );
};

export default Settings;