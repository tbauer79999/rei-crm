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

const Troubleshooting = () => {
  // Support contact methods (extracted from original)
  const supportMethods = [
    {
      icon: '💬',
      title: 'Live Chat Support',
      description: 'Available Monday-Friday 9AM-6PM EST. Average response time: 2 minutes. Click the chat bubble in the platform.'
    },
    {
      icon: '📧',
      title: 'Email Support',
      description: 'support@yourplatform.com - Response within 24 hours. Include account name and detailed issue description.'
    },
    {
      icon: '📚',
      title: 'Knowledge Base',
      description: 'Search our online help center for instant answers. Updated weekly with new articles and solutions.'
    },
    {
      icon: '🎓',
      title: 'Training Sessions',
      description: 'Weekly group training sessions for new users. Book 1-on-1 onboarding for enterprise accounts.'
    },
    {
      icon: '🚨',
      title: 'Emergency Support',
      description: 'For critical issues affecting business operations. Available 24/7 for enterprise customers.'
    },
    {
      icon: '👥',
      title: 'User Community',
      description: 'Join our Slack community to connect with other users, share tips, and get peer support.'
    }
  ];

  // Performance benchmarks (extracted from original)
  const performanceBenchmarks = [
    ['Initial Response Rate', '<10%', '15-25%', '>30%'],
    ['Lead to Hot Lead', '<2%', '3-8%', '>10%'],
    ['Hot Lead to Sale', '<10%', '15-25%', '>30%'],
    ['Cost per Hot Lead', '>$50', '$20-40', '<$15'],
    ['Sales Response Time', '>1 hour', '15-30 min', '<10 min']
  ];

  // System health metrics
  const systemHealthMetrics = [
    { value: '95%+', label: 'Normal Message Delivery', sublabel: 'Expected delivery rate' },
    { value: '<15min', label: 'Hot Lead Response', sublabel: 'Target response time' },
    { value: '99.9%', label: 'System Uptime', sublabel: 'Monthly availability' },
    { value: '<5%', label: 'Error Rate Threshold', sublabel: 'Warning trigger point' }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-3xl font-bold mb-4">🔧 Troubleshooting Guide</h2>
        <p className="text-lg text-gray-600 mb-8">
          Quick solutions to common issues. Most problems can be resolved in minutes with these troubleshooting steps.
        </p>
      </div>

      {/* Critical Issues - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🚨 Critical Issues - Immediate Action Required</h2>
        
        <CollapsibleSection title="AI Not Sending Any Messages" isInitiallyOpen={true}>
          <AlertBox type="danger" icon="🚨" title="Impact:">
            No lead engagement, potential revenue loss
          </AlertBox>
          
          <h4 className="text-lg font-semibold mb-3">Diagnostic Steps:</h4>
          <ol className="ml-6 text-gray-700 space-y-2 mb-4">
            <li><strong>Check Campaign Status:</strong> Is it Active? Is AI turned ON?</li>
            <li><strong>Verify Phone Number:</strong> Is one assigned? Is it active/verified?</li>
            <li><strong>Review Lead Status:</strong> Are leads assigned to the campaign?</li>
            <li><strong>Check Time Settings:</strong> Are you within business hours?</li>
            <li><strong>Message Throttle:</strong> Have you hit daily/hourly limits?</li>
            <li><strong>System Health:</strong> Check Control Room for red indicators</li>
          </ol>
          
          <h4 className="text-lg font-semibold mb-3">Quick Fixes:</h4>
          <ul className="ml-6 text-gray-700 space-y-1">
            <li>Toggle campaign off/on to reset</li>
            <li>Verify phone number by texting it yourself</li>
            <li>Check Settings → Messaging for throttle limits</li>
            <li>Ensure leads have valid phone numbers with country code</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Hot Leads Not Being Detected">
          <h4 className="text-lg font-semibold mb-3">Common Causes:</h4>
          <ul className="ml-6 text-gray-700 space-y-2 mb-4">
            <li>Escalation threshold set too high (&gt;85)</li>
            <li>AI personality mismatch with audience</li>
            <li>Campaign goal doesn't match lead intent</li>
            <li>Conversations ending too early</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Solutions:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li>Review recent conversations - are leads showing interest?</li>
            <li>Lower threshold to 70 temporarily and monitor</li>
            <li>Check if AI is asking qualifying questions</li>
            <li>Ensure follow-up messages are enabled</li>
            <li>Run A/B test with different approach</li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="High Unsubscribe Rate (>3%)">
          <WarningBox title="Risk: High unsubscribes can damage sender reputation">
            Address immediately to prevent delivery issues
          </WarningBox>
          
          <h4 className="text-lg font-semibold mb-3">Diagnostic Questions:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Is your opening message too aggressive?</li>
            <li>Are you texting outside business hours?</li>
            <li>Is lead source quality poor?</li>
            <li>Frequency too high? (&gt;1 message/day)</li>
            <li>Message content spammy or misleading?</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Immediate Actions:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li>Pause campaign temporarily</li>
            <li>Review and soften opening message</li>
            <li>Verify lead consent/source quality</li>
            <li>Reduce follow-up frequency</li>
            <li>A/B test friendlier approach</li>
          </ol>
        </CollapsibleSection>
      </div>

      {/* Common Issues & Solutions - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">⚠️ Common Issues & Solutions</h2>
        
        <CollapsibleSection title="CSV Import Failing">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Error: "Invalid file format"</h4>
              <ul className="ml-6 text-gray-700 space-y-1 mb-4">
                <li>Save as CSV (not Excel format)</li>
                <li>Use UTF-8 encoding</li>
                <li>Remove any formulas or formatting</li>
                <li>Check for hidden columns/rows</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Error: "Headers don't match"</h4>
              <ul className="ml-6 text-gray-700 space-y-1 mb-4">
                <li>Download fresh template from platform</li>
                <li>Headers are case-sensitive</li>
                <li>Remove any trailing spaces</li>
                <li>Don't add/remove columns</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Error: "Invalid phone numbers"</h4>
              <ul className="ml-6 text-gray-700 space-y-1">
                <li>Include country code (+1 for US)</li>
                <li>Remove special characters: ()-.</li>
                <li>Format: +15551234567</li>
                <li>No extensions or letters</li>
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Sales Team Not Getting Notifications">
          <h4 className="text-lg font-semibold mb-3">Check These Settings:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li><strong>Team Member Status:</strong> Active and Available?</li>
            <li><strong>Campaign Assignment:</strong> Assigned to specific team member?</li>
            <li><strong>Notification Settings:</strong> Email/SMS enabled in their profile?</li>
            <li><strong>Email Delivery:</strong> Check spam folder</li>
            <li><strong>Phone Number:</strong> Correct number with country code?</li>
          </ol>
          
          <h4 className="text-lg font-semibold mt-4 mb-3">Test Notification System:</h4>
          <p className="text-gray-700">Create a test lead and manually mark as hot to trigger notifications</p>
        </CollapsibleSection>

        <CollapsibleSection title="AI Giving Incorrect Information">
          <h4 className="text-lg font-semibold mb-3">Root Causes:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Outdated knowledge base documents</li>
            <li>Conflicting information in multiple docs</li>
            <li>AI instructions too vague</li>
            <li>No relevant info in knowledge base</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Fix Process:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li>Review conversation to identify incorrect info</li>
            <li>Update knowledge base with correct details</li>
            <li>Add specific instructions to prevent recurrence</li>
            <li>Test by asking AI the same question</li>
            <li>Monitor future conversations</li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Poor AI Conversation Quality">
          <h4 className="text-lg font-semibold mb-3">Symptoms:</h4>
          <ul className="ml-6 text-gray-700 space-y-1 mb-4">
            <li>Repetitive responses</li>
            <li>Not answering questions directly</li>
            <li>Too pushy or too passive</li>
            <li>Losing conversation context</li>
          </ul>
          
          <h4 className="text-lg font-semibold mb-3">Optimization Steps:</h4>
          <ol className="ml-6 text-gray-700 space-y-2">
            <li><strong>Review AI Personality:</strong> Does it match your audience?</li>
            <li><strong>Update Instructions:</strong> Add examples of good responses</li>
            <li><strong>Knowledge Base:</strong> Ensure comprehensive FAQ coverage</li>
            <li><strong>A/B Test:</strong> Try different conversation styles</li>
            <li><strong>Human Review:</strong> Have sales team review and provide feedback</li>
          </ol>
        </CollapsibleSection>
      </div>

      {/* Performance Issues - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔍 Performance Issues</h2>
        
        <CollapsibleSection title="Slow Message Delivery">
          <h4 className="text-lg font-semibold mb-3">Normal vs Abnormal Delays:</h4>
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-800 mb-2">✅ Normal:</h5>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• 5-30 second AI response delay (configured)</li>
                <li>• 1-2 minute delay during high volume</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h5 className="font-semibold text-red-800 mb-2">❌ Abnormal:</h5>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• &gt;5 minute delays consistently</li>
                <li>• Messages arriving hours later</li>
              </ul>
            </div>
          </div>
          
          <h4 className="text-lg font-semibold mb-3">Troubleshooting:</h4>
          <ol className="ml-6 text-gray-700 space-y-1">
            <li>Check System Metrics in Control Room</li>
            <li>Verify message throttle settings</li>
            <li>Reduce active campaign count temporarily</li>
            <li>Contact support if delays persist</li>
          </ol>
        </CollapsibleSection>

        <CollapsibleSection title="Dashboard Loading Slowly">
          <h4 className="text-lg font-semibold mb-3">Quick Fixes:</h4>
          <ul className="ml-6 text-gray-700 space-y-1">
            <li>Clear browser cache and cookies</li>
            <li>Try different browser (Chrome recommended)</li>
            <li>Reduce date range in analytics views</li>
            <li>Close unnecessary browser tabs</li>
            <li>Check internet connection speed</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="System Performance Benchmarks">
          <h4 className="text-lg font-semibold mb-3">Expected Performance Ranges:</h4>
          <DataTable
            headers={['Metric', 'Poor', 'Average', 'Excellent']}
            data={performanceBenchmarks}
          />
          
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-3">System Health Indicators:</h4>
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
        </CollapsibleSection>
      </div>

      {/* Diagnostic Tools */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🔬 Diagnostic Tools & Self-Help</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">🔍 Self-Diagnostic Checklist:</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">All campaigns show "Active" status</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">Phone numbers are verified and assigned</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">A2P brand and campaigns approved</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">Business hours configured correctly</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">Sales team notifications enabled</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">AI knowledge base uploaded</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-gray-700">Test messages sent successfully</span>
              </label>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">📊 Health Check Tools:</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-1">Control Room Dashboard</h4>
                <p className="text-sm text-gray-600">Real-time system health indicators</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-1">Message Delivery Logs</h4>
                <p className="text-sm text-gray-600">Track individual message status</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-1">AI Performance Metrics</h4>
                <p className="text-sm text-gray-600">Conversation quality scores</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-1">Campaign Analytics</h4>
                <p className="text-sm text-gray-600">Response rates and conversions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Help - Extracted from original */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">📞 Getting Help</h2>
        
        <div className="cards-grid mb-8">
          {supportMethods.map((method, index) => (
            <FeatureCard
              key={index}
              icon={method.icon}
              title={method.title}
              description={method.description}
            />
          ))}
        </div>

        <AlertBox type="success" icon="💡" title="Pro Tip:">
          When contacting support, include: Campaign ID, example lead ID, screenshot of issue, and steps to reproduce. This speeds up resolution by 80%!
        </AlertBox>
      </div>

      {/* Emergency Procedures */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🚨 Emergency Procedures</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">🔥 Critical System Down</h3>
            <ol className="text-red-700 text-sm space-y-2">
              <li>1. Check status page for outages</li>
              <li>2. Contact emergency support line</li>
              <li>3. Document impact on business</li>
              <li>4. Implement backup procedures</li>
            </ol>
          </div>
          
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-3">⚠️ Compliance Issue</h3>
            <ol className="text-orange-700 text-sm space-y-2">
              <li>1. Immediately pause all campaigns</li>
              <li>2. Document the violation</li>
              <li>3. Contact legal/compliance team</li>
              <li>4. Submit incident report</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-3">📱 Phone Number Suspended</h3>
            <ol className="text-yellow-700 text-sm space-y-2">
              <li>1. Check carrier notification emails</li>
              <li>2. Review recent message content</li>
              <li>3. Submit appeal if appropriate</li>
              <li>4. Activate backup number</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 bg-gray-100 p-6 rounded-lg">
          <h3 className="font-semibold mb-3">📋 Incident Response Checklist:</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Immediate Actions:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Assess scope and impact</li>
                <li>• Stop/pause affected systems</li>
                <li>• Notify stakeholders</li>
                <li>• Document timeline</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Resolution Process:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Gather diagnostic information</li>
                <li>• Contact appropriate support</li>
                <li>• Implement workarounds</li>
                <li>• Monitor resolution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Prevention & Maintenance */}
      <div className="feature-section">
        <h2 className="text-2xl font-bold mb-6">🛡️ Prevention & Maintenance</h2>
        
        <BestPracticeBox title="Weekly Maintenance Checklist">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">System Health:</h4>
              <ul className="space-y-1">
                <li>• Review error logs and alerts</li>
                <li>• Check message delivery rates</li>
                <li>• Monitor AI conversation quality</li>
                <li>• Verify phone number status</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Management:</h4>
              <ul className="space-y-1">
                <li>• Backup lead database</li>
                <li>• Clean duplicate entries</li>
                <li>• Update knowledge base</li>
                <li>• Archive old conversations</li>
              </ul>
            </div>
          </div>
        </BestPracticeBox>

        <WarningBox title="Common Prevention Mistakes">
          <ul className="ml-6 space-y-1">
            <li>Not monitoring unsubscribe rates daily</li>
            <li>Ignoring carrier compliance updates</li>
            <li>Skipping regular knowledge base updates</li>
            <li>Not testing phone numbers regularly</li>
            <li>Failing to train new team members properly</li>
          </ul>
        </WarningBox>
      </div>
    </div>
  );
};

export default Troubleshooting;