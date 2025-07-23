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

const Analytics = () => {
  // Analytics dashboard hierarchy (extracted from original)
  const dashboardHierarchy = [
    { icon: '🎯', label: 'Pipeline Control Room', sublabel: 'Real-time Operations' },
    { icon: '🧠', label: 'AI Strategy Hub', sublabel: 'Performance Analysis' },
    { icon: '📈', label: 'Business Analytics', sublabel: 'Strategic Insights' },
    { icon: '🏢', label: 'Enterprise View', sublabel: 'Multi-tenant Overview' }
  ];

  // System health indicators (extracted from original)
  const systemHealthMetrics = [
    { value: '95%+', label: 'Message Delivery', sublabel: 'Typical delivery rate' },
    { value: '<15min', label: 'Hot Lead Response', sublabel: 'Target response time' },
    { value: '99.9%', label: 'System Uptime', sublabel: 'Monthly availability' },
    { value: '<5%', label: 'Error Rate Warning', sublabel: 'Alert threshold' }
  ];

  // Typical performance metrics (extracted from original)
  const performanceMetrics = [
    { value: '15-25%', label: 'Typical Response Rate', sublabel: 'Industry average for first message' },
    { value: '3-8%', label: 'Lead to Hot Conversion', sublabel: 'Percentage that become hot leads' },
    { value: '24-48hrs', label: 'Average Qualification Time', sublabel: 'Time to identify hot leads' },
    { value: '72hrs', label: 'Follow-up Window', sublabel: 'Critical response timeframe' }
  ];

  // Analytics comparison data (extracted from original)
  const analyticsComparisonData = [
    ['Messages Sent', 'Outreach volume', 'Capacity planning'],
    ['Open Rate', 'Message visibility', 'Timing optimization'],
    ['Reply Rate', 'Message effectiveness', 'Content optimization'],
    ['Conversion Rate', 'Overall success', 'ROI calculation']
  ];

  // Test results confidence levels (extracted from original)
  const testResultsData = [
    ['95%+ ✅', 'Statistically significant winner', 'Implement winning variant across all campaigns'],
    ['70-94% 🟡', 'Trending toward significance', 'Continue test for more data'],
    ['Below 70% ⏳', 'Insufficient data', 'Need more participants or time']
  ];

  // Weekly review checklist items
  const weeklyReviewItems = [
    'Check Control Room: All systems green? Any overnight issues?',
    'Review Hot Leads: How many generated? All contacted by sales?',
    'Analyze Funnel: Where are leads dropping off? Any stage below benchmark?',
    'Campaign Performance: Which campaigns over/under performing?',
    'A/B Test Results: Any tests ready to call? New tests to start?',
    'Sales Feedback: Lead quality meeting expectations?',
    'Action Items: Document changes to make this week'
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">📊 Analytics & Intelligence Platform</h2>
        <p className="text-lg text-gray-600 mb-8">
          Transform your lead engagement data into actionable insights. The analytics platform provides real-time visibility into every aspect of your AI-powered outreach.
        </p>

        <h3 className="text-2xl font-semibold mb-6">Analytics Dashboard Hierarchy</h3>
        <ProcessFlow steps={dashboardHierarchy} />
      </div>

      {/* Pipeline Control Room - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Pipeline Control Room</h2>
        <p className="text-gray-600 mb-6">
          Your real-time command center for monitoring system health and lead flow:
        </p>

        <h3 className="text-xl font-semibold mb-4">System Health Indicators</h3>
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-semibold mb-3">📊 Real-Time Monitoring:</h4>
            <ul className="text-gray-700 space-y-2">
              <li><strong>Overview & Health Panel:</strong> Monitor total lead volume, weekly trends, active campaigns, and system performance with green/yellow/red indicators.</li>
              <li><strong>Hot Lead Handoff Tracking:</strong> Real-time view of hot leads awaiting contact, average response time, and sales team performance.</li>
              <li><strong>Lead Journey Funnel:</strong> Visual funnel showing conversion at each stage. Identify bottlenecks and optimization opportunities.</li>
              <li><strong>AI Optimization Metrics:</strong> Message analysis, keyword performance, conversation success rates.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">⚡ System Performance:</h4>
            <div className="metric-grid">
              {systemHealthMetrics.map((metric, index) => (
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

        <AlertBox type="warning" icon="⚠️" title="Warning Thresholds:">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">System Alerts:</h4>
              <ul className="space-y-1">
                <li>• &gt;30min Hot Lead Wait Time</li>
                <li>• &lt;90% Message Delivery Rate</li>
                <li>• &gt;5% System Error Rate</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance Alerts:</h4>
              <ul className="space-y-1">
                <li>• &lt;10% Campaign Response Rate</li>
                <li>• &gt;3% Unsubscribe Rate</li>
                <li>• &lt;60% Sales Acceptance Rate</li>
              </ul>
            </div>
          </div>
        </AlertBox>
      </div>

      {/* AI Strategy Hub - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🧠 AI Strategy Hub (Admin Only)</h2>
        <p className="text-gray-600 mb-6">
          Deep analytics for optimizing your AI performance:
        </p>

        <h3 className="text-xl font-semibold mb-4">Key Analytics Views</h3>
        
        <CollapsibleSection title="Overview Reports">
          <h4 className="text-lg font-semibold mb-3">Macro Conversion Funnel:</h4>
          <p className="mb-4">Track leads through 7 stages with conversion rates at each step:</p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <ol className="space-y-2 text-gray-700">
              <li><strong>1. Leads Uploaded</strong> (100%)</li>
              <li><strong>2. AI Engaged</strong> (85-95% typical)</li>
              <li><strong>3. Replied</strong> (20-40% typical)</li>
              <li><strong>4. Hot Lead</strong> (5-15% of total)</li>
              <li><strong>5. Sales Connected</strong> (80% of hot)</li>
              <li><strong>6. Qualified</strong> (60% of connected)</li>
              <li><strong>7. Deal Won</strong> (20-30% of qualified)</li>
            </ol>
          </div>
          
          <h4 className="text-lg font-semibold mb-3">Historical Performance:</h4>
          <p className="text-gray-700">Track trends over time including hot lead rate, reply rate, and cost per hot lead. Identify seasonal patterns and optimization opportunities.</p>
        </CollapsibleSection>

        <CollapsibleSection title="AI Performance Analysis">
          <h4 className="text-lg font-semibold mb-3">Confidence vs Outcome:</h4>
          <p className="mb-4">Scatter plot showing AI's confidence scores against actual outcomes. Helps calibrate scoring algorithms.</p>
          
          <h4 className="text-lg font-semibold mb-3">Message Effectiveness:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Response rates by message template</li>
            <li>Sentiment progression through conversations</li>
            <li>Drop-off points in conversations</li>
            <li>Most effective question types</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Optimal Timing Analysis:</h4>
          <p className="text-gray-700">Data-driven insights on best times to send initial messages and follow-ups based on your actual response data.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Performance Analytics">
          <h4 className="text-lg font-semibold mb-3">Campaign Comparison:</h4>
          <DataTable
            headers={['Metric', 'What It Shows', 'Use Case']}
            data={analyticsComparisonData}
          />
          
          <h4 className="text-lg font-semibold mt-6 mb-3">AI Persona Performance:</h4>
          <p className="text-gray-700">Compare conversion rates across different AI personalities to find what resonates with your audience.</p>
        </CollapsibleSection>

        <CollapsibleSection title="ROI & Revenue Analytics">
          <h4 className="text-lg font-semibold mb-3">Lead Source ROI:</h4>
          <p className="mb-4">Track performance by lead source:</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold mb-2">Cost Analysis:</h5>
              <ul className="ml-6 text-gray-700 text-sm space-y-1">
                <li>Cost per lead by source</li>
                <li>Cost per hot lead by source</li>
                <li>Cost per closed deal by source</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">Revenue Analysis:</h5>
              <ul className="ml-6 text-gray-700 text-sm space-y-1">
                <li>Revenue generated by source</li>
                <li>Lifetime value by source</li>
                <li>ROI by source and time period</li>
              </ul>
            </div>
          </div>
          
          <h4 className="text-lg font-semibold mt-6 mb-3">Sales Team Performance:</h4>
          <ul className="ml-6 text-gray-700 space-y-1">
            <li>Hot leads received vs. converted</li>
            <li>Average deal size by rep</li>
            <li>Response time to hot leads</li>
            <li>Win rate by rep</li>
          </ul>
        </CollapsibleSection>
      </div>

      {/* A/B Testing Analytics - Added from original AI Features content */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🧪 A/B Testing Analytics</h2>
        
        <h3 className="text-xl font-semibold mb-4">Understanding Test Results</h3>
        <DataTable
          headers={['Confidence Level', 'What It Means', 'Action to Take']}
          data={testResultsData}
        />

        <h3 className="text-xl font-semibold mt-6 mb-4">Test Performance Tracking</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">📊 What You Can Test:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Opening message variations</li>
              <li>• AI personality differences</li>
              <li>• Follow-up timing</li>
              <li>• Message sequences</li>
              <li>• Value propositions</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3">✅ Best Practices:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Test one variable at a time</li>
              <li>• 100-200 leads per variant minimum</li>
              <li>• Run tests for 7-14 days</li>
              <li>• Document everything tested</li>
              <li>• Apply learnings to new tests</li>
            </ul>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-3">📈 Success Metrics:</h4>
            <ul className="text-orange-700 text-sm space-y-1">
              <li>• Response rate improvement</li>
              <li>• Hot lead conversion rate</li>
              <li>• Conversation depth increase</li>
              <li>• Unsubscribe rate reduction</li>
              <li>• Sales acceptance rate</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Using Analytics for Optimization - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📈 Using Analytics for Optimization</h2>
        
        <h3 className="text-xl font-semibold mb-4">Weekly Analytics Review Checklist</h3>
        <BestPracticeBox title="Monday Morning Review Process">
          <div className="space-y-3">
            {weeklyReviewItems.map((item, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">{index + 1}</div>
                <div className="text-gray-700">{item}</div>
              </div>
            ))}
          </div>
        </BestPracticeBox>

        <h3 className="text-xl font-semibold mt-8 mb-4">Key Performance Benchmarks</h3>
        <DataTable
          headers={['Metric', 'Poor', 'Average', 'Excellent']}
          data={[
            ['Initial Response Rate', '<10%', '15-25%', '>30%'],
            ['Lead to Hot Lead', '<2%', '3-8%', '>10%'],
            ['Hot Lead to Sale', '<10%', '15-25%', '>30%'],
            ['Cost per Hot Lead', '>$50', '$20-40', '<$15'],
            ['Sales Response Time', '>1 hour', '15-30 min', '<10 min']
          ]}
        />

        <AlertBox type="info" icon="💡" title="Analytics Pro Tip:">
          Export your data weekly and build trend charts in Excel/Google Sheets. Look for patterns over 4-8 week periods rather than daily fluctuations.
        </AlertBox>
      </div>

      {/* Business Analytics & Reporting */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📊 Business Analytics & Reporting</h2>
        
        <h3 className="text-xl font-semibold mb-4">Executive Dashboard Metrics</h3>
        <div className="metric-grid mb-6">
          {performanceMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              value={metric.value}
              label={metric.label}
              sublabel={metric.sublabel}
            />
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-4">Custom Reporting Options</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-3">📈 Available Report Types:</h4>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold">Campaign Performance Report</h5>
                <p className="text-sm text-gray-600">Response rates, conversion metrics, ROI by campaign</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold">Sales Team Performance Report</h5>
                <p className="text-sm text-gray-600">Hot lead handling, response times, conversion rates by rep</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold">Lead Source Analysis Report</h5>
                <p className="text-sm text-gray-600">ROI, quality scores, and performance by lead source</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold">AI Optimization Report</h5>
                <p className="text-sm text-gray-600">Conversation quality, scoring accuracy, optimization opportunities</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">⏰ Report Scheduling:</h4>
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h5 className="font-semibold">Daily Reports</h5>
                <p className="text-sm text-gray-600">Hot leads generated, system health, urgent alerts</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <h5 className="font-semibold">Weekly Reports</h5>
                <p className="text-sm text-gray-600">Campaign performance, conversion trends, optimization recommendations</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-3">
                <h5 className="font-semibold">Monthly Reports</h5>
                <p className="text-sm text-gray-600">Executive summary, ROI analysis, strategic insights</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-3">
                <h5 className="font-semibold">Custom Reports</h5>
                <p className="text-sm text-gray-600">Ad-hoc analysis, specific date ranges, custom metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Export & Integration */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📤 Data Export & Integration</h2>
        
        <h3 className="text-xl font-semibold mb-4">Export Options</h3>
        <DataTable
          headers={['Export Type', 'Includes', 'Format', 'Use Case']}
          data={[
            ['Lead Export', 'All lead data, custom fields, status, scores', 'CSV, Excel', 'CRM sync, analysis, backup'],
            ['Conversation Export', 'Full message history with timestamps', 'PDF, Text', 'Compliance, training, quality review'],
            ['Analytics Export', 'Performance metrics, trends, ROI data', 'CSV, Excel', 'Executive reporting, deep analysis'],
            ['Billing Export', 'Usage, costs, invoices', 'PDF', 'Accounting, budgeting']
          ]}
        />

        <h3 className="text-xl font-semibold mt-6 mb-4">Integration Capabilities</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">🔌 Current Integrations:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Manual CSV export/import</li>
              <li>• Email report delivery</li>
              <li>• Scheduled data exports</li>
              <li>• Custom date range exports</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3">🚀 Coming Soon:</h4>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• REST API for real-time data</li>
              <li>• Webhook event notifications</li>
              <li>• Native CRM integrations</li>
              <li>• Business Intelligence connectors</li>
            </ul>
          </div>
        </div>

        <BestPracticeBox title="Data Management Best Practices">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📊 Regular Exports:</h4>
              <ul className="space-y-1">
                <li>• Daily: Hot leads and active conversations</li>
                <li>• Weekly: All leads and campaign settings</li>
                <li>• Monthly: Complete system backup including analytics</li>
                <li>• Quarterly: Archive old conversations to external storage</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔍 Analysis Tips:</h4>
              <ul className="space-y-1">
                <li>• Build trend charts over 4-8 week periods</li>
                <li>• Compare performance across lead sources</li>
                <li>• Track seasonal patterns and adjust accordingly</li>
                <li>• Share insights with sales team regularly</li>
              </ul>
            </div>
          </div>
        </BestPracticeBox>
      </div>

      {/* Advanced Analytics */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🎯 Advanced Analytics Features</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-3">🧠 Predictive Analytics</h3>
            <p className="text-purple-700 text-sm mb-3">AI-powered predictions for lead scoring and conversion probability.</p>
            <div className="text-purple-600 text-xs">Coming in Q2 2024</div>
          </div>
          
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-800 mb-3">📊 Cohort Analysis</h3>
            <p className="text-indigo-700 text-sm mb-3">Track lead behavior and conversion patterns over time by cohorts.</p>
            <div className="text-indigo-600 text-xs">Coming in Q3 2024</div>
          </div>
          
          <div className="bg-teal-50 p-6 rounded-lg border border-teal-200">
            <h3 className="font-semibold text-teal-800 mb-3">🎲 Attribution Modeling</h3>
            <p className="text-teal-700 text-sm mb-3">Multi-touch attribution to understand the full lead journey.</p>
            <div className="text-teal-600 text-xs">Coming in Q4 2024</div>
          </div>
        </div>

        <WarningBox title="Analytics Limits & Considerations">
          <ul className="ml-6 space-y-1">
            <li>Historical data retention: 24 months for detailed analytics</li>
            <li>Real-time updates may have 5-15 minute delays during high volume</li>
            <li>Custom report generation limited to 50 reports per month</li>
            <li>Large data exports (&gt;100k records) may take several minutes</li>
            <li>Some advanced features require Admin-level access</li>
          </ul>
        </WarningBox>
      </div>
    </div>
  );
};

export default Analytics;