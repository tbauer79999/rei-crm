import { generateTrendData } from './mockHelpers';

export const generateDemoJourneyData = (tenantId, dateRange = 30) => {
  return {
    statusDistribution: [
      { name: 'New', value: 89 },
      { name: 'AI Engaged', value: 67 },
      { name: 'Qualified', value: 45 },
      { name: 'Hot', value: 23 },
      { name: 'Sales Follow-up', value: 34 },
      { name: 'Converted', value: 12 },
      { name: 'Disqualified', value: 28 }
    ],
    funnelData: [
      { 
        fromStage: 'New', 
        toStage: 'AI Engaged', 
        countEntered: 298, 
        countExited: 89, 
        conversionRate: 70.1, 
        dropOffRate: 29.9 
      },
      { 
        fromStage: 'AI Engaged', 
        toStage: 'Qualified', 
        countEntered: 209, 
        countExited: 67, 
        conversionRate: 67.9, 
        dropOffRate: 32.1 
      },
      { 
        fromStage: 'Qualified', 
        toStage: 'Hot', 
        countEntered: 142, 
        countExited: 45, 
        conversionRate: 68.3, 
        dropOffRate: 31.7 
      },
      { 
        fromStage: 'Hot', 
        toStage: 'Converted', 
        countEntered: 97, 
        countExited: 12, 
        conversionRate: 87.6, 
        dropOffRate: 12.4 
      }
    ],
    transitionData: [
      { transition: 'New → AI Engaged', count: 89, percent: '29.9%' },
      { transition: 'AI Engaged → Qualified', count: 67, percent: '32.1%' },
      { transition: 'Qualified → Hot', count: 45, percent: '31.7%' },
      { transition: 'Hot → Converted', count: 12, percent: '12.4%' },
      { transition: 'Qualified → Disqualified', count: 28, percent: '19.7%' },
      { transition: 'AI Engaged → Disqualified', count: 34, percent: '16.3%' }
    ],
    totalLeads: 298,
    trends: generateTrendData(dateRange, 8, 5).map(item => ({
      date: item.date,
      leads: item.count // Rename count to leads for journey data
    })),
    trendData: generateTrendData(dateRange, 8, 5).map(item => ({
      date: item.date,
      leads: item.count // Also provide as trendData for compatibility
    }))
  };
};