import supabase from './supabaseClient';

// Helper function to invoke Edge Functions with proper auth
const invokeEdgeFunction = async (functionName, options = {}) => {
  // Try to get current session
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Refresh if missing or token is null
  if (sessionError || !session || !session.access_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshed?.session?.access_token) {
      console.error('❌ Unable to obtain access token for edge function');
      throw new Error('No valid session or access token');
    }

    session = refreshed.session;
    console.log('🔄 Session refreshed for Edge Function call');
  }

  console.log(`🔗 Edge Function Request: ${functionName}`);

  const { data, error } = await supabase.functions.invoke(functionName, {
    method: options.method || 'GET',
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (error) {
    console.error(`❌ Edge Function Error: ${functionName}`, error);
    throw error;
  }

  console.log(`✅ Edge Function Success: ${functionName}`, data);
  return data;
};

// ============= OVERVIEW & HEALTH =============
export async function fetchHealth() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverview() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverviewMetrics() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchOverviewTrendAndCost() {
  return {
    trend: [],
    totalMessagesSent: 0,
    totalHotLeads: 0,
    previousMessagesSent: 0,
    previousHotLeads: 0
  };
}

// ============= HOT LEADS & HANDOFF =============
export async function fetchHotSummary() {
  return await invokeEdgeFunction('HotLeadHandoffPanel');
}

export async function fetchHotLeads() {
  return await invokeEdgeFunction('get-hot-leads');
}

// ============= LEAD JOURNEY & FUNNEL =============
export async function fetchFunnel() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

export async function fetchLeadJourneyFunnel() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

export async function fetchFunnelHealth() {
  return await invokeEdgeFunction('LeadJourneyFunnel');
}

// ============= AI OPTIMIZATION =============
export async function fetchAiOptimizationPanel() {
  return await invokeEdgeFunction('AiOptimizationPanel');
}

export async function fetchKeywords() {
  return await invokeEdgeFunction('AiOptimizationPanel');
}

export async function fetchAIEfficiency() {
  return await invokeEdgeFunction('ai-efficiency-card');
}

export async function fetchAIvsHumanSplit() {
  return await invokeEdgeFunction('ai-efficiency-card');
}

// ============= LEAD METRICS =============
export async function fetchProperties() {
  return await invokeEdgeFunction('get-lead-analytics');
}

export async function fetchLeadTrends() {
  return await invokeEdgeFunction('overview-analytics');
}

export async function fetchLeadConversionSpeed() {
  return await invokeEdgeFunction('get-lead-analytics');
}

// ============= PERFORMANCE METRICS =============
export async function fetchResponseTimeMetrics() {
  return await invokeEdgeFunction('response-time');
}

export async function fetchMessageQualityMetrics() {
  return await invokeEdgeFunction('message-quality');
}

export async function fetchWeeklyMomentumMetrics() {
  return await invokeEdgeFunction('weekly-momentum');
}

export async function fetchEscalationStats() {
  return await invokeEdgeFunction('escalation-stats');
}

export async function fetchReplyPacingStats() {
  return await invokeEdgeFunction('reply-pacing');
}

export async function fetchFailureRate() {
  return await invokeEdgeFunction('failure-rate');
}

export async function fetchConversationFlow() {
  return await invokeEdgeFunction('conversation-flow');
}

// ============= SETTINGS =============
export async function fetchSettings() {
  return await invokeEdgeFunction('settings');
}

export async function updateSettings(settings) {
  return await invokeEdgeFunction('settings', {
    body: { settings },
    method: 'POST',
  });
}

// ============= CAMPAIGNS =============
export async function fetchCampaigns() {
  return await invokeEdgeFunction('campaigns');
}

export async function createCampaign(campaign) {
  return await invokeEdgeFunction('campaigns', {
    body: campaign,
    method: 'POST',
  });
}

export async function updateCampaign(id, updates) {
  return await invokeEdgeFunction('campaigns', {
    body: { id, ...updates },
    method: 'PUT',
  });
}

export async function deleteCampaign(id) {
  return await invokeEdgeFunction('campaigns', {
    body: { id },
    method: 'DELETE',
  });
}

// ============= ENTERPRISE ANALYTICS =============
export async function fetchPortfolioPerformance(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-portfolio-performance', {
    body: params,
  });
}

export async function fetchCohortAnalysis(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-portfolio-cohort-analysis', {
    body: params,
  });
}

export async function fetchCompetitiveAnalysis() {
  return await invokeEdgeFunction('enterprise-analytics-market-competitive-analysis');
}

export async function fetchIndustryBenchmarks(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-market-industry-benchmarks', {
    body: params,
  });
}

export async function fetchARRWaterfall(params = {}) {
  return await invokeEdgeFunction('enterprise-analytics-revenue-arr-waterfall', {
    body: params,
  });
}

export async function fetchRevenueMetrics() {
  return await invokeEdgeFunction('enterprise-analytics-revenue-metrics');
}

export async function fetchChurnRisk() {
  return await invokeEdgeFunction('enterprise-analytics-predictive-churn-risk');
}

export async function fetchForecasting() {
  return await invokeEdgeFunction('enterprise-analytics-predictive-forecasting');
}

export async function fetchGlobalKPIs() {
  return await invokeEdgeFunction('enterprise-analytics-kpis-global');
}
