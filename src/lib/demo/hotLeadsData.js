import { generateRealisticNames, generateCompanyNames, generateTimeAgo, generateRandomElement } from './mockHelpers';

export const generateDemoHotLeadData = (tenantId) => {
  const names = generateRealisticNames();
  
  const demoLeads = [
    {
      id: 'demo-lead-1',
      name: names[0],
      snippet: 'Interested in enterprise pricing for 50+ user team. Mentioned budget of $50k/year and Q4 implementation timeline.',
      campaign: 'Enterprise Outbound Q3',
      marked_hot_time_ago: '23m ago',
      call_logged: false,
      requires_immediate_attention: true
    },
    {
      id: 'demo-lead-2',
      name: names[1],
      snippet: 'Asked about integration with Salesforce. Currently using competitor solution but unhappy with performance.',
      campaign: 'Integration Focus Campaign',
      marked_hot_time_ago: '1h 15m ago',
      call_logged: false,
      requires_immediate_attention: true
    },
    {
      id: 'demo-lead-3',
      name: names[2],
      snippet: 'Wants demo ASAP. Mentioned timeline for Q4 implementation and has decision-making authority.',
      campaign: 'Demo Request Campaign',
      marked_hot_time_ago: '2h 45m ago',
      call_logged: false,
      requires_immediate_attention: false
    },
    {
      id: 'demo-lead-4',
      name: names[3],
      snippet: 'Looking to replace current system. Asked about migration support and training options.',
      campaign: 'Replacement Campaign',
      marked_hot_time_ago: '4h 12m ago',
      call_logged: false,
      requires_immediate_attention: false
    },
    {
      id: 'demo-lead-5',
      name: names[4],
      snippet: 'Inquired about API capabilities and custom integrations. Technical team ready to evaluate.',
      campaign: 'Technical Evaluation',
      marked_hot_time_ago: '6h 30m ago',
      call_logged: false,
      requires_immediate_attention: false
    }
  ];

  return {
    hotLeads: demoLeads,
    hotSummary: {
      avg_response: '12m',
      fastest_response: '3m',
      slowest_response: '2h 15m',
      connected: 23,
      voicemail: 8,
      no_answer: 12,
      not_fit: 5,
      qualified: 18
    }
  };
};

const generateLeadSnippet = () => {
  const snippets = [
    'Interested in enterprise pricing for 50+ user team. Mentioned budget of $50k/year.',
    'Asked about integration with Salesforce. Currently using competitor solution.',
    'Wants demo ASAP. Mentioned timeline for Q4 implementation.',
    'Looking to replace current system. Asked about migration support.',
    'Inquired about API capabilities and custom integrations.',
    'Mentioned team of 25 users. Interested in bulk pricing options.',
    'Asked about security features and compliance certifications.',
    'Wants to schedule call with technical team about implementation.'
  ];
  
  return generateRandomElement(snippets);
};