import { generateTrendData } from './mockHelpers';

export const generateDemoOverviewMetrics = (period = '30days') => {
  return {
    totalLeads: 324,
    weeklyLeads: 47,
    hotLeadRate: '18.5%',
    replyRate: '64.2%',
    activeLeads: 89,
    completedLeads: 156,
    messagesSent: 1247,
    messagesReceived: 892,
    trends: {
      weeklyLeads: '+12%',
      hotLeadRate: '+3.2%',
      replyRate: '-1.8%',
      completedLeads: '+8.5%',
      messagesSent: '+15.3%',
      messagesReceived: '+22.1%',
    }
  };
};

export const generateDemoDetailedMetrics = (metricType) => {
  const baseData = {
    trendData: generateTrendData(30, 50, 20),
    sourceData: [
      { source: 'Website', count: 145, color: '#3B82F6' },
      { source: 'Paid Ads', count: 89, color: '#10B981' },
      { source: 'Referral', count: 67, color: '#F59E0B' },
      { source: 'Cold Outreach', count: 43, color: '#8B5CF6' },
      { source: 'Social Media', count: 31, color: '#EF4444' }
    ],
    topSalespersons: [
      { id: '1', name: 'Sarah Johnson', totalLeads: 87, avatar: '👩‍💼' },
      { id: '2', name: 'Mike Chen', totalLeads: 73, avatar: '👨‍💼' },
      { id: '3', name: 'Emily Davis', totalLeads: 65, avatar: '👩‍💼' },
      { id: '4', name: 'Robert Smith', totalLeads: 52, avatar: '👨‍💼' },
      { id: '5', name: 'Lisa Wang', totalLeads: 48, avatar: '👩‍💼' }
    ]
  };

  // Add metric-specific data based on metricType
  switch (metricType) {
    case 'weeklyLeads':
      return {
        ...baseData,
        weeklyTrendData: generateWeeklyTrendData(),
        avgHotRate: 15.2,
        totalHotLeads: 125,
        bestWeek: 'Week 3',
        weeklyInsights: "Last week saw a 15% increase in leads, driven primarily by organic search traffic. Paid ads conversion dropped slightly, requiring campaign optimization."
      };
    
    case 'hotLeadRate':
      return {
        ...baseData,
        hotRateTrendData: generateTrendData(30, 15, 8).map(item => ({
          date: item.date,
          hotRate: item.count // Rename count to hotRate for this metric
        })),
        targetHotRate: 15,
        hotRateByChannelData: [
          { channel: 'Website', hotRate: 0.18 },
          { channel: 'Paid Ads', hotRate: 0.12 },
          { channel: 'Referral', hotRate: 0.22 },
          { channel: 'Cold Outreach', hotRate: 0.08 },
          { channel: 'Social Media', hotRate: 0.14 }
        ],
        hotRateByTopicData: [
          { topic: 'Pricing Inquiry', hotRate: 25.5 },
          { topic: 'Demo Request', hotRate: 22.3 },
          { topic: 'Feature Question', hotRate: 12.8 },
          { topic: 'General Info', hotRate: 8.2 },
          { topic: 'Support Issue', hotRate: 5.1 }
        ],
        timeToHotData: {
          avgMinutes: 135,
          medianMinutes: 90,
          distribution: [
            { range: '< 1 hour', percentage: 35 },
            { range: '1-2 hours', percentage: 30 },
            { range: '2-4 hours', percentage: 20 },
            { range: '> 4 hours', percentage: 15 }
          ]
        },
        funnelData: [
          { stage: 'Initial Contact', count: 500, conversionToNext: 60 },
          { stage: 'Qualified Response', count: 300, conversionToNext: 50 },
          { stage: 'Strong Interest', count: 150, conversionToNext: 80 },
          { stage: 'Hot Lead', count: 120 }
        ],
        optimizationTips: [
          "Paid Ads channel shows 5% lower hot rate than average - consider campaign optimization",
          "Leads asking about pricing convert to hot 2x faster - emphasize pricing transparency",
          "Weekend leads take 40% longer to become hot - consider staffing adjustments"
        ]
      };

    case 'activeLeads':
      return {
        ...baseData,
        stageData: [
          { source: 'AI Engaged', count: 45, color: '#3B82F6' },
          { source: 'Sales Follow-up', count: 32, color: '#10B981' },
          { source: 'Pending Info', count: 18, color: '#F59E0B' },
          { source: 'Scheduling', count: 12, color: '#8B5CF6' }
        ],
        ownerData: [
          { source: 'AI Bot', count: 45, color: '#3B82F6' },
          { source: 'Sarah J.', count: 28, color: '#10B981' },
          { source: 'Mike C.', count: 22, color: '#F59E0B' },
          { source: 'Emily D.', count: 12, color: '#8B5CF6' }
        ],
        stagnantLeads: [
          { leadId: '1', name: 'John Smith', currentStatus: 'AI Engaged', assignedTo: 'AI', lastInteraction: '2024-01-05', daysStagnant: 8 },
          { leadId: '2', name: 'Jane Doe', currentStatus: 'Sales Follow-up', assignedTo: 'Mike Chen', lastInteraction: '2024-01-01', daysStagnant: 12 },
          { leadId: '3', name: 'Bob Wilson', currentStatus: 'Pending Info', assignedTo: 'Sarah J.', lastInteraction: '2024-01-03', daysStagnant: 10 }
        ]
      };

    case 'completedLeads':
      return {
        ...baseData,
        outcomeData: [
          { status: 'Converted to Customer', count: 125 },
          { status: 'Disqualified', count: 89 },
          { status: 'Archived', count: 45 },
          { status: 'Long-Term Nurture', count: 31 }
        ],
        disqualificationReasons: [
          { reason: 'Not a good fit', count: 35 },
          { reason: 'No budget', count: 28 },
          { reason: 'Bad timing', count: 18 },
          { reason: 'Went with competitor', count: 8 }
        ],
        avgCompletionTime: 15.3
      };

    case 'messagesSent':
      return {
        ...baseData,
        messageTypeData: [
          { source: 'Initial Outreach', count: 450, color: '#3B82F6' },
          { source: 'Follow-up', count: 320, color: '#10B981' },
          { source: 'Qualification', count: 180, color: '#F59E0B' },
          { source: 'Nurture', count: 150, color: '#8B5CF6' }
        ],
        deliveryStats: [
          { label: 'Total Sent', value: '1,100' },
          { label: 'Delivered', value: '1,056', percentage: 96 },
          { label: 'Failed', value: '44', percentage: 4 },
          { label: 'Opened', value: '423', percentage: 40 }
        ],
        engagementData: [
          { type: 'Initial Outreach', rate: 0.35 },
          { type: 'Follow-up', rate: 0.42 },
          { type: 'Qualification', rate: 0.58 },
          { type: 'Nurture', rate: 0.28 }
        ]
      };

    case 'messagesReceived':
      return {
        ...baseData,
        topIntents: [
          { intent: 'Pricing Inquiry', count: 156 },
          { intent: 'Demo Request', count: 128 },
          { intent: 'Technical Support', count: 89 },
          { intent: 'Feature Question', count: 67 },
          { intent: 'General Info', count: 45 }
        ],
        sentimentData: [
          { sentiment: 'Positive', count: 367 },
          { sentiment: 'Neutral', count: 245 },
          { sentiment: 'Negative', count: 56 }
        ],
        unhandledMessages: [
          { messageId: 'msg-001', content: 'Can your AI integrate with our custom CRM that uses...', date: '2024-01-12', confidence: 0.32 },
          { messageId: 'msg-002', content: 'We need a solution that handles both B2B and B2C...', date: '2024-01-11', confidence: 0.45 },
          { messageId: 'msg-003', content: 'What about GDPR compliance for European customers...', date: '2024-01-10', confidence: 0.28 }
        ]
      };
    
    default:
      return baseData;
  }
};

const generateWeeklyTrendData = () => {
  return Array.from({ length: 8 }, (_, i) => ({
    weekStartDate: new Date(Date.now() - (7 - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currentWeekLeads: Math.floor(Math.random() * 50) + 100,
    previousWeekLeads: Math.floor(Math.random() * 50) + 90,
    growthPercentage: Math.floor(Math.random() * 40) - 20
  }));
};