import React from 'react';
import { 
  FeatureCard, 
  CollapsibleSection, 
  DataTable, 
  AlertBox, 
  MetricCard,
  BestPracticeBox,
  WarningBox,
  FeatureList
} from '../shared';

const AIFeatures = () => {
  // Core AI capabilities (extracted from original)
  const aiCapabilities = [
    {
      icon: '🧠',
      title: 'Natural Language Processing',
      description: 'AI understands context, intent, and nuance in conversations. It remembers previous messages, adapts responses based on lead behavior, and maintains consistent personality throughout.'
    },
    {
      icon: '📊',
      title: 'Real-Time Analysis',
      description: 'Every message is analyzed for sentiment, urgency, buying signals, and objections. Scores update instantly, helping identify hot leads the moment they show interest.'
    },
    {
      icon: '🎯',
      title: 'Smart Escalation',
      description: 'AI knows when to hand off to humans. It detects complex questions, high-value opportunities, and perfect timing for sales intervention.'
    },
    {
      icon: '📚',
      title: 'Knowledge Integration',
      description: 'Upload your company docs, FAQs, and product info. AI references this knowledge to answer specific questions accurately without hallucination.'
    },
    {
      icon: '🔄',
      title: 'Continuous Learning',
      description: 'While AI doesn\'t learn from individual conversations, you can update its knowledge base and instructions based on performance data.'
    },
    {
      icon: '🛡️',
      title: 'Compliance Built-In',
      description: 'Automatic handling of opt-outs, TCPA compliance, and appropriate response timing. AI never texts outside business hours unless configured.'
    }
  ];

  // Message analysis factors (extracted from original)
  const analysisFactors = [
    {
      title: 'Sentiment Score (-1 to +1)',
      description: 'Measures emotional tone of the message. Positive sentiment (>0.5) indicates interest and engagement. Negative sentiment (<-0.3) might indicate frustration or disinterest. AI adjusts approach based on sentiment trends.'
    },
    {
      title: 'Urgency Detection',
      description: 'Identifies time-sensitive language like "need this soon", "by next week", "ASAP". High urgency combined with positive sentiment fast-tracks hot lead status.'
    },
    {
      title: 'Hesitation Indicators',
      description: 'Detects uncertainty phrases like "not sure", "maybe", "I\'ll think about it". AI responds with reassurance and addresses concerns without being pushy.'
    },
    {
      title: 'Qualification Signals',
      description: 'Looks for budget mentions, timeline discussions, decision-maker identification. These signals increase lead score dramatically.'
    },
    {
      title: 'Engagement Depth',
      description: 'Measures message length, question asking, and topic exploration. Deeper engagement indicates genuine interest vs. polite responses.'
    }
  ];

  // AI response strategies (extracted from original)
  const responseStrategiesData = [
    ['Short, minimal responses', 'Ask open-ended questions', '"I\'d love to understand more about what you\'re looking for. What\'s most important to you in [solution]?"'],
    ['Asking specific questions', 'Provide detailed answers + soft CTA', '"Great question! [Detailed answer]. Would you like to discuss how this could work for your specific situation?"'],
    ['Expressing concerns', 'Address directly + social proof', '"I understand your concern about [issue]. Many of our clients felt the same way initially. Here\'s how we address that..."'],
    ['High interest signals', 'Move toward commitment', '"It sounds like this could be a great fit! The best next step would be a quick call with our specialist. What\'s your availability like this week?"'],
    ['Going cold/delayed responses', 'Re-engagement attempt', '"Hey [Name], just wanted to check back in. I know things get busy. Is this still something you\'re interested in exploring?"']
  ];

  // A/B testing capabilities (extracted from original)
  const testingCapabilities = [
    {
      title: 'Opening Messages',
      description: 'Test different hooks, value propositions, and approaches. Example: Professional intro vs. casual greeting vs. question-based opener.'
    },
    {
      title: 'AI Tone Variations',
      description: 'Compare conversion rates between Professional, Friendly, Casual, or Custom personalities on the same lead list.'
    },
    {
      title: 'Follow-up Timing',
      description: 'Test immediate vs. 1-hour vs. next-day follow-ups. Find the sweet spot for your audience.'
    },
    {
      title: 'Message Sequences',
      description: 'Compare different conversation flows. Should you ask for contact info early or build rapport first?'
    },
    {
      title: 'Value Propositions',
      description: 'Test different benefits and pain points. Price-focused vs. service-focused vs. results-focused messaging.'
    }
  ];

  // Industry templates data
  const industryTemplates = {
    realEstate: `You are a friendly real estate investment specialist focused on helping homeowners who need to sell quickly. 

Your approach is empathetic and solution-oriented. You understand that selling a home can be stressful, and you're here to make it easier.

Key Discovery Questions:
1. "What's motivating you to sell at this time?"
2. "What's your ideal timeline for moving?"
3. "Tell me a bit about the property - how long have you owned it?"
4. "Are there any repairs or updates needed?"
5. "Have you already looked into traditional listing?"

Qualifying Indicators for Hot Lead:
- Timeline of 0-3 months
- Motivated by: relocation, financial distress, inherited property, divorce
- Open to cash offer
- Concerned about condition/repairs
- Wants to avoid realtor hassles

Escalate to human when:
- They express strong interest in getting an offer
- Timeline is under 30 days
- They provide property address
- They ask detailed process questions
- Sentiment is highly positive after 3+ exchanges`,

    staffing: `You are a professional recruiter helping connect talented professionals with great opportunities.

Your tone is enthusiastic yet professional. You genuinely care about finding the right fit for both candidates and clients.

Key Discovery Questions:
1. "What type of role would be ideal for your next career move?"
2. "What's most important to you in your next position?"
3. "Are you actively looking or just exploring options?"
4. "What's your availability for starting a new position?"
5. "What salary range would make a move worthwhile for you?"

Qualifying Indicators for Hot Lead:
- Actively interviewing
- Can start within 30 days
- Realistic salary expectations
- Skills match current openings
- Open to contract or permanent placement

Escalate to human when:
- Actively looking and qualified
- Asks about specific positions
- Provides detailed work history
- Available for immediate placement
- Shows high interest in multiple exchanges`,

    b2bSaas: `You are a solutions consultant helping businesses streamline their operations with innovative software.

Your approach is consultative and educational. Focus on understanding their challenges before presenting solutions.

Key Discovery Questions:
1. "What challenges are you facing with [current process]?"
2. "How is your team currently handling [specific task]?"
3. "What would ideal solution look like for you?"
4. "Who else would be involved in evaluating solutions?"
5. "What's your timeline for implementing a solution?"

Qualifying Indicators for Hot Lead:
- Clear pain point identified
- Budget allocated or available
- Decision maker engaged
- Timeline within 3 months
- Current solution inadequate

Escalate to human when:
- Requests demo or trial
- Provides specific requirements
- Multiple stakeholders involved
- Budget conversation initiated
- Technical questions beyond basics`
  };

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">🤖 AI Engine Deep Dive</h2>
        <p className="text-lg text-gray-600 mb-8">
          Understanding how the AI works helps you optimize performance and get better results. Here's everything you need to know about the AI engine powering your conversations.
        </p>

        <h3 className="text-2xl font-semibold mb-6">Core AI Capabilities</h3>
        <div className="cards-grid">
          {aiCapabilities.map((capability, index) => (
            <FeatureCard
              key={index}
              icon={capability.icon}
              title={capability.title}
              description={capability.description}
            />
          ))}
        </div>
      </div>

      {/* Conversation Intelligence - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">💬 Conversation Intelligence</h2>
        
        <h3 className="text-xl font-semibold mb-4">What AI Analyzes in Every Message</h3>
        <FeatureList features={analysisFactors} />

        <h3 className="text-xl font-semibold mt-8 mb-4">AI Response Strategies</h3>
        <DataTable
          headers={['Lead Behavior', 'AI Strategy', 'Example Response']}
          data={responseStrategiesData}
        />

        <AlertBox type="info" icon="🧠" title="AI Intelligence Note:">
          The AI adapts its strategy in real-time based on how each lead responds. It's not following a rigid script - it's having genuine conversations while keeping your business goals in mind.
        </AlertBox>
      </div>

      {/* A/B Testing Mastery - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🧪 A/B Testing Mastery</h2>
        <p className="text-gray-600 mb-6">
          The A/B testing framework lets you optimize every aspect of your AI conversations with scientific precision.
        </p>

        <h3 className="text-xl font-semibold mb-4">What You Can Test</h3>
        <FeatureList features={testingCapabilities} />

        <h3 className="text-xl font-semibold mt-8 mb-4">A/B Testing Best Practices</h3>
        <BestPracticeBox title="Testing Guidelines">
          <ul className="ml-6 space-y-1">
            <li><strong>One Variable at a Time:</strong> Only test one element to clearly identify what drives results</li>
            <li><strong>Sufficient Sample Size:</strong> Need at least 100-200 leads per variant for statistical significance</li>
            <li><strong>Run Full Cycle:</strong> Let tests run 7-14 days to account for different response patterns</li>
            <li><strong>Document Everything:</strong> Keep notes on what you tested and why for future reference</li>
            <li><strong>Apply Learnings:</strong> Winner becomes new control for next test</li>
          </ul>
        </BestPracticeBox>

        <h3 className="text-xl font-semibold mt-6 mb-4">Understanding Test Results</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">95%+ Confidence ✅</h4>
            <p className="text-green-700 text-sm mb-2">Statistically significant winner</p>
            <p className="text-green-600 text-xs">Action: Implement winning variant across all campaigns</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">70-94% Confidence 🟡</h4>
            <p className="text-yellow-700 text-sm mb-2">Trending toward significance</p>
            <p className="text-yellow-600 text-xs">Action: Continue test for more data</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Below 70% ⏳</h4>
            <p className="text-gray-700 text-sm mb-2">Insufficient data</p>
            <p className="text-gray-600 text-xs">Action: Need more participants or time</p>
          </div>
        </div>
      </div>

      {/* AI Instructions & Customization - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 AI Instructions & Customization</h2>
        
        <h3 className="text-xl font-semibold mb-4">Creating Custom AI Instructions</h3>
        <p className="text-gray-600 mb-4">Navigate to Settings → AI Instruction Hub to create custom behaviors:</p>
        
        <CollapsibleSection title="Industry-Specific Templates" isInitiallyOpen={true}>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-3">Real Estate Investor Template:</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-line">
                {industryTemplates.realEstate}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">Staffing/Recruiting Template:</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-line">
                {industryTemplates.staffing}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">B2B SaaS Template:</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-line">
                {industryTemplates.b2bSaas}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Advanced AI Behaviors">
          <h4 className="text-lg font-semibold mb-3">Objection Handling:</h4>
          <p className="mb-4">Train AI to handle common objections:</p>
          <div className="space-y-3 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>"Too expensive"</strong> → "I understand price is important. Let's discuss the value and ROI you'd see..."
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>"Not interested"</strong> → "No problem! Just curious - is it timing, or is there something specific that doesn't fit your needs?"
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>"Already have a solution"</strong> → "That's great! How's that working for you? We often help companies enhance their existing setup..."
            </div>
          </div>

          <h4 className="text-lg font-semibold mb-3">Escalation Triggers:</h4>
          <p className="mb-4">Define when AI should mark leads as hot:</p>
          <ul className="ml-6 text-gray-700 space-y-1">
            <li>Specific phrases: "ready to move forward", "send me a quote", "when can we start"</li>
            <li>Question patterns: Asking about price, process, timeline multiple times</li>
            <li>Engagement level: 5+ message exchanges with positive sentiment</li>
            <li>Information provided: Shares budget, timeline, decision criteria voluntarily</li>
          </ul>
        </CollapsibleSection>

        <WarningBox title="AI Instruction Don'ts">
          <ul className="ml-6 space-y-1">
            <li>Don't make promises AI can't keep ("I'll call you in 5 minutes")</li>
            <li>Don't use aggressive or pushy language</li>
            <li>Don't claim to be human or give AI a human name</li>
            <li>Don't discuss competitors negatively</li>
            <li>Don't share confidential information</li>
          </ul>
        </WarningBox>
      </div>

      {/* Knowledge Base Management - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📚 AI Knowledge Base Management</h2>
        
        <h3 className="text-xl font-semibold mb-4">What to Upload</h3>
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-semibold mb-3">📄 Essential Documents:</h4>
            <ul className="text-gray-700 space-y-2">
              <li><strong>Company Overview:</strong> Basic info about your business, mission, values, and unique selling propositions.</li>
              <li><strong>Product/Service Details:</strong> Specifications, pricing (if public), features, benefits.</li>
              <li><strong>FAQs:</strong> Common questions and approved answers. This is the most important document.</li>
              <li><strong>Case Studies:</strong> Success stories and testimonials for credibility.</li>
              <li><strong>Process Documents:</strong> How your service works, timelines, what to expect.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">✅ Best Practices:</h4>
            <ul className="text-gray-700 space-y-2">
              <li><strong>Update Quarterly:</strong> Or when major changes occur</li>
              <li><strong>Keep Concise:</strong> Well-organized with clear headings</li>
              <li><strong>Use Bullet Points:</strong> AI parses structured content better</li>
              <li><strong>Include Internal Notes:</strong> "DO NOT SHARE" sections for context</li>
              <li><strong>Test After Upload:</strong> Ask AI questions to verify knowledge</li>
            </ul>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4">Knowledge Base Formatting</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
{`# COMPANY FAQ - ABC Real Estate Investments

## About Our Company
ABC Investments has been purchasing homes for cash since 2010. We've helped over 5,000 homeowners sell quickly and easily.

## Frequently Asked Questions

### How quickly can you close?
We can close in as little as 7 days, but we work on your timeline. The average closing is 2-3 weeks.

### Do I need to make repairs?
No repairs needed. We buy houses as-is, saving you time and money.

### How do you determine your offer?
We consider:
- Property location and condition
- Recent comparable sales
- Repair costs needed
- Current market conditions

### Are there any fees?
No fees or commissions. We even cover closing costs.

## DO NOT SHARE - Internal Only
- Our typical offer is 70-80% of ARV minus repairs
- Minimum deal size is $50,000 profit potential
- We avoid properties with major foundation issues`}
        </div>

        <BestPracticeBox title="Knowledge Base Maintenance">
          <ul className="ml-6 space-y-1">
            <li>Review AI conversations weekly for knowledge gaps</li>
            <li>Update FAQ based on real questions from leads</li>
            <li>Version control: Keep document history</li>
            <li>Test by asking AI questions after updates</li>
            <li>Keep documents under 10 pages for best results</li>
          </ul>
        </BestPracticeBox>
      </div>

      {/* AI Performance Monitoring */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📊 AI Performance Monitoring</h2>
        
        <h3 className="text-xl font-semibold mb-4">Key Performance Indicators</h3>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <MetricCard value="85-95%" label="Message Understanding" sublabel="AI comprehension rate" />
          <MetricCard value="2-5 sec" label="Response Time" sublabel="AI processing speed" />
          <MetricCard value="90%+" label="Accuracy Rate" sublabel="Correct information provided" />
          <MetricCard value="15-25%" label="Escalation Rate" sublabel="Conversations moved to humans" />
        </div>

        <h3 className="text-xl font-semibold mb-4">Quality Monitoring</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-3">🔍 Weekly Review Checklist:</h4>
            <ul className="text-gray-700 space-y-2">
              <li>• Sample 10-20 random conversations</li>
              <li>• Check for appropriate responses</li>
              <li>• Verify knowledge base usage</li>
              <li>• Review escalation decisions</li>
              <li>• Monitor sentiment progression</li>
              <li>• Check compliance with instructions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">🎯 Optimization Triggers:</h4>
            <ul className="text-gray-700 space-y-2">
              <li>• Response rate drops below 15%</li>
              <li>• Hot lead rate falls under 3%</li>
              <li>• Sales team reports quality issues</li>
              <li>• Unusual conversation patterns detected</li>
              <li>• Knowledge gaps identified</li>
              <li>• Competitor mentions increase</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Tools & Maintenance - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔧 System Tools & Maintenance</h2>
        
        <h3 className="text-xl font-semibold mb-4">Data Export Options</h3>
        <DataTable
          headers={['Export Type', 'Includes', 'Format', 'Use Case']}
          data={[
            ['Lead Export', 'All lead data, custom fields, status, scores', 'CSV, Excel', 'CRM sync, analysis, backup'],
            ['Conversation Export', 'Full message history with timestamps', 'PDF, Text', 'Compliance, training, quality review'],
            ['Analytics Export', 'Performance metrics, trends, ROI data', 'CSV, Excel', 'Executive reporting, deep analysis'],
            ['Billing Export', 'Usage, costs, invoices', 'PDF', 'Accounting, budgeting']
          ]}
        />

        <h3 className="text-xl font-semibold mt-6 mb-4">API Access (Coming Soon)</h3>
        <AlertBox type="info" icon="🔌" title="API Integration:">
          REST API for custom integrations is in development. Will support lead creation, status updates, conversation access, and analytics retrieval.
        </AlertBox>

        <h3 className="text-xl font-semibold mt-6 mb-4">Backup Best Practices</h3>
        <BestPracticeBox title="Recommended Backup Schedule">
          <ul className="ml-6 space-y-1">
            <li><strong>Daily:</strong> Hot leads and active conversations</li>
            <li><strong>Weekly:</strong> All leads and campaign settings</li>
            <li><strong>Monthly:</strong> Complete system backup including analytics</li>
            <li><strong>Quarterly:</strong> Archive old conversations to external storage</li>
          </ul>
        </BestPracticeBox>
      </div>

      {/* AI Future Roadmap */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🚀 AI Future Roadmap</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">Q2 2024</h3>
            <ul className="text-blue-700 text-sm space-y-2">
              <li>• Voice conversation capabilities</li>
              <li>• Multi-language support</li>
              <li>• Advanced sentiment analysis</li>
              <li>• Predictive lead scoring</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-3">Q3 2024</h3>
            <ul className="text-green-700 text-sm space-y-2">
              <li>• Custom AI model training</li>
              <li>• Industry-specific AI variants</li>
              <li>• Advanced objection handling</li>
              <li>• Conversation coaching mode</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-3">Q4 2024</h3>
            <ul className="text-purple-700 text-sm space-y-2">
              <li>• AI-generated follow-up sequences</li>
              <li>• Cross-platform conversation sync</li>
              <li>• Advanced personalization</li>
              <li>• Integration with GPT-5</li>
            </ul>
          </div>
        </div>

        <AlertBox type="success" icon="🎯" title="Stay Updated:">
          <div>
            New AI features are released monthly. Check the platform changelog and attend our monthly AI optimization webinars to stay current with the latest capabilities.
          </div>
        </AlertBox>
      </div>
    </div>
  );
};

export default AIFeatures;